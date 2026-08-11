import { describe, expect, it } from 'vitest'
import { adjustedEnemyXP, xpMultiplier } from '../../shared/game-data/progression'
import { applyXPAndLevelUps, calculateXPRequired } from './progression'
import type { Character } from '../types/game'

const character = (level = 1): Character => ({ id: 'p', name: 'P', classId: 'blacksmith', level, currentXP: 0, attack: 60 + level - 1, maxHP: 1150 + (level - 1) * 5, currentHP: 1150 + (level - 1) * 5, alive: true, ready: false })

describe('Phase 7 infinite progression and low-level XP', () => {
  it('keeps the exact XP formula', () => expect(calculateXPRequired(20)).toBe(Math.round(100 * 20 ** 1.35)))
  it.each([[3, 1], [4, .75], [6, .75], [7, .5], [10, .5], [11, .25], [15, .25], [16, .1], [50, .1]])('difference %i has multiplier %f', (difference, multiplier) => expect(xpMultiplier(20 + difference, 20)).toBe(multiplier))
  it('penalty affects XP only through a testable function', () => expect(adjustedEnemyXP(101, 30, 20)).toBe(51))
  it('remains uncapped beyond level 100', () => {
    const result = applyXPAndLevelUps(character(100), calculateXPRequired(100))
    expect(result.character.level).toBe(101)
    expect(result.character.attack).toBe(character(100).attack + 1)
    expect(result.character.maxHP).toBe(character(100).maxHP + 5)
  })
  it('still supports multiple level-ups', () => expect(applyXPAndLevelUps(character(), 10_000).levelsGained).toBeGreaterThan(5))
})
