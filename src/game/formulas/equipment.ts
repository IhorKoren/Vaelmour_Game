import { weapons } from '../../data/weapons';
import { armors } from '../../data/armors';
import { items } from '../../data/items';
import { shields } from '../../data/shields';
import type { HeroState, EquipmentSlot, Weapon, Armor, Shield, GeneratedEquipmentItem, GeneratedEquipmentStats } from '../types';
import { calculateDerivedStats } from './stats';
import { getGeneratedItemFromHero } from '../equipment/generatedEquipment';


const RING_SLOTS: EquipmentSlot[] = ['ring1', 'ring2'];

function isStackableInventoryItem(itemId: string): boolean {
  const item = items.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase());
  if (!item) {
    return false;
  }

  return getEquippableSlot(item) === null;
}

function getSharedStatsShape(stats: GeneratedEquipmentStats) {
  const s = stats as Record<string, number | undefined>;
  return {
    armor: Number(s.armor ?? s.defense ?? 0),
    defense: Number(s.defense ?? s.armor ?? 0),
    damageBonus: Number(s.damageBonus ?? 0),
    dodgeBonus: Number(s.dodgeBonus ?? s.dodgeChance ?? 0),
    hpBonus: Number(s.hpBonus ?? 0),
    healthRegen: Number(s.healthRegen ?? 0),
    accuracy: Number(s.accuracy ?? 0),
    critChance: Number(s.critChance ?? 0),
    critDamage: Number(s.critDamage ?? 0),
    attackSpeedBonus: Number(s.attackSpeedBonus ?? 0),
    armorPenetration: Number(s.armorPenetration ?? 0),
    dodgeChance: Number(s.dodgeChance ?? 0),
    maxHp: Number(s.maxHp ?? s.maxHealth ?? 0),
    maxHealth: Number(s.maxHealth ?? s.maxHp ?? 0),
    damageReduction: Number(s.damageReduction ?? 0),
    blockChance: Number(s.blockChance ?? 0),
    blockPower: Number(s.blockPower ?? s.blockValue ?? 0),
    lifeSteal: Number(s.lifeSteal ?? 0),
    goldFindBonus: Number(s.goldFindBonus ?? s.goldBonus ?? 0),
    goldBonus: Number(s.goldBonus ?? s.goldFindBonus ?? 0),
    xpBonus: Number(s.xpBonus ?? 0),
    lootChanceBonus: Number(s.lootChanceBonus ?? s.itemFind ?? 0),
    itemFind: Number(s.itemFind ?? s.lootChanceBonus ?? 0),
    rarityFindBonus: Number(s.rarityFindBonus ?? s.rarityFind ?? 0),
    rarityFind: Number(s.rarityFind ?? s.rarityFindBonus ?? 0),
    bleedChance: Number(s.bleedChance ?? 0),
    bleedDamage: Number(s.bleedDamage ?? 0),
    stunChance: Number(s.stunChance ?? 0),
    counterChance: Number(s.counterChance ?? 0),
    thorns: Number(s.thorns ?? 0),
    fireDamage: Number(s.fireDamage ?? 0),
    frostDamage: Number(s.frostDamage ?? 0),
    poisonDamage: Number(s.poisonDamage ?? 0),
    evasion: Number(s.evasion ?? s.dodgeChance ?? 0)
  };
}

function generatedToEquippedShape(item: GeneratedEquipmentItem): Weapon | Armor | Shield {
  const shared = getSharedStatsShape(item.stats);

  if (item.slot === 'weapon') {
    return {
      ...shared,
      id: item.id,
      name: item.name,
      type: 'generated',
      tier: item.tier,
      rarity: item.rarity,
      minDamage: Number(item.stats.minDamage ?? 1),
      maxDamage: Number(item.stats.maxDamage ?? Math.max(2, Number(item.stats.minDamage ?? 1) + 1)),
      attackSpeed: Number(item.stats.attackSpeed ?? 1),
      mainStat: 'strength',
      effect: '',
      description: 'Generated equipment item.'
    } as Weapon;
  }

  if (item.slot === 'shield') {
    return {
      ...shared,
      id: item.id,
      name: item.name,
      type: 'shield',
      tier: item.tier,
      rarity: item.rarity,
      blockValue: Number(item.stats.blockValue ?? item.stats.blockPower ?? 0),
      staggerResist: Number(item.stats.stunResist ?? 0),
      description: 'Generated equipment item.'
    } as Shield;
  }

  return {
    ...shared,
    id: item.id,
    name: item.name,
    type: item.slot,
    tier: item.tier,
    rarity: item.rarity,
    description: 'Generated equipment item.'
  } as Armor;
}

