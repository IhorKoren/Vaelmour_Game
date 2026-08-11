import type { Profession, RecipeDefinition } from './types'
import { PHASE7_RECIPES } from './phase7Catalog'

const RECIPE_DEFINITIONS: RecipeDefinition[] = [
  { id: 'recipe_warrior_weapon', name: 'Меч із Заліза Розлому', profession: 'blacksmith', category: 'equipment', outputItemId: 'forged_warrior_weapon', outputQuantity: 1, targetClass: 'warrior', requirements: { rift_iron: 4, core_metal: 1 } },
  { id: 'recipe_warrior_chest', name: 'Темний нагрудник', profession: 'blacksmith', category: 'equipment', outputItemId: 'forged_warrior_chest', outputQuantity: 1, targetClass: 'warrior', requirements: { rift_iron: 3, dark_plate_fragment: 3 } },
  { id: 'recipe_ranger_weapon', name: 'Лук Відлуння', profession: 'blacksmith', category: 'equipment', outputItemId: 'forged_ranger_weapon', outputQuantity: 1, targetClass: 'ranger', requirements: { rift_iron: 4, dark_plate_fragment: 1 } },
  { id: 'recipe_ranger_chest', name: 'Панцир слідопита', profession: 'blacksmith', category: 'equipment', outputItemId: 'forged_ranger_chest', outputQuantity: 1, targetClass: 'ranger', requirements: { rift_iron: 2, dark_plate_fragment: 3 } },
  { id: 'recipe_blacksmith_weapon', name: 'Молот ядра', profession: 'blacksmith', category: 'equipment', outputItemId: 'forged_blacksmith_weapon', outputQuantity: 1, targetClass: 'blacksmith', requirements: { rift_iron: 4, core_metal: 2 } },
  { id: 'recipe_blacksmith_chest', name: 'Фартух коваля Розлому', profession: 'blacksmith', category: 'equipment', outputItemId: 'forged_blacksmith_chest', outputQuantity: 1, targetClass: 'blacksmith', requirements: { dark_plate_fragment: 4, core_metal: 1 } },
  { id: 'recipe_alchemist_weapon', name: 'Жезл мутації', profession: 'alchemist', category: 'equipment', outputItemId: 'crafted_alchemist_weapon', outputQuantity: 1, targetClass: 'alchemist', requirements: { rift_essence: 4, mutated_blood: 2 } },
  { id: 'recipe_alchemist_chest', name: 'Мантія есенції', profession: 'alchemist', category: 'equipment', outputItemId: 'crafted_alchemist_chest', outputQuantity: 1, targetClass: 'alchemist', requirements: { rift_essence: 3, spore_extract: 2 } },
  { id: 'recipe_healing_potion', name: 'Healing Potion ×2', profession: 'alchemist', category: 'consumables', outputItemId: 'healing_potion', outputQuantity: 2, requirements: { rift_essence: 2, mutated_blood: 1 } },
  { id: 'recipe_jeweler_weapon', name: 'Кристалічне зубило', profession: 'jeweler', category: 'equipment', outputItemId: 'crafted_jeweler_weapon', outputQuantity: 1, targetClass: 'jeweler', requirements: { rift_crystal: 4, core_shard: 1 } },
  { id: 'recipe_jeweler_chest', name: 'Камзол гранувальника', profession: 'jeweler', category: 'equipment', outputItemId: 'crafted_jeweler_chest', outputQuantity: 1, targetClass: 'jeweler', requirements: { rift_crystal: 3, gem_fragment: 2 } },
  { id: 'recipe_attack_ring', name: 'Перстень гострого відлуння', profession: 'jeweler', category: 'jewelry', outputItemId: 'attack_ring', outputQuantity: 1, requirements: { rift_crystal: 3, gem_fragment: 2 } },
  { id: 'recipe_hp_ring', name: 'Перстень живого каменю', profession: 'jeweler', category: 'jewelry', outputItemId: 'hp_ring', outputQuantity: 1, requirements: { rift_crystal: 2, core_shard: 2 } },
  { id: 'recipe_balanced_amulet', name: 'Амулет рівноваги', profession: 'jeweler', category: 'jewelry', outputItemId: 'balanced_amulet', outputQuantity: 1, requirements: { rift_crystal: 3, gem_fragment: 1, core_shard: 1 } },
]

export const RECIPES: Record<string, RecipeDefinition> = {
  ...Object.fromEntries(RECIPE_DEFINITIONS.map((recipe) => [recipe.id, recipe])),
  ...PHASE7_RECIPES,
}

export const PROFESSION_RECIPE_IDS: Record<Profession, string[]> = {
  blacksmith: Object.values(RECIPES).filter((recipe) => recipe.profession === 'blacksmith').map((recipe) => recipe.id),
  alchemist: Object.values(RECIPES).filter((recipe) => recipe.profession === 'alchemist').map((recipe) => recipe.id),
  jeweler: Object.values(RECIPES).filter((recipe) => recipe.profession === 'jeweler').map((recipe) => recipe.id),
}

export const STARTER_LEARNED_RECIPES: Partial<Record<Profession, string[]>> = {
  blacksmith: ['recipe_warrior_weapon', 'recipe_blacksmith_weapon'],
  alchemist: ['recipe_alchemist_weapon', 'recipe_healing_potion'],
  jeweler: ['recipe_jeweler_weapon', 'recipe_attack_ring'],
}
