import { describe, expect, it } from 'vitest';

import { recipes } from './recipes';
import {
  getLiveRecipesForEnemy,
  getCompatibleKnownRecipeIds,
  getLiveRecipeUnlockRule,
  LIVE_RECIPE_LEVEL_STEPS,
  LIVE_RECIPE_UNLOCK_RULES,
  rollLiveRecipeUnlock,
  STARTER_RECIPE_IDS,
} from './recipeDropSources';
import { curatedCraftingQuests } from './quests';

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

    expect(compatibleIds.has('recipe_weapon_blade_lvl_03')).toBe(true);
    expect(compatibleIds.has('REC_001')).toBe(true);
    expect(compatibleIds.has('REC_RING_NEW_003')).toBe(true);
  });

  it('rolls a live recipe unlock only when the source and chance match', () => {
    const result = rollLiveRecipeUnlock('Thorn Rot Hound', 'LOC_001', ['recipe_weapon_blade_lvl_03'], {}, 0.01, 0.0);
    const blockedByChance = rollLiveRecipeUnlock('Thorn Rot Hound', 'LOC_001', ['recipe_weapon_blade_lvl_03'], {}, 0.99, 0.0);
    const blockedByKnown = rollLiveRecipeUnlock('Thorn Rot Hound', 'LOC_001', ['recipe_weapon_blade_lvl_03', 'recipe_shield_guard_lvl_03'], {}, 0.01, 0.0);

    expect(result.learnedRecipe?.id).toBe('recipe_shield_guard_lvl_03');
    expect(blockedByChance.learnedRecipe).toBeNull();
    expect(blockedByKnown.learnedRecipe?.id).not.toBe('recipe_shield_guard_lvl_03');
  });

  it('increases recipe pity on failure and resets pity on unlock', () => {
    // Let's check pity increment on fail
    const pityBefore: Record<string, number> = {};
    const resultFail = rollLiveRecipeUnlock('Thorn Rot Hound', 'LOC_001', ['recipe_weapon_blade_lvl_03'], pityBefore, 0.99);
    expect(resultFail.learnedRecipe).toBeNull();
    expect(resultFail.updatedPity['LOC_001_LEVEL_3_RECIPE_POOL']).toBe(1);

    // Let's check pity increases the chance
    // With 3 failed attempts, pool pity is 3. effectiveChance = 25.0 (base) + 3 * 5 = 40.0%
    const pityHigh = { LOC_001_LEVEL_3_RECIPE_POOL: 3 };
    // randomValue 0.35 (35%) is > base 25.0% but <= effective 40.0%
    const resultSuccess = rollLiveRecipeUnlock('Thorn Rot Hound', 'LOC_001', ['recipe_weapon_blade_lvl_03'], pityHigh, 0.35, 0.0);
    expect(resultSuccess.learnedRecipe?.id).toBe('recipe_shield_guard_lvl_03');
    expect(resultSuccess.updatedPity['LOC_001_LEVEL_3_RECIPE_POOL']).toBe(0);
  });

  it('excludes starter recipe IDs from compatible known recipe list', () => {
    const compatibleIds = getCompatibleKnownRecipeIds();
    for (const starterId of STARTER_RECIPE_IDS) {
      expect(compatibleIds).not.toContain(starterId);
    }
  });

  it('keeps Ring Level 1 and Amulet Level 1 active', () => {
    expect(STARTER_RECIPE_IDS).not.toContain('recipe_ring_band_lvl_01');
    expect(STARTER_RECIPE_IDS).not.toContain('recipe_amulet_charm_lvl_01');
    
    const compatibleIds = getCompatibleKnownRecipeIds();
    expect(compatibleIds).toContain('recipe_ring_band_lvl_01');
    expect(compatibleIds).toContain('recipe_amulet_charm_lvl_01');
  });

  it('guarantees no live recipe progression has unlockType boss', () => {
    for (const rule of LIVE_RECIPE_UNLOCK_RULES) {
      expect(rule.unlockType).not.toBe('boss');
    }
  });

  it('guarantees every drop/elite live recipe can unlock without defeated boss progress', () => {
    for (const rule of LIVE_RECIPE_UNLOCK_RULES) {
      if (rule.unlockType === 'starter' || rule.unlockType === 'quest') {
        continue;
      }

      const eligibleRecipes = getLiveRecipesForEnemy(rule.locationId, rule.enemyNames[0]);

      expect(eligibleRecipes.map((candidate) => candidate.recipeId)).toContain(rule.recipeId);
    }
  });

  it('guarantees every active level 3 live equipment recipe has a LOC_001 non-boss unlock path', () => {
    const lvl3Rules = LIVE_RECIPE_UNLOCK_RULES.filter((rule) => rule.level === 3);
    expect(lvl3Rules.length).toBe(9); // weapon, shield, head, chest, hands, legs, feet, ring, amulet
    for (const rule of lvl3Rules) {
      expect(rule.locationId).toBe('LOC_001');
      expect(rule.unlockType).toBe('drop');
      expect(rule.enemyNames).toContain('Thorn Rot Hound');
      expect(rule.enemyNames).toContain('Blackfang Brigand');
    }
  });

  it('guarantees level 3 feet recipe is included in LOC_001 drops', () => {
    const feetRule = LIVE_RECIPE_UNLOCK_RULES.find((rule) => rule.recipeId === 'recipe_feet_boots_lvl_03');
    expect(feetRule).toBeDefined();
    expect(feetRule?.locationId).toBe('LOC_001');
    expect(feetRule?.unlockType).toBe('drop');
  });

  it('guarantees no level 6+ recipes are moved into LOC_001', () => {
    const loc1Rules = LIVE_RECIPE_UNLOCK_RULES.filter((rule) => rule.locationId === 'LOC_001');
    for (const rule of loc1Rules) {
      expect(rule.level).toBeLessThan(6);
    }
  });

  it('guarantees early quests reward correct recipes', () => {
    const quest1 = curatedCraftingQuests.find((q) => q.id === 'quest_crafting_01');
    const quest2 = curatedCraftingQuests.find((q) => q.id === 'quest_crafting_02');
    expect(quest1).toBeDefined();
    expect(quest2).toBeDefined();
    expect(quest1!.rewards.recipeIds).toContain('recipe_weapon_blade_lvl_03');
    expect(quest2!.rewards.recipeIds).toContain('recipe_feet_boots_lvl_03');
  });

  it('proves LOC_001 level 3 pool selects a different recipe when poolSelectorRandom varies', () => {
    // With known = ['recipe_weapon_blade_lvl_03']
    // Index 0 -> recipe_shield_guard_lvl_03
    // We can pick other indices by passing different selector values.
    // Length is 8 (9 total level 3 recipes minus weapon)
    const result0 = rollLiveRecipeUnlock('Thorn Rot Hound', 'LOC_001', ['recipe_weapon_blade_lvl_03'], {}, 0.01, 0.0);
    const resultEnd = rollLiveRecipeUnlock('Thorn Rot Hound', 'LOC_001', ['recipe_weapon_blade_lvl_03'], {}, 0.01, 0.999);

    expect(result0.learnedRecipe).toBeDefined();
    expect(resultEnd.learnedRecipe).toBeDefined();
    expect(result0.learnedRecipe?.id).not.toBe(resultEnd.learnedRecipe?.id);
  });

  it('guarantees LOC_001 level 3 pool unlock on the 6th attempt (after 5 failures)', () => {
    const pity = { LOC_001_LEVEL_3_RECIPE_POOL: 5 };
    // Even with randomValue = 0.99 (99%), it must unlock since effectiveChance is 100%
    const result = rollLiveRecipeUnlock('Thorn Rot Hound', 'LOC_001', [], pity, 0.99);

    expect(result.learnedRecipe).toBeDefined();
    expect(result.updatedPity['LOC_001_LEVEL_3_RECIPE_POOL']).toBe(0);
  });

  it('excludes known recipes from the LOC_001 level 3 pool', () => {
    // If all level 3 recipes are known, it shouldn't unlock any level 3 recipes
    const allLvl3Ids = LIVE_RECIPE_UNLOCK_RULES.filter((rule) => rule.level === 3).map((rule) => rule.recipeId);
    const result = rollLiveRecipeUnlock('Thorn Rot Hound', 'LOC_001', allLvl3Ids, {}, 0.01);

    expect(result.learnedRecipe).toBeNull();
  });

  it('proves level 6+ recipes are not affected by LOC_001 level 3 pool pity key', () => {
    // Roll level 6 recipe in LOC_003 (Raider Camp) from Blood Raider
    const pityBefore = { LOC_001_LEVEL_3_RECIPE_POOL: 4 };
    const result = rollLiveRecipeUnlock('Blood Raider', 'LOC_003', [], pityBefore, 0.99);

    // It should not increment the pool pity key
    expect(result.updatedPity['LOC_001_LEVEL_3_RECIPE_POOL']).toBe(4);
    // It should increment individual pity keys for eligible level 6 rules
    const lvl6Rule = LIVE_RECIPE_UNLOCK_RULES.find((rule) => rule.recipeId === 'recipe_chest_armor_lvl_06');
    expect(lvl6Rule).toBeDefined();
    expect(result.updatedPity['recipe_chest_armor_lvl_06']).toBe(1);
  });
});
