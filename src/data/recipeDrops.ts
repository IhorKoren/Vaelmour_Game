import rawData from './generated/recipeDrops.json';
import minorArmorRecipeDropData from './generated/minorArmorRecipeDrops.json';
import shieldRecipeDropData from './generated/shieldRecipeDrops.json';
import ringRecipeDropData from './generated/ringRecipeDrops.json';
import amuletRecipeDropData from './generated/amuletRecipeDrops.json';

export type RecipeDropRule = {
  recipe_id: string;
  source_location: string;
  drops_from: string;
  recipe_drop_chance: string;
  dropped_recipe: string;
};

export const recipeDrops = [...(rawData as RecipeDropRule[]), ...(shieldRecipeDropData as RecipeDropRule[]), ...(ringRecipeDropData as RecipeDropRule[]), ...(minorArmorRecipeDropData as RecipeDropRule[]), ...(amuletRecipeDropData as RecipeDropRule[])];

