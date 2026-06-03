import {
  createGeneratedEquipmentItem,
  EQUIPMENT_LEVELS
} from './equipment/generatedEquipment';
import { calculateDerivedStats } from './formulas/stats';
import type {
  EquipmentSlot,
  GeneratedEquipmentItem,
  HeroState,
  InventoryStack,
  ItemAffix,
  Rarity
} from './types';

export type AutoEquipPresetRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary';

export type AutoEquipPresetItem = {
  /**
   * Слот, у який буде автоматично одягнута річ.
   *
   * Доступні слоти:
   * weapon, shield, head, chest, hands, legs, feet, ring1, ring2, amulet
   */
  slot: EquipmentSlot;

  /**
   * Рівень предмета.
   *
   * Поточна прогресія екіпіровки:
   * 1, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30.
   *
   * Якщо поставити level: 10, генератор автоматично використає
   * найближчий доступний рівень нижче — level 9.
   */
  level?: number;

  /**
   * Зручний варіант через tier.
   *
   * tier 1 = level 1
   * tier 2 = level 3
   * tier 3 = level 6
   * tier 4 = level 9
   * tier 5 = level 12
   * tier 6 = level 15
   * tier 7 = level 18
   * tier 8 = level 21
   * tier 9 = level 24
   * tier 10 = level 27
   * tier 11 = level 30
   *
   * Якщо вказані і tier, і level — tier має пріоритет.
   */
  tier?: number;

  /**
   * Рідкість предмета.
   *
   * common = 0 випадкових афіксів
   * uncommon = 1 випадковий афікс
   * rare = 2 випадкові афікси
   * epic = 3 випадкові афікси
   * legendary = 4 випадкові афікси
   */
  rarity: AutoEquipPresetRarity;

  /**
   * Необовʼязкова власна назва.
   * Якщо не вказати — гра поставить згенеровану назву.
   */
  name?: string;

  /**
   * Міцність предмета після одягання.
   * Якщо не вказати — буде 100.
   */
  durability?: number;
};

/**
 * true = preset активний.
 * false = preset повністю вимкнений.
 */
export const AUTO_EQUIP_PRESET_ENABLED = false;

/**
 * Міняй це значення кожного разу, коли хочеш,
 * щоб гра заново застосувала preset.
 *
 * Наприклад:
 * 'test_loadout_v1'
 * 'test_loadout_v2'
 * 'epic_level_12_test_v1'
 */
export const AUTO_EQUIP_PRESET_VERSION = 'test_loadout_v1';

/**
 * false = застосувати тільки 1 раз для поточної AUTO_EQUIP_PRESET_VERSION.
 * true = застосовувати при кожному завантаженні героя.
 *
 * Краще залишати false, щоб гра не перезаписувала екіпіровку кожен вхід.
 */
export const AUTO_EQUIP_PRESET_FORCE_REAPPLY_ON_EVERY_LOAD = false;

/**
 * true = старі одягнуті речі повертаються в інвентар.
 * false = старі одягнуті речі просто замінюються.
 */
export const AUTO_EQUIP_PRESET_KEEP_REPLACED_ITEMS_IN_INVENTORY = true;

/**
 * true = після застосування preset герой лікується до нового maxHp.
 * false = currentHp просто обрізається, якщо він більший за новий maxHp.
 */
export const AUTO_EQUIP_PRESET_FULL_HEAL_AFTER_APPLY = true;

const AUTO_EQUIP_PRESET_FLAG = `autoEquipPreset:${AUTO_EQUIP_PRESET_VERSION}`;

/**
 * ОСЬ ТУТ ТИ БАЧИШ І МІНЯЄШ, ЩО ОДІТО НА ГЕРОЇ.
 *
 * Приклади:
 *
 * tier: 3 = предмет 6 рівня
 * rarity: 'rare' = рідкісний предмет
 *
 * Щоб перегенерувати речі після зміни цього списку,
 * зміни AUTO_EQUIP_PRESET_VERSION вище.
 */
export const AUTO_EQUIP_PRESET: AutoEquipPresetItem[] = [
  {
    slot: 'weapon',
    tier: 3,
    rarity: 'rare',
    name: 'Test Rare Blade'
  },
  {
    slot: 'shield',
    tier: 3,
    rarity: 'uncommon',
    name: 'Test Guard Shield'
  },
  {
    slot: 'head',
    tier: 2,
    rarity: 'uncommon'
  },
  {
    slot: 'chest',
    tier: 3,
    rarity: 'rare'
  },
  {
    slot: 'hands',
    tier: 2,
    rarity: 'common'
  },
  {
    slot: 'legs',
    tier: 2,
    rarity: 'common'
  },
  {
    slot: 'feet',
    tier: 2,
    rarity: 'common'
  },
  {
    slot: 'ring1',
    tier: 3,
    rarity: 'rare',
    name: 'Test Ring I'
  },
  {
    slot: 'ring2',
    tier: 2,
    rarity: 'uncommon',
    name: 'Test Ring II'
  },
  {
    slot: 'amulet',
    tier: 3,
    rarity: 'rare',
    name: 'Test Amulet'
  }
];

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeVersionForId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 48);
}

