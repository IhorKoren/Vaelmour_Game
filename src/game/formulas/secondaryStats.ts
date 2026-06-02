import type { EquipmentSlot, HeroState, SecondaryStats } from '../types';
import { armors } from '../../data/armors';
import { items } from '../../data/items';
import { weapons } from '../../data/weapons';
import { shields } from '../../data/shields';
import { clamp } from './stats';
import { getGeneratedItemFromHero } from '../equipment/generatedEquipment';

type NumericItemStats = {
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
  bleedChance?: number;
  bleedResist?: number;
  stunChance?: number;
  stunResist?: number;
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

const EMPTY_SECONDARY_STATS: SecondaryStats = {
  defense: 0,
  damageBonus: 0,
  dodgeBonus: 0,
  hpBonus: 0,
  flatMaxHealth: 0,
  healthRegen: 0,
  critDamageBonus: 0,
  attackSpeedBonus: 0,
  armorPenetration: 0,
  lifesteal: 0,
  bleedChance: 0,
  bleedDamage: 0,
  bleedResistance: 0,
  staggerPower: 0,
  staggerResistance: 0,
  poise: 0,
  rageFromAttacks: 0,
  blockChance: 0,
  blockValue: 0,
  goldFindBonus: 0,
  lootChanceBonus: 0,
  rarityFindBonus: 0,
  durabilityLossReduction: 0,
  counterChance: 0,
  counterDamage: 0,
  executeDamage: 0,
  damageReductionHighHp: 0,
  lowHpArmorBonus: 0,
  bleedTickRate: 0,
  bleedRageBonus: 0
};

function resolveItem(itemId: string): NumericItemStats | null {
  return (
    (armors.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase()) as NumericItemStats | undefined) ??
    (shields.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase()) as NumericItemStats | undefined) ??
    (weapons.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase()) as NumericItemStats | undefined) ??
    (items.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase()) as NumericItemStats | undefined) ??
    null
  );
}

function resolveItemForHero(hero: HeroState, slot: EquipmentSlot, itemId: string): NumericItemStats | null {
  const generated = hero.equippedGeneratedItems?.[slot] ?? getGeneratedItemFromHero(hero, itemId);
  if (generated) {
    return {
      defense: Number(generated.stats.defense ?? generated.stats.armor ?? 0),
      armor: Number(generated.stats.armor ?? generated.stats.defense ?? 0),
      damageBonus: Number(generated.stats.damageBonus ?? 0),
      dodgeBonus: Number(generated.stats.dodgeBonus ?? generated.stats.dodgeChance ?? 0),
      dodgeChance: Number(generated.stats.dodgeChance ?? 0),
      hpBonus: Number(generated.stats.hpBonus ?? 0),
      maxHealth: Number(generated.stats.maxHealth ?? generated.stats.maxHp ?? 0),
      maxHp: Number(generated.stats.maxHp ?? generated.stats.maxHealth ?? 0),
      healthRegen: Number(generated.stats.healthRegen ?? 0),
      accuracy: Number(generated.stats.accuracy ?? 0),
      critChance: Number(generated.stats.critChance ?? 0),
      critDamage: Number(generated.stats.critDamage ?? 0),
      attackSpeedBonus: Number(generated.stats.attackSpeedBonus ?? 0),
      armorPenetration: Number(generated.stats.armorPenetration ?? 0),
      bleedChance: Number(generated.stats.bleedChance ?? 0),
      bleedResist: Number(generated.stats.bleedResist ?? 0),
      stunChance: Number(generated.stats.stunChance ?? 0),
      stunResist: Number(generated.stats.stunResist ?? 0),
      blockChance: Number(generated.stats.blockChance ?? 0),
      blockValue: Number(generated.stats.blockValue ?? generated.stats.blockPower ?? 0),
      blockPower: Number(generated.stats.blockPower ?? generated.stats.blockValue ?? 0),
      damageReduction: Number(generated.stats.damageReduction ?? 0),
      lifeSteal: Number(generated.stats.lifeSteal ?? 0),
      goldFindBonus: Number(generated.stats.goldFindBonus ?? 0),
      lootChanceBonus: Number(generated.stats.lootChanceBonus ?? 0),
      rarityFindBonus: Number(generated.stats.rarityFindBonus ?? 0),
      durabilityLossReduction: Number(generated.stats.durabilityLossReduction ?? 0)
    };
  }
  return resolveItem(itemId);
}

