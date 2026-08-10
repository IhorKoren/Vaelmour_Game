import { PROFESSIONS, RECIPE_DROP_CHANCE, RESOURCE_DROP_CHANCE, isProfessionClass } from '../../shared/game-data/economy'
import { PROFESSION_RECIPE_IDS } from '../../shared/game-data/recipes'
import { FIRST_RIFT_LOOT_POOLS, RESOURCES } from '../../shared/game-data/resources'
import type { PersonalLoot, Profession } from '../../shared/game-data/types'
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
      const resourceId = choose(pool[profession], random)
      if (resourceId) personal[recipient.id].resources[resourceId] = (personal[recipient.id].resources[resourceId] ?? 0) + (enemyKind === 'boss' ? 2 : 1)
    }

    recipeRolls[profession] += 1
    if (random() < recipeChance[enemyKind]) {
      const recipient = choose(eligible, random)!
      const recipeId = choose(PROFESSION_RECIPE_IDS[profession], random)
      if (recipeId) personal[recipient.id].recipeIds.push(recipeId)
    }
  }

  const genericResources = Object.keys(RESOURCES)
  for (const participant of alive.filter((member) => !isProfessionClass(member.classId))) {
    if (random() < resourceChance.combatClass) {
      const resourceId = choose(genericResources, random)
      if (resourceId) personal[participant.id].resources[resourceId] = (personal[participant.id].resources[resourceId] ?? 0) + 1
    }
  }

  return { personal, professionPoolRolls, recipeRolls }
}
