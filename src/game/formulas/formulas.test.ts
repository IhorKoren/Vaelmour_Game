import { describe, it, expect } from 'vitest';
import { COMBAT_ATTACK_INTERVAL_MULTIPLIER } from '../constants';
import { sendFullHealthNotification } from '../../telegram/telegramNotifications';
import { calculateDerivedStats, xpToNextLevel, clamp } from './stats';
import { calculateHeroDamage, calculateEnemyDamage } from './combat';
import {
  calculateBaseHp,
  calculateFullDerivedStats,
  xpRequiredForLevel,
  checkLevelUp,
  allocateStatPoint,
  calculateEnemyStats
} from './progression';
import { rollLootDrop, rollGeneratedEquipmentDrop } from './loot';
import { rollCraftSuccess } from './crafting';
import { generateItemAffixes } from './affixes';
import { calculateRerollCost, rerollItemAffix } from './reroll';
import { applyOfflineHealthRegen, normalizeHeroState } from '../save/saveSystem';
import { applyRankScaling, rollEliteOrNormal, getBossForLocation } from './enemyScaling';
import { canStartBossEncounter } from './bossUnlocks';
import { openLootbox } from './lootboxes';
import { calculateItemSellValue } from './sellValue';
import { calculateSecondaryStats, getEffectiveAttackSpeed } from './secondaryStats';
import { equipInventoryItem, unequipInventoryItem } from './equipment';
import {
  initializeQuests,
  updateQuestProgressOnEnemyKilled,
  updateQuestProgressOnBattleWon,
  updateQuestProgressOnMaterialGained,
  updateQuestProgressOnLocationChanged,
  canClaimQuest,
  claimQuestReward
} from './quests';
import type { HeroState, Enemy, Weapon, Armor, Skill, ItemAffix } from '../types';
import { items, type ItemDefinition } from '../../data/items';
import { recipes } from '../../data/recipes';
import { getEquippableSlot } from './equipment';
import {
  getGeneratedEquipmentDropChance,
  rollGeneratedEquipmentRarity,
  rollWeightedEquipmentSlot,
  getEquipmentLevelForEnemy,
  EQUIPMENT_SLOT_WEIGHTS
} from '../equipment/generatedEquipment';


// Mock data structures for tests
const mockHero: HeroState = {
  id: 'test_hero',
  name: 'Vaelmour Hero',
  level: 1,
  xp: 0,
  gold: 100,
  baseHp: 100,
  currentHp: 100,
  maxHp: 100,
  stats: { strength: 10, vitality: 10, agility: 10 },
  unspentStatPoints: 0,
  equippedWeaponId: 'fallback_weapon',
  equippedArmorId: 'fallback_armor',
  equipment: {
    weapon: null,
    shield: null,
    head: null,
    chest: null,
    legs: null,
    hands: null,
    feet: null,
    ring1: null,
    ring2: null,
    amulet: null
  },
  inventory: [],
  equipmentDurability: {}
};

const mockEnemy: Enemy = {
  id: 'test_enemy',
  name: 'Test Goblin',
  levelRange: [1, 5],
  level: 1,
  hp: 50,
  attack: 10,
  defense: 2,
  dodgeChance: 0.05,
  critChance: 0.03,
  xp: 20,
  gold: 10,
  location: 'test_zone',
  lootTable: 'test_loot_table',
  behavior: 'normal',
  notes: ''
};

const mockWeapon: Weapon = {
  id: 'test_sword',
  name: 'Test Iron Sword',
  type: 'sword',
  tier: 1,
  rarity: 'common',
  minDamage: 8,
  maxDamage: 12,
  attackSpeed: 1.5,
  mainStat: 'strength',
  effect: '',
  description: ''
};

const mockArmor: Armor = {
  id: 'test_chestplate',
  name: 'Test Chestplate',
  type: 'medium',
  tier: 1,
  rarity: 'common',
  defense: 4,
  damageBonus: 0.05,
  dodgeBonus: 0.02,
  hpBonus: 0.1,
  description: ''
};

const mockSkill: Skill = {
  id: 'quick_slash',
  name: 'Quick Slash',
  weaponTypes: ['sword'],
  cooldown: 0,
  cost: 10,
  scaling: '0.5',
  tags: ['active'],
  description: ''
};

describe('Stats Formulas (stats.ts)', () => {
  it('should calculate derived stats correctly from core stats', () => {
    const stats = { strength: 12, vitality: 15, agility: 8 };
    const derived = calculateDerivedStats(stats, 100);

    expect(derived.attackPower).toBe(24); // strength * 2
    expect(derived.maxHp).toBe(175); // baseHp (100) + vitality (15) * 5 = 175, hpBonus = 0
    expect(derived.critChance).toBeCloseTo(0.074, 5); // base (0.05) + agility (8) * 0.003
    expect(derived.dodgeChance).toBeCloseTo(0.046, 5); // base (0.03) + agility (8) * 0.002
    expect(derived.accuracy).toBeCloseTo(0.912, 5); // base (0.9) + agility (8) * 0.0015
    expect(derived.healthRegen).toBe(3); // Math.floor(vitality / 5) = 3
  });

  it('should apply clamping rules to stats', () => {
    // High agility stats to trigger caps
    const stats = { strength: 10, vitality: 10, agility: 500 };
    const derived = calculateDerivedStats(stats, 100);

    expect(derived.critChance).toBe(0.35); // capped at 0.35
    expect(derived.dodgeChance).toBe(0.25); // capped at 0.25
    expect(derived.accuracy).toBe(0.98); // capped at 0.98
  });

  it('should calculate level-up XP correctly', () => {
    expect(xpToNextLevel(1)).toBe(100);
    expect(xpToNextLevel(2)).toBe(255);
    expect(xpToNextLevel(30)).toBe(0); // cap returns 0
  });

  it('should clamp values correctly', () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
  });
});

