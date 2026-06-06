import type { Armor, ItemCategory, Recipe, Rarity, Shield, Weapon } from '../game/types';
import { getRecipeSourceDescriptor, getRecipeUnlockMethodDescriptor } from './recipeDropSources';

export const EQUIPMENT_LEVELS = [1, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30] as const;

export type EquipmentTemplateStats = {
  minDamage?: number;
  maxDamage?: number;
  attackSpeed?: number;
  armor?: number;
  maxHp?: number;
  accuracy?: number;
  dodgeChance?: number;
  blockChance?: number;
  blockPower?: number;
  damageBonus?: number;
  attackSpeedBonus?: number;
  damageReduction?: number;
  armorPenetration?: number;
  healthRegen?: number;
};

export type EquipmentItemDefinition = {
  id: string;
  templateId: string;
  codeName: string;
  name: string;
  category: ItemCategory;
  slot: 'weapon' | 'head' | 'chest' | 'hands' | 'legs' | 'feet' | 'shield' | 'ring' | 'amulet';
  rarity: Rarity;
  tier: number;
  level: number;
  description: string;
  stats: EquipmentTemplateStats;
  sourceSheet: string;
};

type ItemDefinition = {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: Rarity;
  tier: number;
  description: string;
  sourceSheet?: string;
  level?: number;
  templateId?: string;
  codeName?: string;
  minDamage?: number;
  maxDamage?: number;
  attackSpeed?: number;
  defense?: number;
  armor?: number;
  maxHealth?: number;
  maxHp?: number;
  damageBonus?: number;
  dodgeBonus?: number;
  dodgeChance?: number;
  hpBonus?: number;
  healthRegen?: number;
  accuracy?: number;
  critChance?: number;
  critDamage?: number;
  attackSpeedBonus?: number;
  armorPenetration?: number;
  stunChance?: number;
  bleedChance?: number;
  stunResist?: number;
  bleedResist?: number;
  blockChance?: number;
  blockValue?: number;
  blockPower?: number;
  damageReduction?: number;
  lifeSteal?: number;
  goldFindBonus?: number;
  lootChanceBonus?: number;
  rarityFindBonus?: number;
  durabilityLossReduction?: number;
};

type SlotConfig = {
  slot: EquipmentItemDefinition['slot'];
  category: ItemCategory;
  codePrefix: string;
  names: readonly string[];
  description: string;
  statsByLevel: readonly EquipmentTemplateStats[];
  itemType: string;
};

const TIER_NAMES = [
  'Початковий',
  'Укріплений',
  'Міцний',
  'Вартовий',
  'Загартований',
  'Сталевий',
  'Ветеранський',
  'Темнолісий',
  'Попелястий',
  'Чемпіонський',
  'Ваельморський'
] as const;

const WEAPON_SPEED = 1.0;

