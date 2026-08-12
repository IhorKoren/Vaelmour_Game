import { resolveRound, generateEnemyAction, weightedZone } from '../../src/combat/engine'
import { CLASSES, ZONES } from '../../src/data/config/balance'
import type { Character, CharacterClass, CombatAction, Enemy, Zone } from '../../src/types/game'
import { COIN_MULTIPLIER, FAILED_EXPEDITION_LOOT_LOSS } from '../../shared/game-data/economy'
import { PHASE7_ITEMS, POTION_HEAL_PERCENT, POTION_IDS } from '../../shared/game-data/phase7Catalog'
import { floorDefinition, floorEncounters } from '../../shared/game-data/rifts'
import { adjustedEnemyXP } from '../../shared/game-data/progression'
import { generateProfessionLoot } from '../loot/professionLoot'
import type { ContentTier, Profession } from '../../shared/game-data/types'
import { SIMULATION_BALANCE_CONFIG } from '../../shared/game-data/balance'
import { selectAutoPotion } from '../../shared/game-data/autoBattle'
import { createRiftEnemy } from '../combat/firstRiftEnemyFactory'

export type BehaviorProfile = 'RANDOM' | 'BASIC_SMART'
export type GearProfile = 'UNDERGEARED' | 'RECOMMENDED' | 'STRONG'

export interface SimulationScenario {
  id: string
  riftId?: string
  floorNumber: number
  classes: CharacterClass[]
  gear: GearProfile
  behavior: BehaviorProfile
  runs: number
  seed: number
}

export interface SimulationMetrics {
  scenario: SimulationScenario
  clearRate: number
  deathRate: number
  averageRoundsPerEncounter: number
  averageTotalRounds: number
  averagePotions: number
  averageXP: number
  averageCoins: number
  resourcesPerRun: number
  recipesPerRun: number
  extractionBeforeFailure: number
  extractionAfterFailure: number
  resourcesByProfession: Record<Profession, number>
  recipesPer100Runs: number
  averageRunsPerRecipe: number
  medianRunsPerRecipe: number
  p90RunsPerRecipe: number
  averagePotionsPerClear: number
  deathsWithPotionsRemaining: number
  potionExhaustionFailureRate: number
  lowValuePotionRate: number
  averagePotionOverheal: number
  potionTierUsage: Record<string, number>
  retainedResourcesPerRun: number
  retainedRecipesPerRun: number
  manualMinutesPerRun: number
  autoMinutesPerRun: number
  coinsPerHour: number
  resourcesPerHour: number
  recipesPerHour: number
}

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6D2B79F5
    let value = state
    value = Math.imul(value ^ value >>> 15, value | 1)
    value ^= value + Math.imul(value ^ value >>> 7, value | 61)
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
}

export function createScenarioEnemy(floorNumber: number, encounterIndex: number, partySize: number, riftId = 'first_rift'): Enemy {
  return createRiftEnemy(riftId, floorNumber, encounterIndex, partySize)
}

function targetTier(riftId: string, floor: number): ContentTier {
  return floorDefinition(riftId, floor)?.resourceTier ?? 1
}

function gearTier(riftId: string, floor: number, gear: GearProfile): number {
  const target = targetTier(riftId, floor)
  if (gear === 'UNDERGEARED') return Math.max(0, target - 2)
  if (gear === 'RECOMMENDED') return Math.max(0, target - 1)
  return target
}

function levelFor(riftId: string, floor: number, gear: GearProfile): number {
  const recommendation = floorDefinition(riftId, floor)!.recommendedLevel
  if (gear === 'UNDERGEARED') return Math.max(1, recommendation.min - 3)
  return Math.round((recommendation.min + recommendation.max) / 2)
}

function createParty(scenario: SimulationScenario): Character[] {
  const riftId = scenario.riftId ?? 'first_rift'
  const tier = gearTier(riftId, scenario.floorNumber, scenario.gear)
  const level = levelFor(riftId, scenario.floorNumber, scenario.gear)
  return scenario.classes.map((classId, index) => {
    const gear = tier > 0 ? Object.values(PHASE7_ITEMS).filter((item) => item.tier === tier && item.allowedClass === classId) : []
    const attack = CLASSES[classId].attack + level - 1 + gear.reduce((sum, item) => sum + (item.attack ?? 0), 0)
    const maxHP = CLASSES[classId].maxHP + (level - 1) * 5 + gear.reduce((sum, item) => sum + (item.hp ?? 0), 0)
    return { id: `p${index}`, name: `${classId}-${index}`, classId, level, currentXP: 0, attack, maxHP, currentHP: maxHP, alive: true, ready: false }
  })
}

