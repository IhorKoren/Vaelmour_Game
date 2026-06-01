import rawData from './generated/recipes.json';
import minorArmorRecipeData from './generated/minorArmorRecipes.json';
import shieldRecipeData from './generated/shieldRecipes.json';
import ringRecipeData from './generated/ringRecipes.json';
import amuletRecipeData from './generated/amuletRecipes.json';
import type { Recipe } from '../game/types';

export const recipes: Recipe[] = [...(rawData as Recipe[]), ...(shieldRecipeData as Recipe[]), ...(ringRecipeData as Recipe[]), ...(minorArmorRecipeData as Recipe[]), ...(amuletRecipeData as Recipe[])];