const SLOT_CONFIGS: readonly SlotConfig[] = [
  {
    slot: 'weapon',
    category: 'weapon',
    codePrefix: 'weapon_blade',
    names: TIER_NAMES.map((name) => `${name} клинок`),
    description: 'Зброя ближнього бою зі стабільною шкодою та простором для афіксів наступу.',
    itemType: 'Weapon',
    statsByLevel: [
      { minDamage: 8, maxDamage: 12, attackSpeed: WEAPON_SPEED },
      { minDamage: 9, maxDamage: 14, attackSpeed: WEAPON_SPEED },
      { minDamage: 11, maxDamage: 17, attackSpeed: WEAPON_SPEED },
      { minDamage: 13, maxDamage: 20, attackSpeed: WEAPON_SPEED },
      { minDamage: 16, maxDamage: 23, attackSpeed: WEAPON_SPEED },
      { minDamage: 18, maxDamage: 27, attackSpeed: WEAPON_SPEED },
      { minDamage: 22, maxDamage: 32, attackSpeed: WEAPON_SPEED },
      { minDamage: 25, maxDamage: 38, attackSpeed: WEAPON_SPEED },
      { minDamage: 30, maxDamage: 45, attackSpeed: WEAPON_SPEED },
      { minDamage: 35, maxDamage: 53, attackSpeed: WEAPON_SPEED },
      { minDamage: 42, maxDamage: 63, attackSpeed: WEAPON_SPEED }
    ]
  },
  {
    slot: 'head',
    category: 'head',
    codePrefix: 'head_helmet',
    names: TIER_NAMES.map((name) => `${name} шолом`),
    description: 'Шолом із базовою бронею та запасом здоровʼя.',
    itemType: 'Head',
    statsByLevel: [
      { armor: 4, maxHp: 12 },
      { armor: 5, maxHp: 14 },
      { armor: 6, maxHp: 17 },
      { armor: 7, maxHp: 21 },
      { armor: 8, maxHp: 25 },
      { armor: 9, maxHp: 30 },
      { armor: 11, maxHp: 36 },
      { armor: 13, maxHp: 43 },
      { armor: 15, maxHp: 52 },
      { armor: 18, maxHp: 62 },
      { armor: 21, maxHp: 74 }
    ]
  },
  {
    slot: 'chest',
    category: 'armor',
    codePrefix: 'chest_armor',
    names: TIER_NAMES.map((name) => `${name} нагрудник`),
    description: 'Основний броньовий слот із найбільшим внеском у виживання.',
    itemType: 'Chest',
    statsByLevel: [
      { armor: 10 },
      { armor: 12 },
      { armor: 14 },
      { armor: 16 },
      { armor: 19 },
      { armor: 23 },
      { armor: 27 },
      { armor: 32 },
      { armor: 38 },
      { armor: 44 },
      { armor: 52 }
    ]
  },
  {
    slot: 'hands',
    category: 'hands',
    codePrefix: 'hands_gloves',
    names: TIER_NAMES.map((name) => `${name} рукавиці`),
    description: 'Рукавиці з базовою бронею та бонусом влучності.',
    itemType: 'Hands',
    statsByLevel: [
      { armor: 3, accuracy: 0.02 },
      { armor: 4, accuracy: 0.025 },
      { armor: 4, accuracy: 0.03 },
      { armor: 5, accuracy: 0.035 },
      { armor: 6, accuracy: 0.04 },
      { armor: 7, accuracy: 0.045 },
      { armor: 8, accuracy: 0.05 },
      { armor: 10, accuracy: 0.055 },
      { armor: 11, accuracy: 0.06 },
      { armor: 13, accuracy: 0.065 },
      { armor: 16, accuracy: 0.07 }
    ]
  },
  {
    slot: 'legs',
    category: 'legs',
    codePrefix: 'legs_pants',
    names: TIER_NAMES.map((name) => `${name} поножі`),
    description: 'Поножі з бронею та додатковим запасом здоровʼя.',
    itemType: 'Legs',
    statsByLevel: [
      { armor: 6, maxHp: 10 },
      { armor: 7, maxHp: 12 },
      { armor: 8, maxHp: 14 },
      { armor: 10, maxHp: 17 },
      { armor: 12, maxHp: 21 },
      { armor: 14, maxHp: 25 },
      { armor: 16, maxHp: 30 },
      { armor: 19, maxHp: 36 },
      { armor: 23, maxHp: 43 },
      { armor: 27, maxHp: 52 },
      { armor: 31, maxHp: 62 }
    ]
  },
  {
    slot: 'feet',
    category: 'feet',
    codePrefix: 'feet_boots',
    names: TIER_NAMES.map((name) => `${name} чоботи`),
    description: 'Чоботи з мобільністю та базовим шансом ухилення.',
    itemType: 'Feet',
    statsByLevel: [
      { armor: 4, dodgeChance: 0.01 },
      { armor: 5, dodgeChance: 0.013 },
      { armor: 6, dodgeChance: 0.016 },
      { armor: 7, dodgeChance: 0.019 },
      { armor: 8, dodgeChance: 0.022 },
      { armor: 9, dodgeChance: 0.025 },
      { armor: 11, dodgeChance: 0.028 },
      { armor: 13, dodgeChance: 0.031 },
      { armor: 15, dodgeChance: 0.034 },
      { armor: 18, dodgeChance: 0.037 },
      { armor: 21, dodgeChance: 0.04 }
    ]
  },
  {
    slot: 'shield',
    category: 'shield',
    codePrefix: 'shield_guard',
    names: TIER_NAMES.map((name) => `${name} щит`),
    description: 'Щит із бронею, шансом блоку та силою блоку.',
    itemType: 'Shield',
    statsByLevel: [
      { armor: 8, blockChance: 0.05, blockPower: 6 },
      { armor: 9, blockChance: 0.055, blockPower: 7 },
      { armor: 11, blockChance: 0.06, blockPower: 8 },
      { armor: 13, blockChance: 0.065, blockPower: 10 },
      { armor: 16, blockChance: 0.07, blockPower: 12 },
      { armor: 18, blockChance: 0.075, blockPower: 14 },
      { armor: 22, blockChance: 0.08, blockPower: 16 },
      { armor: 25, blockChance: 0.085, blockPower: 19 },
      { armor: 30, blockChance: 0.09, blockPower: 23 },
      { armor: 35, blockChance: 0.095, blockPower: 27 },
      { armor: 42, blockChance: 0.1, blockPower: 31 }
    ]
  },
  {
    slot: 'ring',
    category: 'ring',
    codePrefix: 'ring_band',
    names: TIER_NAMES.map((name) => `${name} перстень`),
    description: 'Перстень для build-defining первинного рола та додаткових афіксів.',
    itemType: 'Ring',
    statsByLevel: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]
  },
  {
    slot: 'amulet',
    category: 'amulet',
    codePrefix: 'amulet_charm',
    names: TIER_NAMES.map((name) => `${name} амулет`),
    description: 'Амулет із запасом здоровʼя та потужним primary roll.',
    itemType: 'Amulet',
    statsByLevel: [
      { maxHp: 8 },
      { maxHp: 10 },
      { maxHp: 12 },
      { maxHp: 14 },
      { maxHp: 17 },
      { maxHp: 20 },
      { maxHp: 24 },
      { maxHp: 29 },
      { maxHp: 34 },
      { maxHp: 41 },
      { maxHp: 50 }
    ]
  }
] as const;

