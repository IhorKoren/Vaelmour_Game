import { describe, expect, it } from 'vitest';

import { applyCoinsDelta, clampAdminCoins, MAX_ADMIN_TEST_COINS, resetCoinsValue } from './adminCoinsEditor';

describe('admin test coins editor helpers', () => {
  it('applies quick button deltas to editor state values', () => {
    expect(applyCoinsDelta('0', 10)).toBe('10');
    expect(applyCoinsDelta('10', 100)).toBe('110');
    expect(applyCoinsDelta('999', 1000)).toBe('1999');
  });

  it('resets coins to zero', () => {
    expect(resetCoinsValue()).toBe('0');
  });

  it('clamps coins to the supported admin test range', () => {
    expect(clampAdminCoins(-999)).toBe(0);
    expect(clampAdminCoins(12.9)).toBe(12);
    expect(clampAdminCoins(MAX_ADMIN_TEST_COINS + 123)).toBe(MAX_ADMIN_TEST_COINS);
  });
});
