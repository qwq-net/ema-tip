import { describe, expect, it } from 'vitest';
import { getEventNextStep } from './event-next-step';

const ready = { status: 'SCHEDULED', entrantCount: 8 };
const empty = { status: 'SCHEDULED', entrantCount: 0 };
const done = { status: 'FINALIZED', entrantCount: 8 };

describe('getEventNextStep', () => {
  it('レースがなければ何も促さないこと', () => {
    expect(getEventNextStep('SCHEDULED', [])).toBeNull();
  });

  it('準備中で全レースに出走馬が揃えば開始を促し、1 件でも空なら促さないこと', () => {
    expect(getEventNextStep('SCHEDULED', [ready, ready])).toBe('start');
    expect(getEventNextStep('SCHEDULED', [ready, empty])).toBeNull();
  });

  it('開催中で全レースの払戻が確定すれば終了を促し、未確定が残れば促さないこと', () => {
    expect(getEventNextStep('ACTIVE', [done, done])).toBe('finish');
    expect(getEventNextStep('ACTIVE', [done, ready])).toBeNull();
  });

  it('終了済みは何も促さないこと', () => {
    expect(getEventNextStep('COMPLETED', [done])).toBeNull();
  });
});
