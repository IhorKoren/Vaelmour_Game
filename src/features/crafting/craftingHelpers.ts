import type { HeroState, Recipe } from '../../game/types';
import { weapons } from '../../data/weapons';
import { armors } from '../../data/armors';
import { shields } from '../../data/shields';
import { items } from '../../data/items';
import { resolveItemDefinitionByIdOrName } from '../../data/itemResolver';
import { getDisplayLocationName, getDisplayEnemyName } from '../../utils/displayHelpers';
import { getLiveRecipeUnlockRule } from '../../data/recipeDropSources';


export type CraftingBlockedReason =
  | 'INVALID_RECIPE'
  | 'UNRESOLVED_OUTPUT'
  | 'RECIPE_NOT_LEARNED'
  | 'LEVEL_TOO_LOW'
  | 'NOT_ENOUGH_GOLD'
  | 'MISSING_MATERIALS';

export interface BlockedReasonInfo {
  reason: CraftingBlockedReason;
  text: string;
}

export function resolveCraftResult(resultId: string) {
  if (!resultId) return null;
  const match =
    resolveItemDefinitionByIdOrName(resultId, weapons) ??
    resolveItemDefinitionByIdOrName(resultId, armors) ??
    resolveItemDefinitionByIdOrName(resultId, shields) ??
    resolveItemDefinitionByIdOrName(resultId, items);

  if (match) {
    const weaponsSet = new Set(weapons.map(w => w.id.toLowerCase()));
    const armorsSet = new Set(armors.map(a => a.id.toLowerCase()));
    const shieldsSet = new Set(shields.map(s => s.id.toLowerCase()));
    const matchIdLower = match.id.toLowerCase();

    let cat = 'category' in match ? (match as Record<string, unknown>).category as string : 'crafted';
    if (weaponsSet.has(matchIdLower)) cat = 'weapon';
    else if (armorsSet.has(matchIdLower)) cat = 'chest';
    else if (shieldsSet.has(matchIdLower)) cat = 'shield';

    return { ...match, category: cat };
  }
  return null;
}

export function getCraftingBlockedReason(
  recipe: Recipe | undefined,
  hero: HeroState,
  knownRecipeIds: Set<string>
): BlockedReasonInfo | null {
  if (!recipe || !recipe.id || !recipe.result || !recipe.materials || !Array.isArray(recipe.materials)) {
    return {
      reason: 'INVALID_RECIPE',
      text: 'Недійсні дані рецепта.'
    };
  }

  const outputItem = resolveCraftResult(recipe.result);
  if (!outputItem) {
    return {
      reason: 'UNRESOLVED_OUTPUT',
      text: 'Помилка: не вдалося знайти предмет результату в каталозі.'
    };
  }

  if (!knownRecipeIds.has(recipe.id)) {
    const sourceText = getDisplayRecipeUnlockSource(recipe.id);
    return {
      reason: 'RECIPE_NOT_LEARNED',
      text: `Креслення не вивчено. Здобувається: ${sourceText}`
    };
  }

  if (hero.level < recipe.requiredLevel) {
    return {
      reason: 'LEVEL_TOO_LOW',
      text: `Рівень героя занизький (потрібен рівень ${recipe.requiredLevel}).`
    };
  }

  if (hero.gold < recipe.goldCost) {
    return {
      reason: 'NOT_ENOUGH_GOLD',
      text: `Недостатньо золота (потрібно ${recipe.goldCost} зол.).`
    };
  }

  const hasMaterials = recipe.materials.every((material) => {
    const stack = hero.inventory.find((item) => item.itemId.toLowerCase() === material.id.toLowerCase());
    return (stack?.qty ?? 0) >= material.qty;
  });

  if (!hasMaterials) {
    return {
      reason: 'MISSING_MATERIALS',
      text: 'Недостатньо матеріалів для виготовлення.'
    };
  }

  return null;
}

export function getDisplayRecipeUnlockMethod(recipeId: string): string {
  const rule = getLiveRecipeUnlockRule(recipeId);
  if (!rule) {
    return 'Невідомо';
  }

  switch (rule.unlockType) {
    case 'starter':
      return 'Стартовий рецепт';
    case 'drop':
      return 'Звичайний дроп';
    case 'elite':
      return 'Елітний дроп';
    case 'boss':
      return 'Трофей боса';
    default:
      return 'Невідомо';
  }
}

export function getDisplayRecipeUnlockSource(recipeId: string): string {
  const rule = getLiveRecipeUnlockRule(recipeId);
  if (!rule) {
    return 'Невідоме джерело';
  }

  if (rule.unlockType === 'starter') {
    return 'Доступний від початку';
  }

  const locationName = getDisplayLocationName(rule.locationId);
  if (rule.enemyNames.length === 0) {
    return locationName;
  }

  const translatedEnemies = rule.enemyNames
    .map((name) => getDisplayEnemyName(name) || name)
    .join(' / ');

  return `${locationName} (${translatedEnemies})`;
}

export function getSafeVisibleRecipes(recipes: Recipe[], knownRecipeIds: Set<string>, heroLevel: number): Recipe[] {
  return recipes.filter((recipe) => {
    if (knownRecipeIds.has(recipe.id)) {
      return true;
    }

    // Safely preview recipes that are near player level progression
    return recipe.requiredLevel <= heroLevel + 3;
  });
}
