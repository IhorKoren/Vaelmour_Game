import { armors } from './armors';
import { items, type ItemDefinition } from './items';
import { weapons } from './weapons';
import type { GeneratedEquipmentItem, InventoryStack } from '../game/types';

export type ResolvedInventoryItem = ItemDefinition & {
  generatedItem?: GeneratedEquipmentItem;
};

function buildGeneratedItemDefinition(
  generatedItem: GeneratedEquipmentItem,
): ResolvedInventoryItem {
  return {
    id: generatedItem.id,
    name: generatedItem.name,
    category: generatedItem.category,
    rarity: generatedItem.rarity,
    tier: generatedItem.tier,
    level: generatedItem.level,
    description: 'Generated equipment drop.',
    generatedItem,
    ...generatedItem.stats,
  };
}

export function resolveBaseItemDefinition(itemId: string): ResolvedInventoryItem | null {
  const normalizedItemId = itemId.toLowerCase();

  const itemMatch = items.find((entry) => entry.id.toLowerCase() === normalizedItemId);

  if (itemMatch) {
    return itemMatch;
  }

  const weaponMatch = weapons.find((entry) => entry.id.toLowerCase() === normalizedItemId);

  if (weaponMatch) {
    return {
      id: weaponMatch.id,
      name: weaponMatch.name,
      category: 'weapon',
      rarity: weaponMatch.rarity,
      tier: weaponMatch.tier,
      description: weaponMatch.description || '',
      level: weaponMatch.level,
      minDamage: weaponMatch.minDamage,
      maxDamage: weaponMatch.maxDamage,
      attackSpeed: weaponMatch.attackSpeed,
      healthRegen: weaponMatch.healthRegen,
      accuracy: weaponMatch.accuracy,
      critChance: weaponMatch.critChance,
      critDamage: weaponMatch.critDamage,
      attackSpeedBonus: weaponMatch.attackSpeedBonus,
      armorPenetration: weaponMatch.armorPenetration,
      damageBonus: weaponMatch.damageBonus,
    };
  }

  const armorMatch = armors.find((entry) => entry.id.toLowerCase() === normalizedItemId);

  if (armorMatch) {
    return {
      id: armorMatch.id,
      name: armorMatch.name,
      category: 'armor',
      rarity: armorMatch.rarity,
      tier: armorMatch.tier,
      description: armorMatch.description || '',
      level: armorMatch.level,
      armor: armorMatch.armor,
      defense: armorMatch.defense,
      damageBonus: armorMatch.damageBonus,
      dodgeBonus: armorMatch.dodgeBonus,
      hpBonus: armorMatch.hpBonus,
      healthRegen: armorMatch.healthRegen,
      accuracy: armorMatch.accuracy,
      critChance: armorMatch.critChance,
      critDamage: armorMatch.critDamage,
      attackSpeedBonus: armorMatch.attackSpeedBonus,
      armorPenetration: armorMatch.armorPenetration,
      dodgeChance: armorMatch.dodgeChance,
      maxHp: armorMatch.maxHp,
      maxHealth: armorMatch.maxHealth,
      damageReduction: armorMatch.damageReduction,
      blockChance: armorMatch.blockChance,
      blockPower: armorMatch.blockPower,
      lifeSteal: armorMatch.lifeSteal,
    };
  }

  return null;
}

export function resolveInventoryItemDefinition(
  stack: InventoryStack,
): ResolvedInventoryItem | null {
  if (stack.generatedItem) {
    return buildGeneratedItemDefinition(stack.generatedItem);
  }

  return resolveBaseItemDefinition(stack.itemId);
}
