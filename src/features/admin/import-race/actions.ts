'use server';

import { db } from '@/shared/db';
import { horses, raceEntries, raceInstances, raceOdds } from '@/shared/db/schema';
import { RACE_EVENTS, raceEventEmitter } from '@/shared/lib/sse/event-emitter';
import { requireAdmin } from '@/shared/utils/admin';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { inflateSync } from 'zlib';
import { parseNetkeibaResult } from './lib/parse-result';
import { parseShutuba } from './lib/parse-shutuba';
import type { ActionResult, HorsePreviewItem, NetkeibaRaceResult, RacePreviewWithHorseStatus } from './model/types';

const ALLOWED_HOSTS: Record<string, string> = {
  'race.netkeiba.com': 'https://race.netkeiba.com/race/shutuba.html',
  'nar.netkeiba.com': 'https://nar.netkeiba.com/race/shutuba.html',
};

function normalizeNetkeibaUrl(input: string): string {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error('URLの形式が正しくありません');
  }
  const base = ALLOWED_HOSTS[parsed.hostname];
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
  const json = JSON.parse(jsonStr) as { status: string; data: string | unknown };

  if ((json.status !== 'result' && json.status !== 'middle') || !json.data) {
    return {};
  }

  let oddsData: { odds?: Record<string, Record<string, [string, string, string]>> };
  if (typeof json.data === 'string') {
    const buf = Buffer.from(json.data, 'base64');
    oddsData = JSON.parse(inflateSync(buf).toString('utf-8'));
  } else {
    oddsData = json.data as typeof oddsData;
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

    normalizeNetkeibaUrl(params.url);
    if (params.horses.length === 0) throw new Error('出走馬が0頭です');

    const duplicateRace = await db.query.raceInstances.findFirst({
      where: and(eq(raceInstances.eventId, params.eventId), eq(raceInstances.name, params.raceName)),
      columns: { id: true },
    });
    if (duplicateRace) throw new Error(`同じイベントに「${params.raceName}」は既に登録されています`);

    const result = await db.transaction(async (tx) => {
      const horseIds: Record<number, string> = {};

      for (const horse of params.horses) {
        const existing = await tx.query.horses.findFirst({
          where: eq(horses.name, horse.name),
          columns: { id: true },
        });

        if (existing) {
          horseIds[horse.horseNumber] = existing.id;
        } else {
          const [inserted] = await tx
            .insert(horses)
            .values({ name: horse.name, gender: horse.gender, age: horse.age })
            .returning({ id: horses.id });
          horseIds[horse.horseNumber] = inserted.id;
        }
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
          netkeibaUrl: params.url,
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

export async function updateOddsFromNetkeiba(raceId: string): Promise<void> {
  await requireAdmin();

  const race = await db.query.raceInstances.findFirst({
    where: eq(raceInstances.id, raceId),
    columns: { netkeibaUrl: true },
  });
  if (!race?.netkeibaUrl) throw new Error('Netkeiba URLが設定されていません');

  if (isNarUrl(race.netkeibaUrl)) throw new Error('地方競馬のオッズ更新は対応していません');

  const netkeibaRaceId = new URL(race.netkeibaUrl).searchParams.get('race_id');
  if (!netkeibaRaceId) throw new Error('race_idが取得できません');

  const winOdds = await fetchNetkeibaWinOdds(netkeibaRaceId);
  if (Object.keys(winOdds).length === 0) throw new Error('オッズデータが取得できませんでした');

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

export async function fetchNetkeibaRaceResult(raceId: string): Promise<NetkeibaRaceResult | null> {
  await requireAdmin();

  const race = await db.query.raceInstances.findFirst({
    where: eq(raceInstances.id, raceId),
    columns: { netkeibaUrl: true },
  });
  if (!race?.netkeibaUrl) throw new Error('Netkeiba URLが設定されていません');

  const netkeibaRaceId = new URL(race.netkeibaUrl).searchParams.get('race_id');
  if (!netkeibaRaceId) throw new Error('race_idが取得できません');

  const host = isNarUrl(race.netkeibaUrl) ? 'nar.netkeiba.com' : 'race.netkeiba.com';
  const resultUrl = `https://${host}/race/result.html?race_id=${netkeibaRaceId}`;
  const html = await fetchNetkeibaHtml(resultUrl);
  const result = parseNetkeibaResult(html);

  if (result && result.finishOrder.length < 3) {
    return null;
  }

  return result;
}
