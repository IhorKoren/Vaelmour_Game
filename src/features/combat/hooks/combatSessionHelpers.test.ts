import { describe, expect, it } from 'vitest';

export function isHeroHpTooLow(currentHp: number, maxHp: number): boolean {
  if (maxHp <= 0) return true;
  return currentHp < maxHp * 0.20;
}

export function isSessionActive(localId: number, activeId: number): boolean {
  return localId === activeId;
}

describe('Combat Session Helpers', () => {
  describe('isHeroHpTooLow', () => {
    it('returns true if HP is below 20%', () => {
      expect(isHeroHpTooLow(19, 100)).toBe(true);
      expect(isHeroHpTooLow(1, 100)).toBe(true);
      expect(isHeroHpTooLow(0, 100)).toBe(true);
    });

    it('returns false if HP is 20% or above', () => {
      expect(isHeroHpTooLow(20, 100)).toBe(false);
      expect(isHeroHpTooLow(50, 100)).toBe(false);
      expect(isHeroHpTooLow(100, 100)).toBe(false);
    });

    it('handles zero or negative maxHp safely', () => {
      expect(isHeroHpTooLow(10, 0)).toBe(true);
      expect(isHeroHpTooLow(10, -50)).toBe(true);
    });
  });

  describe('isSessionActive', () => {
    it('returns true if session IDs match', () => {
      expect(isSessionActive(5, 5)).toBe(true);
    });

    it('returns false if session IDs do not match', () => {
      expect(isSessionActive(5, 6)).toBe(false);
    });
  });
});