function padLevel(level: number): string {
  return String(level).padStart(2, '0');
}

function makeTemplateId(slot: string, level: number): string {
  return `${slot}_${padLevel(level)}`;
}

function itemIdFromConfig(config: SlotConfig, level: number): string {
  return `${config.codePrefix}_lvl_${padLevel(level)}`;
}

function statSummary(slot: SlotConfig['slot'], stats: EquipmentTemplateStats): string {
  if (slot === 'weapon') {
    return `${stats.minDamage}-${stats.maxDamage} шкоди`;
  }

  const pieces: string[] = [];
  if (stats.armor) pieces.push(`+${stats.armor} броні`);
  if (stats.maxHp) pieces.push(`+${stats.maxHp} HP`);
  if (stats.accuracy) pieces.push(`+${Math.round(stats.accuracy * 1000) / 10}% влучності`);
  if (stats.dodgeChance) pieces.push(`+${Math.round(stats.dodgeChance * 1000) / 10}% ухилення`);
  if (stats.blockChance) pieces.push(`+${Math.round(stats.blockChance * 1000) / 10}% блоку`);
  if (stats.blockPower) pieces.push(`+${stats.blockPower} сили блоку`);
  return pieces.join(', ');
}

function toItemDefinition(item: EquipmentItemDefinition): ItemDefinition {
  return {
    id: item.id,
    templateId: item.templateId,
    codeName: item.codeName,
    name: item.name,
    category: item.category,
    rarity: item.rarity,
    tier: item.tier,
    level: item.level,
    description: item.description,
    sourceSheet: item.sourceSheet,
    minDamage: item.stats.minDamage,
    maxDamage: item.stats.maxDamage,
    attackSpeed: item.stats.attackSpeed,
    defense: item.stats.armor ?? 0,
    armor: item.stats.armor ?? 0,
    maxHealth: item.stats.maxHp ?? 0,
    maxHp: item.stats.maxHp ?? 0,
    accuracy: item.stats.accuracy ?? 0,
    dodgeChance: item.stats.dodgeChance ?? 0,
    blockChance: item.stats.blockChance ?? 0,
    blockValue: item.stats.blockPower ?? 0,
    blockPower: item.stats.blockPower ?? 0,
    damageBonus: item.stats.damageBonus ?? 0,
    attackSpeedBonus: item.stats.attackSpeedBonus ?? 0,
    damageReduction: item.stats.damageReduction ?? 0,
    armorPenetration: item.stats.armorPenetration ?? 0,
    healthRegen: item.stats.healthRegen ?? 0
  };
}