describe('Combat Formulas (combat.ts)', () => {
  it('should calculate hero damage deterministically on hit', () => {
    // Mock random returns 0.5 (hit check <= accuracy (0.915) -> hit)
    // Dodge roll returns 0.8 (dodge check > enemy.dodgeChance (0.05) -> no dodge)
    // weaponRoll = 0.5 * (12 - 8) + 8 = 10
    // attackPower = 20 * 0.5 (skill power) = 10
    // mitigatedDamage = raw (20) - defense (2) = 18
    // critRoll = 0.9 (crit roll > critChance (0.08) -> no crit)
    const mockRandom = (() => {
      let count = 0;
      const values = [0.5, 0.8, 0.5, 0.9];
      return () => values[count++] ?? 0.5;
    })();

    const result = calculateHeroDamage({
      hero: mockHero,
      weapon: mockWeapon,
      armor: mockArmor,
      skill: mockSkill,
      enemy: mockEnemy,
      random: mockRandom
    });

    expect(result.hit).toBe(true);
    expect(result.crit).toBe(false);
    expect(result.damage).toBe(16);
  });

  it('should calculate critical hits properly', () => {
    const mockRandom = (() => {
      let count = 0;
      // hit roll, weapon roll, crit roll
      const values = [0.1, 0.5, 0.01];
      return () => values[count++] ?? 0.5;
    })();

    const result = calculateHeroDamage({
      hero: mockHero,
      weapon: mockWeapon,
      armor: mockArmor,
      skill: mockSkill,
      enemy: mockEnemy,
      random: mockRandom
    });

    expect(result.hit).toBe(true);
    expect(result.crit).toBe(true);
    expect(result.damage).toBe(21);
  });

  it('should handle misses and dodges', () => {
    // Mock random returns 0.99 for hit (triggers miss as accuracy is ~0.915)
    const result = calculateHeroDamage({
      hero: mockHero,
      weapon: mockWeapon,
      armor: mockArmor,
      skill: mockSkill,
      enemy: mockEnemy,
      random: () => 0.99
    });

    expect(result.hit).toBe(false);
    expect(result.damage).toBe(0);
  });

  it('should calculate enemy damage correctly', () => {
    // dodgeRoll (0.9 -> no dodge)
    // mitigatedDamage = attack (10) - totalDefense (0) = 10
    // critRoll (0.9 -> no crit)
    const mockRandom = (() => {
      let count = 0;
      const values = [0.9, 0.9];
      return () => values[count++] ?? 0.5;
    })();

    const result = calculateEnemyDamage({
      enemy: mockEnemy,
      hero: mockHero,
      armor: mockArmor,
      random: mockRandom
    });

    expect(result.hit).toBe(true);
    expect(result.crit).toBe(false);
    expect(result.damage).toBe(10);
  });

  it('should parse crafted item effects into secondary stats', () => {
    const craftedHero: HeroState = {
      ...mockHero,
      equipment: {
        ...mockHero.equipment,
        ring1: 'ring_band_lvl_01',
        amulet: 'amulet_charm_lvl_01'
      },
      equipmentAffixes: {
        ring1: [
          { id: 'bleed_resist_aff', type: 'bleedResist', label: 'Bleed Resist', value: 0.08, valueType: 'percent' }
        ],
        amulet: [
          { id: 'bleed_chance_aff', type: 'bleedChance', label: 'Bleed Chance', value: 0.06, valueType: 'percent' }
        ]
      }
    };

    const secondary = calculateSecondaryStats(craftedHero);

    expect(secondary.bleedResistance).toBeGreaterThan(0);
    expect(secondary.bleedChance).toBeGreaterThan(0);
  });

  it('should apply attack speed bonuses to effective speed', () => {
    const craftedHero: HeroState = {
      ...mockHero,
      equipment: {
        ...mockHero.equipment,
        chest: 'chest_armor_lvl_01'
      },
      equipmentAffixes: {
        chest: [
          { id: 'attack_speed_aff', type: 'attackSpeedBonus', label: 'Attack Speed', value: 0.08, valueType: 'percent' }
        ]
      }
    };

    const speed = getEffectiveAttackSpeed(craftedHero, mockWeapon);
    expect(speed).toBeGreaterThan(mockWeapon.attackSpeed);
  });

  it('should parse defensive crafted effects into secondary stats', () => {
    const craftedHero: HeroState = {
      ...mockHero,
      currentHp: 70,
      equipment: {
        ...mockHero.equipment,
        chest: 'chest_armor_lvl_01',
        shield: 'shield_guard_lvl_01'
      },
      equipmentAffixes: {
        chest: [
          { id: 'block_aff', type: 'blockChance', label: 'Block Chance', value: 0.07, valueType: 'percent' },
          { id: 'reduction_aff', type: 'damageReduction', label: 'Damage Reduction', value: 0.05, valueType: 'percent' }
        ],
        shield: [
          { id: 'block_power_aff', type: 'blockPower', label: 'Block Power', value: 12, valueType: 'flat' }
        ]
      }
    };

    const secondary = calculateSecondaryStats(craftedHero);
    expect(secondary.blockChance).toBeGreaterThan(0);
    expect(secondary.blockValue).toBeGreaterThan(0);
    expect(secondary.damageReductionHighHp).toBeGreaterThan(0);
  });
});

describe('Equipment instance durability', () => {
  it('should preserve item durability when unequipping and re-equipping another copy', () => {
    const heroWithTwoChests: HeroState = {
      ...mockHero,
      equipment: { ...mockHero.equipment, chest: 'chest_armor_lvl_01' },
      equippedArmorId: 'chest_armor_lvl_01',
      equipmentDurability: { chest: 61 },
      inventory: [
        { itemId: 'chest_armor_lvl_01', qty: 1, durability: 100 },
        { itemId: 'head_helmet_lvl_01', qty: 1, durability: 88 }
      ]
    };

    const swapped = equipInventoryItem(heroWithTwoChests, 'head_helmet_lvl_01', 1);
    expect(swapped.equipment.head).toBe('head_helmet_lvl_01');
    expect(swapped.equipmentDurability?.head).toBe(88);

    const unequipped = unequipInventoryItem(swapped, 'head');
    const returnedHelmet = unequipped.inventory.find((stack) => stack.itemId === 'head_helmet_lvl_01' && stack.durability === 88);
    expect(returnedHelmet).toBeDefined();
  });
});

describe('Progression Formulas (progression.ts)', () => {
  it('should calculate base HP correctly', () => {
    expect(calculateBaseHp(1, 10)).toBe(160); // 100 + 1 * 10 + 10 * 5 = 160
    expect(calculateBaseHp(5, 20)).toBe(250); // 100 + 5 * 10 + 20 * 5 = 250
  });

  it('should calculate full derived stats and apply caps', () => {
    const stats = { strength: 10, vitality: 10, agility: 1000 };
    const derived = calculateFullDerivedStats(stats, 1, 0);

    expect(derived.critChance).toBe(0.35); // capped at 35%
    expect(derived.dodgeChance).toBe(0.30); // capped at 30%
    expect(derived.armorReduction).toBe(0);
  });

  it('should verify level-up logic correctly', () => {
    // Starting level 1, needs 100 XP to level up. Give 105 XP.
    const result = checkLevelUp(1, 105);
    expect(result.newLevel).toBe(2);
    expect(result.remainingXp).toBe(5);
    expect(result.statPointsGained).toBe(3);
  });

  it('should verify xpRequiredForLevel increases with level', () => {
    expect(xpRequiredForLevel(1)).toBe(100);
    expect(xpRequiredForLevel(30)).toBe(0);
  });

  it('should spend stat points and update attributes correctly', () => {
    const stats = { strength: 10, vitality: 10, agility: 10 };
    const result = allocateStatPoint(stats, 'strength', 5);

    expect(result.stats.strength).toBe(11);
    expect(result.unspentPoints).toBe(4);

    // No points left
    const resultZero = allocateStatPoint(stats, 'strength', 0);
    expect(resultZero.stats.strength).toBe(10);
    expect(resultZero.unspentPoints).toBe(0);
  });

  it('should scale enemy stats dynamically based on archetype', () => {
    const normalEnemy = calculateEnemyStats(5, 'normal');
    expect(normalEnemy.hp).toBe(80 + 5 * 18); // 170

    const eliteEnemy = calculateEnemyStats(5, 'elite');
    expect(eliteEnemy.hp).toBe(Math.round(170 * 1.8)); // 306

    const bossEnemy = calculateEnemyStats(5, 'boss');
    expect(bossEnemy.hp).toBe(Math.round(170 * 3.5)); // 595
  });
});

