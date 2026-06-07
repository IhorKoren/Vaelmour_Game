import { describe, expect, it } from 'vitest';

import { equipmentItems } from '../../data/equipmentCatalog';
import { createInitialHero } from '../createInitialHero';
import type { HeroState } from '../types';
import { equipInventoryItem } from './equipment';
import { canEquipItem, getChestEligibleEquipmentLevels, resolveItemRequiredLevel } from './equipmentRules';

const level18WeaponId =
  equipmentItems.find((item) => item.category === 'weapon' && item.level === 18)?.id ?? 'weapon_blade_lvl_01';

function createHero(overrides: Partial<HeroState> = {}): HeroState {
  return {
    ...createInitialHero(),
    ...overrides,
    equipment: {
      ...createInitialHero().equipment,
      ...overrides.equipment,
    },
    inventory: overrides.inventory ?? createInitialHero().inventory,
    equipmentDurability: {
      ...createInitialHero().equipmentDurability,
      ...overrides.equipmentDurability,
    },
    equipmentAffixes: {
      ...createInitialHero().equipmentAffixes,
      ...overrides.equipmentAffixes,
    },
    equippedGeneratedItems: {
      ...createInitialHero().equippedGeneratedItems,
      ...overrides.equippedGeneratedItems,
    },
  };
}

describe('equipment level rules', () => {
  it('blocks a level 4 hero from equipping a level 18 item and returns the Ukrainian reason', () => {
    const hero = createHero({ level: 4 });
    const requirement = canEquipItem(hero, {
      id: 'generated_weapon_18',
      level: 18,
      tier: 6,
    });

    expect(requirement.canEquip).toBe(false);
    expect(requirement.requiredLevel).toBe(18);
    expect(requirement.heroLevel).toBe(4);
    expect(requirement.reason).toBe('level_too_low');
    expect(requirement.detailLines).toEqual(['Потрібен рівень: 18', 'Ваш рівень: 4']);
    expect(requirement.message).toContain('Потрібен рівень: 18');
    expect(requirement.message).toContain('Ваш рівень: 4');
  });

  it('allows a level 18 hero to equip a level 18 item', () => {
    const hero = createHero({ level: 18 });
    const requirement = canEquipItem(hero, {
      id: 'generated_weapon_18',
      level: 18,
      tier: 6,
    });

    expect(requirement.canEquip).toBe(true);
    expect(requirement.requiredLevel).toBe(18);
    expect(requirement.heroLevel).toBe(18);
  });

  it('derives required level from catalog and generated equipment safely', () => {
    const catalogItem = equipmentItems.find((item) => item.level === 18);
    expect(catalogItem).toBeDefined();
    expect(level18WeaponId).not.toBe('weapon_blade_lvl_01');
    expect(resolveItemRequiredLevel(catalogItem!)).toBe(18);

    expect(resolveItemRequiredLevel({
      id: 'generated_ring_future',
      generatedItem: { level: 21 },
      tier: 7,
    })).toBe(21);

    expect(resolveItemRequiredLevel({
      id: 'legacy_fallback',
      tier: 3,
    })).toBe(3);
  });

  it('keeps the blocked item in inventory and leaves current equipment unchanged', () => {
    const blockedItemId = level18WeaponId;
    const hero = createHero({
      level: 4,
      equipment: {
        ...createInitialHero().equipment,
        weapon: 'weapon_blade_lvl_01',
      },
      equippedWeaponId: 'weapon_blade_lvl_01',
      inventory: [
        {
          itemId: blockedItemId,
          qty: 1,
        },
      ],
    });

    const result = equipInventoryItem(hero, blockedItemId, 0);

    expect(result.equipment.weapon).toBe('weapon_blade_lvl_01');
    expect(result.equippedWeaponId).toBe('weapon_blade_lvl_01');
    expect(result.inventory).toEqual(hero.inventory);
    expect(result.inventory[0]?.itemId).toBe(blockedItemId);
  });

  it('equips the item when the hero level meets the requirement', () => {
    const equippableItemId = level18WeaponId;
    const hero = createHero({
      level: 18,
      equipment: {
        ...createInitialHero().equipment,
        weapon: 'weapon_blade_lvl_01',
      },
      equippedWeaponId: 'weapon_blade_lvl_01',
      inventory: [
        {
          itemId: equippableItemId,
          qty: 1,
        },
      ],
    });

    const result = equipInventoryItem(hero, equippableItemId, 0);

    expect(result.equipment.weapon).toBe(equippableItemId);
    expect(result.equippedWeaponId).toBe(equippableItemId);
    expect(result.inventory.some((stack) => stack.itemId === equippableItemId)).toBe(false);
  });

  it('returns the future chest level windows for representative hero levels', () => {
    expect(getChestEligibleEquipmentLevels(1)).toEqual([1, 3]);
    expect(getChestEligibleEquipmentLevels(4)).toEqual([3, 6]);
    expect(getChestEligibleEquipmentLevels(16)).toEqual([15, 18]);
    expect(getChestEligibleEquipmentLevels(29)).toEqual([27, 30]);
    expect(getChestEligibleEquipmentLevels(30)).toEqual([30]);
  });
});