export const LIVE_RECIPE_SLOT_PROFILES = [
  {
    slot: 'weapon',
    goldCosts: [12, 18, 30, 44, 58, 78, 102, 132, 168, 214, 278],
    materialSets: [
      [{ id: 'MAT_003', qty: 3 }, { id: 'MAT_001', qty: 2 }],
      [{ id: 'MAT_003', qty: 4 }, { id: 'MAT_002', qty: 2 }, { id: 'MAT_004', qty: 1 }],
      [{ id: 'MAT_003', qty: 5 }, { id: 'MAT_007', qty: 2 }, { id: 'MAT_005', qty: 2 }],
      [{ id: 'MAT_003', qty: 6 }, { id: 'MAT_008', qty: 2 }, { id: 'MAT_009', qty: 2 }],
      [{ id: 'MAT_003', qty: 6 }, { id: 'MAT_008', qty: 2 }, { id: 'MAT_010', qty: 2 }],
      [{ id: 'MAT_003', qty: 7 }, { id: 'MAT_013', qty: 3 }, { id: 'MAT_012', qty: 2 }, { id: 'MAT_023', qty: 1 }],
      [{ id: 'MAT_003', qty: 8 }, { id: 'MAT_013', qty: 3 }, { id: 'MAT_014', qty: 2 }, { id: 'MAT_023', qty: 1 }],
      [{ id: 'MAT_003', qty: 9 }, { id: 'MAT_016', qty: 3 }, { id: 'MAT_015', qty: 2 }, { id: 'MAT_024', qty: 1 }],
      [{ id: 'MAT_003', qty: 10 }, { id: 'MAT_016', qty: 4 }, { id: 'MAT_018', qty: 2 }, { id: 'MAT_023', qty: 1 }],
      [{ id: 'MAT_003', qty: 12 }, { id: 'MAT_019', qty: 4 }, { id: 'MAT_017', qty: 2 }, { id: 'MAT_024', qty: 1 }],
      [{ id: 'MAT_003', qty: 14 }, { id: 'MAT_019', qty: 5 }, { id: 'MAT_020', qty: 1 }, { id: 'MAT_023', qty: 2 }]
    ]
  },
  {
    slot: 'shield',
    goldCosts: [14, 20, 34, 48, 64, 84, 108, 140, 176, 224, 290],
    materialSets: [
      [{ id: 'MAT_003', qty: 3 }, { id: 'MAT_001', qty: 2 }],
      [{ id: 'MAT_003', qty: 4 }, { id: 'MAT_001', qty: 2 }],
      [{ id: 'MAT_003', qty: 5 }, { id: 'MAT_007', qty: 2 }, { id: 'MAT_005', qty: 1 }],
      [{ id: 'MAT_003', qty: 6 }, { id: 'MAT_008', qty: 2 }, { id: 'MAT_009', qty: 2 }],
      [{ id: 'MAT_003', qty: 7 }, { id: 'MAT_008', qty: 3 }, { id: 'MAT_010', qty: 2 }],
      [{ id: 'MAT_003', qty: 8 }, { id: 'MAT_013', qty: 3 }, { id: 'MAT_009', qty: 3 }],
      [{ id: 'MAT_003', qty: 9 }, { id: 'MAT_013', qty: 3 }, { id: 'MAT_014', qty: 1 }, { id: 'MAT_024', qty: 1 }],
      [{ id: 'MAT_003', qty: 10 }, { id: 'MAT_016', qty: 4 }, { id: 'MAT_009', qty: 3 }, { id: 'MAT_024', qty: 1 }],
      [{ id: 'MAT_003', qty: 11 }, { id: 'MAT_016', qty: 4 }, { id: 'MAT_017', qty: 1 }, { id: 'MAT_024', qty: 1 }],
      [{ id: 'MAT_003', qty: 12 }, { id: 'MAT_019', qty: 4 }, { id: 'MAT_016', qty: 2 }, { id: 'MAT_024', qty: 2 }],
      [{ id: 'MAT_003', qty: 14 }, { id: 'MAT_019', qty: 5 }, { id: 'MAT_020', qty: 1 }, { id: 'MAT_024', qty: 2 }]
    ]
  },
  {
    slot: 'chest',
    goldCosts: [16, 24, 38, 54, 70, 92, 118, 152, 190, 240, 308],
    materialSets: [
      [{ id: 'MAT_002', qty: 4 }, { id: 'MAT_001', qty: 3 }],
      [{ id: 'MAT_002', qty: 5 }, { id: 'MAT_001', qty: 3 }, { id: 'MAT_004', qty: 1 }],
      [{ id: 'MAT_002', qty: 6 }, { id: 'MAT_007', qty: 2 }, { id: 'MAT_005', qty: 2 }],
      [{ id: 'MAT_002', qty: 7 }, { id: 'MAT_008', qty: 3 }, { id: 'MAT_009', qty: 2 }],
      [{ id: 'MAT_002', qty: 8 }, { id: 'MAT_008', qty: 3 }, { id: 'MAT_010', qty: 2 }],
      [{ id: 'MAT_002', qty: 9 }, { id: 'MAT_013', qty: 3 }, { id: 'MAT_012', qty: 2 }, { id: 'MAT_011', qty: 1 }],
      [{ id: 'MAT_002', qty: 10 }, { id: 'MAT_013', qty: 3 }, { id: 'MAT_014', qty: 2 }, { id: 'MAT_023', qty: 1 }],
      [{ id: 'MAT_002', qty: 11 }, { id: 'MAT_016', qty: 4 }, { id: 'MAT_015', qty: 2 }, { id: 'MAT_024', qty: 1 }],
      [{ id: 'MAT_002', qty: 12 }, { id: 'MAT_016', qty: 4 }, { id: 'MAT_018', qty: 2 }, { id: 'MAT_023', qty: 1 }],
      [{ id: 'MAT_002', qty: 14 }, { id: 'MAT_019', qty: 5 }, { id: 'MAT_017', qty: 1 }, { id: 'MAT_024', qty: 2 }],
      [{ id: 'MAT_002', qty: 16 }, { id: 'MAT_019', qty: 6 }, { id: 'MAT_020', qty: 1 }, { id: 'MAT_024', qty: 2 }]
    ]
  },
  {
    slot: 'head',
    goldCosts: [12, 18, 28, 40, 54, 72, 94, 122, 154, 196, 252],
    materialSets: [
      [{ id: 'MAT_002', qty: 2 }, { id: 'MAT_001', qty: 2 }],
      [{ id: 'MAT_002', qty: 3 }, { id: 'MAT_001', qty: 2 }, { id: 'MAT_004', qty: 1 }],
      [{ id: 'MAT_002', qty: 4 }, { id: 'MAT_007', qty: 1 }, { id: 'MAT_006', qty: 1 }],
      [{ id: 'MAT_002', qty: 4 }, { id: 'MAT_008', qty: 2 }, { id: 'MAT_009', qty: 1 }],
      [{ id: 'MAT_002', qty: 5 }, { id: 'MAT_008', qty: 2 }, { id: 'MAT_010', qty: 1 }],
      [{ id: 'MAT_002', qty: 6 }, { id: 'MAT_013', qty: 2 }, { id: 'MAT_012', qty: 1 }, { id: 'MAT_011', qty: 1 }],
      [{ id: 'MAT_002', qty: 6 }, { id: 'MAT_013', qty: 2 }, { id: 'MAT_015', qty: 2 }, { id: 'MAT_023', qty: 1 }],
      [{ id: 'MAT_002', qty: 7 }, { id: 'MAT_016', qty: 2 }, { id: 'MAT_014', qty: 1 }, { id: 'MAT_024', qty: 1 }],
      [{ id: 'MAT_002', qty: 8 }, { id: 'MAT_016', qty: 3 }, { id: 'MAT_018', qty: 1 }, { id: 'MAT_023', qty: 1 }],
      [{ id: 'MAT_002', qty: 9 }, { id: 'MAT_019', qty: 3 }, { id: 'MAT_017', qty: 1 }, { id: 'MAT_024', qty: 1 }],
      [{ id: 'MAT_002', qty: 10 }, { id: 'MAT_019', qty: 4 }, { id: 'MAT_020', qty: 1 }, { id: 'MAT_023', qty: 1 }]
    ]
  },
  {
    slot: 'hands',
    goldCosts: [11, 17, 27, 39, 52, 68, 90, 118, 148, 190, 246],
    materialSets: [
      [{ id: 'MAT_002', qty: 2 }, { id: 'MAT_001', qty: 1 }],
      [{ id: 'MAT_002', qty: 3 }, { id: 'MAT_001', qty: 1 }, { id: 'MAT_004', qty: 1 }],
      [{ id: 'MAT_002', qty: 4 }, { id: 'MAT_007', qty: 1 }, { id: 'MAT_005', qty: 1 }],
      [{ id: 'MAT_002', qty: 4 }, { id: 'MAT_008', qty: 2 }, { id: 'MAT_009', qty: 1 }],
      [{ id: 'MAT_002', qty: 5 }, { id: 'MAT_008', qty: 2 }, { id: 'MAT_010', qty: 1 }],
      [{ id: 'MAT_002', qty: 5 }, { id: 'MAT_013', qty: 2 }, { id: 'MAT_012', qty: 1 }, { id: 'MAT_011', qty: 1 }],
      [{ id: 'MAT_002', qty: 6 }, { id: 'MAT_013', qty: 2 }, { id: 'MAT_014', qty: 1 }, { id: 'MAT_023', qty: 1 }],
      [{ id: 'MAT_002', qty: 7 }, { id: 'MAT_016', qty: 2 }, { id: 'MAT_015', qty: 1 }, { id: 'MAT_024', qty: 1 }],
      [{ id: 'MAT_002', qty: 8 }, { id: 'MAT_016', qty: 3 }, { id: 'MAT_018', qty: 1 }, { id: 'MAT_023', qty: 1 }],
      [{ id: 'MAT_002', qty: 9 }, { id: 'MAT_019', qty: 3 }, { id: 'MAT_017', qty: 1 }, { id: 'MAT_024', qty: 1 }],
      [{ id: 'MAT_002', qty: 10 }, { id: 'MAT_019', qty: 4 }, { id: 'MAT_020', qty: 1 }, { id: 'MAT_023', qty: 1 }]
    ]
  },
  {
    slot: 'legs',
    goldCosts: [13, 19, 31, 44, 58, 76, 100, 130, 164, 208, 268],
    materialSets: [
      [{ id: 'MAT_002', qty: 3 }, { id: 'MAT_001', qty: 2 }],
      [{ id: 'MAT_002', qty: 4 }, { id: 'MAT_001', qty: 2 }, { id: 'MAT_004', qty: 1 }],
      [{ id: 'MAT_002', qty: 5 }, { id: 'MAT_007', qty: 2 }, { id: 'MAT_005', qty: 1 }],
      [{ id: 'MAT_002', qty: 5 }, { id: 'MAT_008', qty: 2 }, { id: 'MAT_009', qty: 1 }],
      [{ id: 'MAT_002', qty: 6 }, { id: 'MAT_008', qty: 2 }, { id: 'MAT_010', qty: 2 }],
      [{ id: 'MAT_002', qty: 7 }, { id: 'MAT_013', qty: 2 }, { id: 'MAT_012', qty: 1 }, { id: 'MAT_011', qty: 1 }],
      [{ id: 'MAT_002', qty: 8 }, { id: 'MAT_013', qty: 3 }, { id: 'MAT_014', qty: 1 }, { id: 'MAT_023', qty: 1 }],
      [{ id: 'MAT_002', qty: 9 }, { id: 'MAT_016', qty: 3 }, { id: 'MAT_015', qty: 1 }, { id: 'MAT_024', qty: 1 }],
      [{ id: 'MAT_002', qty: 10 }, { id: 'MAT_016', qty: 3 }, { id: 'MAT_018', qty: 1 }, { id: 'MAT_023', qty: 1 }],
      [{ id: 'MAT_002', qty: 11 }, { id: 'MAT_019', qty: 4 }, { id: 'MAT_017', qty: 1 }, { id: 'MAT_024', qty: 1 }],
      [{ id: 'MAT_002', qty: 12 }, { id: 'MAT_019', qty: 5 }, { id: 'MAT_020', qty: 1 }, { id: 'MAT_024', qty: 1 }]
    ]
  },
  {
    slot: 'feet',
    goldCosts: [11, 17, 27, 39, 52, 68, 90, 118, 148, 190, 246],
    materialSets: [
      [{ id: 'MAT_002', qty: 2 }, { id: 'MAT_001', qty: 2 }],
      [{ id: 'MAT_002', qty: 3 }, { id: 'MAT_001', qty: 2 }, { id: 'MAT_004', qty: 1 }],
      [{ id: 'MAT_002', qty: 4 }, { id: 'MAT_007', qty: 1 }, { id: 'MAT_006', qty: 1 }],
      [{ id: 'MAT_002', qty: 4 }, { id: 'MAT_008', qty: 1 }, { id: 'MAT_009', qty: 1 }],
      [{ id: 'MAT_002', qty: 5 }, { id: 'MAT_008', qty: 2 }, { id: 'MAT_010', qty: 1 }],
      [{ id: 'MAT_002', qty: 5 }, { id: 'MAT_013', qty: 2 }, { id: 'MAT_012', qty: 1 }],
      [{ id: 'MAT_002', qty: 6 }, { id: 'MAT_013', qty: 2 }, { id: 'MAT_015', qty: 2 }, { id: 'MAT_023', qty: 1 }],
      [{ id: 'MAT_002', qty: 7 }, { id: 'MAT_016', qty: 2 }, { id: 'MAT_015', qty: 2 }, { id: 'MAT_024', qty: 1 }],
      [{ id: 'MAT_002', qty: 8 }, { id: 'MAT_016', qty: 2 }, { id: 'MAT_018', qty: 1 }, { id: 'MAT_023', qty: 1 }],
      [{ id: 'MAT_002', qty: 9 }, { id: 'MAT_019', qty: 3 }, { id: 'MAT_017', qty: 1 }, { id: 'MAT_024', qty: 1 }],
      [{ id: 'MAT_002', qty: 10 }, { id: 'MAT_019', qty: 4 }, { id: 'MAT_020', qty: 1 }, { id: 'MAT_023', qty: 1 }]
    ]
  },
  {
    slot: 'ring',
    goldCosts: [10, 16, 28, 40, 56, 76, 100, 130, 166, 212, 274],
    materialSets: [
      [{ id: 'MAT_003', qty: 1 }, { id: 'MAT_004', qty: 1 }],
      [{ id: 'MAT_003', qty: 1 }, { id: 'MAT_004', qty: 2 }],
      [{ id: 'MAT_003', qty: 1 }, { id: 'MAT_005', qty: 1 }, { id: 'MAT_006', qty: 1 }, { id: 'MAT_007', qty: 1 }],
      [{ id: 'MAT_003', qty: 1 }, { id: 'MAT_009', qty: 2 }, { id: 'MAT_008', qty: 1 }],
      [{ id: 'MAT_003', qty: 1 }, { id: 'MAT_010', qty: 2 }, { id: 'MAT_011', qty: 1 }],
      [{ id: 'MAT_003', qty: 1 }, { id: 'MAT_012', qty: 2 }, { id: 'MAT_013', qty: 1 }, { id: 'MAT_011', qty: 1 }],
      [{ id: 'MAT_003', qty: 1 }, { id: 'MAT_015', qty: 2 }, { id: 'MAT_014', qty: 1 }, { id: 'MAT_023', qty: 1 }],
      [{ id: 'MAT_003', qty: 1 }, { id: 'MAT_016', qty: 1 }, { id: 'MAT_015', qty: 2 }, { id: 'MAT_024', qty: 1 }],
      [{ id: 'MAT_003', qty: 1 }, { id: 'MAT_018', qty: 2 }, { id: 'MAT_017', qty: 1 }, { id: 'MAT_023', qty: 1 }],
      [{ id: 'MAT_003', qty: 1 }, { id: 'MAT_019', qty: 2 }, { id: 'MAT_018', qty: 2 }, { id: 'MAT_024', qty: 1 }],
      [{ id: 'MAT_003', qty: 1 }, { id: 'MAT_020', qty: 1 }, { id: 'MAT_019', qty: 2 }, { id: 'MAT_023', qty: 2 }]
    ]
  },
  {
    slot: 'amulet',
    goldCosts: [10, 16, 28, 40, 56, 76, 102, 132, 170, 218, 282],
    materialSets: [
      [{ id: 'MAT_001', qty: 1 }, { id: 'MAT_004', qty: 1 }],
      [{ id: 'MAT_001', qty: 1 }, { id: 'MAT_004', qty: 2 }],
      [{ id: 'MAT_001', qty: 1 }, { id: 'MAT_005', qty: 1 }, { id: 'MAT_007', qty: 1 }],
      [{ id: 'MAT_001', qty: 1 }, { id: 'MAT_009', qty: 1 }, { id: 'MAT_008', qty: 1 }],
      [{ id: 'MAT_001', qty: 1 }, { id: 'MAT_010', qty: 2 }, { id: 'MAT_011', qty: 1 }],
      [{ id: 'MAT_001', qty: 1 }, { id: 'MAT_012', qty: 2 }, { id: 'MAT_013', qty: 1 }, { id: 'MAT_011', qty: 1 }],
      [{ id: 'MAT_001', qty: 1 }, { id: 'MAT_014', qty: 1 }, { id: 'MAT_015', qty: 2 }, { id: 'MAT_023', qty: 1 }],
      [{ id: 'MAT_001', qty: 1 }, { id: 'MAT_016', qty: 1 }, { id: 'MAT_017', qty: 1 }, { id: 'MAT_024', qty: 1 }],
      [{ id: 'MAT_001', qty: 1 }, { id: 'MAT_017', qty: 2 }, { id: 'MAT_018', qty: 1 }, { id: 'MAT_023', qty: 1 }],
      [{ id: 'MAT_001', qty: 1 }, { id: 'MAT_019', qty: 2 }, { id: 'MAT_017', qty: 2 }, { id: 'MAT_024', qty: 1 }],
      [{ id: 'MAT_001', qty: 1 }, { id: 'MAT_020', qty: 1 }, { id: 'MAT_018', qty: 2 }, { id: 'MAT_023', qty: 2 }]
    ]
  }
] as const;