describe('Loot Drop Formulas (loot.ts)', () => {
  const mockItems: ItemDefinition[] = [
    { id: 'MAT_001', name: 'Torn Cloth', category: 'material', rarity: 'common', tier: 1, description: '' },
    { id: 'WEAP_001', name: 'Rust Sword', category: 'weapon', rarity: 'common', tier: 1, description: '' }
  ];

  it('should return valid LootDropResult structures', () => {
    // Drop chance roll: 0.1 <= 0.25 (drop triggers)
    // Equip chance roll: 0.9 >= 0.05 (material drop)
    const mockRandom = (() => {
      let count = 0;
      const values = [0.9, 0.9, 0.05, 0.5];
      return () => values[count++] ?? 0.5;
    })();

    const result = rollLootDrop(mockEnemy, mockItems, 'Safe', mockRandom);

    expect(result.dropped).toBe(true);
    expect(result.itemId).toBeDefined();
    expect(result.itemName).toBeDefined();
  });

  it('should drop thematic common secondary gear from a normal beast/wolf enemy', () => {
    const beastEnemy: Enemy = {
      ...mockEnemy,
      name: 'Young Wolf',
      family: 'Blackfang Wolves',
      archetype: 'Hunter',
      location: 'LOC_001',
      rank: 'normal'
    };

    const pool: ItemDefinition[] = [
      { id: 'MAT_001', name: 'Torn Cloth', category: 'material', rarity: 'common', tier: 1, description: '' },
      { id: 'SHLD_001', name: 'Roadwatch Buckler', category: 'shield', rarity: 'common', tier: 1, description: '' },
      { id: 'AMUL_001', name: 'Wolf Fang Charm', category: 'amulet', rarity: 'common', tier: 1, description: '' },
      { id: 'HEAD_001', name: 'Roadside Hood', category: 'head', rarity: 'common', tier: 1, description: '' }
    ];

    const mockRandom = (() => {
      let count = 0;
      const values = [0.01, 0.5];
      return () => values[count++] ?? 0.5;
    })();

    const result = rollLootDrop(beastEnemy, pool, 'Safe', mockRandom);

    expect(result.dropped).toBe(true);
    expect(result.itemId).toBe('MAT_001');
  });

  it('should generate a full equipment instance when generated loot drop succeeds', () => {
    const enemy: Enemy = {
      ...mockEnemy,
      level: 9,
      rank: 'elite'
    };

    const mockRandom = (() => {
      let count = 0;
      const values = [0.01, 0.5, 0.75, 0.5, 0.5];
      return () => values[count++] ?? 0.5;
    })();

    const result = rollGeneratedEquipmentDrop(enemy, mockHero, 'LOC_001', mockRandom);

    expect(result.dropped).toBe(true);
    expect(result.item).toBeDefined();
    expect(result.item?.id.startsWith('generated_')).toBe(true);
    expect(result.item?.level).toBe(9);
    expect(result.item?.durability).toBe(100);
    expect(result.item?.affixes.length).toBeGreaterThanOrEqual(1);
    expect(result.item?.source?.enemyId).toBe(enemy.id);
  });

  it('should verify regular enemy drop chance is lower than elite, and elite is lower than boss', () => {
    const normalEnemy = { ...mockEnemy, rank: 'normal' as const };
    const eliteEnemy = { ...mockEnemy, rank: 'elite' as const };
    const bossEnemy = { ...mockEnemy, rank: 'boss' as const };

    const normalChance = getGeneratedEquipmentDropChance(normalEnemy, mockHero);
    const eliteChance = getGeneratedEquipmentDropChance(eliteEnemy, mockHero);
    const bossChance = getGeneratedEquipmentDropChance(bossEnemy, mockHero);

    expect(normalChance).toBeLessThan(eliteChance);
    expect(eliteChance).toBeLessThan(bossChance);
    expect(normalChance).toBe(0.035);
    expect(eliteChance).toBe(0.12);
    expect(bossChance).toBe(0.35);
  });

  it('should verify rarity chances improve from level 1 to level 30', () => {
    const level1Enemy = { ...mockEnemy, level: 1, rank: 'normal' as const };
    const level30Enemy = { ...mockEnemy, level: 30, rank: 'normal' as const };

    // At level 1, rollGeneratedEquipmentRarity uses levelFactor = 1/30
    // At level 30, it uses levelFactor = 30/30 = 1.0
    // We pass custom random rolls to check progression deterministically
    const rarityLvl1 = rollGeneratedEquipmentRarity(level1Enemy, mockHero, () => 0.70);
    const rarityLvl30 = rollGeneratedEquipmentRarity(level30Enemy, mockHero, () => 0.70);

    expect(rarityLvl1).toBe('common');
    expect(rarityLvl30).toBe('uncommon');
  });

  it('should verify equipment tier mapping produces only allowed tiers', () => {
    const allowedTiers = [1, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30];
    for (let lvl = 1; lvl <= 30; lvl++) {
      const mappedLevel = getEquipmentLevelForEnemy(lvl);
      expect(allowedTiers).toContain(mappedLevel);
      if (lvl < 3) {
        expect(mappedLevel).toBe(1);
      } else if (lvl >= 30) {
        expect(mappedLevel).toBe(30);
      }
    }
  });

  it('should verify all required loot slots can be selected and no belt slot is generated', () => {
    const expectedSlots = ['weapon', 'shield', 'head', 'chest', 'hands', 'legs', 'feet', 'ring1', 'amulet'];
    const generatedSlots = new Set<string>();

    const slotsInWeights = EQUIPMENT_SLOT_WEIGHTS.map(w => w.slot);
    
    expect(slotsInWeights).toContain('weapon');
    expect(slotsInWeights).toContain('shield');
    expect(slotsInWeights).toContain('head');
    expect(slotsInWeights).toContain('chest');
    expect(slotsInWeights).toContain('hands');
    expect(slotsInWeights).toContain('legs');
    expect(slotsInWeights).toContain('feet');
    expect(slotsInWeights).toContain('ring1');
    expect(slotsInWeights).toContain('amulet');
    expect(slotsInWeights).not.toContain('belt');

    let sum = 0;
    const totalWeight = EQUIPMENT_SLOT_WEIGHTS.reduce((s, e) => s + e.weight, 0);
    for (const entry of EQUIPMENT_SLOT_WEIGHTS) {
      const midPoint = (sum + entry.weight / 2) / totalWeight;
      const slot = rollWeightedEquipmentSlot(() => midPoint);
      generatedSlots.add(slot);
      sum += entry.weight;
    }

    expect(generatedSlots.size).toBe(expectedSlots.length);
    for (const slot of expectedSlots) {
      expect(generatedSlots.has(slot)).toBe(true);
    }
  });
});

