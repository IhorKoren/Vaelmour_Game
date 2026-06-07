import { SAVE_KEY } from '../constants';
import { calculateDerivedStats } from '../formulas/stats';
import type {
  HeroState,
  ItemAffix,
  ActiveQuest,
  EquipmentSlot,
  GeneratedEquipmentItem
} from '../types';
import { initializeQuests } from '../formulas/quests';
import { curatedCraftingQuests } from '../../data/quests';

export type GameSave = {
  hero: HeroState;
  updatedAt: string;
};

const HEALTH_REGEN_INTERVAL_MS = 5000;
const SAVE_DEBOUNCE_MS = 800;

const STARTER_EQUIPMENT_V2_FLAG = 'starterEquipmentV2';

const STARTER_EQUIPMENT_BY_SLOT: Partial<Record<EquipmentSlot, string>> = {
  weapon: 'weapon_blade_lvl_01',
  shield: 'shield_guard_lvl_01',
  head: 'head_helmet_lvl_01',
  chest: 'chest_armor_lvl_01',
  hands: 'hands_gloves_lvl_01',
  legs: 'legs_pants_lvl_01',
  feet: 'feet_boots_lvl_01'
};

const STARTER_EQUIPMENT_SLOTS = Object.keys(
  STARTER_EQUIPMENT_BY_SLOT
) as EquipmentSlot[];

let pendingSaveTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingSaveSnapshot: GameSave | null = null;

/**
 * Normalizes any loaded HeroState to guarantee it adheres to current types,
 * preventing app crashes due to missing affix collections or nested arrays.
 */
export function normalizeHeroState(savedHero: unknown): HeroState {
  if (!savedHero) return savedHero as HeroState;

  const heroObj = savedHero as Record<string, unknown>;

  const rawEquipmentAffixes = (heroObj.equipmentAffixes ?? {}) as Record<
    string,
    ItemAffix[]
  >;

  const equipmentAffixes: Record<string, ItemAffix[]> = {
    ...rawEquipmentAffixes
  };

  if (!equipmentAffixes.ring1 && rawEquipmentAffixes.ring) {
    equipmentAffixes.ring1 = rawEquipmentAffixes.ring;
  }

  const rawDurability = (heroObj.equipmentDurability ?? {}) as Record<
    string,
    number
  >;

  const equipmentDurability: Record<string, number> = {
    ...rawDurability
  };

  if (
    equipmentDurability.ring1 === undefined &&
    rawDurability.ring !== undefined
  ) {
    equipmentDurability.ring1 = rawDurability.ring;
  }

  const rawInventory = (heroObj.inventory ?? []) as Array<
    Record<string, unknown>
  >;

  const inventory = rawInventory.map((stack) => {
    const rawGeneratedItem = stack.generatedItem as
      | GeneratedEquipmentItem
      | undefined;

    return {
      itemId: String(stack.itemId ?? ''),
      qty: Number(stack.qty ?? 0),
      affixes: (stack.affixes ?? []) as ItemAffix[],
      durability:
        typeof stack.durability === 'number'
          ? Number(stack.durability)
          : undefined,
      rerollCount:
        typeof stack.rerollCount === 'number'
          ? Number(stack.rerollCount)
          : 0,
      generatedItem: rawGeneratedItem
        ? {
            ...rawGeneratedItem,
            affixes: (rawGeneratedItem.affixes ?? []) as ItemAffix[],
            stats: { ...(rawGeneratedItem.stats ?? {}) }
          }
        : undefined
    };
  });

  const rawEquippedGeneratedItems = (heroObj.equippedGeneratedItems ?? {}) as Partial<
    Record<EquipmentSlot, GeneratedEquipmentItem | null>
  >;

  const equippedGeneratedItems: Partial<
    Record<EquipmentSlot, GeneratedEquipmentItem | null>
  > = {};

  for (const [slot, generatedItem] of Object.entries(
    rawEquippedGeneratedItems
  )) {
    if (!generatedItem) {
      equippedGeneratedItems[slot as EquipmentSlot] = null;
      continue;
    }

    equippedGeneratedItems[slot as EquipmentSlot] = {
      ...generatedItem,
      affixes: (generatedItem.affixes ?? []) as ItemAffix[],
      stats: { ...(generatedItem.stats ?? {}) }
    };
  }

  const level = Number(heroObj.level ?? 1);
  const savedQuests = (heroObj.quests ?? []) as ActiveQuest[];
  const migrationFlags =
    heroObj.migrationFlags && typeof heroObj.migrationFlags === 'object'
      ? {
          ...(heroObj.migrationFlags as Record<string, boolean>)
        }
      : {};

  let quests: ActiveQuest[];

  if (migrationFlags.craftingQuestChainV1) {
    const defaultQuests = initializeQuests(level);
    const savedQuestMap = new Map(
      savedQuests.map((quest) => [quest.questId, quest])
    );
    quests = defaultQuests.map(
      (quest) => savedQuestMap.get(quest.questId) ?? quest
    );
  } else {
    const curatedIds = new Set(curatedCraftingQuests.map((q) => q.id));
    const nextQuests: ActiveQuest[] = [];

    // 1. Keep and preserve active/completed/claimed curated crafting quests
    for (const q of savedQuests) {
      if (curatedIds.has(q.questId)) {
        nextQuests.push(q);
      }
    }

    // 2. Populate missing curated crafting quests if hero level meets requiredLevel
    for (const curated of curatedCraftingQuests) {
      if (level >= (curated.requiredLevel ?? 1)) {
        const alreadyHas = nextQuests.some((q) => q.questId === curated.id);
        if (!alreadyHas) {
          nextQuests.push({
            questId: curated.id,
            status: 'active',
            objectives: curated.objectives.map((o) => ({ ...o, current: 0 }))
          });
        }
      }
    }

    quests = nextQuests;
    migrationFlags.craftingQuestChainV1 = true;
  }

  const defeatedBossIds = (heroObj.defeatedBossIds ?? []) as string[];

  const rawEquipment =
    heroObj.equipment && typeof heroObj.equipment === 'object'
      ? (heroObj.equipment as Record<string, unknown>)
      : {};

  const normalizedEquipment: HeroState['equipment'] = {
    weapon: String(rawEquipment.weapon ?? '') || null,
    shield: String(rawEquipment.shield ?? '') || null,
    head: String(rawEquipment.head ?? '') || null,
    chest: String(rawEquipment.chest ?? '') || null,
    legs: String(rawEquipment.legs ?? '') || null,
    hands: String(rawEquipment.hands ?? '') || null,
    feet: String(rawEquipment.feet ?? '') || null,
    ring1: String(rawEquipment.ring1 ?? rawEquipment.ring ?? '') || null,
    ring2: String(rawEquipment.ring2 ?? '') || null,
    amulet: String(rawEquipment.amulet ?? '') || null
  };


  if (!migrationFlags[STARTER_EQUIPMENT_V2_FLAG]) {
    for (const slot of STARTER_EQUIPMENT_SLOTS) {
      const starterItemId = STARTER_EQUIPMENT_BY_SLOT[slot];

      if (!starterItemId) continue;

      if (!normalizedEquipment[slot]) {
        normalizedEquipment[slot] = starterItemId;
      }

      if (
        normalizedEquipment[slot] === starterItemId &&
        equipmentDurability[slot] === undefined
      ) {
        equipmentDurability[slot] = 100;
      }

      if (
        normalizedEquipment[slot] === starterItemId &&
        !equipmentAffixes[slot]
      ) {
        equipmentAffixes[slot] = [];
      }
    }

    // Rings and amulet are intentionally NOT given as starter equipment.
    migrationFlags[STARTER_EQUIPMENT_V2_FLAG] = true;
  }

  const normalizedHero = {
    ...heroObj,
    equipment: normalizedEquipment,
    equippedWeaponId:
      normalizedEquipment.weapon ?? String(heroObj.equippedWeaponId ?? ''),
    equippedArmorId:
      normalizedEquipment.chest ?? String(heroObj.equippedArmorId ?? ''),
    inventory,
    equipmentAffixes,
    equipmentDurability,
    equippedGeneratedItems,
    quests,
    defeatedBossIds,
    migrationFlags
  } as unknown as HeroState;

  const derived = calculateDerivedStats(
    normalizedHero.stats,
    normalizedHero.baseHp,
    undefined,
    normalizedHero
  );

  return {
    ...normalizedHero,
    maxHp: derived.maxHp,
    currentHp: Math.min(
      Number(normalizedHero.currentHp ?? derived.maxHp),
      derived.maxHp
    )
  };
}