export function createSimulationAction(member: Character, enemy: Enemy, behavior: BehaviorProfile, potions: number, random: () => number, potionTier: ContentTier = 1, contentTier: ContentTier = potionTier): CombatAction {
  const potion = behavior === 'RANDOM'
    ? selectAutoPotion({ currentHP: member.currentHP, maxHP: member.maxHP, potionCooldown: 0, contentTier,
      potions: [{ itemId: POTION_IDS[potionTier], quantity: potions, healPercent: POTION_HEAL_PERCENT[potionTier] }] })
    : potions > 0 && member.currentHP / member.maxHP <= SIMULATION_BALANCE_CONFIG.manualSmartPotionThresholdByTier[contentTier]
      ? { potionItemId: POTION_IDS[potionTier] }
      : null
  if (potion) return { type: 'potion', potionItemId: potion.potionItemId, defendZone: behavior === 'BASIC_SMART' ? weightedZone(enemy.attackZoneWeights, random) : ZONES[Math.floor(random() * ZONES.length)] }
  const attackZone: Zone = behavior === 'BASIC_SMART'
    ? [...ZONES].sort((a, b) => (enemy.defenseZoneWeights?.[a] ?? 1) - (enemy.defenseZoneWeights?.[b] ?? 1))[Math.floor(random() * 2)]
    : ZONES[Math.floor(random() * ZONES.length)]
  const defendZone = behavior === 'BASIC_SMART' ? weightedZone(enemy.attackZoneWeights, random) : ZONES[Math.floor(random() * ZONES.length)]
  return { type: 'attack', attackZone, defendZone }
}

