import rawMaterials from './generated/materials.json';
import generatedItems from './generated/items.json';
import generatedAmulets from './generated/amulets.json';
import generatedMinorArmor from './generated/minorArmor.json';
import generatedRings from './generated/rings.json';
import generatedShields from './generated/shields.json';
import { equipmentItems } from './equipmentCatalog';
import { normalizeLegacyMaterialId } from './legacyMaterialMap';
import type { ItemCategory, Rarity } from '../game/types';

export type ItemDefinition = {
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
  damageBonus?: number;
  dodgeBonus?: number;
  dodgeChance?: number;
  hpBonus?: number;
  maxHealth?: number;
  maxHp?: number;
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
  staggerResist?: number;
  damageReduction?: number;
  lifeSteal?: number;
  goldFindBonus?: number;
  lootChanceBonus?: number;
  rarityFindBonus?: number;
  durabilityLossReduction?: number;
  sellValueGold?: number;
};

const materialItems: ItemDefinition[] = (rawMaterials as Array<Record<string, unknown>>).map((item) => ({
  id: String(item.id),
  name: String(item.name),
  category: 'material',
  rarity: String(item.rarity ?? 'common'),
  tier: Number(item.tier ?? 1),
  description: String(item.notes ?? item.source ?? item.primaryUsage ?? item.name),
  sourceSheet: String(item.sourceSheet ?? 'Materials'),
  sellValueGold: Number(item.sellValueGold ?? 0)
}));

const supplementalGeneratedItems: ItemDefinition[] = (generatedItems as Array<Record<string, unknown>>).map((item) => ({
  id: String(item.id),
  name: String(item.name),
  category: String(item.category ?? 'crafted'),
  rarity: String(item.rarity ?? 'common'),
  tier: Number(item.tier ?? 1),
  description: String(item.description ?? item.notes ?? item.name ?? ''),
  sourceSheet: String(item.sourceSheet ?? 'Generated Items'),
  level: item.level == null ? undefined : Number(item.level),
  minDamage: item.minDamage == null ? undefined : Number(item.minDamage),
  maxDamage: item.maxDamage == null ? undefined : Number(item.maxDamage),
  attackSpeed: item.attackSpeed == null ? undefined : Number(item.attackSpeed),
  defense: item.defense == null ? undefined : Number(item.defense),
  armor: item.armor == null ? undefined : Number(item.armor),
  damageBonus: item.damageBonus == null ? undefined : Number(item.damageBonus),
  dodgeBonus: item.dodgeBonus == null ? undefined : Number(item.dodgeBonus),
  dodgeChance: item.dodgeChance == null ? undefined : Number(item.dodgeChance),
  hpBonus: item.hpBonus == null ? undefined : Number(item.hpBonus),
  maxHealth: item.maxHealth == null ? undefined : Number(item.maxHealth),
  maxHp: item.maxHp == null ? undefined : Number(item.maxHp),
  healthRegen: item.healthRegen == null ? undefined : Number(item.healthRegen),
  accuracy: item.accuracy == null ? undefined : Number(item.accuracy),
  critChance: item.critChance == null ? undefined : Number(item.critChance),
  critDamage: item.critDamage == null ? undefined : Number(item.critDamage),
  attackSpeedBonus: item.attackSpeedBonus == null ? undefined : Number(item.attackSpeedBonus),
  armorPenetration: item.armorPenetration == null ? undefined : Number(item.armorPenetration),
  blockChance: item.blockChance == null ? undefined : Number(item.blockChance),
  blockValue: item.blockValue == null ? undefined : Number(item.blockValue),
  blockPower: item.blockPower == null ? undefined : Number(item.blockPower),
  damageReduction: item.damageReduction == null ? undefined : Number(item.damageReduction),
  lifeSteal: item.lifeSteal == null ? undefined : Number(item.lifeSteal),
  goldFindBonus: item.goldFindBonus == null ? undefined : Number(item.goldFindBonus),
  lootChanceBonus: item.lootChanceBonus == null ? undefined : Number(item.lootChanceBonus),
  rarityFindBonus: item.rarityFindBonus == null ? undefined : Number(item.rarityFindBonus),
  durabilityLossReduction: item.durabilityLossReduction == null ? undefined : Number(item.durabilityLossReduction),
  sellValueGold: item.sellValueGold == null ? undefined : Number(item.sellValueGold)
}));

function mapGeneratedCatalogItems(data: Array<Record<string, unknown>>): ItemDefinition[] {
  return data.map((item) => ({
    id: String(item.id),
    name: String(item.name),
    category: String(item.category ?? 'crafted'),
    rarity: String(item.rarity ?? 'common'),
    tier: Number(item.tier ?? 1),
    description: String(item.description ?? item.notes ?? item.name ?? ''),
    sourceSheet: String(item.sourceSheet ?? 'Generated Catalog'),
    level: item.level == null ? undefined : Number(item.level),
    defense: item.defense == null ? undefined : Number(item.defense),
    armor: item.armor == null ? undefined : Number(item.armor),
    damageBonus: item.damageBonus == null ? undefined : Number(item.damageBonus),
    dodgeBonus: item.dodgeBonus == null ? undefined : Number(item.dodgeBonus),
    hpBonus: item.hpBonus == null ? undefined : Number(item.hpBonus),
    healthRegen: item.healthRegen == null ? undefined : Number(item.healthRegen),
    blockChance: item.blockChance == null ? undefined : Number(item.blockChance),
    blockValue: item.blockValue == null ? undefined : Number(item.blockValue),
    maxHealth: item.maxHealth == null ? undefined : Number(item.maxHealth),
    damageReduction: item.damageReduction == null ? undefined : Number(item.damageReduction)
  }));
}

const supportCatalogItems = [
  ...mapGeneratedCatalogItems(generatedShields as Array<Record<string, unknown>>),
  ...mapGeneratedCatalogItems(generatedRings as Array<Record<string, unknown>>),
  ...mapGeneratedCatalogItems(generatedAmulets as Array<Record<string, unknown>>),
  ...mapGeneratedCatalogItems(generatedMinorArmor as Array<Record<string, unknown>>)
];

const mergedItems = [
  ...materialItems,
  ...supplementalGeneratedItems,
  ...supportCatalogItems,
  ...equipmentItems
];

export const items: ItemDefinition[] = Array.from(
  mergedItems.reduce((map, item) => {
    const normalizedId = item.id.toLowerCase();
    if (!map.has(normalizedId)) {
      map.set(normalizedId, item);
    }
    return map;
  }, new Map<string, ItemDefinition>()).values(),
);

export function resolveCanonicalItemId(itemId: string): string {
  return normalizeLegacyMaterialId(itemId);
}
