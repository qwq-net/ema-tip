import { RACE_CONDITIONS } from '@/shared/constants/race';
import { lookup, narrowToOption } from '@/shared/utils/lookup';
import { parse } from 'node-html-parser';
import type { RacePreviewData, ScrapedHorse, ScrapedRaceInfo } from '../model/types';

const GENDER_MAP = {
  牡: 'HORSE',
  牝: 'MARE',
  セ: 'GELDING',
} satisfies Record<string, 'MARE' | 'FILLY' | 'HORSE' | 'COLT' | 'GELDING'>;

function extractRaceId(url: string): string {
  const raceId = new URL(url).searchParams.get('race_id');
  if (!raceId || !/^\d{12}$/.test(raceId)) throw new Error('URLの形式が正しくありません');
  return raceId;
}

function parseRaceInfo(root: ReturnType<typeof parse>, raceId: string): ScrapedRaceInfo {
  const raceData01 = root.querySelector('.RaceData01')?.text ?? '';
  const raceName =
    root.querySelector('.RaceName')?.text?.trim() ?? root.querySelector('h1.RaceName')?.text?.trim() ?? '';

  const distanceMatch = raceData01.match(/(\d+)m/);
  const distance = distanceMatch ? parseInt(distanceMatch[1]) : 0;

  const surface = raceData01.includes('芝') ? '芝' : 'ダート';

  let direction: 'RIGHT' | 'LEFT' | null = null;
  if (raceData01.includes('右')) direction = 'RIGHT';
  else if (raceData01.includes('左')) direction = 'LEFT';

  const conditionMatch = raceData01.match(/(良|稍重|重|不良)/);
  const condition = conditionMatch ? (narrowToOption(RACE_CONDITIONS, conditionMatch[1]) ?? null) : null;

  const raceNumber = parseInt(raceId.slice(10, 12));
  const netkeibaVenueCode = raceId.slice(4, 6);

  return { raceName, distance, surface, direction, condition, raceNumber, netkeibaVenueCode };
}

function parseHorses(root: ReturnType<typeof parse>): ScrapedHorse[] {
  const rows = root.querySelectorAll('tr.HorseList');

  if (rows.length === 0) throw new Error('出走馬情報を取得できませんでした');

  const firstRow = rows[0];
  const wakuCell = firstRow.querySelector('td[class*="Waku"]');
  const isConfirmed = /Waku\d/.test(wakuCell?.classNames ?? '');
  if (!isConfirmed) {
    throw new Error('馬番・枠番が確定していません。出走確定後に再取得してください。');
  }

  return rows
    .map((row, idx): ScrapedHorse => {
      const rowText = row.text;
      const scratched = rowText.includes('取消') || rowText.includes('除外');
      const umaban = row.querySelector('td[class*="Umaban"]');
      const horseNumber = parseInt(umaban?.text?.trim() ?? '') || idx + 1;

      const waku = row.querySelector('td[class*="Waku"]');
      const bracketNumber = parseInt(waku?.querySelector('span')?.text?.trim() || waku?.text?.trim() || '') || 0;

      const horseName =
        row.querySelector('td.HorseInfo .HorseName a')?.getAttribute('title')?.trim() ??
        row.querySelector('td.HorseInfo .HorseName a')?.text?.trim() ??
        '';

      const bareiText =
        row.querySelector('td.Barei')?.text?.trim() || row.querySelector('td.HorseInfo .Age')?.text?.trim() || '';
      const genderChar = bareiText[0] ?? '';
      const gender = lookup(GENDER_MAP, genderChar) ?? 'HORSE';
      const ageMatch = bareiText.match(/(\d+)/);
      const age = ageMatch ? parseInt(ageMatch[1]) : null;

      const weightText = row
        .querySelectorAll('td.Txt_C')
        .find((td) => /^\d+\.\d+$/.test(td.text.trim()))
        ?.text?.trim();
      const weight = weightText ? parseFloat(weightText) : null;

      const jockey = row.querySelector('td.Jockey a')?.text?.trim() ?? null;

      const oddsText = row.querySelector('td.Popular span[id^="odds-"]')?.text?.trim();
      const oddsRaw = parseFloat(oddsText ?? '');
      const odds = isNaN(oddsRaw) ? null : oddsRaw;

      return { horseNumber, bracketNumber, name: horseName, gender, age, jockey, weight, odds, scratched };
    })
    .filter((h) => h.name !== '');
}

export function parseShutuba(html: string, url: string): RacePreviewData {
  const raceId = extractRaceId(url);
  const root = parse(html);
  const raceInfo = parseRaceInfo(root, raceId);
  const horses = parseHorses(root);

  return { raceInfo, horses, sourceUrl: url };
}
