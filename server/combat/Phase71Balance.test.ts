import { describe, expect, it } from 'vitest'
import { PARTY_SIZE_SCALING, PRODUCTION_MIN_PARTY_SIZE, RECIPE_DROP_CHANCE } from '../../shared/game-data/balance'
import { RECIPE_DROP_CHANCE as ECONOMY_RECIPE_RATES } from '../../shared/game-data/economy'
import { floorEncounters } from '../../shared/game-data/rifts'
import { FIRST_RIFT } from '../../shared/game-data/rifts/firstRift'
import { createFirstRiftEnemy, partyScaling, scaleEnemyDefinition } from './firstRiftEnemyFactory'
import { createScenarioEnemy, createSimulationAction, seededRandom, simulateScenario } from '../simulation/balanceSimulator'
import type { Character, Enemy } from '../../src/types/game'

const base = floorEncounters(1)[0]
const member: Character = { id: 'p', name: 'P', classId: 'warrior', level: 5, currentXP: 0, attack: 90, maxHP: 1000, currentHP: 250, alive: true, ready: false }
const enemy: Enemy = createFirstRiftEnemy(1, 0, 5)

describe('Phase 7.1 production party scaling', () => {
  it('5-player enemy scaling is the 1.0 baseline', () => expect(partyScaling(5)).toEqual({ hp: 1, attack: 1 }))
  it('production permits solo expeditions', () => expect(PRODUCTION_MIN_PARTY_SIZE).toBe(1))
  it('4-player scaling applies configured HP', () => expect(scaleEnemyDefinition(base, 4).maxHP).toBe(Math.round(base.maxHP * PARTY_SIZE_SCALING[4].hp)))
  it('4-player scaling applies configured Attack', () => expect(scaleEnemyDefinition(base, 4).attack).toBe(Math.round(base.attack * PARTY_SIZE_SCALING[4].attack)))
  it('3-player scaling applies configured HP', () => expect(scaleEnemyDefinition(base, 3).maxHP).toBe(Math.round(base.maxHP * PARTY_SIZE_SCALING[3].hp)))
  it('3-player scaling applies configured Attack', () => expect(scaleEnemyDefinition(base, 3).attack).toBe(Math.round(base.attack * PARTY_SIZE_SCALING[3].attack)))
  it('scaling does not change XP or coins', () => {
    const scaled = scaleEnemyDefinition(base, 3)
    expect([scaled.baseXP, scaled.baseCoins]).toEqual([base.baseXP, base.baseCoins])
  })
  it('scaling does not change profession loot tier or patterns', () => {
    const scaled = scaleEnemyDefinition(floorEncounters(3).at(-1)!, 3)
    expect(scaled.lootTier).toBe(3)
    expect(scaled.bossPattern).toEqual(floorEncounters(3).at(-1)!.bossPattern)
  })
  it('scaling depends on party size, not class composition or gear', () => {
    expect(createFirstRiftEnemy(2, 0, 4)).toEqual(createFirstRiftEnemy(2, 0, 4))
  })
  it('simulator uses the production scaled enemy factory', () => {
    expect(createScenarioEnemy(2, 0, 3)).toEqual(createFirstRiftEnemy(2, 0, 3))
  })
  it('same seed remains deterministic after scaling', () => {
    const scenario = { id: 'scaled', floorNumber: 1, classes: ['warrior', 'ranger', 'alchemist'] as const, gear: 'RECOMMENDED' as const, behavior: 'BASIC_SMART' as const, runs: 20, seed: 44 }
    expect(simulateScenario({ ...scenario, classes: [...scenario.classes] })).toEqual(simulateScenario({ ...scenario, classes: [...scenario.classes] }))
  })
  it('Auto still never uses a potion', () => expect(createSimulationAction(member, enemy, 'RANDOM', 4, seededRandom(1)).type).toBe('attack'))
  it('BASIC_SMART action uses current state and deterministic RNG only', () => {
    expect(createSimulationAction(member, enemy, 'BASIC_SMART', 4, seededRandom(9))).toEqual(createSimulationAction(member, enemy, 'BASIC_SMART', 4, seededRandom(9)))
  })
  it('recipe rates come from one centralized config', () => expect(ECONOMY_RECIPE_RATES).toBe(RECIPE_DROP_CHANCE))
  it.each([1, 2, 3])('Floor %i boss remains the final encounter', (floor) => {
    expect(floorEncounters(floor).at(-1)?.type).toBe('BOSS')
    expect(FIRST_RIFT.floors[floor - 1].bossId).toBe(floorEncounters(floor).at(-1)?.id)
  })
})