export function getEquippableSlot(item: { id: string; category: string; name?: string }): EquipmentSlot | null {
  const cat = item.category.toLowerCase();
  const id = item.id.toLowerCase();
  if (cat === 'material' || id.startsWith('mat_')) {
    return null;
  }
  const name = (item.name || '').toLowerCase();

  if (cat === 'weapon') return 'weapon';
  if (cat === 'shield') return 'shield';
  if (cat === 'armor') return 'chest';
  if (cat === 'head' || cat === 'helmet') return 'head';
  if (cat === 'chest') return 'chest';
  if (cat === 'legs' || cat === 'leggings') return 'legs';
  if (cat === 'hands' || cat === 'gloves') return 'hands';
  if (cat === 'feet' || cat === 'boots') return 'feet';
  if (cat === 'ring') return 'ring1';
  if (cat === 'amulet' || cat === 'talisman' || cat === 'charm') return 'amulet';

  // Fallback check for crafted items or loose matches
  if (name.includes('hatchet') || name.includes('cleaver') || name.includes('sword') || name.includes('longsword') || name.includes('hammer') || name.includes('warhammer') || name.includes('maul') || name.includes('edge') || name.includes('blade') || name.includes('axe') || name.includes('dagger')) {
    return 'weapon';
  }
  if (name.includes('vest') || name.includes('mail') || name.includes('plate') || name.includes('harness') || name.includes('cuirass') || name.includes('chest') || name.includes('armor')) {
    return 'chest';
  }
  if (name.includes('helm') || name.includes('helmet') || name.includes('hood') || name.includes('crown') || name.includes('cap') || name.includes('head')) {
    return 'head';
  }
  if (name.includes('legs') || name.includes('leggings') || name.includes('pants') || name.includes('greaves') || name.includes('trousers')) {
    return 'legs';
  }
  if (name.includes('gloves') || name.includes('gauntlets') || name.includes('hands') || name.includes('bracers')) {
    return 'hands';
  }
  if ((name.includes('shield') || name.includes('buckler')) && !name.includes('mail')) {
    return 'shield';
  }
  if (name.includes('boots') || name.includes('shoes') || name.includes('feet') || name.includes('soles')) {
    return 'feet';
  }
  if (name.includes('ring') || name.includes('band') || name.includes('seal')) {
    return 'ring1';
  }
  if (name.includes('amulet') || name.includes('necklace') || name.includes('talisman') || name.includes('charm') || name.includes('sigil')) {
    return 'amulet';
  }

  return null;
}

