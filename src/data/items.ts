import rawMaterials from './generated/materials.json';
import { equipmentItems } from './equipmentCatalog';
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

export const items: ItemDefinition[] = [...materialItems, ...equipmentItems];