export function calculateSecondaryStats(hero: HeroState): SecondaryStats {
  const totals: SecondaryStats = { ...EMPTY_SECONDARY_STATS };
  const slots: EquipmentSlot[] = ['head', 'chest', 'legs', 'hands', 'feet', 'ring1', 'ring2', 'amulet', 'shield', 'weapon'];

  for (const slot of slots) {
    const itemId = hero.equipment?.[slot];
    if (!itemId || itemId.startsWith('fallback_') || itemId.startsWith('blank_')) continue;

    const item = resolveItemForHero(hero, slot, itemId);
    if (!item) continue;

    const factor = (hero.equipmentDurability?.[slot] ?? 100) <= 0 ? 0 : 1;

    totals.defense += Number(item.defense ?? item.armor ?? 0) * factor;
    totals.damageBonus += Number(item.damageBonus ?? 0) * factor;
    totals.dodgeBonus += Number(item.dodgeBonus ?? item.dodgeChance ?? 0) * factor;
    totals.hpBonus += Number(item.hpBonus ?? 0) * factor;
    totals.flatMaxHealth += Number(item.maxHealth ?? item.maxHp ?? 0) * factor;
    totals.healthRegen += Number(item.healthRegen ?? 0) * factor;
    totals.critDamageBonus += Number(item.critDamage ?? 0) * factor;
    totals.attackSpeedBonus += Number(item.attackSpeedBonus ?? 0) * factor;
    totals.armorPenetration += Number(item.armorPenetration ?? 0) * factor;
    totals.lifesteal += Number(item.lifeSteal ?? 0) * factor;
    totals.bleedChance += Number(item.bleedChance ?? 0) * factor;
    totals.bleedResistance += Number(item.bleedResist ?? 0) * factor;
    totals.staggerResistance += Number(item.stunResist ?? 0) * factor;
    totals.blockChance += Number(item.blockChance ?? 0) * factor;
    totals.blockValue += Number(item.blockValue ?? item.blockPower ?? 0) * factor;
    totals.damageReductionHighHp += Number(item.damageReduction ?? 0) * factor;
    totals.goldFindBonus += Number(item.goldFindBonus ?? 0) * factor;
    totals.lootChanceBonus += Number(item.lootChanceBonus ?? 0) * factor;
    totals.rarityFindBonus += Number(item.rarityFindBonus ?? 0) * factor;
    totals.durabilityLossReduction += Number(item.durabilityLossReduction ?? 0) * factor;

    const isGenerated = Boolean(hero.equippedGeneratedItems?.[slot]);
    const slotAffixes = isGenerated ? [] : (hero.equipmentAffixes?.[slot] ?? []);
    for (const affix of slotAffixes) {
      const affixValue = affix.value * factor;
      switch (affix.type) {
        case 'armor':
          totals.defense += affixValue;
          break;
        case 'damageBonus':
          totals.damageBonus += affixValue;
          break;
        case 'dodgeChance':
          totals.dodgeBonus += affixValue;
          break;
        case 'maxHealth':
        case 'maxHp':
          totals.flatMaxHealth += affixValue;
          break;
        case 'healthRegen':
          totals.healthRegen += affixValue;
          break;
        case 'critDamage':
          totals.critDamageBonus += affixValue;
          break;
        case 'attackSpeedBonus':
          totals.attackSpeedBonus += affixValue;
          break;
        case 'armorPenetration':
          totals.armorPenetration += affixValue;
          break;
        case 'lifeSteal':
          totals.lifesteal += affixValue;
          break;
        case 'bleedChance':
          totals.bleedChance += affixValue;
          break;
        case 'bleedResist':
          totals.bleedResistance += affixValue;
          break;
        case 'stunResist':
          totals.staggerResistance += affixValue;
          break;
        case 'blockChance':
          totals.blockChance += affixValue;
          break;
        case 'blockPower':
          totals.blockValue += affixValue;
          break;
        case 'damageReduction':
          totals.damageReductionHighHp += affixValue;
          break;
        case 'goldFindBonus':
          totals.goldFindBonus += affixValue;
          break;
        case 'lootChanceBonus':
          totals.lootChanceBonus += affixValue;
          break;
        case 'rarityFindBonus':
          totals.rarityFindBonus += affixValue;
          break;
        case 'durabilityLossReduction':
          totals.durabilityLossReduction += affixValue;
          break;
      }
    }
  }

  return {
    ...totals,
    attackSpeedBonus: clamp(totals.attackSpeedBonus, 0, 0.25),
    armorPenetration: clamp(totals.armorPenetration, 0, 0.6),
    lifesteal: clamp(totals.lifesteal, 0, 0.15),
    blockChance: clamp(totals.blockChance, 0, 0.45),
    damageReductionHighHp: clamp(totals.damageReductionHighHp, 0, 0.65),
    rarityFindBonus: Math.max(0, totals.rarityFindBonus),
    lootChanceBonus: Math.max(0, totals.lootChanceBonus),
    goldFindBonus: Math.max(0, totals.goldFindBonus),
    durabilityLossReduction: clamp(totals.durabilityLossReduction, 0, 0.5)
  };
}

export function getEffectiveAttackSpeed(hero: HeroState, weapon: { attackSpeed: number }): number {
  const stats = calculateSecondaryStats(hero);
  return weapon.attackSpeed * (1 + clamp(stats.attackSpeedBonus, 0, 0.25));
}
