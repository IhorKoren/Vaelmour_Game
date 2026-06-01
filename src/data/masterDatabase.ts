import armors from './generated/armors.json';
import bosses from './generated/bosses.json';
import economy from './generated/economy.json';
import eliteEnemies from './generated/eliteEnemies.json';
import enemies from './generated/enemies.json';
import inventoryRules from './generated/inventoryRules.json';
import baseItems from './generated/items.json';
import minorArmor from './generated/minorArmor.json';
import shields from './generated/shields.json';
import rings from './generated/rings.json';
import amulets from './generated/amulets.json';
import locations from './generated/locations.json';
import lootTables from './generated/lootTables.json';
import materials from './generated/materials.json';
import masterWorkbookSummary from './generated/masterWorkbookSummary.json';
import quests from './generated/quests.json';
import baseRecipes from './generated/recipes.json';
import minorArmorRecipes from './generated/minorArmorRecipes.json';
import shieldRecipes from './generated/shieldRecipes.json';
import ringRecipes from './generated/ringRecipes.json';
import amuletRecipes from './generated/amuletRecipes.json';
import skills from './generated/skills.json';
import weapons from './generated/weapons.json';

const items = [...baseItems, ...minorArmor, ...shields, ...rings, ...amulets];
const recipes = [...baseRecipes, ...shieldRecipes, ...ringRecipes, ...minorArmorRecipes, ...amuletRecipes];

export const masterDatabase = {
  armors,
  bosses,
  economy,
  eliteEnemies,
  enemies,
  inventoryRules,
  items,
  locations,
  lootTables,
  materials,
  masterWorkbookSummary,
  quests,
  recipes,
  skills,
  weapons
};

export type MasterDatabase = typeof masterDatabase;
