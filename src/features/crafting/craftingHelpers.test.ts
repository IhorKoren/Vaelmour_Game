import { describe, expect, test } from 'vitest';
import {
  getCraftingBlockedReason,
  getDisplayRecipeUnlockMethod,
  getDisplayRecipeUnlockSource,
  getSafeVisibleRecipes,
  getRecipeStatChips,
  resolveCraftResult,
  executeCraftTransaction,
  rollCraftRarity
} from './craftingHelpers';
import type { HeroState, Recipe } from '../../game/types';
import { getMaterialDisplaySourceHint } from '../../data/materialTaxonomy';
import { weapons } from '../../data/weapons';

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
    // Note: since recipe_weapon_blade_lvl_01 is a starter recipe, we need to test with a non-starter recipe for success
    const nonStarterRecipe: Recipe = {
      ...starterRecipe,
      id: 'recipe_ring_band_lvl_01',
      result: 'ring_band_lvl_01'
    };
    const known = new Set(['recipe_ring_band_lvl_01']);
    const blocked = getCraftingBlockedReason(nonStarterRecipe, dummyHero, known);
    expect(blocked).toBeNull();
  });

  test('should return RECIPE_NOT_LEARNED if not in known recipes', () => {
    const nonStarterRecipe: Recipe = {
      ...starterRecipe,
      id: 'recipe_ring_band_lvl_01',
      result: 'ring_band_lvl_01'
    };
    const known = new Set<string>();
    const blocked = getCraftingBlockedReason(nonStarterRecipe, dummyHero, known);
    expect(blocked?.reason).toBe('RECIPE_NOT_LEARNED');
    expect(blocked?.text).toContain(getDisplayRecipeUnlockSource(nonStarterRecipe.id));
  });

  test('should return LEVEL_TOO_LOW if player level is low', () => {
    const highLevelRecipe: Recipe = {
      ...starterRecipe,
      id: 'recipe_ring_band_lvl_01',
      result: 'ring_band_lvl_01',
      requiredLevel: 10
    };
    const known = new Set(['recipe_ring_band_lvl_01']);
    const blocked = getCraftingBlockedReason(highLevelRecipe, dummyHero, known);
    expect(blocked?.reason).toBe('LEVEL_TOO_LOW');
    expect(blocked?.text).toContain('10');
  });

  test('should return NOT_ENOUGH_GOLD if gold is insufficient', () => {
    const expensiveRecipe: Recipe = {
      ...starterRecipe,
      id: 'recipe_ring_band_lvl_01',
      result: 'ring_band_lvl_01',
      goldCost: 100
    };
    const known = new Set(['recipe_ring_band_lvl_01']);
    const blocked = getCraftingBlockedReason(expensiveRecipe, dummyHero, known);
    expect(blocked?.reason).toBe('NOT_ENOUGH_GOLD');
    expect(blocked?.text).toContain('100');
  });

  test('should return MISSING_MATERIALS if materials are insufficient', () => {
    const resourceHeavyRecipe: Recipe = {
      ...starterRecipe,
      id: 'recipe_ring_band_lvl_01',
      result: 'ring_band_lvl_01',
      materials: [{ id: 'MAT_001', qty: 50 }]
    };
    const known = new Set(['recipe_ring_band_lvl_01']);
    const blocked = getCraftingBlockedReason(resourceHeavyRecipe, dummyHero, known);
    expect(blocked?.reason).toBe('MISSING_MATERIALS');
    expect(blocked?.text).toContain(getMaterialDisplaySourceHint('MAT_001'));
  });

  test('should translate unlock methods correctly', () => {
    expect(getDisplayRecipeUnlockMethod('recipe_weapon_blade_lvl_01')).toBeTruthy();
    expect(getDisplayRecipeUnlockMethod('recipe_ring_band_lvl_01')).toBeTruthy();
  });

  test('should format recipe unlock source descriptions', () => {
    expect(getDisplayRecipeUnlockSource('recipe_weapon_blade_lvl_01')).toBeTruthy();
    expect(getDisplayRecipeUnlockSource('recipe_ring_band_lvl_01')).toContain('Broken Shield Guard');
  });

  test('getSafeVisibleRecipes logic filters out starter recipes and far-progression recipes', () => {
    const recipes: Recipe[] = [
      { ...starterRecipe, id: 'recipe_weapon_blade_lvl_01', requiredLevel: 1 }, // Starter Level 1 -> Filtered out
      { ...starterRecipe, id: 'recipe_ring_band_lvl_01', requiredLevel: 1 },    // Level 1 Ring -> NOT starter -> visible
      { ...starterRecipe, id: 'recipe_ring_band_lvl_03', requiredLevel: 3 },    // Level 3 Ring -> visible (locked)
      { ...starterRecipe, id: 'recipe_ring_band_lvl_15', requiredLevel: 15 }    // Level 15 Ring -> too high -> hidden
    ];
    const known = new Set(['recipe_ring_band_lvl_01']);
    const visible = getSafeVisibleRecipes(recipes, known, 5);
    expect(visible.map(r => r.id)).toEqual(['recipe_ring_band_lvl_01', 'recipe_ring_band_lvl_03']);
  });

  test('debug resolveCraftResult', () => {
    const res = resolveCraftResult('ring_band_lvl_01');
    console.log('DEBUG:', res);
    
    // Check resolveItemDefinitionByIdOrName results
    const weaponsList = weapons;
    const normalized = 'ring band lvl 01';
    weaponsList.forEach(item => {
      const normId = item.id.toLowerCase().replace(/[РІР‚в„ў']/g, "'").replace(/[^a-z0-9]+/g, ' ').trim();
      const normName = item.name.toLowerCase().replace(/[РІР‚в„ў']/g, "'").replace(/[^a-z0-9]+/g, ' ').trim();
      const matchId = normId === normalized;
      const matchName = normName === normalized;
      const matchNameInc = normName.includes(normalized);
      const matchNameIncRev = normalized.includes(normName);
      if (matchId || matchName || matchNameInc || matchNameIncRev) {
        console.log(`MATCHED WEAPON: id=${item.id}, name=${item.name}, normId=${normId}, normName=${normName}, matchId=${matchId}, matchName=${matchName}, matchNameInc=${matchNameInc}, matchNameIncRev=${matchNameIncRev}`);
      }
    });
  });

  test('getRecipeStatChips includes damage/speed for weapons and excludes them for non-weapons', () => {
    const weaponChips = getRecipeStatChips(starterRecipe);
    expect(weaponChips.length).toBeGreaterThan(2);
    expect(weaponChips.some(c => c.value.includes('-'))).toBe(true);

    const ringRecipe: Recipe = {
      ...starterRecipe,
      id: 'recipe_ring_band_lvl_01',
      result: 'ring_band_lvl_01',
      itemType: 'ring'
    };
    const ringChips = getRecipeStatChips(ringRecipe);
    expect(ringChips.length).toBeLessThan(weaponChips.length);
    expect(ringChips.some(c => c.value.includes('-'))).toBe(false);
    expect(ringChips.some(c => c.value === 'weapon')).toBe(false);
  });

  test('executeCraftTransaction successfully crafts an item and rolls generated stats', () => {
    const recipe: Recipe = {
      id: 'recipe_ring_band_lvl_01',
      result: 'ring_band_lvl_01',
      name: 'Ring Blueprint',
      requiredLevel: 1,
      goldCost: 10,
      materials: [{ id: 'MAT_001', qty: 2 }],
      tier: 1,
      rarity: 'common',
      successChance: 1,
      station: 'forge',
      itemType: 'ring',
      outputEffect: ''
    };

    const hero: HeroState = {
      ...dummyHero,
      knownRecipeIds: ['recipe_ring_band_lvl_01'],
      gold: 50,
      inventory: [
        { itemId: 'MAT_001', qty: 10 }
      ]
    };

    const result = executeCraftTransaction(recipe, hero, () => true, () => 0.9);
    expect(result.success).toBe(true);
    expect(result.hero.gold).toBe(40);
    
    // Mat MAT_001 should be reduced to 8
    const matStack = result.hero.inventory.find(s => s.itemId === 'MAT_001');
    expect(matStack?.qty).toBe(8);

    // Should contain a generated equipment item stack
    const itemStack = result.hero.inventory.find(s => s.itemId.startsWith('generated_'));
    expect(itemStack).toBeDefined();
    expect(itemStack?.qty).toBe(1);
    expect(itemStack?.generatedItem).toBeDefined();
    expect(itemStack?.generatedItem?.rarity).toBe('common');
    expect(itemStack?.generatedItem?.level).toBe(1);
    expect(itemStack?.generatedItem?.slot).toBe('ring1');
  });

  test('executeCraftTransaction consumes materials and gold on failure without creating item', () => {
    const recipe: Recipe = {
      id: 'recipe_ring_band_lvl_01',
      result: 'ring_band_lvl_01',
      name: 'Ring Blueprint',
      requiredLevel: 1,
      goldCost: 10,
      materials: [{ id: 'MAT_001', qty: 2 }],
      tier: 1,
      rarity: 'common',
      successChance: 1,
      station: 'forge',
      itemType: 'ring',
      outputEffect: ''
    };

    const hero: HeroState = {
      ...dummyHero,
      knownRecipeIds: ['recipe_ring_band_lvl_01'],
      gold: 50,
      inventory: [
        { itemId: 'MAT_001', qty: 10 }
      ]
    };

    const result = executeCraftTransaction(recipe, hero, () => false);
    expect(result.success).toBe(false);
    expect(result.hero.gold).toBe(40);
    
    // Mat MAT_001 should be reduced to 8
    const matStack = result.hero.inventory.find(s => s.itemId === 'MAT_001');
    expect(matStack?.qty).toBe(8);

    // Should NOT contain a generated item
    const itemStack = result.hero.inventory.find(s => s.itemId.startsWith('generated_'));
    expect(itemStack).toBeUndefined();
  });

  test('rollCraftRarity rolls correct rarities under default and improved conditions', () => {
    const normalRecipe: Recipe = {
      id: 'recipe_shield_guard_lvl_03',
      result: 'shield_guard_lvl_03',
      name: 'Shield',
      requiredLevel: 3,
      goldCost: 10,
      materials: [{ id: 'MAT_001', qty: 2 }], // Torn Cloth (common)
      tier: 1,
      station: 'forge',
      successChance: 1.0
    };

    const catalystRecipe: Recipe = {
      id: 'recipe_shield_guard_lvl_12',
      result: 'shield_guard_lvl_12',
      name: 'Shield',
      requiredLevel: 12,
      goldCost: 20,
      materials: [{ id: 'MAT_011', qty: 1 }], // Blood Ash (rare catalyst)
      tier: 2,
      station: 'forge',
      successChance: 1.0
    };

    // Default Rarity Table Rolls (normalRecipe):
    // roll < 2 -> epic, roll < 10 -> rare, roll < 35 -> uncommon, otherwise common
    expect(rollCraftRarity(normalRecipe, () => 0.01)).toBe('epic');
    expect(rollCraftRarity(normalRecipe, () => 0.05)).toBe('rare');
    expect(rollCraftRarity(normalRecipe, () => 0.20)).toBe('uncommon');
    expect(rollCraftRarity(normalRecipe, () => 0.50)).toBe('common');

    // Improved Rarity Table Rolls (catalystRecipe):
    // roll < 5 -> epic, roll < 20 -> rare, roll < 55 -> uncommon, otherwise common
    expect(rollCraftRarity(catalystRecipe, () => 0.04)).toBe('epic');
    expect(rollCraftRarity(catalystRecipe, () => 0.10)).toBe('rare');
    expect(rollCraftRarity(catalystRecipe, () => 0.40)).toBe('uncommon');
    expect(rollCraftRarity(catalystRecipe, () => 0.70)).toBe('common');
  });
});