export function getEquippedItemStats(hero: HeroState, slot: EquipmentSlot): Weapon | Armor | Shield | null {
  const itemId = hero.equipment?.[slot] ?? null;
  if (!itemId || itemId.startsWith('fallback_') || itemId.startsWith('blank_')) {
    return null;
  }

  const generated = hero.equippedGeneratedItems?.[slot] ?? getGeneratedItemFromHero(hero, itemId);
  if (generated) {
    return generatedToEquippedShape(generated);
  }

  // 1. Check weapons database
  if (slot === 'weapon') {
    const w = weapons.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase());
    if (w) return w;
  }

  if (slot === 'shield') {
    const shield = shields.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase());
    if (shield) {
      return {
        id: shield.id,
        name: shield.name,
        type: 'shield',
        tier: shield.tier,
        rarity: shield.rarity,
        armor: shield.armor ?? 0,
        defense: shield.armor ?? 0,
        blockChance: shield.blockChance ?? 0,
        blockValue: shield.blockValue ?? 0,
        maxHealth: shield.maxHealth ?? 0,
        staggerResist: shield.staggerResist ?? 0,
        description: shield.description
      };
    }
  }

  // 2. Check armors database
  const a = armors.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase());
  if (a) return a;

  // 3. Fallback: crafted item or loose match in items database
  const it = items.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase());
  if (it) {
    const tier = it.tier || 1;
    const rarity = it.rarity || 'common';
    const description = it.description || '';

    if (slot === 'weapon') {
      return {
        id: it.id,
        name: it.name,
        type: 'crafted',
        tier,
        rarity,
        minDamage: tier * 6,
        maxDamage: tier * 10,
        attackSpeed: 1.0,
        mainStat: 'strength',
        effect: '',
        description
      };
    } else if (slot === 'shield') {
      if (it.blockChance !== undefined) {
        return {
          id: it.id,
          name: it.name,
          type: 'shield',
          tier,
          rarity,
          armor: it.armor !== undefined ? it.armor : (it.defense !== undefined ? it.defense : 0),
          defense: it.defense !== undefined ? it.defense : 0,
          blockChance: it.blockChance,
          blockValue: it.blockValue !== undefined ? it.blockValue : 0,
          maxHealth: it.maxHealth !== undefined ? it.maxHealth : 0,
          staggerResist: it.staggerResist !== undefined ? it.staggerResist : 0,
          description
        };
      }
      return {
        id: it.id,
        name: it.name,
        type: 'shield',
        tier,
        rarity,
        armor: Math.round(tier * 4),
        defense: Math.round(tier * 4),
        blockChance: Number((0.12 + Math.max(0, tier - 1) * 0.015).toFixed(3)),
        blockValue: Math.round(4 + tier * 3),
        maxHealth: Math.round(10 + tier * 8),
        staggerResist: Number((0.08 + Math.max(0, tier - 1) * 0.02).toFixed(3)),
        description
      };
    } else {
      if (
        it.defense !== undefined ||
        it.armor !== undefined ||
        it.damageBonus !== undefined ||
        it.dodgeBonus !== undefined ||
        it.hpBonus !== undefined ||
        it.maxHealth !== undefined ||
        it.healthRegen !== undefined
      ) {
        return {
          id: it.id,
          name: it.name,
          type: slot,
          tier,
          rarity,
          armor: it.armor !== undefined ? it.armor : (it.defense !== undefined ? it.defense : 0),
          defense: it.defense !== undefined ? it.defense : 0,
          damageBonus: it.damageBonus !== undefined ? it.damageBonus : 0,
          dodgeBonus: it.dodgeBonus !== undefined ? it.dodgeBonus : 0,
          hpBonus: it.hpBonus !== undefined ? it.hpBonus : 0,
          maxHealth: it.maxHealth !== undefined ? it.maxHealth : 0,
          healthRegen: it.healthRegen !== undefined ? it.healthRegen : 0,
          description
        } as unknown as Armor;
      }

      // Calculate dynamic values based on slot
      let multiplier = 1.0;
      if (slot === 'head' || slot === 'legs') multiplier = 0.7;
      if (slot === 'hands' || slot === 'feet') multiplier = 0.5;
      if (slot === 'ring1' || slot === 'ring2' || slot === 'amulet') multiplier = 0.2;

      return {
        id: it.id,
        name: it.name,
        type: slot,
        tier,
        rarity,
        armor: Math.round(tier * 5 * multiplier),
        defense: Math.round(tier * 5 * multiplier),
        damageBonus: Number((tier * 0.01 * multiplier).toFixed(3)),
        dodgeBonus: Number((tier * 0.008 * multiplier).toFixed(3)),
        hpBonus: Number((tier * 0.02 * multiplier).toFixed(3)),
        description
      } as unknown as Armor;
    }
  }

  return null;
}

export function getEquippedWeaponStats(hero: HeroState): Weapon {
  const weaponStats = getEquippedItemStats(hero, 'weapon') as Weapon | null;
  if (weaponStats) return weaponStats;

  // Starter fists fallback
  return {
    id: 'fallback_fists',
    name: 'Fists',
    type: 'unarmed',
    tier: 1,
    rarity: 'common',
    minDamage: 1,
    maxDamage: 3,
    attackSpeed: 0.5,
    mainStat: 'strength',
    effect: '',
    description: 'Basic unarmed physical strike.'
  };
}

export function getEquippedArmorStats(hero: HeroState): Armor {
  const armorStats = getEquippedItemStats(hero, 'chest') as Armor | null;
  if (armorStats) return armorStats;

  return {
    id: 'fallback_naked',
    name: 'Cloth Rags',
    type: 'light',
    tier: 1,
    rarity: 'common',
    armor: 0,
    defense: 0,
    damageBonus: 0,
    dodgeBonus: 0,
    hpBonus: 0,
    description: 'Offering zero protection.'
  };
}

export function getEffectiveWeaponStats(hero: HeroState): Weapon {
  return getEquippedWeaponStats(hero);
}

export function getEffectiveArmorStats(hero: HeroState): Armor {
  return getEffectiveItemStats(hero, 'chest') as Armor | null ?? getEquippedArmorStats(hero);
}