type LiveRecipeSlotProfile = (typeof LIVE_RECIPE_SLOT_PROFILES)[number];

const recipeProfileBySlot = new Map<EquipmentItemDefinition['slot'], LiveRecipeSlotProfile>(
  LIVE_RECIPE_SLOT_PROFILES.map((profile) => [profile.slot, profile])
);

function getRecipeProfile(slot: EquipmentItemDefinition['slot']): LiveRecipeSlotProfile {
  const profile = recipeProfileBySlot.get(slot);
  if (!profile) {
    throw new Error(`Missing live recipe profile for slot: ${slot}`);
  }
  return profile;
}

function recipeMaterialsFor(slot: EquipmentItemDefinition['slot'], level: number): Recipe['materials'] {
  const profile = getRecipeProfile(slot);
  const levelIndex = EQUIPMENT_LEVELS.indexOf(level as (typeof EQUIPMENT_LEVELS)[number]);
  if (levelIndex < 0) {
    throw new Error(`Unsupported equipment level for recipe materials: ${level}`);
  }

  return profile.materialSets[levelIndex].map((material) => ({ ...material }));
}

function goldCostFor(slot: EquipmentItemDefinition['slot'], level: number): number {
  const profile = getRecipeProfile(slot);
  const levelIndex = EQUIPMENT_LEVELS.indexOf(level as (typeof EQUIPMENT_LEVELS)[number]);
  if (levelIndex < 0) {
    throw new Error(`Unsupported equipment level for recipe gold cost: ${level}`);
  }

  return profile.goldCosts[levelIndex];
}

