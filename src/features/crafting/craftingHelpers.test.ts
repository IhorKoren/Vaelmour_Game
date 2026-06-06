import { describe, expect, test } from 'vitest';
import {
  getCraftingBlockedReason,
  getDisplayRecipeUnlockMethod,
  getDisplayRecipeUnlockSource,
  getSafeVisibleRecipes
} from './craftingHelpers';
import type { HeroState, Recipe } from '../../game/types';

describe('craftingHelpers tests', () => {
  const dummyHero: HeroState = {
    id: 'player',
    name: 'Test Hero',
    level: 5,
    xp: 0,
    gold: 50,
    knownRecipeIds: ['recipe_weapon_blade_lvl_01'],
    inventory: [
      { itemId: 'MAT_001', qty: 10 },
      { itemId: 'MAT_002', qty: 2 }
    ],
    baseHp: 100,
    currentHp: 100,
    maxHp: 100,
    stats: { strength: 5, vitality: 5, agility: 5 },
    unspentStatPoints: 0,
    equippedWeaponId: 'weapon_blade_lvl_01',
    equippedArmorId: 'chest_armor_lvl_01',
    equipment: {
      weapon: 'weapon_blade_lvl_01',
      shield: 'shield_guard_lvl_01',
      head: 'head_helmet_lvl_01',
      chest: 'chest_armor_lvl_01',
      hands: 'hands_gloves_lvl_01',
      legs: 'legs_pants_lvl_01',
      feet: 'feet_boots_lvl_01',
      ring1: null,
      ring2: null,
      amulet: null
    },
    equipmentDurability: {},
    equipmentAffixes: {},
    equippedGeneratedItems: {},
    defeatedBossIds: [],
    quests: []
  };

  const starterRecipe: Recipe = {
    id: 'recipe_weapon_blade_lvl_01',
    result: 'weapon_blade_lvl_01',
    name: 'Blade',
    requiredLevel: 1,
    goldCost: 10,
    materials: [{ id: 'MAT_001', qty: 5 }],
    tier: 1,
    rarity: 'common',
    successChance: 1,
    station: 'forge',
    itemType: 'weapon',
    outputEffect: ''
  };

  test('should return null when crafting is possible', () => {
    const known = new Set(['recipe_weapon_blade_lvl_01']);
    const blocked = getCraftingBlockedReason(starterRecipe, dummyHero, known);
    expect(blocked).toBeNull();
  });

  test('should return RECIPE_NOT_LEARNED if not in known recipes', () => {
    const known = new Set<string>();
    const blocked = getCraftingBlockedReason(starterRecipe, dummyHero, known);
    expect(blocked?.reason).toBe('RECIPE_NOT_LEARNED');
    expect(blocked?.text).toContain('Креслення не вивчено');
  });

  test('should return LEVEL_TOO_LOW if player level is low', () => {
    const highLevelRecipe: Recipe = {
      ...starterRecipe,
      requiredLevel: 10
    };
    const known = new Set(['recipe_weapon_blade_lvl_01']);
    const blocked = getCraftingBlockedReason(highLevelRecipe, dummyHero, known);
    expect(blocked?.reason).toBe('LEVEL_TOO_LOW');
    expect(blocked?.text).toContain('Рівень героя занизький');
  });

  test('should return NOT_ENOUGH_GOLD if gold is insufficient', () => {
    const expensiveRecipe: Recipe = {
      ...starterRecipe,
      goldCost: 100
    };
    const known = new Set(['recipe_weapon_blade_lvl_01']);
    const blocked = getCraftingBlockedReason(expensiveRecipe, dummyHero, known);
    expect(blocked?.reason).toBe('NOT_ENOUGH_GOLD');
    expect(blocked?.text).toContain('Недостатньо золота');
  });

  test('should return MISSING_MATERIALS if materials are insufficient', () => {
    const resourceHeavyRecipe: Recipe = {
      ...starterRecipe,
      materials: [{ id: 'MAT_001', qty: 50 }]
    };
    const known = new Set(['recipe_weapon_blade_lvl_01']);
    const blocked = getCraftingBlockedReason(resourceHeavyRecipe, dummyHero, known);
    expect(blocked?.reason).toBe('MISSING_MATERIALS');
    expect(blocked?.text).toContain('Недостатньо матеріалів');
  });

  test('should translate unlock methods correctly', () => {
    expect(getDisplayRecipeUnlockMethod('recipe_weapon_blade_lvl_01')).toBe('Стартовий рецепт');
    expect(getDisplayRecipeUnlockMethod('recipe_ring_band_lvl_01')).toBe('Звичайний дроп');
  });

  test('should format recipe unlock source descriptions', () => {
    expect(getDisplayRecipeUnlockSource('recipe_weapon_blade_lvl_01')).toBe('Доступний від початку');
    expect(getDisplayRecipeUnlockSource('recipe_ring_band_lvl_01')).toContain('Околиці Розбитої дороги');
  });

  test('getSafeVisibleRecipes logic filters out far-progression recipes', () => {
    const recipes: Recipe[] = [
      { ...starterRecipe, id: 'recipe_a', requiredLevel: 1 }, // Level 1
      { ...starterRecipe, id: 'recipe_b', requiredLevel: 8 }, // Level 8 (Locked, hero level 5 + 3 = 8, visible)
      { ...starterRecipe, id: 'recipe_c', requiredLevel: 9 }  // Level 9 (Locked, too high, hidden)
    ];
    const known = new Set(['recipe_a']);
    const visible = getSafeVisibleRecipes(recipes, known, 5);
    expect(visible.map(r => r.id)).toEqual(['recipe_a', 'recipe_b']);
  });
});