export function getEffectiveItemStats(hero: HeroState, slot: EquipmentSlot): Weapon | Armor | Shield | null {
  const item = getEquippedItemStats(hero, slot);
  if (!item) return null;
  return item;
}

export function equipInventoryItem(hero: HeroState, itemId: string, stackIndexOverride?: number): HeroState {
  const locatedStackIndex = stackIndexOverride ?? hero.inventory.findIndex((s) => s.itemId.toLowerCase() === itemId.toLowerCase());
  const locatedStack = locatedStackIndex >= 0 ? hero.inventory[locatedStackIndex] : undefined;
  let item: { id: string; category: string; name?: string } | undefined = locatedStack?.generatedItem
    ? {
        id: locatedStack.generatedItem.id,
        category: locatedStack.generatedItem.category,
        name: locatedStack.generatedItem.name
      }
    : items.find((i) => i.id.toLowerCase() === itemId.toLowerCase());
  if (!item) {
    const w = weapons.find((w) => w.id.toLowerCase() === itemId.toLowerCase());
    if (w) {
      item = { ...w, category: 'weapon' };
    }
  }
  if (!item) {
    const a = armors.find((a) => a.id.toLowerCase() === itemId.toLowerCase());
    if (a) {
      item = { ...a, category: 'armor' };
    }
  }
  if (!item) return hero;

  const baseSlot = getEquippableSlot(item);
  if (!baseSlot) return hero;

  const slot =
    baseSlot === 'ring1'
      ? (RING_SLOTS.find((ringSlot) => hero.equipment[ringSlot] === null) ??
        RING_SLOTS.find((ringSlot) => hero.equipment[ringSlot] && hero.equipment[ringSlot]!.toLowerCase() === itemId.toLowerCase()) ??
        'ring1')
      : baseSlot;

  const stackIndex = locatedStackIndex;
  if (stackIndex === -1 || hero.inventory[stackIndex].qty <= 0) {
    return hero;
  }

  const stack = hero.inventory[stackIndex];
  const itemAffixes = stack.affixes ?? [];
  const itemDurability = stack.generatedItem?.durability ?? stack.durability ?? 100;
  const generatedItem = stack.generatedItem;

  const updatedInventory = hero.inventory.map((s) => ({ ...s }));
  const updatedEquipment = { ...hero.equipment };
  const updatedEquipmentAffixes = { ...hero.equipmentAffixes };
  const updatedEquipmentDurability = { ...hero.equipmentDurability };
  const updatedEquippedGeneratedItems = { ...hero.equippedGeneratedItems };

  updatedInventory[stackIndex].qty -= 1;
  if (updatedInventory[stackIndex].qty <= 0) {
    updatedInventory.splice(stackIndex, 1);
  }

  const prevEquippedId = updatedEquipment[slot];
  const prevDurability = hero.equipmentDurability?.[slot] ?? 100;

  if (prevEquippedId && !prevEquippedId.startsWith('fallback_')) {
    const prevAffixes = hero.equipmentAffixes?.[slot] ?? [];
    const returnedStack: HeroState['inventory'][number] = { itemId: prevEquippedId, qty: 1, affixes: prevAffixes, durability: prevDurability };
    const prevGeneratedItem = hero.equippedGeneratedItems?.[slot] ?? null;
    if (prevGeneratedItem) {
      returnedStack.generatedItem = {
        ...prevGeneratedItem,
        durability: prevDurability,
        affixes: prevAffixes
      } as never;
    }
    if (prevAffixes.length > 0 || !isStackableInventoryItem(prevEquippedId)) {
      updatedInventory.push(returnedStack);
    } else {
      const existingIndex = updatedInventory.findIndex((s) => s.itemId.toLowerCase() === prevEquippedId.toLowerCase() && (!s.affixes || s.affixes.length === 0) && s.durability === undefined);
      if (existingIndex >= 0) {
        updatedInventory[existingIndex].qty += 1;
      } else {
        updatedInventory.push(returnedStack);
      }
    }
  }

  updatedEquipment[slot] = itemId;
  updatedEquipmentAffixes[slot] = itemAffixes;
  updatedEquipmentDurability[slot] = itemDurability;
  updatedEquippedGeneratedItems[slot] = generatedItem ? { ...generatedItem, durability: itemDurability, affixes: itemAffixes } : null;

  let nextEquippedWeaponId = hero.equippedWeaponId;
  let nextEquippedArmorId = hero.equippedArmorId;
  if (slot === 'weapon') {
    nextEquippedWeaponId = itemId;
  } else if (slot === 'chest') {
    nextEquippedArmorId = itemId;
  }

  const nextHeroPartial: HeroState = {
    ...hero,
    equippedWeaponId: nextEquippedWeaponId,
    equippedArmorId: nextEquippedArmorId,
    equipment: updatedEquipment,
    inventory: updatedInventory,
    equipmentAffixes: updatedEquipmentAffixes,
    equipmentDurability: updatedEquipmentDurability,
    equippedGeneratedItems: updatedEquippedGeneratedItems
  };

  const nextDerived = calculateDerivedStats(nextHeroPartial.stats, nextHeroPartial.baseHp, undefined, nextHeroPartial);

  return {
    ...nextHeroPartial,
    maxHp: nextDerived.maxHp,
    currentHp: Math.min(nextDerived.maxHp, hero.currentHp)
  };
}