export function simulateScenario(scenario: SimulationScenario): SimulationMetrics {
  const riftId = scenario.riftId ?? 'first_rift'
  const random = seededRandom(scenario.seed)
  let clears = 0, deaths = 0, totalRounds = 0, completedEncounters = 0, totalPotions = 0
  let totalXP = 0, totalCoins = 0, totalResources = 0, totalRecipes = 0, beforeExtraction = 0, afterExtraction = 0
  let clearPotions = 0, deathsWithPotions = 0, potionExhaustionFailures = 0, lowValuePotions = 0, potionOverheal = 0
  const potionTierUses: Record<string, number> = {}
  let retainedResources = 0, retainedRecipes = 0
  const resourcesByProfession: Record<Profession, number> = { blacksmith: 0, alchemist: 0, jeweler: 0 }
  for (let run = 0; run < scenario.runs; run += 1) {
    let party = createParty(scenario)
    // Keep the consumable loadout fixed across gear profiles so the gear comparison isolates equipment power.
    const potionTier = Math.max(1, targetTier(riftId, scenario.floorNumber) - 1) as ContentTier
    const potions: Record<string, number> = Object.fromEntries(party.map((member) => [member.id, SIMULATION_BALANCE_CONFIG.potionsPerPlayer]))
    const cooldowns: Record<string, number> = Object.fromEntries(party.map((member) => [member.id, 0]))
    let runResources = 0, runRecipes = 0, runFailed = false, runPotions = 0
    const encounters = floorEncounters(riftId, scenario.floorNumber)
    for (let encounterIndex = 0; encounterIndex < encounters.length; encounterIndex += 1) {
      let enemy = createScenarioEnemy(scenario.floorNumber, encounterIndex, scenario.classes.length, riftId)
      let encounterRounds = 0
      while (enemy.currentHP > 0 && party.some((member) => member.alive) && encounterRounds < 200) {
        const actions: Record<string, CombatAction> = {}
        const acting = party.filter((value) => value.alive)
        for (const member of acting) {
          actions[member.id] = createSimulationAction(member, enemy, scenario.behavior, cooldowns[member.id] === 0 ? potions[member.id] : 0, random, potionTier, targetTier(riftId, scenario.floorNumber))
        }
        const potionUsers = acting.filter((member) => actions[member.id].type === 'potion').sort((a, b) => a.currentHP / a.maxHP - b.currentHP / b.maxHP)
        if (scenario.behavior === 'BASIC_SMART') for (const member of potionUsers.slice(SIMULATION_BALANCE_CONFIG.basicSmartMaxPotionUsersPerRound)) {
          actions[member.id] = createSimulationAction(member, enemy, scenario.behavior, 0, random, potionTier, targetTier(riftId, scenario.floorNumber))
        }
        for (const member of acting) {
          if (actions[member.id].type === 'potion') {
            const heal = Math.round(member.maxHP * POTION_HEAL_PERCENT[potionTier])
            if (member.maxHP - member.currentHP < heal * 0.5) lowValuePotions += 1
            potionOverheal += Math.max(0, heal - (member.maxHP - member.currentHP))
            potionTierUses[String(potionTier)] = (potionTierUses[String(potionTier)] ?? 0) + 1
            potions[member.id] -= 1; totalPotions += 1; runPotions += 1
          }
        }
        const result = resolveRound({ party, enemy, actions, enemyAction: generateEnemyAction(enemy, party, random), potionCooldown: cooldowns[party[0]?.id] ?? 0,
          potionCooldowns: cooldowns, potionHealPercents: Object.fromEntries(party.map((member) => [member.id, POTION_HEAL_PERCENT[potionTier]])), random })
        party = result.party; enemy = result.enemy
        Object.assign(cooldowns, result.potionCooldowns)
        encounterRounds += 1; totalRounds += 1
      }
      if (enemy.currentHP > 0) { runFailed = true; break }
      completedEncounters += 1
      const definition = encounters[encounterIndex]
      const loot = generateProfessionLoot(party.map((member) => ({ id: member.id, classId: member.classId, alive: member.alive })), encounterIndex, enemy.kind, { random, tier: definition.lootTier })
      for (const member of party.filter((value) => value.alive)) {
        totalXP += adjustedEnemyXP(definition.baseXP, member.level, definition.level)
        totalCoins += Math.floor(definition.baseCoins * COIN_MULTIPLIER[member.classId])
        const personal = loot.personal[member.id]
        const count = Object.values(personal.resources).reduce((sum, quantity) => sum + quantity, 0)
        runResources += count; runRecipes += personal.recipeIds.length
        if (member.classId === 'blacksmith' || member.classId === 'alchemist' || member.classId === 'jeweler') resourcesByProfession[member.classId] += count
      }
    }
    const clear = !runFailed && party.some((member) => member.alive)
    if (clear) clears += 1
    if (clear) clearPotions += runPotions
    deaths += party.filter((member) => !member.alive).length
    deathsWithPotions += party.filter((member) => !member.alive && potions[member.id] > 0).length
    if (!clear && Object.values(potions).every((quantity) => quantity === 0)) potionExhaustionFailures += 1
    totalResources += runResources; totalRecipes += runRecipes
    beforeExtraction += runResources + runRecipes
    const retainedFraction = clear ? 1 : 1 - FAILED_EXPEDITION_LOOT_LOSS
    afterExtraction += (runResources + runRecipes) * retainedFraction
    retainedResources += runResources * retainedFraction
    retainedRecipes += runRecipes * retainedFraction
  }
  const recipeChance = totalRecipes / Math.max(1, scenario.runs)
  const noDrop = Math.max(0.000001, 1 - Math.min(0.999999, recipeChance))
  const manualMinutes = totalRounds / scenario.runs * SIMULATION_BALANCE_CONFIG.manualReadySecondsPerRound / 60
  const autoMinutes = totalRounds / scenario.runs * SIMULATION_BALANCE_CONFIG.autoSecondsPerRound / 60
  const behaviorMinutes = scenario.behavior === 'RANDOM' ? autoMinutes : manualMinutes
  return { scenario, clearRate: clears / scenario.runs, deathRate: deaths / (scenario.runs * scenario.classes.length),
    averageRoundsPerEncounter: totalRounds / Math.max(1, completedEncounters), averageTotalRounds: totalRounds / scenario.runs,
    averagePotions: totalPotions / scenario.runs, averageXP: totalXP / scenario.runs, averageCoins: totalCoins / scenario.runs,
    resourcesPerRun: totalResources / scenario.runs, recipesPerRun: totalRecipes / scenario.runs,
    extractionBeforeFailure: beforeExtraction / scenario.runs, extractionAfterFailure: afterExtraction / scenario.runs,
    resourcesByProfession: Object.fromEntries(Object.entries(resourcesByProfession).map(([key, value]) => [key, value / scenario.runs])) as Record<Profession, number>,
    recipesPer100Runs: totalRecipes / scenario.runs * 100, averageRunsPerRecipe: recipeChance ? 1 / recipeChance : Number.POSITIVE_INFINITY,
    medianRunsPerRecipe: recipeChance ? Math.ceil(Math.log(0.5) / Math.log(noDrop)) : Number.POSITIVE_INFINITY,
    p90RunsPerRecipe: recipeChance ? Math.ceil(Math.log(0.1) / Math.log(noDrop)) : Number.POSITIVE_INFINITY,
    averagePotionsPerClear: clears ? clearPotions / clears : 0, deathsWithPotionsRemaining: deathsWithPotions / scenario.runs,
    potionExhaustionFailureRate: potionExhaustionFailures / scenario.runs, lowValuePotionRate: totalPotions ? lowValuePotions / totalPotions : 0,
    averagePotionOverheal: totalPotions ? potionOverheal / totalPotions : 0,
    potionTierUsage: Object.fromEntries(Object.entries(potionTierUses).map(([tier, count]) => [tier, count / Math.max(1, totalPotions)])),
    retainedResourcesPerRun: retainedResources / scenario.runs, retainedRecipesPerRun: retainedRecipes / scenario.runs,
    manualMinutesPerRun: manualMinutes, autoMinutesPerRun: autoMinutes,
    coinsPerHour: behaviorMinutes ? totalCoins / scenario.runs * 60 / behaviorMinutes : 0,
    resourcesPerHour: behaviorMinutes ? retainedResources / scenario.runs * 60 / behaviorMinutes : 0,
    recipesPerHour: behaviorMinutes ? retainedRecipes / scenario.runs * 60 / behaviorMinutes : 0 }
}
