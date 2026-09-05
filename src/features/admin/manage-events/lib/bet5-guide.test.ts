import { describe, expect, it } from 'vitest';
import { getBet5Guide } from './bet5-guide';

const finished = { status: 'FINALIZED' };
const running = { status: 'CLOSED' };

describe('getBet5Guide', () => {
  it('BET5 未設定の開催前・開催中は設定を案内する', () => {
    expect(getBet5Guide({ status: 'SCHEDULED', bet5Event: null })).toBe('setup');
    expect(getBet5Guide({ status: 'ACTIVE' })).toBe('setup');
  });

  it('開催終了と BET5 払戻済みは何も案内しない', () => {
    expect(getBet5Guide({ status: 'COMPLETED', bet5Event: null })).toBeNull();
    expect(getBet5Guide({ status: 'ACTIVE', bet5Event: { status: 'FINALIZED' } })).toBeNull();
  });

  it('開催中に BET5 が受付中なら締切を案内する', () => {
    expect(getBet5Guide({ status: 'ACTIVE', bet5Event: { status: 'SCHEDULED' } })).toBe('close');
    expect(getBet5Guide({ status: 'SCHEDULED', bet5Event: { status: 'SCHEDULED' } })).toBeNull();
  });

  it('BET5 締切後は対象 5 レースがすべて払戻確定してから払戻を案内する', () => {
    const allDone = {
      status: 'CLOSED',
      race1: finished,
      race2: finished,
      race3: finished,
      race4: finished,
      race5: finished,
    };
    expect(getBet5Guide({ status: 'ACTIVE', bet5Event: allDone })).toBe('payout');
    expect(getBet5Guide({ status: 'ACTIVE', bet5Event: { ...allDone, race5: running } })).toBeNull();
  });
});
