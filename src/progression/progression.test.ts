import { describe, expect, it } from 'vitest'
import { applyXPAndLevelUps, calculateXPRequired } from './progression'
import type { Character } from '../types/game'

const character: Character = {
  id: 'player', name: 'Тест', classId: 'ranger', level: 1, currentXP: 0,
  attack: 100, maxHP: 800, currentHP: 800, alive: true, ready: false,
}

describe('progression rules', () => {
  it('level-up gives +1 Attack and +5 HP', () => {
    const result = applyXPAndLevelUps(character, calculateXPRequired(1))
    expect(result.character.level).toBe(2)
    expect(result.character.attack).toBe(101)
    expect(result.character.maxHP).toBe(805)
    expect(result.character.currentHP).toBe(805)
  })

  it('supports multiple level-ups from one XP reward', () => {
    const reward = calculateXPRequired(1) + calculateXPRequired(2) + calculateXPRequired(3)
    const result = applyXPAndLevelUps(character, reward)
    expect(result.levelsGained).toBe(3)
    expect(result.character.level).toBe(4)
    expect(result.character.attack).toBe(103)
    expect(result.character.maxHP).toBe(815)
    expect(result.character.currentXP).toBe(0)
  })
})