export function unequipInventoryItem(hero: HeroState, slot: EquipmentSlot): HeroState {
  const itemId = hero.equipment[slot];
  if (!itemId || itemId.startsWith('fallback_')) {
    return hero;
  }

  const updatedEquipment = { ...hero.equipment };
  const updatedInventory = hero.inventory.map((s) => ({ ...s }));
  const updatedEquipmentAffixes = { ...hero.equipmentAffixes };
  const updatedEquipmentDurability = { ...hero.equipmentDurability };
  const updatedEquippedGeneratedItems = { ...hero.equippedGeneratedItems };
  const equippedDurability = hero.equipmentDurability?.[slot] ?? 100;

  updatedEquipment[slot] = null;
  const prevAffixes = hero.equipmentAffixes?.[slot] ?? [];
  const prevGeneratedItem = hero.equippedGeneratedItems?.[slot] ?? null;
  delete updatedEquipmentAffixes[slot];
  delete updatedEquipmentDurability[slot];
  delete updatedEquippedGeneratedItems[slot];

  const returnedStack: HeroState['inventory'][number] = { itemId, qty: 1, affixes: prevAffixes, durability: equippedDurability };
  if (prevGeneratedItem) {
    returnedStack.generatedItem = {
      ...prevGeneratedItem,
      durability: equippedDurability,
      affixes: prevAffixes
    } as never;
  }
  if (prevAffixes.length > 0 || !isStackableInventoryItem(itemId)) {
    updatedInventory.push(returnedStack);
  } else {
    const existingIndex = updatedInventory.findIndex((s) => s.itemId.toLowerCase() === itemId.toLowerCase() && (!s.affixes || s.affixes.length === 0) && s.durability === undefined);
    if (existingIndex >= 0) {
      updatedInventory[existingIndex].qty += 1;
    } else {
      updatedInventory.push(returnedStack);
    }
  }

  let nextEquippedWeaponId = hero.equippedWeaponId;
  let nextEquippedArmorId = hero.equippedArmorId;
  if (slot === 'weapon') {
    nextEquippedWeaponId = '';
  } else if (slot === 'chest') {
    nextEquippedArmorId = '';
  }

  const nextHeroPartial: HeroState = {
    ...hero,
    equippedWeaponId: nextEquippedWeaponId,
    equippedArmorId: nextEquippedArmorId,
    equipment: updatedEquipment,
    inventory: updatedInventory,
    equipmentAffixes: updatedEquipmentAffixes,
    equipmentDurability: updatedEquipmentDurability,
    equippedGeneratedItems: updatedEquippedGeneratedItems
  };

  const nextDerived = calculateDerivedStats(nextHeroPartial.stats, nextHeroPartial.baseHp, undefined, nextHeroPartial);

  return {
    ...nextHeroPartial,
    maxHp: nextDerived.maxHp,
    currentHp: Math.min(nextDerived.maxHp, hero.currentHp)
  };
}

export function applyWeaponDurabilityLoss(hero: HeroState, amount: number = 1): HeroState {
  void amount;
  return hero;
}

export function applyArmorDurabilityLoss(hero: HeroState, amount: number = 1): HeroState {
  void amount;
  return hero;
}

export function getRepairCost(item: Weapon | Armor | Shield, durability: number, maxDurability: number = 100): number {
  void item;
  void durability;
  void maxDurability;
  return 0;
}

export function repairEquippedItem(hero: HeroState, slot: EquipmentSlot): HeroState {
  void slot;
  return hero;
}