export function loadGame(): GameSave | null {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);

    if (!raw) {
      return null;
    }

    const save = JSON.parse(raw) as GameSave;

    if (save && save.hero) {
      save.hero = normalizeHeroState(save.hero);
    }

    return applyOfflineHealthRegen(save);
  } catch {
    return null;
  }
}

export function saveGame(save: GameSave): void {
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

export function scheduleSaveGame(save: GameSave): void {
  pendingSaveSnapshot = save;

  if (pendingSaveTimeout) {
    window.clearTimeout(pendingSaveTimeout);
  }

  pendingSaveTimeout = window.setTimeout(() => {
    if (pendingSaveSnapshot) {
      saveGame(pendingSaveSnapshot);
      pendingSaveSnapshot = null;
    }

    pendingSaveTimeout = null;
  }, SAVE_DEBOUNCE_MS);
}

export function flushPendingSaveGame(): void {
  if (pendingSaveTimeout) {
    window.clearTimeout(pendingSaveTimeout);
    pendingSaveTimeout = null;
  }

  if (pendingSaveSnapshot) {
    saveGame(pendingSaveSnapshot);
    pendingSaveSnapshot = null;
  }
}

export function clearGameSave(): void {
  window.localStorage.removeItem(SAVE_KEY);
}

export function applyOfflineHealthRegen(
  save: GameSave | null,
  now = Date.now()
): GameSave | null {
  if (!save?.hero) return save;

  const savedAt = Date.parse(save.updatedAt);

  if (Number.isNaN(savedAt) || now <= savedAt) return save;

  const hero = normalizeHeroState(save.hero);

  if (hero.currentHp <= 0) {
    return {
      ...save,
      hero
    };
  }

  const derived = calculateDerivedStats(hero.stats, hero.baseHp, undefined, hero);

  if (derived.healthRegen <= 0 || hero.currentHp >= derived.maxHp) {
    return {
      ...save,
      hero: {
        ...hero,
        maxHp: derived.maxHp,
        currentHp: Math.min(hero.currentHp, derived.maxHp)
      }
    };
  }

  const elapsedTicks = Math.floor(
    (now - savedAt) / HEALTH_REGEN_INTERVAL_MS
  );

  if (elapsedTicks <= 0) {
    return {
      ...save,
      hero: {
        ...hero,
        maxHp: derived.maxHp
      }
    };
  }

  const healedHp = Math.min(
    derived.maxHp,
    hero.currentHp + elapsedTicks * derived.healthRegen
  );

  return {
    hero: {
      ...hero,
      currentHp: healedHp,
      maxHp: derived.maxHp
    },
    updatedAt: new Date(now).toISOString()
  };
}