function createSeededRandom(seed: string): () => number {
  let state = 2166136261;

  for (let i = 0; i < seed.length; i += 1) {
    state ^= seed.charCodeAt(i);
    state = Math.imul(state, 16777619);
  }

  return () => {
    state += 0x6d2b79f5;

    let result = state;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);

    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function resolvePresetLevel(preset: AutoEquipPresetItem): number {
  if (typeof preset.tier === 'number') {
    const tierIndex = clampNumber(
      Math.round(preset.tier) - 1,
      0,
      EQUIPMENT_LEVELS.length - 1
    );

    return EQUIPMENT_LEVELS[tierIndex] ?? EQUIPMENT_LEVELS[0];
  }

  if (typeof preset.level === 'number') {
    return clampNumber(Math.round(preset.level), 1, 30);
  }

  return EQUIPMENT_LEVELS[0];
}

function createPresetGeneratedItem(
  preset: AutoEquipPresetItem
): GeneratedEquipmentItem {
  const level = resolvePresetLevel(preset);
  const rarity = preset.rarity as Rarity;
  const safeVersion = normalizeVersionForId(AUTO_EQUIP_PRESET_VERSION);

  const random = createSeededRandom(
    `${AUTO_EQUIP_PRESET_VERSION}:${preset.slot}:${level}:${preset.rarity}`
  );

  const generated = createGeneratedEquipmentItem({
    slot: preset.slot,
    level,
    rarity,
    enemyId: 'AUTO_EQUIP_PRESET',
    enemyName: 'Auto Equip Preset',
    locationId: 'AUTO_EQUIP_PRESET',
    random
  });

  const durability = clampNumber(
    Math.round(preset.durability ?? generated.maxDurability ?? 100),
    0,
    generated.maxDurability ?? 100
  );

  return {
    ...generated,
    id: `auto_${preset.slot}_${level}_${preset.rarity}_${safeVersion}`,
    name: preset.name ?? generated.name,
    durability,
    maxDurability: generated.maxDurability ?? 100
  };
}

function shouldApplyAutoEquipPreset(hero: HeroState): boolean {
  if (!AUTO_EQUIP_PRESET_ENABLED) {
    return false;
  }

  if (AUTO_EQUIP_PRESET_FORCE_REAPPLY_ON_EVERY_LOAD) {
    return true;
  }

  return hero.migrationFlags?.[AUTO_EQUIP_PRESET_FLAG] !== true;
}

function returnPreviousEquippedItemToInventory(params: {
  inventory: InventoryStack[];
  slot: EquipmentSlot;
  previousItemId: string | null;
  previousAffixes: ItemAffix[];
  previousDurability: number;
  previousGeneratedItem?: GeneratedEquipmentItem | null;
}): InventoryStack[] {
  const {
    inventory,
    slot,
    previousItemId,
    previousAffixes,
    previousDurability,
    previousGeneratedItem
  } = params;

  if (
    !previousItemId ||
    previousItemId.startsWith('fallback_') ||
    previousItemId.startsWith('blank_')
  ) {
    return inventory;
  }

  const returnedStack: InventoryStack = {
    itemId: previousItemId,
    qty: 1,
    affixes: previousAffixes,
    durability: previousDurability,
    rerollCount: 0
  };

  if (previousGeneratedItem) {
    returnedStack.generatedItem = {
      ...previousGeneratedItem,
      slot,
      durability: previousDurability,
      affixes: previousAffixes
    };
  }

  return [...inventory, returnedStack];
}

export function applyAutoEquipPreset(hero: HeroState): HeroState {
  if (!shouldApplyAutoEquipPreset(hero)) {
    return hero;
  }

  const equipment = { ...hero.equipment };
  const equipmentAffixes = { ...(hero.equipmentAffixes ?? {}) };
  const equipmentDurability = { ...(hero.equipmentDurability ?? {}) };
  const equippedGeneratedItems = { ...(hero.equippedGeneratedItems ?? {}) };
  const migrationFlags = { ...(hero.migrationFlags ?? {}) };

  let inventory = [...(hero.inventory ?? [])];
  let equippedWeaponId = hero.equippedWeaponId;
  let equippedArmorId = hero.equippedArmorId;

  for (const preset of AUTO_EQUIP_PRESET) {
    const slot = preset.slot;
    const generatedItem = createPresetGeneratedItem(preset);

    if (AUTO_EQUIP_PRESET_KEEP_REPLACED_ITEMS_IN_INVENTORY) {
      inventory = returnPreviousEquippedItemToInventory({
        inventory,
        slot,
        previousItemId: equipment[slot] ?? null,
        previousAffixes: equipmentAffixes[slot] ?? [],
        previousDurability: equipmentDurability[slot] ?? 100,
        previousGeneratedItem: equippedGeneratedItems[slot] ?? null
      });
    }

    equipment[slot] = generatedItem.id;
    equipmentAffixes[slot] = generatedItem.affixes;
    equipmentDurability[slot] = generatedItem.durability;
    equippedGeneratedItems[slot] = generatedItem;

    if (slot === 'weapon') {
      equippedWeaponId = generatedItem.id;
    }

    if (slot === 'chest') {
      equippedArmorId = generatedItem.id;
    }
  }

  migrationFlags[AUTO_EQUIP_PRESET_FLAG] = true;

  const nextHeroPartial: HeroState = {
    ...hero,
    equippedWeaponId,
    equippedArmorId,
    equipment,
    inventory,
    equipmentAffixes,
    equipmentDurability,
    equippedGeneratedItems,
    migrationFlags
  };

  const derived = calculateDerivedStats(
    nextHeroPartial.stats,
    nextHeroPartial.baseHp,
    undefined,
    nextHeroPartial
  );

  return {
    ...nextHeroPartial,
    maxHp: derived.maxHp,
    currentHp: AUTO_EQUIP_PRESET_FULL_HEAL_AFTER_APPLY
      ? derived.maxHp
      : Math.min(nextHeroPartial.currentHp, derived.maxHp)
  };
}