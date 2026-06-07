import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { CharacterScreen } from '../character/CharacterScreen';
import { InventoryScreen } from './InventoryScreen';
import { equipmentItems } from '../../data/equipmentCatalog';
import { createInitialHero } from '../../game/createInitialHero';
import type { HeroState } from '../../game/types';

const level18WeaponId =
  equipmentItems.find((item) => item.category === 'weapon' && item.level === 18)?.id ?? 'weapon_blade_lvl_01';

function createHero(overrides: Partial<HeroState> = {}): HeroState {
  const baseHero = createInitialHero();

  return {
    ...baseHero,
    ...overrides,
    equipment: {
      ...baseHero.equipment,
      ...overrides.equipment,
    },
    inventory: overrides.inventory ?? baseHero.inventory,
    equipmentDurability: {
      ...baseHero.equipmentDurability,
      ...overrides.equipmentDurability,
    },
    equipmentAffixes: {
      ...baseHero.equipmentAffixes,
      ...overrides.equipmentAffixes,
    },
    equippedGeneratedItems: {
      ...baseHero.equippedGeneratedItems,
      ...overrides.equippedGeneratedItems,
    },
  };
}

describe('equipment level UI', () => {
  it('shows required level details and no durability text in the inventory selected item panel', () => {
    expect(level18WeaponId).not.toBe('weapon_blade_lvl_01');
    const hero = createHero({
      level: 4,
      inventory: [
        {
          itemId: level18WeaponId,
          qty: 1,
        },
      ],
    });

    const html = renderToStaticMarkup(
      React.createElement(InventoryScreen, {
        hero,
        onHeroChange: vi.fn(),
      }),
    );

    expect(html).toContain('Рівень предмета');
    expect(html).toContain('Потрібен рівень: 18');
    expect(html).toContain('Ваш рівень: 4');
    expect(html).toContain('Потрібен рівень');
    expect(html).not.toContain('Міцність');
    expect(html).not.toContain('durability');
  });

  it('shows required level details in the character equipment panels for blocked items', () => {
    expect(level18WeaponId).not.toBe('weapon_blade_lvl_01');
    const hero = createHero({
      level: 4,
      inventory: [
        {
          itemId: level18WeaponId,
          qty: 1,
        },
      ],
    });

    const html = renderToStaticMarkup(
      React.createElement(CharacterScreen, {
        hero,
        onHeroChange: vi.fn(),
      }),
    );

    expect(html).toContain('Рівень предмета');
    expect(html).toContain('Потрібен рівень: 18. Ваш рівень: 4');
    expect(html).toContain('Потрібен рівень');
  });
});
