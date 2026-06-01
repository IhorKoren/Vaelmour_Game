import rawData from './generated/items.json';
import minorArmorRawData from './generated/minorArmor.json';
import shieldRawData from './generated/shields.json';
import ringRawData from './generated/rings.json';
import amuletRawData from './generated/amulets.json';
import type { ItemCategory, Rarity } from '../game/types';

export type ItemDefinition = {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: Rarity;
  tier: number;
  description: string;
  defense?: number;
  armor?: number;
  damageBonus?: number;
  dodgeBonus?: number;
  hpBonus?: number;
  maxHealth?: number;
  healthRegen?: number;
  sourceSheet?: string;
  sellValueGold?: number;
  blockChance?: number;
  blockValue?: number;
  staggerResist?: number;
};

const shieldItems: ItemDefinition[] = (shieldRawData as Array<{
  id: string;
  name: string;
  category: 'shield';
  rarity: Rarity;
  tier: number;
  description: string;
  defense?: number;
  armor?: number;
  damageBonus?: number;
  dodgeBonus?: number;
  hpBonus?: number;
  maxHealth?: number;
  healthRegen?: number;
  sourceSheet?: string;
  blockChance?: number;
  blockValue?: number;
  staggerResist?: number;
}>).map((item) => ({
  id: item.id,
  name: item.name,
  category: item.category,
  rarity: item.rarity,
  tier: item.tier,
  description: item.description,
  defense: item.defense,
  armor: item.armor,
  damageBonus: item.damageBonus,
  dodgeBonus: item.dodgeBonus,
  hpBonus: item.hpBonus,
  maxHealth: item.maxHealth,
  healthRegen: item.healthRegen,
  sourceSheet: item.sourceSheet,
  blockChance: item.blockChance,
  blockValue: item.blockValue,
  staggerResist: item.staggerResist
}));

const ringItems: ItemDefinition[] = (ringRawData as Array<{
  id: string;
  name: string;
  category: 'ring';
  rarity: Rarity;
  tier: number;
  description: string;
  defense?: number;
  armor?: number;
  damageBonus?: number;
  dodgeBonus?: number;
  hpBonus?: number;
  maxHealth?: number;
  healthRegen?: number;
  sourceSheet?: string;
}>).map((item) => ({
  id: item.id,
  name: item.name,
  category: item.category,
  rarity: item.rarity,
  tier: item.tier,
  description: item.description,
  defense: item.defense,
  armor: item.armor,
  damageBonus: item.damageBonus,
  dodgeBonus: item.dodgeBonus,
  hpBonus: item.hpBonus,
  maxHealth: item.maxHealth,
  healthRegen: item.healthRegen,
  sourceSheet: item.sourceSheet
}));

const minorArmorItems: ItemDefinition[] = (minorArmorRawData as Array<{
  id: string;
  name: string;
  category: ItemCategory;
  rarity: Rarity;
  tier: number;
  description: string;
  defense?: number;
  armor?: number;
  damageBonus?: number;
  dodgeBonus?: number;
  hpBonus?: number;
  maxHealth?: number;
  healthRegen?: number;
  sourceSheet?: string;
}>).map((item) => ({
  id: item.id,
  name: item.name,
  category: item.category,
  rarity: item.rarity,
  tier: item.tier,
  description: item.description,
  defense: item.defense,
  armor: item.armor,
  damageBonus: item.damageBonus,
  dodgeBonus: item.dodgeBonus,
  hpBonus: item.hpBonus,
  maxHealth: item.maxHealth,
  healthRegen: item.healthRegen,
  sourceSheet: item.sourceSheet
}));

const amuletItems: ItemDefinition[] = (amuletRawData as Array<{
  id: string;
  name: string;
  category: 'amulet';
  rarity: Rarity;
  tier: number;
  description: string;
  defense?: number;
  armor?: number;
  damageBonus?: number;
  dodgeBonus?: number;
  hpBonus?: number;
  maxHealth?: number;
  healthRegen?: number;
  sourceSheet?: string;
}>).map((item) => ({
  id: item.id,
  name: item.name,
  category: item.category,
  rarity: item.rarity,
  tier: item.tier,
  description: item.description,
  defense: item.defense,
  armor: item.armor,
  damageBonus: item.damageBonus,
  dodgeBonus: item.dodgeBonus,
  hpBonus: item.hpBonus,
  maxHealth: item.maxHealth,
  healthRegen: item.healthRegen,
  sourceSheet: item.sourceSheet
}));

export const items: ItemDefinition[] = [...(rawData as ItemDefinition[]), ...shieldItems, ...ringItems, ...minorArmorItems, ...amuletItems];

