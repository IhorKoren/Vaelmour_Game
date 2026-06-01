import { weapons } from '../../data/weapons';
import { armors } from '../../data/armors';
import { items } from '../../data/items';
import { shields } from '../../data/shields';
import type { HeroState, EquipmentSlot, Weapon, Armor, Shield } from '../types';
import { calculateDerivedStats } from './stats';

const RING_SLOTS: EquipmentSlot[] = ['ring1', 'ring2'];

function isStackableInventoryItem(itemId: string): boolean {
  const item = items.find((entry) => entry.id.toLowerCase() === itemId.toLowerCase());
  if (!item) {
    return false;
  }

  return getEquippableSlot(item) === null;
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
  const weapon = getEquippedWeaponStats(hero);
  const durability = hero.equipmentDurability?.weapon ?? 100;
  if (durability <= 0 && !weapon.id.startsWith('fallback_')) {
    return {
      ...weapon,
      minDamage: 0,
      maxDamage: 0
    };
  }
  return weapon;
}

export function getEffectiveArmorStats(hero: HeroState): Armor {
  return getEffectiveItemStats(hero, 'chest') as Armor | null ?? getEquippedArmorStats(hero);
}

export function getEffectiveItemStats(hero: HeroState, slot: EquipmentSlot): Weapon | Armor | Shield | null {
  const item = getEquippedItemStats(hero, slot);
  if (!item) return null;

  const durability = hero.equipmentDurability?.[slot] ?? 100;
  if (durability <= 0 && !item.id.startsWith('fallback_')) {
    if (slot === 'weapon') {
      const w = item as Weapon;
      return {
        ...w,
        minDamage: 0,
        maxDamage: 0
      };
    } else if (slot === 'shield') {
      const s = item as Shield;
      return {
        ...s,
        armor: 0,
        defense: 0,
        blockChance: 0,
        blockValue: 0,
        maxHealth: 0,
        staggerResist: 0
      };
    } else {
      const a = item as Armor;
      return {
        ...a,
        defense: 0,
        armor: 0,
        damageBonus: 0,
        dodgeBonus: 0,
        hpBonus: 0
      };
    }
  }
  return item;
}

export function equipInventoryItem(hero: HeroState, itemId: string, stackIndexOverride?: number): HeroState {
  let item: { id: string; category: string; name?: string } | undefined = items.find((i) => i.id.toLowerCase() === itemId.toLowerCase());
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

  const stackIndex = stackIndexOverride ?? hero.inventory.findIndex((s) => s.itemId.toLowerCase() === itemId.toLowerCase());
  if (stackIndex === -1 || hero.inventory[stackIndex].qty <= 0) {
    return hero;
  }

  const stack = hero.inventory[stackIndex];
  const itemAffixes = stack.affixes ?? [];
  const itemDurability = stack.durability ?? 100;

  const updatedInventory = hero.inventory.map((s) => ({ ...s }));
  const updatedEquipment = { ...hero.equipment };
  const updatedEquipmentAffixes = { ...hero.equipmentAffixes };
  const updatedEquipmentDurability = { ...hero.equipmentDurability };

  updatedInventory[stackIndex].qty -= 1;
  if (updatedInventory[stackIndex].qty <= 0) {
    updatedInventory.splice(stackIndex, 1);
  }

  const prevEquippedId = updatedEquipment[slot];
  const prevDurability = hero.equipmentDurability?.[slot] ?? 100;

  if (prevEquippedId && !prevEquippedId.startsWith('fallback_')) {
    const prevAffixes = hero.equipmentAffixes?.[slot] ?? [];
    const returnedStack = { itemId: prevEquippedId, qty: 1, affixes: prevAffixes, durability: prevDurability };
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
    equipmentDurability: updatedEquipmentDurability
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
  const equippedDurability = hero.equipmentDurability?.[slot] ?? 100;

  updatedEquipment[slot] = null;
  const prevAffixes = hero.equipmentAffixes?.[slot] ?? [];
  delete updatedEquipmentAffixes[slot];
  delete updatedEquipmentDurability[slot];

  const returnedStack = { itemId, qty: 1, affixes: prevAffixes, durability: equippedDurability };
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
    equipmentDurability: updatedEquipmentDurability
  };

  const nextDerived = calculateDerivedStats(nextHeroPartial.stats, nextHeroPartial.baseHp, undefined, nextHeroPartial);

  return {
    ...nextHeroPartial,
    maxHp: nextDerived.maxHp,
    currentHp: Math.min(nextDerived.maxHp, hero.currentHp)
  };
}

export function applyWeaponDurabilityLoss(hero: HeroState, amount: number = 1): HeroState {
  const weapon = getEquippedWeaponStats(hero);
  if (!weapon.id || weapon.id.startsWith('fallback_')) {
    return hero;
  }
  // Only 20% chance to lose durability, reducing wear-and-tear by 80%
  if (Math.random() > 0.20) {
    return hero;
  }
  const currentDurability = hero.equipmentDurability?.weapon ?? 100;
  const nextDurability = Math.max(0, currentDurability - amount);
  return {
    ...hero,
    equipmentDurability: {
      ...hero.equipmentDurability,
      weapon: nextDurability
    }
  };
}

export function applyArmorDurabilityLoss(hero: HeroState, amount: number = 1): HeroState {
  const armorSlots: Array<'head' | 'chest' | 'legs' | 'hands' | 'feet'> = ['head', 'chest', 'legs', 'hands', 'feet'];
  
  const equippedArmorSlots = armorSlots.filter((slot) => {
    const itemId = hero.equipment?.[slot];
    return itemId && !itemId.startsWith('fallback_');
  });

  if (equippedArmorSlots.length === 0) {
    return hero;
  }

  // Only 20% chance to lose durability, reducing wear-and-tear by 80%
  if (Math.random() > 0.20) {
    return hero;
  }

  const rolledSlot = equippedArmorSlots[Math.floor(Math.random() * equippedArmorSlots.length)];
  const currentDurability = hero.equipmentDurability?.[rolledSlot] ?? 100;
  const nextDurability = Math.max(0, currentDurability - amount);

  return {
    ...hero,
    equipmentDurability: {
      ...hero.equipmentDurability,
      [rolledSlot]: nextDurability
    }
  };
}

export function getRepairCost(item: Weapon | Armor | Shield, durability: number, maxDurability: number = 100): number {
  const tier = item.tier ?? 1;
  return Math.ceil((maxDurability - durability) * tier * 0.5);
}

export function repairEquippedItem(hero: HeroState, slot: EquipmentSlot): HeroState {
  const itemId = hero.equipment[slot];
  if (!itemId || itemId.startsWith('fallback_')) {
    return hero;
  }

  const currentDurability = hero.equipmentDurability?.[slot] ?? 100;
  const maxDurability = 100;

  const item = getEquippedItemStats(hero, slot);
  if (!item) {
    return hero;
  }

  const cost = getRepairCost(item, currentDurability, maxDurability);
  if (hero.gold < cost) {
    return hero;
  }

  return {
    ...hero,
    gold: hero.gold - cost,
    equipmentDurability: {
      ...hero.equipmentDurability,
      [slot]: maxDurability
    }
  };
}
