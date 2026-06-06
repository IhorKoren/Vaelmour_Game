import type { HeroState, Recipe } from '../../game/types';
import { weapons } from '../../data/weapons';
import { armors } from '../../data/armors';
import { shields } from '../../data/shields';
import { items } from '../../data/items';
import { resolveItemDefinitionByIdOrName } from '../../data/itemResolver';
import { getDisplayLocationName, getDisplayEnemyName } from '../../utils/displayHelpers';
import { getLiveRecipeUnlockRule, isStarterRecipeId } from '../../data/recipeDropSources';
import { getEquippableSlot } from '../../game/formulas/equipment';

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
  const lowerId = resultId.toLowerCase();
  const match =
    weapons.find(w => w.id.toLowerCase() === lowerId) ??
    armors.find(a => a.id.toLowerCase() === lowerId) ??
    shields.find(s => s.id.toLowerCase() === lowerId) ??
    items.find(i => i.id.toLowerCase() === lowerId) ??
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

  if (isStarterRecipeId(recipe.id)) {
    return {
      reason: 'RECIPE_NOT_LEARNED',
      text: 'Цей стартовий рецепт більше не використовується для крафту.'
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
    // Hide level 1 auto-equipped starter recipes
    if (isStarterRecipeId(recipe.id)) {
      return false;
    }

    if (knownRecipeIds.has(recipe.id)) {
      return true;
    }

    // Safely preview recipes that are near player level progression
    return recipe.requiredLevel <= heroLevel + 3;
  });
}

export interface RecipeStatChip {
  label: string;
  value: string;
}

interface CatalogItemStats {
  minDamage?: number;
  maxDamage?: number;
  attackSpeed?: number;
  armor?: number;
  defense?: number;
  blockChance?: number;
  blockValue?: number;
  blockPower?: number;
  maxHp?: number;
  maxHealth?: number;
  hpBonus?: number;
  damageBonus?: number;
  dodgeBonus?: number;
  dodgeChance?: number;
  accuracy?: number;
  healthRegen?: number;
}

export function getRecipeStatChips(recipe: Recipe): RecipeStatChip[] {
  const item = resolveCraftResult(recipe.result);
  const chips: RecipeStatChip[] = [];
  if (!item) {
    return chips;
  }

  const stats = item as unknown as CatalogItemStats;
  const slot = getEquippableSlot(item);
  let slotLabel = 'Предмет';
  if (slot === 'weapon') slotLabel = 'Зброя';
  else if (slot === 'shield') slotLabel = 'Щит';
  else if (slot === 'head') slotLabel = 'Шолом';
  else if (slot === 'chest') slotLabel = 'Обладунок';
  else if (slot === 'hands') slotLabel = 'Рукавиці';
  else if (slot === 'legs') slotLabel = 'Поножі';
  else if (slot === 'feet') slotLabel = 'Чоботи';
  else if (slot === 'ring1' || slot === 'ring2') slotLabel = 'Перстень';
  else if (slot === 'amulet') slotLabel = 'Амулет';

  chips.push({ label: 'Слот', value: slotLabel });

  // Damage / Speed: Weapon only
  if (slot === 'weapon') {
    const minDmg = stats.minDamage ?? 0;
    const maxDmg = stats.maxDamage ?? 0;
    const speed = stats.attackSpeed ?? 1.0;
    chips.push({ label: 'Шкода', value: `${minDmg}-${maxDmg}` });
    chips.push({ label: 'Швидкість', value: `${speed}` });
  } else {
    // Defense: Non-weapon and non-accessory slots
    if (slot !== 'ring1' && slot !== 'ring2' && slot !== 'amulet') {
      const def = stats.armor ?? stats.defense ?? 0;
      if (def > 0) {
        chips.push({ label: 'Захист', value: `+${def}` });
      }
      if (slot === 'shield') {
        const blockChance = stats.blockChance ?? 0;
        const blockValue = stats.blockValue ?? stats.blockPower ?? 0;
        if (blockChance > 0) {
          chips.push({ label: 'Блок', value: `${Math.round(blockChance * 100)}%` });
        }
        if (blockValue > 0) {
          chips.push({ label: 'Сила блоку', value: `+${blockValue}` });
        }
      }
    }
  }

  // Bonuses: HP, regen, agility/strength percent boosts, dodge
  const maxHp = stats.maxHp ?? stats.maxHealth ?? 0;
  if (maxHp > 0) {
    chips.push({ label: 'Бонус HP', value: `+${maxHp}` });
  }
  const hpBonus = stats.hpBonus ?? 0;
  if (hpBonus > 0) {
    chips.push({ label: 'Бонус HP %', value: `+${Math.round(hpBonus * 100)}%` });
  }
  const dmgBonus = stats.damageBonus ?? 0;
  if (dmgBonus > 0) {
    chips.push({ label: 'Бонус шкоди', value: `+${Math.round(dmgBonus * 100)}%` });
  }
  const dodgeBonus = stats.dodgeBonus ?? stats.dodgeChance ?? 0;
  if (dodgeBonus > 0) {
    chips.push({ label: 'Ухилення', value: `+${Math.round(dodgeBonus * 100)}%` });
  }
  const accuracy = stats.accuracy ?? 0;
  if (accuracy > 0) {
    chips.push({ label: 'Влучність', value: `+${Math.round(accuracy * 100)}%` });
  }
  const healthRegen = stats.healthRegen ?? 0;
  if (healthRegen > 0) {
    chips.push({ label: 'Регенерація', value: `+${healthRegen} HP/5с` });
  }

  return chips;
}
