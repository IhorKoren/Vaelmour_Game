import type { EquipmentSlot, HeroState, SecondaryStats } from '../types';
import { armors } from '../../data/armors';
import { items } from '../../data/items';
import { weapons } from '../../data/weapons';
import { shields } from '../../data/shields';
import { clamp } from './stats';

type ItemLike = {
  id?: string;
  name?: string;
  defense?: number;
  armor?: number;
  damageBonus?: number;
  dodgeBonus?: number;
  hpBonus?: number;
  maxHealth?: number;
  healthRegen?: number;
  hpRegen?: number;
  regeneration?: number;
  recovery?: number;
  healthRecovery?: number;
  hpRecovery?: number;
  lifeRegen?: number;
  blockChance?: number;
  blockValue?: number;
  staggerResist?: number;
  description?: string;
  effect?: string;
  primaryBonus?: string;
  tier?: number;
  rarity?: string;
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
  counterChance: 0,
  counterDamage: 0,
  executeDamage: 0,
  damageReductionHighHp: 0,
  lowHpArmorBonus: 0,
  bleedTickRate: 0,
  bleedRageBonus: 0
};

function getSlotMultiplier(slot: EquipmentSlot): number {
  if (slot === 'head' || slot === 'legs') return 0.7;
  if (slot === 'hands' || slot === 'feet') return 0.5;
  if (slot === 'ring1' || slot === 'ring2' || slot === 'amulet') return 0.2;
  return 1;
}

function scaledValue(tier: number, base: number, perTier = base * 0.5): number {
  return base + Math.max(0, tier - 1) * perTier;
}

function parsePercentValue(text: string): number {
  const match = text.match(/([+-]?\d+(?:\.\d+)?)%/);
  if (!match) return 0;
  return Number(match[1]) / 100;
}

function extractItemRegen(item: ItemLike): number {
  const rawItem = item as Record<string, unknown>;
  return Number(
    rawItem.healthRegen ??
    rawItem.hpRegen ??
    rawItem.regeneration ??
    rawItem.recovery ??
    rawItem.healthRecovery ??
    rawItem.hpRecovery ??
    rawItem.lifeRegen ??
    0
  );
}

function getFallbackItemStats(item: { id: string; name: string; description: string; tier: number; rarity: string }, slot: EquipmentSlot): ItemLike {
  const multiplier = getSlotMultiplier(slot);
  return {
    id: item.id,
    name: item.name,
    tier: item.tier,
    rarity: item.rarity,
    description: item.description,
    defense: Math.round(item.tier * 5 * multiplier),
    armor: Math.round(item.tier * 5 * multiplier),
    damageBonus: Number((item.tier * 0.01 * multiplier).toFixed(3)),
    dodgeBonus: Number((item.tier * 0.008 * multiplier).toFixed(3)),
    hpBonus: Number((item.tier * 0.02 * multiplier).toFixed(3)),
    healthRegen: slot === 'ring1' || slot === 'ring2' || slot === 'amulet' ? Math.round(item.tier * 1.5 * multiplier) : 0,
    blockChance: slot === 'shield' ? Number((0.12 + Math.max(0, item.tier - 1) * 0.015).toFixed(3)) : 0,
    blockValue: slot === 'shield' ? Math.round(4 + item.tier * 3) : 0,
    maxHealth: slot === 'shield' ? Math.round(10 + item.tier * 8) : 0,
    staggerResist: slot === 'shield' ? Number((0.08 + Math.max(0, item.tier - 1) * 0.02).toFixed(3)) : 0
  };
}

function resolveEquippedItem(hero: HeroState, slot: EquipmentSlot): ItemLike | null {
  const itemId = hero.equipment?.[slot];
  if (!itemId || itemId.startsWith('fallback_') || itemId.startsWith('blank_')) {
    return null;
  }

  const armor = armors.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase());
  if (armor) return armor;

  const shield = shields.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase());
  if (shield) return shield;

  const weapon = weapons.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase());
  if (weapon) return weapon;

  const item = items.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase());
  if (!item) return null;

  if (
    item.defense !== undefined ||
    item.armor !== undefined ||
    item.damageBonus !== undefined ||
    item.dodgeBonus !== undefined ||
    item.hpBonus !== undefined ||
    item.maxHealth !== undefined ||
    item.healthRegen !== undefined
  ) {
    return item;
  }

  return getFallbackItemStats(
    {
      id: item.id,
      name: item.name,
      description: item.description,
      tier: item.tier,
      rarity: String(item.rarity ?? 'common')
    },
    slot
  );
}

