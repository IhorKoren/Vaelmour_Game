import { ITEMS } from './items'
import { RECIPES } from './recipes'
import type { ItemDefinition } from './types'

export const RECIPE_ITEM_PREFIX = 'recipe_item:'

export const ITEM_CATALOG: Record<string, ItemDefinition> = {
  ...ITEMS,
  ...Object.fromEntries(Object.values(RECIPES).map((recipe) => [
    `${RECIPE_ITEM_PREFIX}${recipe.id}`,
    { id: `${RECIPE_ITEM_PREFIX}${recipe.id}`, name: `Рецепт: ${recipe.name}`, category: 'recipe', icon: '▤', stackable: true, recipeId: recipe.id } satisfies ItemDefinition,
  ])),
}

export function recipeItemId(recipeId: string): string { return `${RECIPE_ITEM_PREFIX}${recipeId}` }
