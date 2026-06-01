import { SAVE_KEY } from '../constants';
import { calculateDerivedStats } from '../formulas/stats';
import type { HeroState, ItemAffix, ActiveQuest } from '../types';
import { initializeQuests } from '../formulas/quests';

export type GameSave = {
  hero: HeroState;
  updatedAt: string;
};

const HEALTH_REGEN_INTERVAL_MS = 5000;
const SAVE_DEBOUNCE_MS = 800;
let pendingSaveTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingSaveSnapshot: GameSave | null = null;

/**
 * Normalizes any loaded HeroState to guarantee it adheres to current types,
 * preventing app crashes due to missing affix collections or nested arrays.
 */
export function normalizeHeroState(savedHero: unknown): HeroState {
  if (!savedHero) return savedHero as HeroState;

  const heroObj = savedHero as Record<string, unknown>;
  const rawEquipmentAffixes = (heroObj.equipmentAffixes ?? {}) as Record<string, ItemAffix[]>;
  const equipmentAffixes: Record<string, ItemAffix[]> = {
    ...rawEquipmentAffixes
  };
  if (!equipmentAffixes.ring1 && rawEquipmentAffixes.ring) {
    equipmentAffixes.ring1 = rawEquipmentAffixes.ring;
  }

  const rawDurability = (heroObj.equipmentDurability ?? {}) as Record<string, number>;
  const equipmentDurability: Record<string, number> = {
    ...rawDurability
  };
  if (equipmentDurability.ring1 === undefined && rawDurability.ring !== undefined) {
    equipmentDurability.ring1 = rawDurability.ring;
  }
  
  const rawInventory = (heroObj.inventory ?? []) as Array<Record<string, unknown>>;
  const inventory = rawInventory.map((stack) => {
    return {
      itemId: String(stack.itemId ?? ''),
      qty: Number(stack.qty ?? 0),
      affixes: (stack.affixes ?? []) as ItemAffix[],
      durability: typeof stack.durability === 'number' ? Number(stack.durability) : undefined
    };
  });

  const level = Number(heroObj.level ?? 1);
  const defaultQuests = initializeQuests(level);
  const savedQuests = (heroObj.quests ?? []) as ActiveQuest[];
  const savedQuestMap = new Map(savedQuests.map((quest) => [quest.questId, quest]));
  let quests = defaultQuests.map((quest) => savedQuestMap.get(quest.questId) ?? quest);
  
  // Auto-migrate active quest QST_004 targetId from 'thornrot_forest' to 'LOC_002' for compatibility
  quests = quests.map((q) => {
    if (q.questId === 'QST_004') {
      return {
        ...q,
        objectives: q.objectives.map((o) => {
          if (o.type === 'travel_location' && o.targetId === 'thornrot_forest') {
            return { ...o, targetId: 'LOC_002' };
          }
          return o;
        })
      };
    }
    return q;
  });

  const defeatedBossIds = (heroObj.defeatedBossIds ?? []) as string[];

  return {
    ...heroObj,
    equipment: {
      weapon: heroObj.equipment && typeof heroObj.equipment === 'object' ? String((heroObj.equipment as Record<string, unknown>).weapon ?? '') || null : null,
      shield: heroObj.equipment && typeof heroObj.equipment === 'object' ? String((heroObj.equipment as Record<string, unknown>).shield ?? '') || null : null,
      head: heroObj.equipment && typeof heroObj.equipment === 'object' ? String((heroObj.equipment as Record<string, unknown>).head ?? '') || null : null,
      chest: heroObj.equipment && typeof heroObj.equipment === 'object' ? String((heroObj.equipment as Record<string, unknown>).chest ?? '') || null : null,
      legs: heroObj.equipment && typeof heroObj.equipment === 'object' ? String((heroObj.equipment as Record<string, unknown>).legs ?? '') || null : null,
      hands: heroObj.equipment && typeof heroObj.equipment === 'object' ? String((heroObj.equipment as Record<string, unknown>).hands ?? '') || null : null,
      feet: heroObj.equipment && typeof heroObj.equipment === 'object' ? String((heroObj.equipment as Record<string, unknown>).feet ?? '') || null : null,
      ring1:
        heroObj.equipment && typeof heroObj.equipment === 'object'
          ? String(
              (heroObj.equipment as Record<string, unknown>).ring1 ??
                (heroObj.equipment as Record<string, unknown>).ring ??
                ''
            ) || null
          : null,
      ring2:
        heroObj.equipment && typeof heroObj.equipment === 'object'
          ? String((heroObj.equipment as Record<string, unknown>).ring2 ?? '') || null
          : null,
      amulet: heroObj.equipment && typeof heroObj.equipment === 'object' ? String((heroObj.equipment as Record<string, unknown>).amulet ?? '') || null : null
    },
    inventory,
    equipmentAffixes,
    equipmentDurability,
    quests,
    defeatedBossIds
  } as unknown as HeroState;
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

export function applyOfflineHealthRegen(save: GameSave | null, now = Date.now()): GameSave | null {
  if (!save?.hero) return save;

  const savedAt = Date.parse(save.updatedAt);
  if (Number.isNaN(savedAt) || now <= savedAt) return save;

  const hero = normalizeHeroState(save.hero);
  if (hero.currentHp <= 0) return { ...save, hero };

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

  const elapsedTicks = Math.floor((now - savedAt) / HEALTH_REGEN_INTERVAL_MS);
  if (elapsedTicks <= 0) {
    return {
      ...save,
      hero: {
        ...hero,
        maxHp: derived.maxHp
      }
    };
  }

  const healedHp = Math.min(derived.maxHp, hero.currentHp + elapsedTicks * derived.healthRegen);
  return {
    hero: {
      ...hero,
      currentHp: healedHp,
      maxHp: derived.maxHp
    },
    updatedAt: new Date(now).toISOString()
  };
}
