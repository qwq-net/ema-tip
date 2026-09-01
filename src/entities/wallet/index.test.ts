import { describe, expect, it } from 'vitest';
import { calculateNetBalance, isEligibleForLoan } from './index';

describe('Loan Logic', () => {
  describe('isEligibleForLoan', () => {
    const distributeAmount = 10000;

    it('残高が分配額の60%の閾値未満かつ未ローンの場合、trueを返すこと', () => {
      expect(isEligibleForLoan(5999, distributeAmount, false)).toBe(true);
      expect(isEligibleForLoan(0, distributeAmount, false)).toBe(true);
    });

    it('残高が閾値以上の場合、falseを返すこと', () => {
      expect(isEligibleForLoan(6000, distributeAmount, false)).toBe(false);
      expect(isEligibleForLoan(10000, distributeAmount, false)).toBe(false);
    });

    it('既にローン済みの場合、残高に関わらずfalseを返すこと', () => {
      expect(isEligibleForLoan(1000, distributeAmount, true)).toBe(false);
      expect(isEligibleForLoan(7000, distributeAmount, true)).toBe(false);
    });
  });

  describe('calculateNetBalance', () => {
    it('残高からローン総額を引いた値を計算すること', () => {
      expect(calculateNetBalance(5000, 10000)).toBe(-5000);
      expect(calculateNetBalance(20000, 10000)).toBe(10000);
      expect(calculateNetBalance(10000, 0)).toBe(10000);
    });
  });
});
