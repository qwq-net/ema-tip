'use server';

import { db } from '@/shared/db';
import { horses, raceEntries, raceInstances, raceOdds } from '@/shared/db/schema';
import { RACE_EVENTS, raceEventEmitter } from '@/shared/lib/sse/event-emitter';
import { ActionError, requireAdmin, runAction, type ActionResult } from '@/shared/utils/admin';
import { lookup } from '@/shared/utils/lookup';
import { and, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { inflateSync } from 'zlib';
import { parseNetkeibaResult } from './lib/parse-result';
import { parseShutuba } from './lib/parse-shutuba';
import type { HorsePreviewItem, NetkeibaRaceResult, RacePreviewWithHorseStatus } from './model/types';

const ALLOWED_HOSTS = {
  'race.netkeiba.com': 'https://race.netkeiba.com/race/shutuba.html',
  'nar.netkeiba.com': 'https://nar.netkeiba.com/race/shutuba.html',
} satisfies Record<string, string>;

function normalizeNetkeibaUrl(input: string): string {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error('URLの形式が正しくありません');
  }
  const base = lookup(ALLOWED_HOSTS, parsed.hostname);
  if (!base) {
    throw new Error('Netkeiba出馬表のURLを入力してください');
  }
  if (parsed.pathname !== '/race/shutuba.html') {
    throw new Error('出馬表（shutuba.html）のURLを入力してください。結果ページ等には対応していません');
  }
  const raceId = parsed.searchParams.get('race_id');
  if (!raceId || !/^\d{12}$/.test(raceId)) {
    throw new Error('race_idが正しくありません（12桁の数字が必要です）');
  }
  return `${base}?race_id=${raceId}`;
}

function isNarUrl(url: string): boolean {
  return new URL(url).hostname === 'nar.netkeiba.com';
}

async function fetchNetkeibaHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PaperTipster/1.0)' },
    signal: AbortSignal.timeout(10000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Netkeibaページの取得に失敗しました (${res.status})`);
  const buffer = await res.arrayBuffer();

  const contentType = res.headers.get('content-type') ?? '';
  let charset = contentType.match(/charset=([^\s;]+)/i)?.[1];

  if (!charset) {
    const head = new TextDecoder('latin1').decode(buffer.slice(0, 2048));
    charset = head.match(/charset=["']?([^\s;"'>]+)/i)?.[1];
  }

  charset ??= 'euc-jp';

  return new TextDecoder(charset).decode(buffer);
}

const NETKEIBA_SCRATCHED_ODDS = 999.9;

async function fetchNetkeibaWinOdds(raceId: string): Promise<Record<string, number>> {
  const apiUrl = `https://race.netkeiba.com/api/api_get_jra_odds.html?race_id=${raceId}&type=1&action=init&output=jsonp&callback=cb`;
  const res = await fetch(apiUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PaperTipster/1.0)' },
    signal: AbortSignal.timeout(10000),
    cache: 'no-store',
  });
  if (!res.ok) {
    return {};
  }

  const text = await res.text();
  const jsonStr = text.replace(/^cb\(/, '').replace(/\)\s*$/, '');
  // SAFETY: netkeiba オッズ API の JSONP レスポンス形状。直後の status / data ガードで異形状は空扱いにする
  const json = JSON.parse(jsonStr) as { status: string; data: string | unknown };

  if ((json.status !== 'result' && json.status !== 'middle') || !json.data) {
    return {};
  }

  let oddsData: { odds?: Record<string, Record<string, [string, string, string]>> };
  if (json.data instanceof Object) {
    // SAFETY: netkeiba API は data にオブジェクトか base64 文字列のみを返す
    oddsData = json.data as typeof oddsData;
  } else {
    const buf = Buffer.from(String(json.data), 'base64');
    oddsData = JSON.parse(inflateSync(buf).toString('utf-8'));
  }

  const winOddsRaw = oddsData.odds?.['1'] ?? {};
  const result: Record<string, number> = {};
  for (const [key, val] of Object.entries(winOddsRaw)) {
    const horseNum = parseInt(key, 10);
    const oddsVal = parseFloat(val[0]);
    if (!isNaN(oddsVal) && oddsVal < NETKEIBA_SCRATCHED_ODDS) result[String(horseNum)] = oddsVal;
  }
  return result;
}

