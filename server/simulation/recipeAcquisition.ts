import { floorEncounters } from '../../shared/game-data/rifts'
import { generateProfessionLoot } from '../loot/professionLoot'
import { seededRandom } from './balanceSimulator'
import type { Profession } from '../../shared/game-data/types'

export interface RecipeAcquisitionMetric {
  floorNumber: number
  profession: Profession
  runs: number
  populationSize: number
  dropsPer100Runs: number
  averageRunsToAny: number
  medianRunsToAny: number
  p90RunsToAny: number
  expectedAfter10Runs: number
  expectedAfter50Runs: number
  newRecipes: number
  duplicateRecipes: number
  duplicateShare: number
}

export function simulateRecipeAcquisition(floorNumber: number, runs: number, populationSize: number, seed: number): RecipeAcquisitionMetric[] {
  const random = seededRandom(seed)
  const professions: Profession[] = ['blacksmith', 'alchemist', 'jeweler']
  const known = Object.fromEntries(professions.map((profession) => [profession, Array.from({ length: populationSize }, () => new Set<string>())])) as Record<Profession, Set<string>[]>
  const drops: Record<Profession, number> = { blacksmith: 0, alchemist: 0, jeweler: 0 }
  const fresh: Record<Profession, number> = { blacksmith: 0, alchemist: 0, jeweler: 0 }
  const duplicate: Record<Profession, number> = { blacksmith: 0, alchemist: 0, jeweler: 0 }
  const dropRuns: Record<Profession, number[]> = { blacksmith: [], alchemist: [], jeweler: [] }
  const encounters = floorEncounters(floorNumber)
  for (let run = 1; run <= runs; run += 1) {
    const collector = (run - 1) % populationSize
    const participants = professions.map((profession) => ({ id: profession, classId: profession, alive: true }))
    const seenThisRun = new Set<Profession>()
    encounters.forEach((enemy, encounterIndex) => {
      const kind = enemy.type === 'NORMAL' ? 'mob' : enemy.type === 'ELITE' ? 'elite' : 'boss'
      const result = generateProfessionLoot(participants, encounterIndex, kind, { random, tier: enemy.lootTier, resourceChance: { combatClass: 0, correctProfession: 0 } })
      for (const profession of professions) for (const recipeId of result.personal[profession].recipeIds) {
        drops[profession] += 1
        if (!seenThisRun.has(profession)) { dropRuns[profession].push(run); seenThisRun.add(profession) }
        if (known[profession][collector].has(recipeId)) duplicate[profession] += 1
        else { known[profession][collector].add(recipeId); fresh[profession] += 1 }
      }
    })
  }
  return professions.map((profession) => {
    const chance = dropRuns[profession].length / runs
    const noDrop = Math.max(0.000001, 1 - Math.min(0.999999, chance))
    return { floorNumber, profession, runs, populationSize, dropsPer100Runs: drops[profession] / runs * 100,
      averageRunsToAny: chance ? 1 / chance : Number.POSITIVE_INFINITY,
      medianRunsToAny: chance ? Math.ceil(Math.log(0.5) / Math.log(noDrop)) : Number.POSITIVE_INFINITY,
      p90RunsToAny: chance ? Math.ceil(Math.log(0.1) / Math.log(noDrop)) : Number.POSITIVE_INFINITY,
      expectedAfter10Runs: drops[profession] / runs * 10, expectedAfter50Runs: drops[profession] / runs * 50,
      newRecipes: fresh[profession], duplicateRecipes: duplicate[profession], duplicateShare: drops[profession] ? duplicate[profession] / drops[profession] : 0 }
  })
}