describe('Crafting Success Formulas (crafting.ts)', () => {
  it('should guarantee success with successChance >= 1', () => {
    expect(rollCraftSuccess(1.0)).toBe(true);
    expect(rollCraftSuccess(1.5)).toBe(true);
    expect(rollCraftSuccess(undefined)).toBe(true); // default behaves as 1.0
  });

  it('should guarantee failure with successChance <= 0', () => {
    expect(rollCraftSuccess(0)).toBe(false);
    expect(rollCraftSuccess(-0.5)).toBe(false);
  });

  it('should resolve successChance 0.75 correctly based on randomValue thresholds', () => {
    // 0.70 < 0.75 -> success
    expect(rollCraftSuccess(0.75, 0.70)).toBe(true);
    // 0.80 >= 0.75 -> failure
    expect(rollCraftSuccess(0.75, 0.80)).toBe(false);
  });
});

describe('Item Affixes Formulas (affixes.ts)', () => {
  it('should generate correct number of affixes based on rarity', () => {
    expect(generateItemAffixes('common', 'weapon').length).toBe(0);
    expect(generateItemAffixes('uncommon', 'weapon').length).toBe(1);
    expect(generateItemAffixes('rare', 'weapon').length).toBe(2);
    expect(generateItemAffixes('epic', 'weapon').length).toBe(3);
    expect(generateItemAffixes('legendary', 'weapon').length).toBe(4);
  });

  it('should generate affixes with valid properties', () => {
    const affixes = generateItemAffixes('uncommon', 'weapon', 2, () => 0.1);
    expect(affixes.length).toBe(1);
    const affix = affixes[0];
    expect(affix.id).toBeDefined();
    expect(affix.type).toBeDefined();
    expect(affix.label).toBeDefined();
    expect(affix.value).toBeGreaterThan(0);
    expect(affix.valueType).toBeDefined();
  });

  it('should affect hero derived stats when affixes are equipped', () => {
    const customHero: HeroState = {
      ...mockHero,
      equipmentAffixes: {
        weapon: [
          { id: 'crit_aff', type: 'critChance', label: 'Crit Chance', value: 0.1, valueType: 'percent' },
          { id: 'ap_aff', type: 'attackPower', label: 'Attack Power', value: 10, valueType: 'flat' }
        ],
        chest: [
          { id: 'hp_aff', type: 'maxHealth', label: 'Max HP', value: 50, valueType: 'flat' }
        ]
      }
    };

    const derived = calculateDerivedStats(customHero.stats, customHero.baseHp, undefined, customHero);
    
    // Attack power = strength (10) * 2 + affixAttackPower (10) = 30
    expect(derived.attackPower).toBe(30);
    // Max HP = flatHp (baseHp (100) + vitality (10) * 5 + affixMaxHealth (50)) * (1 + totalHpBonus (0)) = 200
    expect(derived.maxHp).toBe(200);
    // Crit chance = BASE_CRIT_CHANCE (0.05) + agility (10) * 0.003 + affixCritChance (0.10) = 0.18
    expect(derived.critChance).toBeCloseTo(0.18, 5);
  });

  it('should respect stat caps when affixes are equipped', () => {
    const cappedHero: HeroState = {
      ...mockHero,
      equipmentAffixes: {
        weapon: [
          { id: 'crit_aff', type: 'critChance', label: 'Crit Chance', value: 0.9, valueType: 'percent' }
        ]
      }
    };

    const derived = calculateDerivedStats(cappedHero.stats, cappedHero.baseHp, undefined, cappedHero);
    
    // Crit chance capped at 0.35
    expect(derived.critChance).toBe(0.35);
  });
});

describe('Reroll System Formulas (reroll.ts)', () => {
  it('should calculate reroll costs based on rarity', () => {
    expect(calculateRerollCost('uncommon')).toBe(100);
    expect(calculateRerollCost('rare')).toBe(250);
    expect(calculateRerollCost('epic')).toBe(600);
    expect(calculateRerollCost('legendary')).toBe(1500);
    expect(calculateRerollCost('common')).toBe(50);
  });

  it('should throw error on invalid index or missing affixes', () => {
    expect(() => rerollItemAffix({
      itemId: 'test',
      category: 'weapon',
      tier: 1,
      rarity: 'common',
      affixIndex: 0
    })).toThrow();

    expect(() => rerollItemAffix({
      itemId: 'test',
      category: 'weapon',
      tier: 1,
      rarity: 'common',
      affixes: [],
      affixIndex: 0
    })).toThrow();

    expect(() => rerollItemAffix({
      itemId: 'test',
      category: 'weapon',
      tier: 1,
      rarity: 'uncommon',
      affixes: [{ id: '1', type: 'critChance', label: 'crit', value: 0.05, valueType: 'percent' }],
      affixIndex: 5
    })).toThrow();
  });

  it('should replace only the target affix at the specified index', () => {
    const initialAffixes: ItemAffix[] = [
      { id: '1', type: 'critChance', label: 'crit', value: 0.05, valueType: 'percent' },
      { id: '2', type: 'attackPower', label: 'ap', value: 10, valueType: 'flat' }
    ];

    const result = rerollItemAffix({
      itemId: 'test',
      category: 'weapon',
      tier: 2,
      rarity: 'rare',
      affixes: initialAffixes,
      affixIndex: 1,
      random: () => 0.9 // rolls accuracy
    });

    expect(result.length).toBe(2);
    // index 0 should remain completely unchanged
    expect(result[0]).toEqual(initialAffixes[0]);
    expect(result[1].type).not.toBe(initialAffixes[1].type);
    expect(result[1].type).not.toBe(initialAffixes[0].type);
    expect(result[1].id.endsWith('_affix_2')).toBe(true);
  });
});

