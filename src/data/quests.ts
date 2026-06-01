import rawQuestBook from './generated/quests.json';
import { locations } from './locations';
import { materials } from './materials';
import type { QuestDefinition, QuestObjective } from '../game/types';
import { getDisplayQuestDescription, getDisplayQuestTitle } from '../utils/displayHelpers';

type GeneratedQuest = Record<string, string>;
type GeneratedQuestBook = Record<string, GeneratedQuest[]>;

const questBook = rawQuestBook as GeneratedQuestBook;

function normalize(value: string | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function parseCount(value: string | undefined, fallback: number = 1): number {
  const match = (value ?? '').match(/\d+/);
  return match ? Number(match[0]) : fallback;
}

function findLocationId(locationName: string | undefined): string | undefined {
  const normalizedLocation = normalize(locationName);
  if (!normalizedLocation || normalizedLocation === 'any' || normalizedLocation === 'crafting') {
    return undefined;
  }

  return locations.find((location) => normalizedLocation.includes(normalize(location.name)))?.id;
}

function findMaterialId(text: string | undefined): string | undefined {
  const normalizedText = normalize(text);
  if (!normalizedText) return undefined;

  return materials.find((material) => {
    const materialName = normalize(material.name);
    return normalizedText.includes(materialName) || materialName.includes(normalizedText);
  })?.id;
}

function estimateRewards(quest: GeneratedQuest, category: string): QuestDefinition['rewards'] {
  const difficulty = normalize(quest.difficulty ?? '');
  const rewardText = normalize(quest.reward_package ?? quest.reward ?? quest.main_reward ?? '');
  const baseXp =
    category === 'bossUnlock' ? 180 :
    category === 'zone' ? 80 :
    category === 'kill' ? 70 :
    55;
  const baseGold =
    category === 'bossUnlock' ? 140 :
    category === 'zone' ? 60 :
    category === 'kill' ? 50 :
    35;

  const multiplier =
    difficulty.includes('high') ? 1.5 :
    difficulty.includes('medium') ? 1.2 :
    1;

  const rewards: QuestDefinition['rewards'] = {
    xp: Math.round(baseXp * multiplier),
    gold: Math.round(baseGold * multiplier)
  };

  const materialId = findMaterialId(rewardText);
  if (materialId) {
    rewards.materialIds = [materialId];
  }

  return rewards;
}

function mapObjective(category: string, quest: GeneratedQuest): QuestObjective[] {
  if (category === 'bossUnlock') {
    return [{ type: 'kill_boss', required: 1, current: 0 }];
  }

  if (category === 'kill') {
    return [{
      type: 'kill_enemy_family',
      targetFamily: quest.target_family || quest.target_archetype || quest.quest_name,
      required: parseCount(quest.kill_count, 1),
      current: 0
    }];
  }

  if (category === 'zone') {
    const objectiveText = normalize(quest.objective);
    const materialId = findMaterialId(quest.objective);

    if (objectiveText.includes('collect') && materialId) {
      return [{
        type: 'collect_material',
        targetId: materialId,
        required: parseCount(quest.objective, 1),
        current: 0
      }];
    }

    if (objectiveText.includes('travel')) {
      return [{
        type: 'travel_location',
        targetId: findLocationId(quest.location),
        required: 1,
        current: 0
      }];
    }

    return [{
      type: quest.target_enemy_family ? 'kill_enemy_family' : 'kill_enemy',
      targetFamily: quest.target_enemy_family || undefined,
      required: parseCount(quest.objective, 1),
      current: 0
    }];
  }

  const questType = normalize(quest.quest_type);
  if (questType === 'elite') {
    return [{ type: 'kill_elite', required: parseCount(quest.target_count_value, 1), current: 0 }];
  }
  if (questType === 'gather') {
    return [{ type: 'collect_any_material', required: parseCount(quest.target_count_value, 1), current: 0 }];
  }
  if (questType === 'craft') {
    return [{ type: 'craft_item', required: parseCount(quest.target_count_value, 1), current: 0 }];
  }
  if (questType === 'combat') {
    return [{ type: 'win_battles', required: parseCount(quest.target_count_value, 1), current: 0 }];
  }

  const targetArchetype = quest.target_archetype && quest.target_archetype !== 'Any' ? quest.target_archetype : undefined;
  return [{
    type: targetArchetype ? 'kill_enemy_family' : 'kill_enemy',
    targetFamily: targetArchetype,
    required: parseCount(quest.target_count_value ?? quest.objective, 1),
    current: 0
  }];
}

function mapQuest(category: string, quest: GeneratedQuest): QuestDefinition {
  return {
    id: quest.quest_id,
    title: getDisplayQuestTitle(quest.quest_name),
    description: getDisplayQuestDescription(quest.objective || quest.unlock_requirement || quest.reward || 'Quest objective from master database.'),
    objectives: mapObjective(category, quest),
    rewards: estimateRewards(quest, category),
    requiredLevel: parseCount(quest.required_level ?? quest.min_level, 1),
    locationId: findLocationId(quest.location)
  };
}

export const questDefinitions: QuestDefinition[] = Object.entries(questBook).flatMap(([category, quests]) =>
  quests.map((quest) => mapQuest(category, quest))
);
