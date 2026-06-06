import { items } from '../../data/items';
import { normalizeLegacyMaterialId } from '../../data/legacyMaterialMap';
import { locations } from '../../data/locations';
import { recipes } from '../../data/recipes';
import type {
  EquipmentSlot,
  EquipmentState,
  GeneratedEquipmentItem,
  InventoryStack,
  ItemAffix,
} from '../types';

const VALID_EQUIPMENT_SLOTS: EquipmentSlot[] = [
  'weapon',
  'shield',
  'head',
  'chest',
  'legs',
  'hands',
  'feet',
  'ring1',
  'ring2',
  'amulet',
];

const VALID_EQUIPMENT_SLOT_SET = new Set<string>(VALID_EQUIPMENT_SLOTS);
const VALID_ITEM_IDS = new Set(items.map((item) => item.id.toLowerCase()));
const VALID_LOCATION_IDS = new Set(locations.map((location) => location.id));
const VALID_RECIPE_IDS = new Set(recipes.map((recipe) => recipe.id));
const VALID_AFFIX_VALUE_TYPES = new Set(['flat', 'percent']);

const MAX_LEVEL = 999;
const MAX_XP = 1_000_000_000;
const MAX_GOLD = 1_000_000_000;
const MAX_HP = 1_000_000_000;
const MAX_INVENTORY_STACKS = 250;
const MAX_STACK_QTY = 999;
const MAX_AFFIXES_PER_ITEM = 8;

type SanitizedSavePayload = {
  hero: Record<string, unknown>;
  selectedLocationId: string;
  changes: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, parsed));
}

function sanitizeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function isGeneratedItemId(value: string): boolean {
  return value.startsWith('generated_');
}

function isValidKnownItemId(value: string): boolean {
  return VALID_ITEM_IDS.has(normalizeLegacyMaterialId(value).toLowerCase());
}

function sanitizeAffix(value: unknown): ItemAffix | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = sanitizeString(value.id).trim();
  const type = sanitizeString(value.type).trim();
  const label = sanitizeString(value.label).trim();
  const rawValueType = sanitizeString(value.valueType).trim();

  if (!id || !type || !label || !VALID_AFFIX_VALUE_TYPES.has(rawValueType)) {
    return null;
  }

  const affixValue = Number(value.value);

  if (!Number.isFinite(affixValue)) {
    return null;
  }

  return {
    id,
    type: type as ItemAffix['type'],
    label,
    value: affixValue,
    valueType: rawValueType as ItemAffix['valueType'],
  };
}

function sanitizeAffixArray(value: unknown): ItemAffix[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => sanitizeAffix(entry))
    .filter((entry): entry is ItemAffix => entry !== null)
    .slice(0, MAX_AFFIXES_PER_ITEM);
}

function sanitizeGeneratedEquipmentItem(value: unknown): GeneratedEquipmentItem | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = sanitizeString(value.id).trim();
  const templateId = sanitizeString(value.templateId).trim();
  const slot = sanitizeString(value.slot).trim();
  const name = sanitizeString(value.name).trim();
  const category = sanitizeString(value.category).trim();
  const rarity = sanitizeString(value.rarity).trim();

  if (
    !id ||
    !templateId ||
    !name ||
    !category ||
    !rarity ||
    !VALID_EQUIPMENT_SLOT_SET.has(slot) ||
    (!isGeneratedItemId(id) && !isGeneratedItemId(templateId))
  ) {
    return undefined;
  }

  const stats = isRecord(value.stats) ? { ...value.stats } : {};
  const source = isRecord(value.source) ? { ...value.source } : undefined;

  return {
    id,
    templateId,
    name,
    category,
    slot: slot as EquipmentSlot,
    level: clampNumber(value.level, 1, MAX_LEVEL, 1),
    tier: clampNumber(value.tier, 1, MAX_LEVEL, 1),
    tierIndex: clampNumber(value.tierIndex, 0, MAX_LEVEL, 0),
    rarity,
    stats,
    affixes: sanitizeAffixArray(value.affixes),
    durability: clampNumber(value.durability, 0, 100, 100),
    maxDurability: clampNumber(value.maxDurability, 1, 100, 100),
    source: source as GeneratedEquipmentItem['source'],
  };
}

