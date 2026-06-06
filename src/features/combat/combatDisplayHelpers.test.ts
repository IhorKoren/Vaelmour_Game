import { describe, expect, it } from 'vitest';
import { isHeroHpTooLow, getHpPercent } from './combatDisplayHelpers';

describe('Combat Display Helpers', () => {
  describe('isHeroHpTooLow', () => {
    it('returns true if HP is below 20%', () => {
      expect(isHeroHpTooLow(19, 100)).toBe(true);
      expect(isHeroHpTooLow(5, 100)).toBe(true);
    });

    it('returns false if HP is 20% or above', () => {
      expect(isHeroHpTooLow(20, 100)).toBe(false);
      expect(isHeroHpTooLow(50, 100)).toBe(false);
    });

    it('handles boundary conditions safely', () => {
      expect(isHeroHpTooLow(0, 100)).toBe(true);
      expect(isHeroHpTooLow(10, 0)).toBe(true);
    });
  });

  describe('getHpPercent', () => {
    it('calculates HP percentage correctly', () => {
      expect(getHpPercent(50, 100)).toBe(50);
      expect(getHpPercent(3, 10)).toBe(30);
      expect(getHpPercent(1, 3)).toBe(33);
    });

    it('handles division by zero safely', () => {
      expect(getHpPercent(10, 0)).toBe(0);
      expect(getHpPercent(10, -10)).toBe(0);
    });
  });
});
