import { describe, expect, it } from 'vitest';
import { describeTransaction, type WalletTransaction } from './describe-transaction';

const BASE_TX: WalletTransaction = { type: 'BET', bet: null, event: null, bet5Ticket: null };

// 取引種別と関連の有無だけを差し替えたテスト用の取引を作る
function makeTx(overrides: Partial<WalletTransaction>): WalletTransaction {
  return { ...BASE_TX, ...overrides };
}

const BET5_TICKET = { bet5Event: { event: { name: '第3回開催' } } };
const RACE_BET = { race: { name: '新馬戦', venue: { shortName: '東京' } } };

describe('describeTransaction', () => {
  it('配布金はイベント名を説明文にすること', () => {
    expect(describeTransaction(makeTx({ type: 'DISTRIBUTION', event: { name: '第3回開催' } }))).toBe('第3回開催');
  });

  it('配布金はイベントを辿れなければ既定の文言を返すこと', () => {
    expect(describeTransaction(makeTx({ type: 'DISTRIBUTION' }))).toBe('配布金');
  });

  it('借入金はイベント名を前置すること', () => {
    expect(describeTransaction(makeTx({ type: 'LOAN', event: { name: '第3回開催' } }))).toBe('第3回開催 借入金');
  });

  it('借入金はイベントを辿れなければ既定の文言を返すこと', () => {
    expect(describeTransaction(makeTx({ type: 'LOAN' }))).toBe('借入金');
  });

  it('BET5 券が紐づく購入は投票の語を使うこと', () => {
    expect(describeTransaction(makeTx({ type: 'BET', bet5Ticket: BET5_TICKET }))).toBe('第3回開催 BET5 投票');
  });

  it('BET5 券が紐づく払戻は払戻の語を使うこと', () => {
    expect(describeTransaction(makeTx({ type: 'PAYOUT', bet5Ticket: BET5_TICKET }))).toBe('第3回開催 BET5 払戻');
  });

  it('BET5 券のイベント名を辿れなければイベント名を省くこと', () => {
    const tx = makeTx({ type: 'BET', bet5Ticket: { bet5Event: null } });
    expect(describeTransaction(tx)).toBe('BET5 投票');
  });

  it('BET5 券が紐づかない購入はレース名を説明文にすること', () => {
    expect(describeTransaction(makeTx({ type: 'BET', bet: RACE_BET }))).toBe('東京 新馬戦');
  });

  it('競馬場を辿れなければレース名だけを返すこと', () => {
    const tx = makeTx({ type: 'PAYOUT', bet: { race: { name: '新馬戦', venue: null } } });
    expect(describeTransaction(tx)).toBe('新馬戦');
  });

  it('返還は BET5 券が紐づいていてもレース側の説明文になること', () => {
    const tx = makeTx({ type: 'REFUND', bet: RACE_BET, bet5Ticket: BET5_TICKET });
    expect(describeTransaction(tx)).toBe('東京 新馬戦');
  });

  it('レースを辿れない馬券の取引は説明文を持たないこと', () => {
    expect(describeTransaction(makeTx({ type: 'BET' }))).toBeNull();
  });
});
