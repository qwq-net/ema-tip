import { BET_TYPES } from '@/entities/bet/constants';
import { describe, expect, it } from 'vitest';
import { parseNetkeibaResult } from './parse-result';

function buildPayoutTable(rows: string): string {
  return `<table class="Payout_Detail_Table">${rows}</table>`;
}

function buildRow(cssClass: string, resultSpans: string, payoutText: string): string {
  return `<tr class="${cssClass}"><td class="Result">${resultSpans}</td><td class="Payout">${payoutText}</td></tr>`;
}

function spans(...nums: number[]): string {
  return nums.map((n) => `<span>${n}</span>`).join(' - ');
}

describe('parseNetkeibaResult', () => {
  it('Payout_Detail_Table がない HTML では null を返す', () => {
    expect(parseNetkeibaResult('<html><body>no table</body></html>')).toBeNull();
  });

  it('単勝を正しくパースする', () => {
    const html = buildPayoutTable(buildRow('Tansho', spans(3), '540'));
    const result = parseNetkeibaResult(html);

    expect(result).not.toBeNull();
    expect(result!.payouts[BET_TYPES.WIN]).toEqual([{ numbers: [3], payout: 540 }]);
    expect(result!.finishOrder).toEqual([3]);
  });

  it('複勝の<br>区切りの金額と複数spanからなる複数行を正しくパースする', () => {
    const html = buildPayoutTable(buildRow('Fukusho', spans(3, 5, 8), '180<br>220<br>350'));
    const result = parseNetkeibaResult(html);

    expect(result!.payouts[BET_TYPES.PLACE]).toEqual([
      { numbers: [3], payout: 180 },
      { numbers: [5], payout: 220 },
      { numbers: [8], payout: 350 },
    ]);
  });

  it('複勝: 複数行に span が分かれている場合', () => {
    const html = buildPayoutTable(
      buildRow('Fukusho', spans(3), '180') + buildRow('Fukusho', spans(5), '220') + buildRow('Fukusho', spans(8), '350')
    );
    const result = parseNetkeibaResult(html);

    expect(result!.payouts[BET_TYPES.PLACE]).toEqual([
      { numbers: [3], payout: 180 },
      { numbers: [5], payout: 220 },
      { numbers: [8], payout: 350 },
    ]);
  });

  it('馬連を正しくパースする', () => {
    const html = buildPayoutTable(buildRow('Umaren', spans(1, 3), '1,520'));
    const result = parseNetkeibaResult(html);

    expect(result!.payouts[BET_TYPES.QUINELLA]).toEqual([{ numbers: [1, 3], payout: 1520 }]);
  });

  it('馬単を正しくパースする', () => {
    const html = buildPayoutTable(buildRow('Umatan', spans(3, 1), '2,840'));
    const result = parseNetkeibaResult(html);

    expect(result!.payouts[BET_TYPES.EXACTA]).toEqual([{ numbers: [3, 1], payout: 2840 }]);
  });

  it('ワイドの<br>区切りの複数組み合わせを正しくパースする', () => {
    const html = buildPayoutTable(buildRow('Wide', spans(1, 3, 1, 5, 3, 5), '420<br>780<br>1,200'));
    const result = parseNetkeibaResult(html);

    expect(result!.payouts[BET_TYPES.WIDE]).toEqual([
      { numbers: [1, 3], payout: 420 },
      { numbers: [1, 5], payout: 780 },
      { numbers: [3, 5], payout: 1200 },
    ]);
  });

  it('3連複を正しくパースする', () => {
    const html = buildPayoutTable(buildRow('Fuku3', spans(1, 3, 5), '4,560'));
    const result = parseNetkeibaResult(html);

    expect(result!.payouts[BET_TYPES.TRIO]).toEqual([{ numbers: [1, 3, 5], payout: 4560 }]);
  });

  it('3連単を正しくパースする', () => {
    const html = buildPayoutTable(buildRow('Tan3', spans(3, 1, 5), '25,600'));
    const result = parseNetkeibaResult(html);

    expect(result!.payouts[BET_TYPES.TRIFECTA]).toEqual([{ numbers: [3, 1, 5], payout: 25600 }]);
  });

  it('枠連を正しくパースする', () => {
    const html = buildPayoutTable(buildRow('Wakuren', spans(2, 5), '1,130'));
    const result = parseNetkeibaResult(html);

    expect(result!.payouts[BET_TYPES.BRACKET_QUINELLA]).toEqual([{ numbers: [2, 5], payout: 1130 }]);
  });

  it('finishOrder は3連単 > 馬単 > 単勝の優先度で決定する', () => {
    const html = buildPayoutTable(
      buildRow('Tansho', spans(3), '540') +
        buildRow('Umatan', spans(3, 1), '2,840') +
        buildRow('Tan3', spans(3, 1, 5), '25,600')
    );
    const result = parseNetkeibaResult(html);
    expect(result!.finishOrder).toEqual([3, 1, 5]);
  });

  it('3連単がない場合は馬単から finishOrder を取得する', () => {
    const html = buildPayoutTable(buildRow('Tansho', spans(3), '540') + buildRow('Umatan', spans(3, 1), '2,840'));
    const result = parseNetkeibaResult(html);
    expect(result!.finishOrder).toEqual([3, 1]);
  });

  it('馬単もない場合は単勝から finishOrder を取得する', () => {
    const html = buildPayoutTable(buildRow('Tansho', spans(3), '540'));
    const result = parseNetkeibaResult(html);
    expect(result!.finishOrder).toEqual([3]);
  });

  it('全券種を含む完全な結果をパースできる', () => {
    const html = buildPayoutTable(
      buildRow('Tansho', spans(3), '540') +
        buildRow('Fukusho', spans(3, 1, 5), '180<br>220<br>350') +
        buildRow('Wakuren', spans(2, 5), '1,130') +
        buildRow('Umaren', spans(1, 3), '1,520') +
        buildRow('Wide', spans(1, 3, 1, 5, 3, 5), '420<br>780<br>1,200') +
        buildRow('Umatan', spans(3, 1), '2,840') +
        buildRow('Fuku3', spans(1, 3, 5), '4,560') +
        buildRow('Tan3', spans(3, 1, 5), '25,600')
    );
    const result = parseNetkeibaResult(html);

    expect(result).not.toBeNull();
    expect(Object.keys(result!.payouts)).toHaveLength(8);
    expect(result!.finishOrder).toEqual([3, 1, 5]);
  });

  it('<br /> (self-closing) も正しく分割する', () => {
    const html = buildPayoutTable(buildRow('Fukusho', spans(1, 2, 3), '150<br />200<br />310'));
    const result = parseNetkeibaResult(html);

    expect(result!.payouts[BET_TYPES.PLACE]).toEqual([
      { numbers: [1], payout: 150 },
      { numbers: [2], payout: 200 },
      { numbers: [3], payout: 310 },
    ]);
  });

  it('金額にカンマや円記号が含まれていても正しくパースする', () => {
    const html = buildPayoutTable(buildRow('Tan3', spans(3, 1, 5), '¥125,600円'));
    const result = parseNetkeibaResult(html);

    expect(result!.payouts[BET_TYPES.TRIFECTA]).toEqual([{ numbers: [3, 1, 5], payout: 125600 }]);
  });

  it('馬番とペイアウトの数が一致しない場合はエントリを生成しない', () => {
    const html = buildPayoutTable(buildRow('Umaren', spans(1), '1,520'));
    const result = parseNetkeibaResult(html);

    expect(result!.payouts[BET_TYPES.QUINELLA]).toBeUndefined();
  });
});
