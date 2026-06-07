import rawQuestBook from './generated/quests.json';
import { locations } from './locations';
import { materials } from './materials';
import type { QuestDefinition, QuestObjective } from '../game/types';
import { getDisplayQuestDescription, getDisplayQuestTitle } from '../utils/displayHelpers';

type GeneratedQuest = Record<string, string>;
type GeneratedQuestBook = Record<string, GeneratedQuest[]>;

export const questBook = rawQuestBook as GeneratedQuestBook;

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

export function mapQuest(category: string, quest: GeneratedQuest): QuestDefinition {
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

export const curatedCraftingQuests: QuestDefinition[] = [
  {
    id: 'quest_crafting_01',
    title: 'Перші кроки коваля',
    description: 'Почніть на Околицях Розбитої дороги: виграйте 3 битви та зберіть 3 одиниці потрісканої шкіри. Після здачі квесту вам відкриється перше корисне креслення для кузні.',
    requiredLevel: 1,
    locationId: 'LOC_001',
    objectives: [
      { type: 'win_battles', required: 3, current: 0 },
      { type: 'collect_material', targetId: 'MAT_002', required: 3, current: 0 }
    ],
    rewards: {
      gold: 60,
      xp: 50,
      recipeIds: ['recipe_weapon_blade_lvl_03'],
      materialIds: ['MAT_003', 'MAT_004'],
      materialQuantities: { 'MAT_003': 4, 'MAT_004': 1 }
    }
  },
  {
    id: 'quest_crafting_02',
    title: 'Збір лісових матеріалів',
    description: 'Перейдіть до Лісу Чорного Ікла, виграйте 4 битви та зберіть 3 вовчі ікла. Нагорода допоможе викувати перше покращення з самого лісу.',
    requiredLevel: 3,
    locationId: 'LOC_002',
    objectives: [
      { type: 'travel_location', targetId: 'LOC_002', required: 1, current: 0 },
      { type: 'win_battles', required: 4, current: 0 },
      { type: 'collect_material', targetId: 'MAT_004', required: 3, current: 0 }
    ],
    rewards: {
      gold: 100,
      xp: 100,
      recipeIds: ['recipe_feet_boots_lvl_03'],
      materialIds: ['MAT_001', 'MAT_004'],
      materialQuantities: { 'MAT_001': 2, 'MAT_004': 2 }
    }
  },
  {
    id: 'quest_crafting_03',
    title: 'Перший викуваний предмет',
    description: 'Досягніть Табору рейдерів, зберіть 2 емблеми рейдерів і викуйте будь-який посилений предмет. Після кування одразу екіпіруйте нову річ, щоб відчути стрибок сили.',
    requiredLevel: 5,
    locationId: 'LOC_003',
    objectives: [
      { type: 'travel_location', targetId: 'LOC_003', required: 1, current: 0 },
      { type: 'collect_material', targetId: 'MAT_005', required: 2, current: 0 },
      { type: 'craft_item', required: 1, current: 0 },
      { type: 'win_battles', required: 4, current: 0 }
    ],
    rewards: {
      gold: 160,
      xp: 160,
      recipeIds: ['recipe_shield_guard_lvl_06', 'recipe_head_helmet_lvl_06'],
      materialIds: ['MAT_003', 'MAT_005', 'MAT_007'],
      materialQuantities: { 'MAT_003': 2, 'MAT_005': 2, 'MAT_007': 3 }
    }
  },
  {
    id: 'quest_crafting_04',
    title: 'Оборона дозорної вежі',
    description: 'Виграйте 8 битв біля старої вежі та зберіть 5 ланок ланцюга.',
    requiredLevel: 7,
    locationId: 'LOC_004',
    objectives: [
      { type: 'win_battles', required: 8, current: 0 },
      { type: 'collect_material', targetId: 'MAT_008', required: 5, current: 0 }
    ],
    rewards: {
      gold: 200,
      xp: 200,
      recipeIds: ['recipe_chest_armor_lvl_09'],
      materialIds: ['MAT_009'],
      materialQuantities: { 'MAT_009': 5 }
    }
  },
  {
    id: 'quest_crafting_05',
    title: 'На підступах до Бастіону',
    description: 'Виграйте 8 битв біля залізного бастіону та зберіть 3 сталеві пластини легіону.',
    requiredLevel: 10,
    locationId: 'LOC_005',
    objectives: [
      { type: 'win_battles', required: 8, current: 0 },
      { type: 'collect_material', targetId: 'MAT_016', required: 3, current: 0 }
    ],
    rewards: {
      gold: 300,
      xp: 300,
      recipeIds: ['recipe_hands_gloves_lvl_12'],
      materialIds: ['MAT_013'],
      materialQuantities: { 'MAT_013': 5 }
    }
  },
  {
    id: 'quest_crafting_06',
    title: 'Болотяна алхімія',
    description: 'Виграйте 10 битв на болотах попелу та зберіть 5 одиниць болотяної смоли.',
    requiredLevel: 12,
    locationId: 'LOC_006',
    objectives: [
      { type: 'win_battles', required: 10, current: 0 },
      { type: 'collect_material', targetId: 'MAT_010', required: 5, current: 0 }
    ],
    rewards: {
      gold: 400,
      xp: 400,
      recipeIds: ['recipe_legs_pants_lvl_15'],
      materialIds: ['MAT_011'],
      materialQuantities: { 'MAT_011': 3 }
    }
  },
  {
    id: 'quest_crafting_07',
    title: 'Доручення найманців',
    description: 'Виграйте 10 битв на перехресті найманців та зберіть 5 очищених металевих брусків.',
    requiredLevel: 15,
    locationId: 'LOC_007',
    objectives: [
      { type: 'win_battles', required: 10, current: 0 },
      { type: 'collect_material', targetId: 'MAT_013', required: 5, current: 0 }
    ],
    rewards: {
      gold: 500,
      xp: 500,
      recipeIds: ['recipe_ring_band_lvl_18'],
      materialIds: ['MAT_014'],
      materialQuantities: { 'MAT_014': 3 }
    }
  },
  {
    id: 'quest_crafting_08',
    title: 'Полювання в гущавині',
    description: 'Виграйте 10 битв у Воронячій порожнині та здолайте 3 елітних ворогів.',
    requiredLevel: 18,
    locationId: 'LOC_009',
    objectives: [
      { type: 'win_battles', required: 10, current: 0 },
      { type: 'kill_elite', required: 3, current: 0 }
    ],
    rewards: {
      gold: 600,
      xp: 600,
      recipeIds: ['recipe_amulet_charm_lvl_21'],
      materialIds: ['MAT_015'],
      materialQuantities: { 'MAT_015': 5 }
    }
  },
  {
    id: 'quest_crafting_09',
    title: 'Бійці руїн арени',
    description: 'Виграйте 12 битв у руїнах арени та зберіть 3 аренні відзнаки.',
    requiredLevel: 21,
    locationId: 'LOC_012',
    objectives: [
      { type: 'win_battles', required: 12, current: 0 },
      { type: 'collect_material', targetId: 'MAT_018', required: 3, current: 0 }
    ],
    rewards: {
      gold: 700,
      xp: 700,
      recipeIds: ['recipe_weapon_blade_lvl_24'],
      materialIds: ['MAT_024'],
      materialQuantities: { 'MAT_024': 3 }
    }
  },
  {
    id: 'quest_crafting_10',
    title: 'Багряні розкопки',
    description: 'Виграйте 12 битв у багряному кар’єрі та зберіть 5 одиниць тирової руди.',
    requiredLevel: 24,
    locationId: 'LOC_013',
    objectives: [
      { type: 'win_battles', required: 12, current: 0 },
      { type: 'collect_material', targetId: 'MAT_019', required: 5, current: 0 }
    ],
    rewards: {
      gold: 800,
      xp: 800,
      recipeIds: ['recipe_chest_armor_lvl_27'],
      materialIds: ['MAT_019'],
      materialQuantities: { 'MAT_019': 3 }
    }
  },
  {
    id: 'quest_crafting_11',
    title: 'Останній поріг',
    description: 'Виграйте 15 битв на порозі Велора та здолайте 5 елітних ворогів.',
    requiredLevel: 27,
    locationId: 'LOC_014',
    objectives: [
      { type: 'win_battles', required: 15, current: 0 },
      { type: 'kill_elite', required: 5, current: 0 }
    ],
    rewards: {
      gold: 1000,
      xp: 1000,
      recipeIds: ['recipe_weapon_blade_lvl_30'],
      materialIds: ['MAT_020'],
      materialQuantities: { 'MAT_020': 2 }
    }
  }
];

export const questDefinitions: QuestDefinition[] = curatedCraftingQuests;
