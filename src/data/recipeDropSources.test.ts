import { describe, expect, it } from 'vitest';

import { recipes } from './recipes';
import {
  getCompatibleKnownRecipeIds,
  getLiveRecipeUnlockRule,
  LIVE_RECIPE_LEVEL_STEPS,
  LIVE_RECIPE_UNLOCK_RULES,
  rollLiveRecipeUnlock,
  STARTER_RECIPE_IDS,
} from './recipeDropSources';

describe('recipe unlock sources', () => {
  it('covers every live recipe with exactly one unlock rule', () => {
    const liveRecipeIds = new Set(recipes.map((recipe) => recipe.id));
    const unlockRuleIds = LIVE_RECIPE_UNLOCK_RULES.map((rule) => rule.recipeId);

    expect(unlockRuleIds).toHaveLength(recipes.length);
    expect(new Set(unlockRuleIds)).toEqual(liveRecipeIds);
  });

  it('keeps only seven core slot recipes as starters', () => {
    expect(STARTER_RECIPE_IDS).toHaveLength(7);
    expect(STARTER_RECIPE_IDS).not.toContain('recipe_ring_band_lvl_01');
    expect(STARTER_RECIPE_IDS).not.toContain('recipe_amulet_charm_lvl_01');

    for (const recipeId of STARTER_RECIPE_IDS) {
      const unlockRule = getLiveRecipeUnlockRule(recipeId);

      expect(unlockRule).not.toBeNull();
      expect(unlockRule?.unlockType).toBe('starter');
      expect(unlockRule?.chancePercent).toBe(0);
    }
  });

  it('covers every level step for every live crafting slot', () => {
    const slotCoverage = new Map<string, number[]>();

    for (const rule of LIVE_RECIPE_UNLOCK_RULES) {
      const levels = slotCoverage.get(rule.slot) ?? [];
      levels.push(rule.level);
      slotCoverage.set(rule.slot, levels);
    }

    expect(slotCoverage.size).toBe(9);
    for (const levels of slotCoverage.values()) {
      expect(new Set(levels)).toEqual(new Set(LIVE_RECIPE_LEVEL_STEPS));
    }
  });

  it('preserves compatibility for legacy generated recipe ids', () => {
    const compatibleIds = new Set(getCompatibleKnownRecipeIds());

    expect(compatibleIds.has('recipe_weapon_blade_lvl_01')).toBe(true);
    expect(compatibleIds.has('REC_001')).toBe(true);
    expect(compatibleIds.has('REC_RING_NEW_003')).toBe(true);
  });

  it('rolls a live recipe unlock only when the source and chance match', () => {
    const unlock = rollLiveRecipeUnlock('Young Wolf', 'LOC_002', [], 0.01);
    const blockedByChance = rollLiveRecipeUnlock('Young Wolf', 'LOC_002', [], 0.99);
    const blockedByKnown = rollLiveRecipeUnlock('Young Wolf', 'LOC_002', ['recipe_weapon_blade_lvl_03'], 0.01);

    expect(unlock?.id).toBe('recipe_weapon_blade_lvl_03');
    expect(blockedByChance).toBeNull();
    expect(blockedByKnown?.id).not.toBe('recipe_weapon_blade_lvl_03');
  });
});