export const equipmentCatalog: EquipmentItemDefinition[] = SLOT_CONFIGS.flatMap((config) =>
  EQUIPMENT_LEVELS.map((level, index) => {
    const stats = config.statsByLevel[index] ?? {};
    return {
      id: itemIdFromConfig(config, level),
      templateId: makeTemplateId(config.slot, level),
      codeName: `${config.codePrefix}_lvl_${padLevel(level)}`,
      name: config.names[index] ?? `${config.slot} ${level}`,
      category: config.category,
      slot: config.slot,
      rarity: 'common',
      tier: index + 1,
      level,
      description: `${config.description} База предмета рівня ${level}: ${statSummary(config.slot, stats)}.`,
      stats,
      sourceSheet: 'Equipment System Scaling'
    };
  })
);

export const equipmentItems: ItemDefinition[] = equipmentCatalog.map(toItemDefinition);

export const weapons: Weapon[] = equipmentCatalog
  .filter((item) => item.slot === 'weapon')
  .map((item) => ({
    id: item.id,
    sourceSheet: item.sourceSheet,
    level: item.level,
    name: item.name,
    type: 'sword',
    archetype: 'blade',
    tier: item.tier,
    rarity: item.rarity,
    minDamage: item.stats.minDamage ?? 1,
    maxDamage: item.stats.maxDamage ?? 2,
    attackSpeed: item.stats.attackSpeed ?? WEAPON_SPEED,
    mainStat: 'strength',
    effect: 'Scales with random offensive affixes.',
    description: item.description,
    healthRegen: 0
  }));

