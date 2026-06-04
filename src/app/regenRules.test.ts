import { describe, expect, it } from 'vitest';

import { shouldApplyPassiveHealthRegen } from './regenRules';

describe('shouldApplyPassiveHealthRegen', () => {
  it('blocks passive regen during active combat', () => {
    expect(
      shouldApplyPassiveHealthRegen({
        currentHp: 40,
        maxHp: 100,
        healthRegen: 5,
        isFighting: true,
      }),
    ).toBe(false);
  });

  it('allows passive regen outside combat when the hero is injured', () => {
    expect(
      shouldApplyPassiveHealthRegen({
        currentHp: 40,
        maxHp: 100,
        healthRegen: 5,
        isFighting: false,
      }),
    ).toBe(true);
  });
});
