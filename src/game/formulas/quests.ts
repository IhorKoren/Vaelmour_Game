import type { HeroState, ActiveQuest, QuestObjective, EncounterRank } from '../types';
import { questDefinitions } from '../../data/quests';
import { enemies } from '../../data/enemies';

/**
 * Initializes starter quests for a new hero or a loaded hero missing quests.
 */
export function initializeQuests(heroLevel: number = 1): ActiveQuest[] {
  return questDefinitions
    .filter((q) => !q.requiredLevel || heroLevel >= q.requiredLevel)
    .map((q) => {
      return {
        questId: q.id,
        status: 'active',
        objectives: q.objectives.map((o) => ({ ...o, current: 0 }))
      };
    });
}

/**
 * Helper to update objective current counts and mark quest as completed if needed.
 */
function updateObjectives(
  quests: ActiveQuest[],
  updateFn: (obj: QuestObjective) => number
): ActiveQuest[] {
  return quests.map((q) => {
    if (q.status !== 'active') return q;

    let allDone = true;
    const nextObjectives = q.objectives.map((o) => {
      const nextCurrent = Math.min(o.required, updateFn(o));
      if (nextCurrent < o.required) {
        allDone = false;
      }
      return { ...o, current: nextCurrent };
    });

    return {
      ...q,
      objectives: nextObjectives,
      status: allDone ? 'completed' : 'active'
    };
  });
}

export function updateQuestProgressOnEnemyKilled(
  hero: HeroState,
  enemyId: string,
  enemyFamily: string,
  rank: EncounterRank = 'normal'
): HeroState {
  if (!hero.quests) return hero;
  const enemy = enemies.find((entry) => entry.id === enemyId);
  const haystack = [
    enemyFamily,
    enemy?.family ?? '',
    enemy?.archetype ?? '',
    enemy?.name ?? ''
  ].join(' ').toLowerCase();

  const nextQuests = updateObjectives(hero.quests, (o) => {
    if (o.type === 'kill_enemy') {
      return o.current + 1;
    }
    if (o.type === 'kill_enemy_family' && o.targetFamily && haystack.includes(o.targetFamily.toLowerCase())) {
      return o.current + 1;
    }
    if (o.type === 'kill_elite' && rank === 'elite') {
      return o.current + 1;
    }
    if (o.type === 'kill_boss' && rank === 'boss') {
      return o.current + 1;
    }
    return o.current;
  });

  return { ...hero, quests: nextQuests };
}

export function updateQuestProgressOnBattleWon(hero: HeroState): HeroState {
  if (!hero.quests) return hero;

  const nextQuests = updateObjectives(hero.quests, (o) => {
    if (o.type === 'win_battles') {
      return o.current + 1;
    }
    return o.current;
  });

  return { ...hero, quests: nextQuests };
}

export function updateQuestProgressOnMaterialGained(
  hero: HeroState,
  materialId: string,
  qty: number
): HeroState {
  if (!hero.quests) return hero;

  const nextQuests = updateObjectives(hero.quests, (o) => {
    if (o.type === 'collect_material' && o.targetId === materialId) {
      return o.current + qty;
    }
    if (o.type === 'collect_any_material') {
      return o.current + qty;
    }
    return o.current;
  });

  return { ...hero, quests: nextQuests };
}

export function updateQuestProgressOnCraftCompleted(hero: HeroState, qty: number = 1): HeroState {
  if (!hero.quests) return hero;

  const nextQuests = updateObjectives(hero.quests, (o) => {
    if (o.type === 'craft_item') {
      return o.current + qty;
    }
    return o.current;
  });

  return { ...hero, quests: nextQuests };
}

export function updateQuestProgressOnLocationChanged(
  hero: HeroState,
  locationId: string
): HeroState {
  if (!hero.quests) return hero;

  const nextQuests = updateObjectives(hero.quests, (o) => {
    if (o.type === 'travel_location' && o.targetId === locationId) {
      return o.current + 1;
    }
    return o.current;
  });

  return { ...hero, quests: nextQuests };
}

export function canClaimQuest(activeQuest: ActiveQuest): boolean {
  return activeQuest.status === 'completed';
}

export function claimQuestReward(hero: HeroState, questId: string): HeroState {
  if (!hero.quests) return hero;

  const quest = hero.quests.find((q) => q.questId === questId);
  if (!quest || quest.status !== 'completed') return hero;

  const def = questDefinitions.find((q) => q.id === questId);
  if (!def) return hero;

  const nextQuests = hero.quests.map((q) => {
    if (q.questId === questId) {
      return { ...q, status: 'claimed' as const };
    }
    return q;
  });

  const goldReward = def.rewards.gold ?? 0;
  const xpReward = def.rewards.xp ?? 0;

  // Grant Recipe rewards
  const nextKnownRecipeIds = hero.knownRecipeIds ? [...hero.knownRecipeIds] : [];
  if (def.rewards.recipeIds) {
    for (const recipeId of def.rewards.recipeIds) {
      if (!nextKnownRecipeIds.includes(recipeId)) {
        nextKnownRecipeIds.push(recipeId);
      }
    }
  }

  // Grant Material rewards
  const nextInventory = [...hero.inventory];
  const uniqueMaterialIds = new Set<string>();
  if (def.rewards.materialIds) {
    for (const mId of def.rewards.materialIds) {
      uniqueMaterialIds.add(mId);
    }
  }
  if (def.rewards.materialQuantities) {
    for (const mId of Object.keys(def.rewards.materialQuantities)) {
      uniqueMaterialIds.add(mId);
    }
  }

  for (const materialId of uniqueMaterialIds) {
    const qty = (def.rewards.materialQuantities && def.rewards.materialQuantities[materialId]) ?? 1;
    const existingStackIndex = nextInventory.findIndex(
      (stack) => stack.itemId.toLowerCase() === materialId.toLowerCase() && !stack.generatedItem && (!stack.affixes || stack.affixes.length === 0)
    );
    if (existingStackIndex >= 0) {
      nextInventory[existingStackIndex] = {
        ...nextInventory[existingStackIndex],
        qty: nextInventory[existingStackIndex].qty + qty
      };
    } else {
      nextInventory.push({
        itemId: materialId,
        qty
      });
    }
  }

  return {
    ...hero,
    gold: hero.gold + goldReward,
    xp: hero.xp + xpReward,
    knownRecipeIds: nextKnownRecipeIds,
    inventory: nextInventory,
    quests: nextQuests
  };
}
