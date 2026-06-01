export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | string;
export type WeaponType = string;
export type ArmorType = string;
export type ItemCategory = 'material' | 'weapon' | 'armor' | 'consumable' | 'crafted' | string;

export type CoreStats = {
  strength: number;
  vitality: number;
  agility: number;
};

export type DerivedStats = {
  attackPower: number;
  maxHp: number;
  critChance: number;
  dodgeChance: number;
  accuracy: number;
  healthRegen: number;
};

export type SecondaryStats = {
  defense: number;
  damageBonus: number;
  dodgeBonus: number;
  hpBonus: number;
  flatMaxHealth: number;
  healthRegen: number;
  critDamageBonus: number;
  attackSpeedBonus: number;
  armorPenetration: number;
  lifesteal: number;
  bleedChance: number;
  bleedDamage: number;
  bleedResistance: number;
  staggerPower: number;
  staggerResistance: number;
  poise: number;
  rageFromAttacks: number;
  blockChance: number;
  blockValue: number;
  counterChance: number;
  counterDamage: number;
  executeDamage: number;
  damageReductionHighHp: number;
  lowHpArmorBonus: number;
  bleedTickRate: number;
  bleedRageBonus: number;
};

export type Weapon = {
  id: string;
  sourceSheet?: string;
  level?: number;
  name: string;
  type: WeaponType;
  archetype?: string;
  tier: number;
  rarity: Rarity;
  minDamage: number;
  maxDamage: number;
  damageRange?: string;
  attackSpeed: number;
  mainStat: keyof CoreStats | string;
  primaryBonus?: string;
  effect: string;
  description: string;
  healthRegen?: number;
};

export type Armor = {
  id: string;
  sourceSheet?: string;
  level?: number;
  name: string;
  archetype?: string;
  type: ArmorType;
  tier: number;
  rarity: Rarity;
  armor?: number;
  defense: number;
  bonus?: string;
  damageBonus: number;
  dodgeBonus: number;
  hpBonus: number;
  description: string;
  healthRegen?: number;
};

export type Shield = {
  id: string;
  sourceSheet?: string;
  name: string;
  type: 'shield';
  tier: number;
  rarity: Rarity;
  armor: number;
  defense: number;
  blockChance: number;
  blockValue: number;
  maxHealth: number;
  staggerResist: number;
  description: string;
};

export type Material = {
  id: string;
  sourceSheet?: string;
  name: string;
  tierRaw?: string;
  tier: number;
  rarity: Rarity;
  category?: string;
  levelBand?: string;
  levelRange?: [number, number] | number[];
  primaryUsage?: string;
  stackSize?: number;
  sellValueGold?: number;
  source?: string;
  tags: string[];
  notes?: string;
};

export type Skill = {
  id: string;
  sourceSheet?: string;
  level?: number;
  name: string;
  weaponType?: WeaponType;
  weaponTypes: Array<WeaponType | 'all'>;
  rageCost?: number;
  cooldownSeconds?: number;
  cooldown: number;
  cost: number;
  effect?: string;
  scaling: string;
  tags: string[];
  description: string;
};

export type Enemy = {
  id: string;
  sourceSheet?: string;
  level?: number;
  name: string;
  family?: string;
  archetype?: string;
  levelRange: [number, number] | number[];
  hp: number;
  damageMin?: number;
  damageMax?: number;
  attack: number;
  armor?: number;
  defense: number;
  poise?: number;
  attackSpeed?: number;
  critChance: number;
  bleedResist?: number;
  dodgeChance: number;
  abilities?: string[];
  lootType?: string;
  spawnWeight?: number;
  xp: number;
  gold: number;
  location: string;
  lootTable: string;
  behavior: string;
  description?: string;
  notes: string;
  isScaled?: boolean;
  levelDiff?: number;
  rank?: EncounterRank;
};

export type EncounterRank = 'normal' | 'elite' | 'boss';

export type Location = {
  id: string;
  sourceSheet?: string;
  name: string;
  levelRange: [number, number] | number[];
  region?: string;
  biome: string;
  combatIdentity?: string;
  description: string;
  uniqueLootTheme?: string;
  bossOrKeyEnemy?: string;
  unlockCondition?: string;
  enemies: string[];
  materials: string[];
};

export type LootDrop = {
  id: string;
  chance: number;
  qty: [number, number] | number[];
};

export type LootTable = {
  id: string;
  drops: LootDrop[];
};

export type Recipe = {
  id: string;
  sourceSheet?: string;
  name: string;
  result: string;
  itemType?: string;
  requiredLevel: number;
  tierRaw?: string;
  tier?: number;
  rarity?: Rarity;
  unlockMethod?: string;
  recipeSource?: string;
  station: string;
  materials: Array<{ id: string; qty: number }>;
  goldCost: number;
  successChance: number;
  outputEffect?: string;
};

export type ItemAffixType =
  | 'attackPower'
  | 'maxHealth'
  | 'armor'
  | 'critChance'
  | 'critDamage'
  | 'dodgeChance'
  | 'accuracy'
  | 'healthRegen';

export type ItemAffix = {
  id: string;
  type: ItemAffixType;
  label: string;
  value: number;
  valueType: 'flat' | 'percent';
};

export type InventoryStack = {
  itemId: string;
  qty: number;
  affixes?: ItemAffix[];
  durability?: number;
};

export type EquipmentSlot = 'weapon' | 'shield' | 'head' | 'chest' | 'legs' | 'hands' | 'feet' | 'ring1' | 'ring2' | 'amulet';

export type EquipmentState = {
  weapon: string | null;
  shield: string | null;
  head: string | null;
  chest: string | null;
  legs: string | null;
  hands: string | null;
  feet: string | null;
  ring1: string | null;
  ring2: string | null;
  amulet: string | null;
};

export type HeroState = {
  id: string;
  name: string;
  nameSource?: 'default' | 'telegram' | 'manual';
  level: number;
  xp: number;
  gold: number;
  knownRecipeIds?: string[];
  baseHp: number;
  currentHp: number;
  maxHp: number;
  stats: CoreStats;
  unspentStatPoints: number;
  equippedWeaponId: string;
  equippedArmorId: string;
  equipment: EquipmentState;
  inventory: InventoryStack[];
  equipmentDurability?: Record<string, number>;
  equipmentAffixes?: Record<string, ItemAffix[]>;
  quests?: ActiveQuest[];
  defeatedBossIds?: string[];
};

export type QuestObjectiveType =
  | 'kill_enemy'
  | 'kill_enemy_family'
  | 'collect_material'
  | 'collect_any_material'
  | 'travel_location'
  | 'win_battles'
  | 'craft_item'
  | 'kill_elite'
  | 'kill_boss';

export type QuestStatus =
  | 'active'
  | 'completed'
  | 'claimed';

export type QuestObjective = {
  type: QuestObjectiveType;
  targetId?: string;
  targetFamily?: string;
  required: number;
  current: number;
};

export type QuestReward = {
  gold?: number;
  xp?: number;
  itemIds?: string[];
  materialIds?: string[];
};

export type QuestDefinition = {
  id: string;
  title: string;
  description: string;
  objectives: QuestObjective[];
  rewards: QuestReward;
  requiredLevel?: number;
  locationId?: string;
};

export type ActiveQuest = {
  questId: string;
  status: QuestStatus;
  objectives: QuestObjective[];
};
