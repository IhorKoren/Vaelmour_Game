import { describe, expect, it } from 'vitest';

import { items } from './items';
import { locations } from './locations';
import { questDefinitions } from './quests';
import { recipes } from './recipes';
import { LIVE_RECIPE_UNLOCK_RULES } from './recipeDropSources';
import { createInitialHero } from '../game/createInitialHero';
import { initializeQuests } from '../game/formulas/quests';

const EARLY_LOCATION_IDS = ['LOC_001', 'LOC_002', 'LOC_003'] as const;
const EARLY_QUEST_IDS = ['quest_crafting_01', 'quest_crafting_02', 'quest_crafting_03'] as const;
const GUIDED_RECIPE_IDS = ['recipe_weapon_blade_lvl_03', 'recipe_feet_boots_lvl_03', 'recipe_shield_guard_lvl_06'] as const;

describe('early progression guardrails', () => {
  it('fresh hero starts with the curated post-wipe quest flow only', () => {
    const hero = createInitialHero();
    const quests = hero.quests ?? [];

    expect(quests.map((quest) => quest.questId)).toEqual(['quest_crafting_01']);
    expect(quests.some((quest) => quest.questId.startsWith('QST_'))).toBe(false);
  });

  it('level 5 quest initialization keeps only the first curated quest arc', () => {
    const quests = initializeQuests(5);

    expect(quests.map((quest) => quest.questId)).toEqual([...EARLY_QUEST_IDS]);
    expect(quests.some((quest) => quest.questId.startsWith('QST_'))).toBe(false);
  });

  it('early quests reference valid recipe, material, item, and location ids', () => {
    const recipeIds = new Set(recipes.map((recipe) => recipe.id));
    const locationIds = new Set(locations.map((location) => location.id));
    const itemIds = new Set(items.map((item) => item.id));

    for (const questId of EARLY_QUEST_IDS) {
      const quest = questDefinitions.find((entry) => entry.id === questId);

      expect(quest).toBeDefined();
      expect(quest?.locationId).toBeTruthy();
      expect(locationIds.has(quest?.locationId ?? '')).toBe(true);

      for (const objective of quest!.objectives) {
        if (objective.type === 'travel_location' && objective.targetId) {
          expect(locationIds.has(objective.targetId)).toBe(true);
        }
        if (objective.type === 'collect_material' && objective.targetId) {
          expect(itemIds.has(objective.targetId)).toBe(true);
        }
      }

      for (const recipeId of quest!.rewards.recipeIds ?? []) {
        expect(recipeIds.has(recipeId)).toBe(true);
      }

      for (const materialId of quest!.rewards.materialIds ?? []) {
        expect(itemIds.has(materialId)).toBe(true);
      }

      for (const materialId of Object.keys(quest!.rewards.materialQuantities ?? {})) {
        expect(itemIds.has(materialId)).toBe(true);
      }
    }
  });

  it('early locations and guided quests expose the materials needed by the first recipe path', () => {
    const availableMaterialIds = new Set<string>();

    for (const locationId of EARLY_LOCATION_IDS) {
      const location = locations.find((entry) => entry.id === locationId);
      expect(location).toBeDefined();
      for (const materialId of location!.materials) {
        availableMaterialIds.add(materialId);
      }
    }

    for (const questId of EARLY_QUEST_IDS) {
      const quest = questDefinitions.find((entry) => entry.id === questId);
      for (const materialId of quest?.rewards.materialIds ?? []) {
        availableMaterialIds.add(materialId);
      }
      for (const materialId of Object.keys(quest?.rewards.materialQuantities ?? {})) {
        availableMaterialIds.add(materialId);
      }
    }

    for (const recipeId of GUIDED_RECIPE_IDS) {
      const recipe = recipes.find((entry) => entry.id === recipeId);
      expect(recipe).toBeDefined();
      for (const material of recipe!.materials) {
        expect(availableMaterialIds.has(material.id)).toBe(true);
      }
    }
  });

  it('early progression keeps a non-boss recipe unlock path through level 6', () => {
    const earlyRules = LIVE_RECIPE_UNLOCK_RULES.filter((rule) => rule.level <= 6);

    expect(earlyRules.every((rule) => rule.unlockType === 'starter' || rule.unlockType === 'drop' || rule.unlockType === 'quest')).toBe(true);
    expect(earlyRules.some((rule) => rule.unlockType === 'quest' && rule.level === 6)).toBe(true);
    expect(earlyRules.some((rule) => rule.unlockType === 'drop' && EARLY_LOCATION_IDS.includes(rule.locationId as (typeof EARLY_LOCATION_IDS)[number]))).toBe(true);
  });
});