export const armors: Armor[] = equipmentCatalog
  .filter((item) => ['head', 'chest', 'hands', 'legs', 'feet', 'ring', 'amulet'].includes(item.slot))
  .map((item) => ({
    id: item.id,
    sourceSheet: item.sourceSheet,
    level: item.level,
    name: item.name,
    archetype: item.slot,
    type: item.category,
    tier: item.tier,
    rarity: item.rarity,
    armor: item.stats.armor ?? 0,
    defense: item.stats.armor ?? 0,
    damageBonus: item.stats.damageBonus ?? 0,
    dodgeBonus: item.stats.dodgeChance ?? 0,
    hpBonus: 0,
    description: item.description,
    healthRegen: item.stats.healthRegen ?? 0
  }));

export const shields: Shield[] = equipmentCatalog
  .filter((item) => item.slot === 'shield')
  .map((item) => ({
    id: item.id,
    sourceSheet: item.sourceSheet,
    name: item.name,
    type: 'shield',
    tier: item.tier,
    rarity: item.rarity,
    armor: item.stats.armor ?? 0,
    defense: item.stats.armor ?? 0,
    blockChance: item.stats.blockChance ?? 0,
    blockValue: item.stats.blockPower ?? 0,
    maxHealth: item.stats.maxHp ?? 0,
    staggerResist: 0,
    description: item.description
  }));