function sanitizeInventoryStack(value: unknown): InventoryStack | null {
  if (!isRecord(value)) {
    return null;
  }

  const generatedItem = sanitizeGeneratedEquipmentItem(value.generatedItem);
  const itemId = sanitizeString(value.itemId).trim();
  const normalizedItemId = generatedItem?.id ?? itemId;

  if (!normalizedItemId) {
    return null;
  }

  if (!generatedItem && !isValidKnownItemId(normalizedItemId)) {
    return null;
  }

  const stack: InventoryStack = {
    itemId: normalizedItemId,
    qty: clampNumber(value.qty, 1, MAX_STACK_QTY, 1),
  };

  const affixes = sanitizeAffixArray(value.affixes);

  if (affixes.length > 0) {
    stack.affixes = affixes;
  }

  if (value.durability !== undefined) {
    stack.durability = clampNumber(value.durability, 0, 100, 100);
  }

  if (value.rerollCount !== undefined) {
    stack.rerollCount = clampNumber(value.rerollCount, 0, 10_000, 0);
  }

  if (generatedItem) {
    stack.generatedItem = generatedItem;
    stack.itemId = generatedItem.id;
  }

  return stack;
}

function sanitizeEquipmentState(value: unknown): EquipmentState {
  const rawEquipment = isRecord(value) ? value : {};

  const equipment = {} as EquipmentState;

  for (const slot of VALID_EQUIPMENT_SLOTS) {
    const rawValue = rawEquipment[slot];

    if (typeof rawValue !== 'string' || rawValue.trim() === '') {
      equipment[slot] = null;
      continue;
    }

    const sanitizedValue = rawValue.trim();

    equipment[slot] =
      isValidKnownItemId(sanitizedValue) || isGeneratedItemId(sanitizedValue)
        ? sanitizedValue
        : null;
  }

  return equipment;
}

function sanitizeSlotNumberMap(value: unknown): Partial<Record<EquipmentSlot, number>> {
  if (!isRecord(value)) {
    return {};
  }

  const result: Partial<Record<EquipmentSlot, number>> = {};

  for (const slot of VALID_EQUIPMENT_SLOTS) {
    if (value[slot] === undefined) {
      continue;
    }

    result[slot] = clampNumber(value[slot], 0, 100, 100);
  }

  return result;
}

function sanitizeSlotAffixMap(value: unknown): Partial<Record<EquipmentSlot, ItemAffix[]>> {
  if (!isRecord(value)) {
    return {};
  }

  const result: Partial<Record<EquipmentSlot, ItemAffix[]>> = {};

  for (const slot of VALID_EQUIPMENT_SLOTS) {
    if (value[slot] === undefined) {
      continue;
    }

    result[slot] = sanitizeAffixArray(value[slot]);
  }

  return result;
}

function sanitizeEquippedGeneratedItems(
  value: unknown,
): Partial<Record<EquipmentSlot, GeneratedEquipmentItem | null>> {
  if (!isRecord(value)) {
    return {};
  }

  const result: Partial<Record<EquipmentSlot, GeneratedEquipmentItem | null>> = {};

  for (const slot of VALID_EQUIPMENT_SLOTS) {
    const entry = value[slot];

    if (entry === undefined) {
      continue;
    }

    if (entry === null) {
      result[slot] = null;
      continue;
    }

    const generatedItem = sanitizeGeneratedEquipmentItem(entry);

    if (generatedItem) {
      result[slot] = generatedItem;
    }
  }

  return result;
}