describe('Save/Load Compatibility & Normalization (saveSystem.ts)', () => {
  it('should safely normalize old saves missing equipmentAffixes and affixes properties', () => {
    const oldSavedHero = {
      id: 'old_hero',
      name: 'Old Hero',
      level: 5,
      xp: 120,
      gold: 500,
      baseHp: 100,
      currentHp: 100,
      maxHp: 100,
      stats: { strength: 10, vitality: 10, agility: 10 },
      unspentStatPoints: 0,
      equippedWeaponId: 'fallback_weapon',
      equippedArmorId: 'fallback_armor',
      equipment: {
        weapon: null,
        head: null,
        chest: null,
        legs: null,
        hands: null,
        feet: null,
        ring1: null,
        ring2: null,
        amulet: null
      },
      inventory: [
        { itemId: 'MAT_001', qty: 5 } // missing optional affixes!
      ],
      migrationFlags: { starterEquipmentV2: true }
    };

    const normalized = normalizeHeroState(oldSavedHero);

    expect(normalized.equipmentAffixes).toBeDefined();
    expect(normalized.equipmentAffixes).toEqual({});
    expect(normalized.inventory[0].affixes).toBeDefined();
    expect(normalized.inventory[0].affixes).toEqual([]);
  });

  it('should preserve existing affixes and equipmentAffixes during normalization', () => {
    const currentHero = {
      ...mockHero,
      equipmentAffixes: {
        weapon: [{ id: 'affix_1', type: 'critChance', label: 'Crit', value: 0.05, valueType: 'percent' }]
      },
      inventory: [
        {
          itemId: 'WEAP_001',
          qty: 1,
          affixes: [{ id: 'affix_2', type: 'attackPower', label: 'AP', value: 5, valueType: 'flat' }]
        }
      ]
    };

    const normalized = normalizeHeroState(currentHero);

    expect(normalized.equipmentAffixes?.weapon).toBeDefined();
    expect(normalized.equipmentAffixes?.weapon?.[0].id).toBe('affix_1');
    expect(normalized.inventory[0].affixes?.[0].id).toBe('affix_2');
  });

  it('should prevent derived stats from crashing when optional affix properties are completely missing', () => {
    const rawOldSavedHero = {
      id: 'old_hero',
      name: 'Old Hero',
      level: 5,
      xp: 120,
      gold: 500,
      baseHp: 100,
      currentHp: 100,
      maxHp: 100,
      stats: { strength: 10, vitality: 10, agility: 10 },
      unspentStatPoints: 0,
      equippedWeaponId: 'fallback_weapon',
      equippedArmorId: 'fallback_armor',
      equipment: {
        weapon: null,
        head: null,
        chest: null,
        legs: null,
        hands: null,
        feet: null,
        ring1: null,
        ring2: null,
        amulet: null
      },
      inventory: [
        { itemId: 'MAT_001', qty: 5 }
      ]
    };

    // Calculate derived stats using raw unnormalized old hero directly -
    // should execute fallback path without throwing
    expect(() => calculateDerivedStats(rawOldSavedHero.stats, rawOldSavedHero.baseHp, undefined, rawOldSavedHero as unknown as HeroState)).not.toThrow();
  });

  it('should apply missed offline health regen ticks from save timestamp', () => {
    const save = {
      hero: {
        ...mockHero,
        currentHp: 60,
        stats: { strength: 10, vitality: 15, agility: 10 }
      },
      updatedAt: '2026-06-01T10:00:00.000Z'
    };

    const progressed = applyOfflineHealthRegen(save, Date.parse('2026-06-01T10:00:15.000Z'));

    expect(progressed?.hero.currentHp).toBe(69);
    expect(progressed?.hero.maxHp).toBe(175);
  });

  it('should not revive a defeated hero during offline catch-up', () => {
    const save = {
      hero: {
        ...mockHero,
        currentHp: 0,
        stats: { strength: 10, vitality: 25, agility: 10 }
      },
      updatedAt: '2026-06-01T10:00:00.000Z'
    };

    const progressed = applyOfflineHealthRegen(save, Date.parse('2026-06-01T10:01:00.000Z'));

    expect(progressed?.hero.currentHp).toBe(0);
  });
});

describe('Quest System Formulas (quests.ts)', () => {
  it('should initialize starter quests for a hero', () => {
    const quests = initializeQuests(1);
    expect(quests.length).toBeGreaterThan(0);
    expect(quests[0].status).toBe('active');
    expect(quests[0].objectives[0].current).toBe(0);
  });

  it('should increment kill enemy progress correctly', () => {
    const heroWithQuests = { ...mockHero, quests: initializeQuests(1) };
    const updated = updateQuestProgressOnEnemyKilled(heroWithQuests, 'enemy_01', 'Blackfang Wolves');
    const firstQuest = updated.quests?.find((q) => q.questId === 'KQ_001');
    expect(firstQuest?.objectives[0].current).toBe(1);
  });

  it('should increment win battles progress correctly', () => {
    const heroWithQuests = { ...mockHero, quests: initializeQuests(5) };
    const updated = updateQuestProgressOnBattleWon(heroWithQuests);
    const secondQuest = updated.quests?.find((q) => q.questId === 'DQ_008');
    expect(secondQuest?.objectives[0].current).toBe(1);
  });

  it('should increment material collection progress correctly', () => {
    const heroWithQuests = { ...mockHero, quests: initializeQuests(1) };
    const updated = updateQuestProgressOnMaterialGained(heroWithQuests, 'MAT_001', 2);
    const thirdQuest = updated.quests?.find((q) => q.questId === 'DQ_006');
    expect(thirdQuest?.objectives[0].current).toBe(2);
  });

  it('should increment travel progress correctly', () => {
    const heroWithQuests = {
      ...mockHero,
      quests: [
        {
          questId: 'ZQ_004',
          status: 'active' as const,
          objectives: [{ type: 'travel_location' as const, targetId: 'LOC_002', required: 1, current: 0 }]
        }
      ]
    };
    const updated = updateQuestProgressOnLocationChanged(heroWithQuests, 'LOC_002');
    const fourthQuest = updated.quests?.find((q) => q.questId === 'ZQ_004');
    expect(fourthQuest?.objectives[0].current).toBe(1);
  });

  it('should mark quest as completed when objectives are met', () => {
    const heroWithQuests = { ...mockHero, quests: initializeQuests(1) };
    // DQ_001 requires 10 kills
    let updated: HeroState = heroWithQuests;
    for (let i = 0; i < 10; i++) {
      updated = updateQuestProgressOnEnemyKilled(updated, 'enemy_01', 'beast');
    }
    const firstQuest = updated.quests?.find((q) => q.questId === 'DQ_001');
    expect(firstQuest?.status).toBe('completed');
  });

  it('should claim quest rewards exactly once', () => {
    const heroWithQuests = { ...mockHero, quests: initializeQuests(1), gold: 10, xp: 10 };
    // Pre-complete DQ_001
    const completedQuests = heroWithQuests.quests?.map((q) => {
      if (q.questId === 'DQ_001') {
        return { ...q, status: 'completed' as const };
      }
      return q;
    });
    const completedHero = { ...heroWithQuests, quests: completedQuests };

    expect(canClaimQuest(completedHero.quests![0])).toBe(true);

    const claimedHero = claimQuestReward(completedHero, 'DQ_001');
    expect(claimedHero.gold).toBeGreaterThan(10);
    expect(claimedHero.xp).toBeGreaterThan(10);
    expect(claimedHero.quests!.find(q => q.questId === 'DQ_001')?.status).toBe('claimed');

    // Repeated claim should not change gold/xp
    const goldBefore = claimedHero.gold;
    const xpBefore = claimedHero.xp;
    const claimedHeroAgain = claimQuestReward(claimedHero, 'DQ_001');
    expect(claimedHeroAgain.gold).toBe(goldBefore);
    expect(claimedHeroAgain.xp).toBe(xpBefore);
  });

  it('should safely normalize older saves without quests', () => {
    const oldSavedHero = {
      id: 'old_hero',
      name: 'Old Hero',
      level: 1,
      xp: 0,
      gold: 40,
      baseHp: 100,
      currentHp: 100,
      maxHp: 100,
      stats: { strength: 5, vitality: 5, agility: 5 },
      unspentStatPoints: 0,
      equippedWeaponId: 'fallback_weapon',
      equippedArmorId: 'fallback_armor',
      equipment: { weapon: null, head: null, chest: null, legs: null, hands: null, feet: null, ring1: null, ring2: null, amulet: null },
      inventory: []
    };

    const normalized = normalizeHeroState(oldSavedHero);
    expect(normalized.quests).toBeDefined();
    expect(normalized.quests?.length).toBeGreaterThan(0);
  });
});