export async function fetchRacePreview(url: string): Promise<ActionResult<RacePreviewWithHorseStatus>> {
  try {
    await requireAdmin();
    const normalizedUrl = normalizeNetkeibaUrl(url);
    const raceId = new URL(normalizedUrl).searchParams.get('race_id')!;

    const [html, winOdds] = await Promise.all([
      fetchNetkeibaHtml(normalizedUrl),
      isNarUrl(normalizedUrl) ? Promise.resolve<Record<string, number>>({}) : fetchNetkeibaWinOdds(raceId),
    ]);
    const preview = parseShutuba(html, normalizedUrl);

    const horseItems: HorsePreviewItem[] = await Promise.all(
      preview.horses.map(async (h) => {
        if (h.scratched) {
          return { ...h, odds: null, existingHorseId: null };
        }
        const existing = await db.query.horses.findFirst({
          where: eq(horses.name, h.name),
          columns: { id: true },
        });
        const oddsFromApi = winOdds[String(h.horseNumber)] ?? null;
        return { ...h, odds: oddsFromApi ?? h.odds, existingHorseId: existing?.id ?? null };
      })
    );

    return { success: true, data: { raceInfo: preview.raceInfo, horses: horseItems, sourceUrl: preview.sourceUrl } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期しないエラーが発生しました' };
  }
}

type ImportRaceParams = {
  url: string;
  eventId: string;
  venueId: string;
  date: string;
  raceName: string;
  raceNumber: number;
  distance: number;
  surface: string;
  direction: 'RIGHT' | 'LEFT' | null;
  condition: string | null;
  fixedOddsMode: boolean;
  horses: Array<{
    horseNumber: number;
    bracketNumber: number;
    name: string;
    gender: 'HORSE' | 'MARE' | 'GELDING';
    age: number | null;
    jockey: string | null;
    odds: number | null;
    scratched?: boolean;
  }>;
};

export async function importRace(params: ImportRaceParams): Promise<ActionResult<{ raceId: string }>> {
  try {
    await requireAdmin();

    const normalizedUrl = normalizeNetkeibaUrl(params.url);
    if (params.horses.length === 0) throw new Error('出走馬が0頭です');

    const result = await db.transaction(async (tx) => {
      // レース名一致だけだと、3歳未勝利のような別会場の同名レースが登録できないため、netkeiba の URL で同定する。
      // 二重確定の競合を防ぐため、チェックは insert と同じトランザクションで行う
      const duplicateRace = await tx.query.raceInstances.findFirst({
        where: and(eq(raceInstances.eventId, params.eventId), eq(raceInstances.netkeibaUrl, normalizedUrl)),
        columns: { id: true },
      });
      if (duplicateRace) throw new Error('このレースは既に同じイベントへ取り込み済みです');

      // 馬は名前で同定する。1頭ずつ照会せず、既存分の一括取得と不足分の一括insertで済ませる
      const existingHorses = await tx.query.horses.findMany({
        where: inArray(
          horses.name,
          params.horses.map((h) => h.name)
        ),
        columns: { id: true, name: true },
      });
      const horseIdByName = new Map(existingHorses.map((h) => [h.name, h.id]));

      // 同名馬が同一レースに重複していても1頭として登録する
      const newHorses = [
        ...new Map(params.horses.filter((h) => !horseIdByName.has(h.name)).map((h) => [h.name, h])).values(),
      ];
      if (newHorses.length > 0) {
        const inserted = await tx
          .insert(horses)
          .values(newHorses.map((h) => ({ name: h.name, gender: h.gender, age: h.age })))
          .returning({ id: horses.id, name: horses.name });
        for (const h of inserted) horseIdByName.set(h.name, h.id);
      }

      const horseIds: Record<number, string> = {};
      for (const h of params.horses) {
        horseIds[h.horseNumber] = horseIdByName.get(h.name)!;
      }

      const [race] = await tx
        .insert(raceInstances)
        .values({
          eventId: params.eventId,
          venueId: params.venueId,
          date: params.date,
          name: params.raceName,
          raceNumber: params.raceNumber,
          distance: params.distance,
          surface: params.surface,
          direction: params.direction,
          condition: params.condition,
          status: 'SCHEDULED',
          netkeibaUrl: normalizedUrl,
          fixedOddsMode: params.fixedOddsMode,
        })
        .returning({ id: raceInstances.id });

      await tx.insert(raceEntries).values(
        params.horses.map((h) => ({
          raceId: race.id,
          horseId: horseIds[h.horseNumber],
          horseNumber: h.horseNumber,
          bracketNumber: h.bracketNumber,
          jockey: h.jockey,
          status: h.scratched ? ('SCRATCHED' as const) : ('ENTRANT' as const),
        }))
      );

      const winOdds: Record<string, number> = {};
      for (const h of params.horses) {
        if (h.odds !== null && !h.scratched) winOdds[String(h.horseNumber)] = h.odds;
      }
      await tx.insert(raceOdds).values({ raceId: race.id, winOdds, placeOdds: {} });

      return { raceId: race.id };
    });

    revalidatePath('/admin/races');
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期しないエラーが発生しました' };
  }
}

// Netkeiba から単勝オッズを取り込んで上書きする。URL未設定・取得失敗などの
// 想定内エラーは throw せず { success: false, error } で返す。
export async function updateOddsFromNetkeiba(raceId: string): Promise<ActionResult<void>> {
  return runAction(() => updateOddsFromNetkeibaInner(raceId));
}

async function updateOddsFromNetkeibaInner(raceId: string): Promise<void> {
  await requireAdmin();

  const race = await db.query.raceInstances.findFirst({
    where: eq(raceInstances.id, raceId),
    columns: { netkeibaUrl: true },
  });
  if (!race?.netkeibaUrl) throw new ActionError('Netkeiba URLが設定されていません');

  if (isNarUrl(race.netkeibaUrl)) throw new ActionError('地方競馬のオッズ更新は対応していません');

  const netkeibaRaceId = new URL(race.netkeibaUrl).searchParams.get('race_id');
  if (!netkeibaRaceId) throw new ActionError('race_idが取得できません');

  const winOdds = await fetchNetkeibaWinOdds(netkeibaRaceId);
  if (Object.keys(winOdds).length === 0) throw new ActionError('オッズデータが取得できませんでした');

  await db
    .insert(raceOdds)
    .values({ raceId, winOdds, placeOdds: {} })
    .onConflictDoUpdate({
      target: raceOdds.raceId,
      set: { winOdds, updatedAt: new Date() },
    });

  raceEventEmitter.emit(RACE_EVENTS.RACE_ODDS_UPDATED, {
    raceId,
    data: { winOdds, placeOdds: {}, updatedAt: new Date() },
  });

  revalidatePath(`/admin/races/${raceId}`);
}

// Netkeiba の結果ページを取得して着順・払戻をパースする。結果未確定なら data は null。
// URL未設定などの想定内エラーは throw せず { success: false, error } で返す。
export async function fetchNetkeibaRaceResult(raceId: string): Promise<ActionResult<NetkeibaRaceResult | null>> {
  return runAction(() => fetchNetkeibaRaceResultInner(raceId));
}

async function fetchNetkeibaRaceResultInner(raceId: string): Promise<NetkeibaRaceResult | null> {
  await requireAdmin();

  const race = await db.query.raceInstances.findFirst({
    where: eq(raceInstances.id, raceId),
    columns: { netkeibaUrl: true },
  });
  if (!race?.netkeibaUrl) throw new ActionError('Netkeiba URLが設定されていません');

  const netkeibaRaceId = new URL(race.netkeibaUrl).searchParams.get('race_id');
  if (!netkeibaRaceId) throw new ActionError('race_idが取得できません');

  const host = isNarUrl(race.netkeibaUrl) ? 'nar.netkeiba.com' : 'race.netkeiba.com';
  const resultUrl = `https://${host}/race/result.html?race_id=${netkeibaRaceId}`;
  const html = await fetchNetkeibaHtml(resultUrl);
  const result = parseNetkeibaResult(html);

  if (result && result.finishOrder.length < 3) {
    return null;
  }

  return result;
}
