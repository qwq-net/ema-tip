import { RACE_CONDITIONS } from '@/shared/constants/race';
import { lookup, narrowToOption } from '@/shared/utils/lookup';
import { type HTMLElement, parse } from 'node-html-parser';
import type { RacePreviewData, ScrapedHorse, ScrapedRaceInfo } from '../model/types';

const GENDER_MAP = {
  牡: 'HORSE',
  牝: 'MARE',
  セ: 'GELDING',
} satisfies Record<string, 'MARE' | 'FILLY' | 'HORSE' | 'COLT' | 'GELDING'>;

/** 要素のテキストを前後の空白なしで返す。要素が無ければ空文字を返す。 */
function textOf(el: HTMLElement | null | undefined): string {
  return el?.text.trim() ?? '';
}

interface GenderAge {
  gender: ScrapedHorse['gender'];
  age: number | null;
}

/**
 * 性齢セルから性別と年齢を取り出す。
 * td.Barei を優先し、空なら馬名欄の .Age を見る。読めない性別は牡、読めない年齢は null になる。
 */
function parseGenderAge(row: HTMLElement): GenderAge {
  const bareiText = textOf(row.querySelector('td.Barei')) || textOf(row.querySelector('td.HorseInfo .Age'));
  const ageDigits = /(\d+)/.exec(bareiText)?.[1];

  return {
    gender: lookup(GENDER_MAP, bareiText[0] ?? '') ?? 'HORSE',
    age: ageDigits === undefined ? null : parseInt(ageDigits),
  };
}

/** 枠番セルから枠番を返す。入れ子の span を優先し、セル直書きの数字へ落とす。読めなければ null を返す。 */
function parseBracketNumber(row: HTMLElement): number | null {
  const waku = row.querySelector('td[class*="Waku"]');
  const parsed = parseInt(textOf(waku?.querySelector('span')) || textOf(waku));
  return Number.isNaN(parsed) ? null : parsed;
}

function extractRaceId(url: string): string {
  const raceId = new URL(url).searchParams.get('race_id');
  if (!raceId || !/^\d{12}$/.test(raceId)) throw new Error('URLの形式が正しくありません');
  return raceId;
}

function parseRaceInfo(root: ReturnType<typeof parse>, raceId: string): ScrapedRaceInfo {
  const raceData01 = root.querySelector('.RaceData01')?.text ?? '';
  const raceName = root.querySelector('.RaceName')?.text.trim() ?? root.querySelector('h1.RaceName')?.text.trim() ?? '';

  // 後読みは数字列の途中から走査をやり直させないための番兵。
  // 取得元は netkeiba のスクレイプ結果で、長い数字列を渡されたときの走査量を線形に抑える
  const distanceMatch = /(?<!\d)(\d+)m/.exec(raceData01);
  const distance = distanceMatch ? Number(distanceMatch[1]) : 0;

  const surface = raceData01.includes('芝') ? '芝' : 'ダート';

  let direction: 'RIGHT' | 'LEFT' | null = null;
  if (raceData01.includes('右')) direction = 'RIGHT';
  else if (raceData01.includes('左')) direction = 'LEFT';

  const conditionMatch = /(良|稍重|重|不良)/.exec(raceData01);
  const condition = conditionMatch ? (narrowToOption(RACE_CONDITIONS, conditionMatch[1]) ?? null) : null;

  const raceNumber = parseInt(raceId.slice(10, 12));
  const netkeibaVenueCode = raceId.slice(4, 6);

  return { raceName, distance, surface, direction, condition, raceNumber, netkeibaVenueCode };
}

function parseHorses(root: ReturnType<typeof parse>): ScrapedHorse[] {
  const rows = root.querySelectorAll('tr.HorseList');

  const [firstRow] = rows;
  if (firstRow === undefined) throw new Error('出走馬情報を取得できませんでした');

  const wakuCell = firstRow.querySelector('td[class*="Waku"]');
  const isConfirmed = /Waku\d/.test(wakuCell?.classNames ?? '');
  if (!isConfirmed) {
    throw new Error('馬番・枠番が確定していません。出走確定後に再取得してください。');
  }

  return rows
    .map((row, idx): ScrapedHorse => {
      const rowText = row.text;
      const scratched = rowText.includes('取消') || rowText.includes('除外');
      const horseNumber = parseInt(textOf(row.querySelector('td[class*="Umaban"]'))) || idx + 1;

      const nameAnchor = row.querySelector('td.HorseInfo .HorseName a');
      const horseName = nameAnchor?.getAttribute('title')?.trim() ?? textOf(nameAnchor);

      const { gender, age } = parseGenderAge(row);

      const weightText = textOf(row.querySelectorAll('td.Txt_C').find((td) => /^\d+\.\d+$/.test(td.text.trim())));
      const weight = weightText ? parseFloat(weightText) : null;

      // 騎手欄は a が無ければ未発表で null、a があって空なら騎手未定の空文字と、意味を分けて扱う
      const jockeyAnchor = row.querySelector('td.Jockey a');
      const jockey = jockeyAnchor ? jockeyAnchor.text.trim() : null;

      const oddsRaw = parseFloat(textOf(row.querySelector('td.Popular span[id^="odds-"]')));
      const odds = isNaN(oddsRaw) ? null : oddsRaw;

      return {
        horseNumber,
        bracketNumber: parseBracketNumber(row),
        name: horseName,
        gender,
        age,
        jockey,
        weight,
        odds,
        scratched,
      };
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
