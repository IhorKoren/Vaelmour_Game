import { PROFESSIONS, RECIPE_DROP_CHANCE, RESOURCE_DROP_CHANCE, isProfessionClass } from '../../shared/game-data/economy'
import { PROFESSION_RECIPE_IDS } from '../../shared/game-data/recipes'
import { FIRST_RIFT_LOOT_POOLS, RESOURCES } from '../../shared/game-data/resources'
import { PHASE7_RECIPES, PHASE7_RESOURCES, tierResources } from '../../shared/game-data/phase7Catalog'
import type { ContentTier, PersonalLoot, Profession } from '../../shared/game-data/types'
import type { CharacterClass, Enemy } from '../../src/types/game'

export interface LootParticipant {
  id: string
  classId: CharacterClass
  alive: boolean
}

interface LootOptions {
  random?: () => number
  resourceChance?: { combatClass: number; correctProfession: number }
  recipeChance?: { mob: number; elite: number; boss: number }
  tier?: ContentTier
}

export interface ProfessionLootResult {
  personal: Record<string, PersonalLoot>
  professionPoolRolls: Record<Profession, number>
  recipeRolls: Record<Profession, number>
}

function choose<T>(items: T[], random: () => number): T | undefined {
  return items[Math.floor(random() * items.length)]
}

export function generateProfessionLoot(
  participants: LootParticipant[],
  encounterIndex: number,
  enemyKind: Enemy['kind'],
  options: LootOptions = {},
): ProfessionLootResult {
  const random = options.random ?? Math.random
  const resourceChance = options.resourceChance ?? RESOURCE_DROP_CHANCE
  const recipeChance = options.recipeChance ?? RECIPE_DROP_CHANCE
  const tier = options.tier
  const alive = participants.filter((participant) => participant.alive)
  const personal = Object.fromEntries(participants.map((participant) => [participant.id, { resources: {}, recipeIds: [] }])) as Record<string, PersonalLoot>
  const professionPoolRolls = { blacksmith: 0, alchemist: 0, jeweler: 0 }
  const recipeRolls = { blacksmith: 0, alchemist: 0, jeweler: 0 }
  const pool = FIRST_RIFT_LOOT_POOLS[encounterIndex] ?? FIRST_RIFT_LOOT_POOLS[0]

  for (const profession of PROFESSIONS) {
    const eligible = alive.filter((participant) => participant.classId === profession)
    if (!eligible.length) continue
    professionPoolRolls[profession] += 1
    if (random() < resourceChance.correctProfession) {
      const recipient = choose(eligible, random)!
      const resources = tier ? tierResources(profession, tier) : pool[profession].map((id) => RESOURCES[id])
      const roleIndex = enemyKind === 'boss' ? (random() < 0.65 ? 2 : 1) : enemyKind === 'elite' ? (random() < 0.45 ? 1 : 0) : 0
      const resourceId = resources[roleIndex]?.id ?? resources[0]?.id
      if (resourceId) personal[recipient.id].resources[resourceId] = (personal[recipient.id].resources[resourceId] ?? 0) + (enemyKind === 'boss' ? 2 : 1)
    }

    recipeRolls[profession] += 1
    if (random() < recipeChance[enemyKind]) {
      const recipient = choose(eligible, random)!
      const recipeIds = tier
        ? Object.values(PHASE7_RECIPES).filter((recipe) => recipe.profession === profession && recipe.tier === tier).map((recipe) => recipe.id)
        : PROFESSION_RECIPE_IDS[profession]
      const recipeId = choose(recipeIds, random)
      if (recipeId) personal[recipient.id].recipeIds.push(recipeId)
    }
  }

  const genericResources = tier ? Object.values(PHASE7_RESOURCES).filter((resource) => resource.tier === tier).map((resource) => resource.id) : Object.keys(RESOURCES)
  for (const participant of alive.filter((member) => !isProfessionClass(member.classId))) {
    if (random() < resourceChance.combatClass) {
      const resourceId = choose(genericResources, random)
      if (resourceId) personal[participant.id].resources[resourceId] = (personal[participant.id].resources[resourceId] ?? 0) + 1
    }
  }

  return { personal, professionPoolRolls, recipeRolls }
}