export const equipmentRecipes: Recipe[] = equipmentCatalog.map((item) => ({
  id: `recipe_${item.codeName}`,
  sourceSheet: 'Equipment System Scaling',
  name: `Креслення: ${item.name}`,
  result: item.id,
  itemType: SLOT_CONFIGS.find((config) => config.slot === item.slot)?.itemType ?? item.slot,
  requiredLevel: item.level,
  tierRaw: String(item.tier),
  tier: item.tier,
  rarity: item.rarity,
  unlockMethod: getRecipeUnlockMethodDescriptor(`recipe_${item.codeName}`),
  recipeSource: getRecipeSourceDescriptor(`recipe_${item.codeName}`),
  station: 'forge',
  materials: recipeMaterialsFor(item.slot, item.level),
  goldCost: goldCostFor(item.slot, item.level),
  successChance: 1,
  outputEffect: `${item.name}: ${statSummary(item.slot, item.stats)}`
}));

export function isEquipmentItemId(itemId: string): boolean {
  return equipmentCatalog.some((item) => item.id.toLowerCase() === itemId.toLowerCase());
}

export function getEquipmentItemDefinition(itemId: string): ItemDefinition | null {
  return equipmentItems.find((item) => item.id.toLowerCase() === itemId.toLowerCase()) ?? null;
}