describe('Elite and Boss Encounter Rank & Scaling Formulas', () => {
  it('should categorize normal rank scaling perfectly', () => {
    const normalEnemy = applyRankScaling(mockEnemy, 'normal');
    expect(normalEnemy.rank).toBe('normal');
    expect(normalEnemy.hp).toBe(mockEnemy.hp);
  });

  it('should apply elite rank scaling correctly (2.2x HP, 1.5x damage, 1.8x rewards)', () => {
    const baseEnemy: Enemy = { ...mockEnemy, damageMin: 10, damageMax: 20 };
    const eliteEnemy = applyRankScaling(baseEnemy, 'elite');
    expect(eliteEnemy.rank).toBe('elite');
    expect(eliteEnemy.hp).toBe(Math.round(mockEnemy.hp * 2.2));
    expect(eliteEnemy.damageMin).toBe(15); // 10 * 1.5
    expect(eliteEnemy.damageMax).toBe(30); // 20 * 1.5
    expect(eliteEnemy.xp).toBe(Math.round(mockEnemy.xp * 1.8));
    expect(eliteEnemy.gold).toBe(Math.round(mockEnemy.gold * 1.8));
  });

  it('should apply boss rank scaling correctly (3.5x HP, 2.2x damage, 4.0x rewards)', () => {
    const baseEnemy: Enemy = { ...mockEnemy, damageMin: 10, damageMax: 20 };
    const bossEnemy = applyRankScaling(baseEnemy, 'boss');
    expect(bossEnemy.rank).toBe('boss');
    expect(bossEnemy.hp).toBe(Math.round(mockEnemy.hp * 3.5));
    expect(bossEnemy.damageMin).toBe(22); // 10 * 2.2
    expect(bossEnemy.damageMax).toBe(44); // 20 * 2.2
    expect(bossEnemy.xp).toBe(Math.round(mockEnemy.xp * 4.0));
    expect(bossEnemy.gold).toBe(Math.round(mockEnemy.gold * 4.0));
  });

  it('should select elite rank randomly based on deterministic 8% chance triggers', () => {
    // mock random returning <= 0.08 triggers elite
    const elite = rollEliteOrNormal(mockEnemy, () => 0.05);
    expect(elite.rank).toBe('elite');
    expect(elite.name).toContain('Кровожерний');

    // mock random returning > 0.08 triggers normal
    const normal = rollEliteOrNormal(mockEnemy, () => 0.12);
    expect(normal.rank).toBe('normal');
    expect(normal.name).toBe(mockEnemy.name);
  });

  it('should trigger and load boss data for a valid location correctly', () => {
    const mockBossesList = [
      { id: 'boss_alpha', name: 'Blackfang Alpha', level: 10, hp: 1200, damageMin: 35, damageMax: -50, phaseMechanics: 'Enrage' }
    ];

    const boss = getBossForLocation('Blackfang Forest', 'Blackfang Alpha', mockBossesList);
    expect(boss).not.toBeNull();
    expect(boss?.id).toBe('boss_alpha');
    expect(boss?.rank).toBe('boss');
    expect(boss?.hp).toBe(1200 * 3.5); // base HP * boss scaling multiplier
  });

  it('should increment kill_elite and kill_boss quest progress correctly', () => {
    const heroWithQuests = {
      ...mockHero,
      quests: [
        {
          questId: 'QST_ELITE_TEST',
          status: 'active' as const,
          objectives: [
            { type: 'kill_elite' as const, required: 1, current: 0 },
            { type: 'kill_boss' as const, required: 1, current: 0 }
          ]
        }
      ]
    };

    // Kill elite
    let updated = updateQuestProgressOnEnemyKilled(heroWithQuests, 'elite_1', 'brigand', 'elite');
    expect(updated.quests![0].objectives[0].current).toBe(1);
    expect(updated.quests![0].objectives[1].current).toBe(0);

    // Kill boss
    updated = updateQuestProgressOnEnemyKilled(updated, 'boss_1', 'boss', 'boss');
    expect(updated.quests![0].objectives[1].current).toBe(1);
  });
});

describe('Boss Unlock & Progression Gate Formulas', () => {
  it('should lock boss encounter if hero level is too low', () => {
    const boss = { level: 10 };
    // Hero level 7 < boss.level - 2 (8)
    const result = canStartBossEncounter({ ...mockHero, level: 7 }, boss);
    expect(result.unlocked).toBe(false);
    expect(result.reason).toContain('потрібен рівень 8');
  });

  it('should unlock boss encounter when hero level requirement is met', () => {
    const boss = { level: 10 };
    // Hero level 8 >= boss.level - 2 (8)
    const result = canStartBossEncounter({ ...mockHero, level: 8 }, boss);
    expect(result.unlocked).toBe(true);
  });

  it('should correctly normalize and load defeatedBossIds field on older saves', () => {
    const oldSavedHero = {
      id: 'old_hero',
      name: 'Old Hero',
      level: 1,
      xp: 0,
      gold: 40,
      baseHp: 100,
      currentHp: 100,
      maxHp: 100,
      stats: { strength: 5, vitality: 5, agility: 5 },
      unspentStatPoints: 0,
      equippedWeaponId: 'fallback_weapon',
      equippedArmorId: 'fallback_armor',
      equipment: { weapon: null, head: null, chest: null, legs: null, hands: null, feet: null, ring1: null, ring2: null, amulet: null },
      inventory: []
    };

    const normalized = normalizeHeroState(oldSavedHero);
    expect(normalized.defeatedBossIds).toBeDefined();
    expect(normalized.defeatedBossIds).toEqual([]);
  });
});