export function sanitizeCloudSavePayload(
  heroValue: unknown,
  selectedLocationIdValue: unknown,
  existingHeroValue: unknown,
): SanitizedSavePayload {
  const hero = isRecord(heroValue) ? heroValue : {};
  const existingHero = isRecord(existingHeroValue) ? existingHeroValue : {};
  const changes: string[] = [];

  const inventorySource = Array.isArray(hero.inventory)
    ? hero.inventory
    : Array.isArray(existingHero.inventory)
      ? existingHero.inventory
      : [];

  const sanitizedInventory = inventorySource
    .map((entry) => sanitizeInventoryStack(entry))
    .filter((entry): entry is InventoryStack => entry !== null)
    .slice(0, MAX_INVENTORY_STACKS);

  if (
    Array.isArray(hero.inventory) &&
    (sanitizedInventory.length !== hero.inventory.length ||
      sanitizedInventory.length === MAX_INVENTORY_STACKS)
  ) {
    changes.push('inventory_sanitized');
  }

  const equipment = sanitizeEquipmentState(hero.equipment ?? existingHero.equipment);
  const level = clampNumber(hero.level ?? existingHero.level, 1, MAX_LEVEL, 1);
  const xp = clampNumber(hero.xp ?? existingHero.xp, 0, MAX_XP, 0);
  const gold = clampNumber(hero.gold ?? existingHero.gold, 0, MAX_GOLD, 0);
  const baseHp = clampNumber(hero.baseHp ?? existingHero.baseHp, 1, MAX_HP, 100);
  const maxHp = clampNumber(hero.maxHp ?? existingHero.maxHp, 1, MAX_HP, baseHp);
  const currentHp = clampNumber(
    hero.currentHp ?? existingHero.currentHp,
    0,
    maxHp,
    maxHp,
  );

  const fallbackLocationId =
    typeof existingHero.selectedLocationId === 'string' &&
    VALID_LOCATION_IDS.has(existingHero.selectedLocationId)
      ? existingHero.selectedLocationId
      : locations[0]?.id ?? 'LOC_001';

  const selectedLocationId =
    typeof selectedLocationIdValue === 'string' && VALID_LOCATION_IDS.has(selectedLocationIdValue)
      ? selectedLocationIdValue
      : typeof hero.selectedLocationId === 'string' && VALID_LOCATION_IDS.has(hero.selectedLocationId)
        ? hero.selectedLocationId
        : fallbackLocationId;

  if (
    selectedLocationIdValue !== undefined &&
    typeof selectedLocationIdValue === 'string' &&
    !VALID_LOCATION_IDS.has(selectedLocationIdValue)
  ) {
    changes.push('selected_location_clamped');
  }

  const knownRecipeIds = Array.isArray(hero.knownRecipeIds)
    ? hero.knownRecipeIds.filter(
        (value): value is string =>
          typeof value === 'string' && VALID_RECIPE_IDS.has(value),
      )
    : Array.isArray(existingHero.knownRecipeIds)
      ? existingHero.knownRecipeIds.filter(
          (value): value is string =>
            typeof value === 'string' && VALID_RECIPE_IDS.has(value),
        )
      : undefined;

  const sanitizedHero: Record<string, unknown> = {
    ...existingHero,
    ...hero,
    level,
    xp,
    gold,
    baseHp,
    maxHp,
    currentHp,
    selectedLocationId,
    inventory: sanitizedInventory,
    equipment,
    knownRecipeIds,
    equipmentDurability: sanitizeSlotNumberMap(
      hero.equipmentDurability ?? existingHero.equipmentDurability,
    ),
    equipmentAffixes: sanitizeSlotAffixMap(
      hero.equipmentAffixes ?? existingHero.equipmentAffixes,
    ),
    equippedGeneratedItems: sanitizeEquippedGeneratedItems(
      hero.equippedGeneratedItems ?? existingHero.equippedGeneratedItems,
    ),
  };

  if (typeof sanitizedHero.equippedWeaponId === 'string') {
    const weaponId = sanitizedHero.equippedWeaponId;
    if (!isValidKnownItemId(weaponId) && !isGeneratedItemId(weaponId)) {
      sanitizedHero.equippedWeaponId = '';
      changes.push('equipped_weapon_sanitized');
    }
  }

  if (typeof sanitizedHero.equippedArmorId === 'string') {
    const armorId = sanitizedHero.equippedArmorId;
    if (!isValidKnownItemId(armorId) && !isGeneratedItemId(armorId)) {
      sanitizedHero.equippedArmorId = '';
      changes.push('equipped_armor_sanitized');
    }
  }

  if (Array.isArray(hero.knownRecipeIds) && knownRecipeIds?.length !== hero.knownRecipeIds.length) {
    changes.push('known_recipes_sanitized');
  }

  if (
    gold !== Number(hero.gold ?? existingHero.gold) ||
    xp !== Number(hero.xp ?? existingHero.xp) ||
    level !== Number(hero.level ?? existingHero.level) ||
    maxHp !== Number(hero.maxHp ?? existingHero.maxHp) ||
    currentHp !== Number(hero.currentHp ?? existingHero.currentHp)
  ) {
    changes.push('numeric_fields_clamped');
  }

  return {
    hero: sanitizedHero,
    selectedLocationId,
    changes,
  };
}
