import { describe, expect, it } from 'vitest'
import { canCharacterAct, resolveRound } from '../../src/combat/engine'
import { simulateScenario } from './balanceSimulator'
import type { CharacterClass } from '../../src/types/game'
import { readFileSync } from 'node:fs'

const scenario = { id: 'test', floorNumber: 1, classes: ['warrior', 'ranger', 'blacksmith', 'alchemist', 'jeweler'] as CharacterClass[],
  gear: 'RECOMMENDED' as const, behavior: 'BASIC_SMART' as const, runs: 20, seed: 77 }

describe('deterministic production-engine balance simulator', () => {
  it('same seed produces identical metrics', () => expect(simulateScenario(scenario)).toEqual(simulateScenario(scenario)))
  it('different seed changes sampled metrics', () => expect(simulateScenario({ ...scenario, seed: 78 })).not.toEqual(simulateScenario(scenario)))
  it('random Auto Battle never consumes potions', () => expect(simulateScenario({ ...scenario, behavior: 'RANDOM' }).averagePotions).toBe(0))
  it('dead characters stop acting in the production engine', () => expect(canCharacterAct({ id: 'x', name: 'x', classId: 'warrior', level: 1, currentXP: 0, attack: 1, maxHP: 1, currentHP: 0, alive: false, ready: false })).toBe(false))
  it('simulator returns profession resource metrics', () => expect(simulateScenario(scenario).resourcesByProfession).toHaveProperty('alchemist'))
  it('uses real round semantics including potion replacing attack', () => {
    const party = [{ id: 'p', name: 'p', classId: 'warrior' as const, level: 1, currentXP: 0, attack: 999, maxHP: 100, currentHP: 10, alive: true, ready: false }]
    const enemy = { id: 'e', name: 'e', kind: 'mob' as const, attack: 1, maxHP: 100, currentHP: 100, attackCount: 0 }
    const result = resolveRound({ party, enemy, actions: { p: { type: 'potion', defendZone: 'head' } }, enemyAction: { attackZone: 'head', defendZone: 'body', targetId: 'p', isGroupAttack: false }, potionCooldown: 0, random: () => 0.5 })
    expect(result.enemy.currentHP).toBe(100)
    expect(result.party[0].currentHP).toBeGreaterThan(10)
  })
  it('balance and progression reports were generated successfully', () => {
    expect(readFileSync('reports/balance-report.md', 'utf8')).toMatch(/Runs per scenario: \*\*10.000\*\*/)
    expect(readFileSync('reports/progression-report.md', 'utf8')).toContain('Estimated successful runs per level')
    expect(readFileSync('reports/phase7-1-balance-report.md', 'utf8')).toMatch(/10.000 runs\/scenario/)
  })
})