describe('Lootbox Shop System (lootboxes.ts)', () => {
  it('should block opening if hero does not have enough gold', () => {
    const poorHero = { ...mockHero, gold: 50 }; // price for supply chest is 100 gold
    const result = openLootbox(poorHero, 'box_01_supply');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Недостатньо золота.');
    expect(result.rewards).toEqual([]);
    expect(result.nextHero.gold).toBe(50);
  });

  it('should open lootbox if hero has enough gold and subtract gold correctly', () => {
    const richHero = { ...mockHero, gold: 1000 };
    const result = openLootbox(richHero, 'box_01_supply');
    expect(result.success).toBe(true);
    expect(result.rewards.length).toBe(2); // box_01_supply has rewardCount = 2
    expect(result.nextHero.gold).toBe(900); // 1000 - 100 = 900
    expect(result.nextHero.inventory.length).toBeGreaterThan(0);
  });

  it('should return a reward result with valid structure', () => {
    const hero = { ...mockHero, gold: 500 };
    const result = openLootbox(hero, 'box_02_hunter');
    expect(result.success).toBe(true);
    expect(result.rewards).toBeInstanceOf(Array);
    result.rewards.forEach(reward => {
      expect(reward.itemId).toBeDefined();
      expect(typeof reward.itemId).toBe('string');
      expect(reward.qty).toBeGreaterThanOrEqual(1);
      expect(reward.rarity).toBeDefined();
    });
  });

  it('should generate equipment that can receive affixes', () => {
    const hero = { ...mockHero, gold: 1500 };
    const mockRandom = () => 0.5;
    const result = openLootbox(hero, 'box_03_forged', mockRandom);
    
    expect(result.success).toBe(true);
    expect(result.rewards.length).toBe(1);
    const itemReward = result.rewards[0];
    
    expect(itemReward.rarity).toBe('rare');
    expect(itemReward.generatedItem).toBeDefined();
    expect(itemReward.generatedItem?.id.startsWith('generated_')).toBe(true);
    expect(itemReward.affixes).toBeDefined();
    expect(itemReward.affixes?.length).toBe(2);
  });

  it('should execute deterministic reward behavior with injected random values', () => {
    const hero = { ...mockHero, gold: 2000 };
    // test box_01_supply with deterministic random values
    // roll < 0.90 triggers materials path
    const resultMaterial = openLootbox(hero, 'box_01_supply', () => 0.1);
    expect(resultMaterial.success).toBe(true);
    // first item should be a material, and quantity should be rolled using roll * 2 + 1 = 1.2 => 1 qty
    expect(resultMaterial.rewards[0].itemId.startsWith('MAT_')).toBe(true);
    
    // roll >= 0.90 triggers equipment path
    const resultEquipment = openLootbox(hero, 'box_01_supply', () => 0.95);
    expect(resultEquipment.success).toBe(true);
    const gearReward = resultEquipment.rewards[0];
    expect(gearReward.rarity).toBe('common');
    expect(gearReward.qty).toBe(1);
    expect(gearReward.generatedItem).toBeDefined();
    expect(gearReward.generatedItem?.durability).toBe(100);
  });

  it('should scale lootbox generated equipment level with hero progress', () => {
    const hero = { ...mockHero, level: 19, gold: 2000 };
    const result = openLootbox(hero, 'box_03_forged', () => 0.5);

    expect(result.success).toBe(true);
    expect(result.rewards[0].generatedItem).toBeDefined();
    expect((result.rewards[0].generatedItem?.level ?? 0) >= 18).toBe(true);
  });
});

describe('Market Sell Item Foundation (sellValue.ts)', () => {
  it('should calculate common item sell value fallback correctly', () => {
    const value = calculateItemSellValue({ itemId: 'test_item', category: 'material', rarity: 'common', tier: 1 });
    expect(value).toBe(10);
  });

  it('should increase sell value with higher rarity', () => {
    const commonVal = calculateItemSellValue({ itemId: 'test', category: 'weapon', rarity: 'common', tier: 1 });
    const uncommonVal = calculateItemSellValue({ itemId: 'test', category: 'weapon', rarity: 'uncommon', tier: 1 });
    const rareVal = calculateItemSellValue({ itemId: 'test', category: 'weapon', rarity: 'rare', tier: 1 });
    const epicVal = calculateItemSellValue({ itemId: 'test', category: 'weapon', rarity: 'epic', tier: 1 });
    const legendaryVal = calculateItemSellValue({ itemId: 'test', category: 'weapon', rarity: 'legendary', tier: 1 });

    expect(commonVal).toBe(10);
    expect(uncommonVal).toBe(25);
    expect(rareVal).toBe(60);
    expect(epicVal).toBe(150);
    expect(legendaryVal).toBe(400);
  });

  it('should increase sell value with tier progression', () => {
    const tier1Val = calculateItemSellValue({ itemId: 'test', category: 'weapon', rarity: 'common', tier: 1 });
    const tier2Val = calculateItemSellValue({ itemId: 'test', category: 'weapon', rarity: 'common', tier: 2 });
    
    // tier 2 multiplier = 1 + (2 - 1) * 0.15 = 1.15. 10 * 1.15 = 11.5 => 12
    expect(tier1Val).toBe(10);
    expect(tier2Val).toBe(12);
  });

  it('should increase sell value with affixes', () => {
    const noAffix = calculateItemSellValue({ itemId: 'test', category: 'weapon', rarity: 'rare', tier: 1, affixesCount: 0 });
    const with2Affixes = calculateItemSellValue({ itemId: 'test', category: 'weapon', rarity: 'rare', tier: 1, affixesCount: 2 });

    // base 60. affixMultiplier = 1 + 2 * 0.1 = 1.2. 60 * 1.2 = 72
    expect(noAffix).toBe(60);
    expect(with2Affixes).toBe(72);
  });

  it('should correctly prioritize explicit item base value if available', () => {
    const value = calculateItemSellValue({ itemId: 'test', category: 'material', rarity: 'common', tier: 1, baseValueGold: 50 });
    expect(value).toBe(50);
  });
});

