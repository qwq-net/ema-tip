import { BET_TYPES, type BetType } from '@/entities/bet/constants';
import { parse } from 'node-html-parser';
import type { NetkeibaPayoutEntry, NetkeibaRaceResult } from '../model/types';

const BET_TYPE_CLASS_MAP: Array<[string, BetType, number]> = [
  ['Tansho', BET_TYPES.WIN, 1],
  ['Fukusho', BET_TYPES.PLACE, 1],
  ['Wakuren', BET_TYPES.BRACKET_QUINELLA, 2],
  ['Umaren', BET_TYPES.QUINELLA, 2],
  ['Wide', BET_TYPES.WIDE, 2],
  ['Umatan', BET_TYPES.EXACTA, 2],
  ['Fuku3', BET_TYPES.TRIO, 3],
  ['Tan3', BET_TYPES.TRIFECTA, 3],
];

function extractHorseNumbers(cell: ReturnType<typeof parse>): number[] {
  return cell
    .querySelectorAll('span')
    .map((s) => s.text.trim())
    .filter((t) => /^\d+$/.test(t))
    .map((t) => parseInt(t, 10))
    .filter((n) => !isNaN(n) && n > 0);
}

function extractPayoutAmounts(cell: ReturnType<typeof parse>): number[] {
  return cell.innerHTML
    .split(/<br\s*\/?>/i)
    .map((part) => parseInt(part.replace(/[^\d]/g, ''), 10))
    .filter((n) => !isNaN(n) && n > 0);
}

function parsePayoutRows(rows: ReturnType<typeof parse>[], numbersPerEntry: number): NetkeibaPayoutEntry[] {
  const allNumbers: number[] = [];
  const allPayouts: number[] = [];

  for (const row of rows) {
    const resultCell = row.querySelector('td.Result');
    const payoutCell = row.querySelector('td.Payout');
    if (!resultCell || !payoutCell) continue;

    allNumbers.push(...extractHorseNumbers(resultCell));
    allPayouts.push(...extractPayoutAmounts(payoutCell));
  }

  if (allPayouts.length === 0) return [];
  if (allNumbers.length !== numbersPerEntry * allPayouts.length) return [];

  return allPayouts.map((payout, i) => ({
    numbers: allNumbers.slice(i * numbersPerEntry, (i + 1) * numbersPerEntry),
    payout,
  }));
}

export function parseNetkeibaResult(html: string): NetkeibaRaceResult | null {
  const root = parse(html);

  if (!root.querySelector('.Payout_Detail_Table')) return null;

  const payouts: NetkeibaRaceResult['payouts'] = {};

  for (const [cssClass, betType, numbersPerEntry] of BET_TYPE_CLASS_MAP) {
    const rows = root.querySelectorAll(`tr.${cssClass}`);
    if (rows.length === 0) continue;

    const entries = parsePayoutRows(rows, numbersPerEntry);
    if (entries.length > 0) {
      payouts[betType] = entries;
    }
  }

  let finishOrder: number[] = [];
  const trifectaEntry = payouts[BET_TYPES.TRIFECTA]?.[0];
  const exactaEntry = payouts[BET_TYPES.EXACTA]?.[0];
  const winEntry = payouts[BET_TYPES.WIN]?.[0];
  if (trifectaEntry) {
    finishOrder = trifectaEntry.numbers;
  } else if (exactaEntry) {
    finishOrder = exactaEntry.numbers;
  } else if (winEntry) {
    finishOrder = winEntry.numbers;
  }

  return { finishOrder, payouts };
}