function addTextBonuses(stats: SecondaryStats, item: ItemLike): void {
  const tier = item.tier ?? 1;
  const effectText = `${item.primaryBonus ?? ''} | ${item.effect ?? ''} | ${item.description ?? ''}`.toLowerCase();

  if (effectText.includes('+bleed chance / bleed damage')) {
    stats.bleedChance += scaledValue(tier, 0.03, 0.01);
    stats.bleedDamage += scaledValue(tier, 0.15, 0.05);
  }
  if (effectText.includes('+bleed chance') && !effectText.includes('/ bleed damage')) {
    const parsed = parsePercentValue(effectText);
    stats.bleedChance += parsed > 0 ? parsed : scaledValue(tier, 0.02, 0.01);
  }
  if (effectText.includes('+rage from attacks')) {
    const parsed = parsePercentValue(effectText);
    stats.rageFromAttacks += parsed > 0 ? parsed : scaledValue(tier, 0.03, 0.01);
  }
  if (effectText.includes('+poise')) {
    const parsed = parsePercentValue(effectText);
    stats.poise += parsed > 0 ? parsed : scaledValue(tier, 0.06, 0.02);
  }
  if (effectText.includes('+stagger power')) {
    stats.staggerPower += scaledValue(tier, 0.14, 0.04);
  }
  if (effectText.includes('-stagger duration') || effectText.includes('+stagger resistance')) {
    stats.staggerResistance += scaledValue(tier, 0.15, 0.05);
  }
  if (effectText.includes('+bleed resist') || effectText.includes('+bleed resistance')) {
    stats.bleedResistance += scaledValue(tier, 0.16, 0.04);
  }
  if (effectText.includes('+bleed damage')) {
    stats.bleedDamage += scaledValue(tier, 0.18, 0.05);
  }
  if (effectText.includes('+attack speed')) {
    stats.attackSpeedBonus += scaledValue(tier, 0.06, 0.02);
  }
  if (effectText.includes('+counter chance')) {
    stats.counterChance += scaledValue(tier, 0.08, 0.03);
  }
  if (effectText.includes('+counter damage')) {
    stats.counterDamage += scaledValue(tier, 0.2, 0.05);
  }
  if (effectText.includes('+block efficiency')) {
    stats.blockChance += scaledValue(tier, 0.08, 0.03);
  }
  if (effectText.includes('+execute damage')) {
    stats.executeDamage += scaledValue(tier, 0.22, 0.05);
  }
  if (effectText.includes('+crit and rage')) {
    stats.critDamageBonus += scaledValue(tier, 0.08, 0.02);
    stats.rageFromAttacks += scaledValue(tier, 0.06, 0.02);
  }
  if (effectText.includes('bleeds tick faster')) {
    stats.bleedTickRate += 0.25;
  }
  if (effectText.includes('+damage reduction above 70% hp')) {
    stats.damageReductionHighHp += scaledValue(tier, 0.08, 0.02);
  }
  if (effectText.includes('bleeds trigger bonus rage')) {
    stats.bleedRageBonus += 3 + tier;
  }
  if (effectText.includes('fortified at low hp')) {
    stats.lowHpArmorBonus += scaledValue(tier, 0.1, 0.03);
  }
  if (effectText.includes('+starter damage')) {
    stats.damageBonus += scaledValue(tier, 0.02, 0.01);
  }
}

export function calculateSecondaryStats(hero: HeroState): SecondaryStats {
  const totals: SecondaryStats = { ...EMPTY_SECONDARY_STATS };
  const slots: EquipmentSlot[] = ['head', 'chest', 'legs', 'hands', 'feet', 'ring1', 'ring2', 'amulet', 'shield', 'weapon'];

  for (const slot of slots) {
    const item = resolveEquippedItem(hero, slot);
    if (!item) continue;

    const durability = hero.equipmentDurability?.[slot] ?? 100;
    const factor = durability <= 0 ? 0 : 1;

    totals.defense += Number(item.defense ?? item.armor ?? 0) * factor;
    totals.damageBonus += Number(item.damageBonus ?? 0) * factor;
    totals.dodgeBonus += Number(item.dodgeBonus ?? 0) * factor;
    totals.hpBonus += Number(item.hpBonus ?? 0) * factor;
    totals.flatMaxHealth += Number(item.maxHealth ?? 0) * factor;
    totals.healthRegen += extractItemRegen(item) * factor;
    totals.blockChance += Number(item.blockChance ?? 0) * factor;
    totals.blockValue += Number(item.blockValue ?? 0) * factor;
    totals.staggerResistance += Number(item.staggerResist ?? 0) * factor;

    const textStats = { ...EMPTY_SECONDARY_STATS };
    addTextBonuses(textStats, item);
    for (const [key, value] of Object.entries(textStats) as Array<[keyof SecondaryStats, number]>) {
      totals[key] += value * factor;
    }

    const slotAffixes = hero.equipmentAffixes?.[slot] ?? [];
    for (const affix of slotAffixes) {
      const affixValue = affix.value * factor;
      if (affix.type === 'armor') totals.defense += affixValue;
      if (affix.type === 'critDamage') totals.critDamageBonus += affixValue;
    }
  }

  return {
    ...totals,
    attackSpeedBonus: Math.min(totals.attackSpeedBonus, 0.35),
    armorPenetration: Math.min(totals.armorPenetration, 0.6),
    lifesteal: Math.min(totals.lifesteal, 0.5),
    blockChance: Math.min(totals.blockChance, 0.6),
    counterChance: Math.min(totals.counterChance, 0.75),
    damageReductionHighHp: Math.min(totals.damageReductionHighHp, 0.5)
  };
}

export function getEffectiveAttackSpeed(hero: HeroState, weapon: { attackSpeed: number }): number {
  const stats = calculateSecondaryStats(hero);
  const agilityBonus = hero.stats.agility * 0.0005;
  return weapon.attackSpeed * (1 + clamp(stats.attackSpeedBonus + agilityBonus, 0, 0.35));
}
