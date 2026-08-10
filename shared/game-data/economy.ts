import type { CharacterClass } from '../../src/types/game'
import type { Profession } from './types'

export const COIN_MULTIPLIER: Record<CharacterClass, number> = {
  warrior: 1, ranger: 1, blacksmith: 0.6, alchemist: 0.6, jeweler: 0.6,
}

export const RESOURCE_DROP_CHANCE = { combatClass: 0.05, correctProfession: 0.35 }
export const RECIPE_DROP_CHANCE = { mob: 0.005, elite: 0.02, boss: 0.08 }
export const FAILED_EXPEDITION_LOOT_LOSS = 0.5
export const MARKET_FEES = { sellListing: 0, buyOrder: 0.01, transaction: 0.02 } as const
export const PROFESSIONS: Profession[] = ['blacksmith', 'alchemist', 'jeweler']

export function isProfessionClass(classId: CharacterClass): classId is Profession {
  return classId === 'blacksmith' || classId === 'alchemist' || classId === 'jeweler'
}