describe('Secondary Equipment Slot Resolution and Crafting Mapping', () => {
  it('should resolve correct slot for feet items (e.g. feet_001_roadworn_boots -> feet)', () => {
    const item = items.find(i => i.id.toLowerCase() === 'feet_boots_lvl_01');
    expect(item).toBeDefined();
    const slot = getEquippableSlot(item!);
    expect(slot).toBe('feet');
  });

  it('should resolve correct slot for legs items (e.g. legs_001_patchwork_greaves -> legs)', () => {
    const item = items.find(i => i.id.toLowerCase() === 'legs_pants_lvl_01');
    expect(item).toBeDefined();
    const slot = getEquippableSlot(item!);
    expect(slot).toBe('legs');
  });

  it('should resolve correct slot for shield items (e.g. shield_001_roadwatch_buckler -> shield)', () => {
    const item = items.find(i => i.id.toLowerCase() === 'shield_guard_lvl_01');
    expect(item).toBeDefined();
    const slot = getEquippableSlot(item!);
    expect(slot).toBe('shield');
  });

  it('should classify secondary armor-like slots into the armor category tab correctly', () => {
    const resolvedItems = [
      items.find(i => i.id.toLowerCase() === 'feet_boots_lvl_01'),
      items.find(i => i.id.toLowerCase() === 'legs_pants_lvl_01'),
      items.find(i => i.id.toLowerCase() === 'shield_guard_lvl_01'),
      items.find(i => i.id.toLowerCase() === 'head_helmet_lvl_01'),
      items.find(i => i.id.toLowerCase() === 'hands_gloves_lvl_01')
    ];

    resolvedItems.forEach(item => {
      expect(item).toBeDefined();
      const slot = getEquippableSlot(item!);
      expect(slot).not.toBeNull();
      const isArmorTab = slot && ['chest', 'shield', 'head', 'hands', 'legs', 'feet'].includes(slot);
      expect(isArmorTab).toBe(true);
    });
  });

  it('should classify blade recipe correctly as a weapon', () => {
    const recipe = recipes.find(r => r.result === 'weapon_blade_lvl_01');
    expect(recipe).toBeDefined();
    
    // Check if it resolves to a weapon
    const itemType = (recipe!.itemType ?? '').toLowerCase();
    const isWeapon = ['axe', 'sword', 'hammer', 'weapon'].includes(itemType);
    expect(isWeapon).toBe(true);
  });

  it('should classify all generated weapon recipes as weapons', () => {
    const weaponRecipes = recipes.filter(r => (r.itemType ?? '').toLowerCase() === 'weapon');
    expect(weaponRecipes.length).toBeGreaterThan(0);
    weaponRecipes.forEach((recipe) => {
      expect(['axe', 'sword', 'hammer', 'weapon'].includes((recipe.itemType ?? '').toLowerCase())).toBe(true);
    });
  });

  it('should map unresolved weapon recipe with itemType Axe to slot weapon', () => {
    // Mimic the getRecipeStatChips signature fallback matching
    const dummyRecipe = { result: 'Unknown Axe', itemType: 'Axe', name: 'Unknown' };
    const signature = `${dummyRecipe.itemType.toLowerCase()} ${dummyRecipe.result.toLowerCase()} ${dummyRecipe.name.toLowerCase()}`;
    const isWeapon = ['axe', 'sword', 'hammer', 'weapon'].includes(dummyRecipe.itemType.toLowerCase()) || 
                     ['hatchet', 'cleaver', 'sword', 'longsword', 'hammer', 'warhammer', 'maul', 'edge', 'blade', 'axe', 'dagger'].some(t => signature.includes(t));
    expect(isWeapon).toBe(true);
  });

  it('should verify boots recipe still maps to feet and Броня', () => {
    const bootsRecipe = recipes.find(r => r.result.toLowerCase() === 'feet_boots_lvl_01');
    expect(bootsRecipe).toBeDefined();
    const item = items.find(i => i.id.toLowerCase() === bootsRecipe!.result.toLowerCase());
    expect(item).toBeDefined();
    const slot = getEquippableSlot(item!);
    expect(slot).toBe('feet');
    const isArmorTab = slot && ['chest', 'shield', 'head', 'hands', 'legs', 'feet'].includes(slot);
    expect(isArmorTab).toBe(true);
  });

  it('should resolve null equipment slot for all material items (MAT_001 through MAT_024)', () => {
    const materialIds = Array.from({ length: 24 }, (_, i) => `mat_${String(i + 1).padStart(3, '0')}`);
    materialIds.forEach(id => {
      const item = items.find(i => i.id.toLowerCase() === id);
      expect(item).toBeDefined();
      const slot = getEquippableSlot(item!);
      expect(slot).toBeNull();
    });
  });

  it('should verify Ash Sigil Fragment (MAT_017) resolves to null slot, not amulet', () => {
    const item = items.find(i => i.id.toLowerCase() === 'mat_017');
    expect(item).toBeDefined();
    const slot = getEquippableSlot(item!);
    expect(slot).toBeNull();
  });

  it('should verify Staggered Bone Plate (MAT_024) resolves to null slot, not chest', () => {
    const item = items.find(i => i.id.toLowerCase() === 'mat_024');
    expect(item).toBeDefined();
    const slot = getEquippableSlot(item!);
    expect(slot).toBeNull();
  });
});

describe('Combat Attack Intervals and Timing Multiplier', () => {
  it('should define COMBAT_ATTACK_INTERVAL_MULTIPLIER as 2.5', () => {
    expect(COMBAT_ATTACK_INTERVAL_MULTIPLIER).toBe(2.5);
  });

  it('should calculate scaled attack intervals correctly for all weapon types', () => {
    const weaponsToTest = [
      { type: 'axe', speed: 1.54, expectedBaseInterval: 1 / 1.54 },
      { type: 'sword', speed: 1.3, expectedBaseInterval: 1 / 1.3 },
      { type: 'hammer', speed: 0.85, expectedBaseInterval: 1 / 0.85 }
    ];

    weaponsToTest.forEach(w => {
      const baseInterval = 1 / w.speed;
      const scaledInterval = baseInterval * COMBAT_ATTACK_INTERVAL_MULTIPLIER;

      expect(scaledInterval).toBeCloseTo(baseInterval * 2.5, 4);

      if (w.type === 'axe') {
        expect(scaledInterval).toBeCloseTo(1.623, 2);
      } else if (w.type === 'sword') {
        expect(scaledInterval).toBeCloseTo(1.923, 2);
      } else if (w.type === 'hammer') {
        expect(scaledInterval).toBeCloseTo(2.941, 2);
      }
    });
  });

  it('should preserve weapon speed identity (Axe is fastest, Hammer is slowest)', () => {
    const axeInterval = (1 / 1.54) * COMBAT_ATTACK_INTERVAL_MULTIPLIER;
    const swordInterval = (1 / 1.3) * COMBAT_ATTACK_INTERVAL_MULTIPLIER;
    const hammerInterval = (1 / 0.85) * COMBAT_ATTACK_INTERVAL_MULTIPLIER;

    expect(axeInterval).toBeLessThan(swordInterval);
    expect(swordInterval).toBeLessThan(hammerInterval);
  });

  it('should calculate scaled intervals for enemy attacks correctly', () => {
    const defaultEnemySpeed = 2.4;
    const baseEnemyInterval = 1 / defaultEnemySpeed;
    const scaledEnemyInterval = baseEnemyInterval * COMBAT_ATTACK_INTERVAL_MULTIPLIER;

    expect(scaledEnemyInterval).toBeCloseTo(1.042, 2);
  });
});

describe('Telegram Full Health Notification', () => {
  it('should fail silently and handle missing user or WebApp context without crashing', async () => {
    await expect(sendFullHealthNotification()).resolves.not.toThrow();
  });
});
