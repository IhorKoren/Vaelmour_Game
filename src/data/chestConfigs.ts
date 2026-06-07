import type { EquipmentSlot, Rarity } from '../game/types';

export type ChestId =
  | 'chest_supply'
  | 'chest_equipment'
  | 'chest_hunter'
  | 'chest_relic'
  | 'chest_slot';

export type ChestPreviewSlot =
  | 'weapon'
  | 'shield'
  | 'head'
  | 'chest'
  | 'hands'
  | 'legs'
  | 'feet'
  | 'ring'
  | 'amulet';

export type ChestRarityWeight = {
  rarity: Rarity;
  weight: number;
};

export type ChestRewardKind = 'materials_only' | 'equipment_and_materials';

export type ChestConfig = {
  id: ChestId;
  nameUk: string;
  descriptionUk: string;
  futurePriceCoins: number;
  rewardKind: ChestRewardKind;
  materialRewardRange: {
    min: number;
    max: number;
  };
  rarityWeights: ChestRarityWeight[];
  minimumRarity?: Rarity;
  allowedSlots?: ChestPreviewSlot[];
  grantsEquipment: boolean;
  allowsChosenSlot: boolean;
  relicsEligible: boolean;
  relicDropChance: number;
  catalystChance: number;
  rareMaterialBonus: boolean;
};

export const CHEST_SLOT_OPTIONS: ChestPreviewSlot[] = [
  'weapon',
  'shield',
  'head',
  'chest',
  'hands',
  'legs',
  'feet',
  'ring',
  'amulet',
];

export const PREVIEW_SLOT_TO_EQUIPMENT_SLOT: Record<ChestPreviewSlot, EquipmentSlot | 'ring'> = {
  weapon: 'weapon',
  shield: 'shield',
  head: 'head',
  chest: 'chest',
  hands: 'hands',
  legs: 'legs',
  feet: 'feet',
  ring: 'ring',
  amulet: 'amulet',
};

export const chestConfigs: ChestConfig[] = [
  {
    id: 'chest_supply',
    nameUk: 'Скриня постачання',
    descriptionUk: 'Лише матеріали для ремесла. Без спорядження, рецептів і реліквій.',
    futurePriceCoins: 10,
    rewardKind: 'materials_only',
    materialRewardRange: { min: 3, max: 6 },
    rarityWeights: [],
    grantsEquipment: false,
    allowsChosenSlot: false,
    relicsEligible: false,
    relicDropChance: 0,
    catalystChance: 0,
    rareMaterialBonus: false,
  },
  {
    id: 'chest_equipment',
    nameUk: 'Скриня спорядження',
    descriptionUk: '1 предмет спорядження та трохи матеріалів. Базова стартова скриня.',
    futurePriceCoins: 35,
    rewardKind: 'equipment_and_materials',
    materialRewardRange: { min: 2, max: 4 },
    rarityWeights: [
      { rarity: 'common', weight: 55 },
      { rarity: 'uncommon', weight: 30 },
      { rarity: 'rare', weight: 12 },
      { rarity: 'epic', weight: 3 },
      { rarity: 'legendary', weight: 0 },
    ],
    minimumRarity: 'common',
    grantsEquipment: true,
    allowsChosenSlot: false,
    relicsEligible: false,
    relicDropChance: 0,
    catalystChance: 0,
    rareMaterialBonus: false,
  },
  {
    id: 'chest_hunter',
    nameUk: 'Скриня мисливця',
    descriptionUk: '1 предмет спорядження від незвичайного, матеріали та малий шанс каталізатора.',
    futurePriceCoins: 75,
    rewardKind: 'equipment_and_materials',
    materialRewardRange: { min: 3, max: 5 },
    rarityWeights: [
      { rarity: 'uncommon', weight: 55 },
      { rarity: 'rare', weight: 32 },
      { rarity: 'epic', weight: 11 },
      { rarity: 'legendary', weight: 2 },
    ],
    minimumRarity: 'uncommon',
    grantsEquipment: true,
    allowsChosenSlot: false,
    relicsEligible: true,
    relicDropChance: 0.35,
    catalystChance: 0.12,
    rareMaterialBonus: false,
  },
  {
    id: 'chest_relic',
    nameUk: 'Скриня реліквій',
    descriptionUk: '1 предмет спорядження від рідкісного, матеріали та шанс на XP-реліквію.',
    futurePriceCoins: 150,
    rewardKind: 'equipment_and_materials',
    materialRewardRange: { min: 4, max: 6 },
    rarityWeights: [
      { rarity: 'rare', weight: 70 },
      { rarity: 'epic', weight: 25 },
      { rarity: 'legendary', weight: 5 },
    ],
    minimumRarity: 'rare',
    grantsEquipment: true,
    allowsChosenSlot: false,
    relicsEligible: true,
    relicDropChance: 1.0,
    catalystChance: 0.3,
    rareMaterialBonus: true,
  },
  {
    id: 'chest_slot',
    nameUk: 'Слот-скриня',
    descriptionUk: 'Дозволить обрати слот майбутнього предмета. Рідкість від незвичайної.',
    futurePriceCoins: 120,
    rewardKind: 'equipment_and_materials',
    materialRewardRange: { min: 2, max: 4 },
    rarityWeights: [
      { rarity: 'uncommon', weight: 45 },
      { rarity: 'rare', weight: 40 },
      { rarity: 'epic', weight: 13 },
      { rarity: 'legendary', weight: 2 },
    ],
    minimumRarity: 'uncommon',
    allowedSlots: CHEST_SLOT_OPTIONS,
    grantsEquipment: true,
    allowsChosenSlot: true,
    relicsEligible: true,
    relicDropChance: 1.5,
    catalystChance: 0,
    rareMaterialBonus: false,
  },
];
