import { describe, expect, it } from 'vitest'
import type { CharacterClass } from '../../src/types/game'
import { simulateScenario, type BehaviorProfile } from './balanceSimulator'

function metric(id: string, classes: CharacterClass[], floorNumber: number, behavior: BehaviorProfile, seed: number) {
  return simulateScenario({ id, riftId: 'second_rift', floorNumber, classes, gear: 'RECOMMENDED', behavior, runs: 300, seed })
}

describe('Phase 9.1 broad balance guardrails', () => {
  it('keeps solo Floor 2 and duo Floor 3 difficult but nonzero under Manual play', () => {
    expect(metric('solo', ['warrior'], 2, 'BASIC_SMART', 91_102).clearRate).toBeGreaterThan(0.05)
    expect(metric('duo', ['warrior', 'alchemist'], 3, 'BASIC_SMART', 91_203).clearRate).toBeGreaterThan(0.08)
  })

  it('keeps 3-5 player Second Rift Manual viable without guaranteed Floor 3 clears', () => {
    const parties: CharacterClass[][] = [
      ['warrior', 'ranger', 'alchemist'],
      ['warrior', 'ranger', 'alchemist', 'jeweler'],
      ['warrior', 'ranger', 'blacksmith', 'alchemist', 'jeweler'],
    ]
    const rates = parties.map((classes, index) => metric(`party-${classes.length}`, classes, 3, 'BASIC_SMART', 91_300 + index).clearRate)
    expect(rates[0]).toBeGreaterThan(0.10)
    expect(rates[1]).toBeGreaterThan(0.45)
    expect(rates[2]).toBeGreaterThan(0.65)
    expect(rates.every((rate) => rate < 0.99)).toBe(true)
  })

  it('makes Auto useful for realistic 3-5 player scenarios while remaining below Manual', () => {
    const scenarios = [
      { classes: ['warrior', 'ranger', 'alchemist'] as CharacterClass[], floor: 1 },
      { classes: ['warrior', 'ranger', 'alchemist', 'jeweler'] as CharacterClass[], floor: 2 },
      { classes: ['warrior', 'warrior', 'warrior', 'ranger', 'ranger'] as CharacterClass[], floor: 3 },
    ]
    for (const [index, scenario] of scenarios.entries()) {
      const auto = metric(`auto-${index}`, scenario.classes, scenario.floor, 'RANDOM', 91_400 + index)
      const manual = metric(`manual-${index}`, scenario.classes, scenario.floor, 'BASIC_SMART', 91_400 + index)
      expect(auto.clearRate).toBeGreaterThan(0)
      expect(auto.clearRate).toBeLessThan(manual.clearRate)
    }
  })
})
