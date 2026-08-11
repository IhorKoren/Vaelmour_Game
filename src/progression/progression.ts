import { LEVEL_GAINS, xpRequired } from '../../shared/game-data/progression'
import type { Character, ProgressionResult } from '../types/game'

export function calculateXPRequired(level: number): number {
  return xpRequired(level)
}

export function applyXPAndLevelUps(character: Character, earnedXP: number): ProgressionResult {
  let currentXP = character.currentXP + Math.max(0, earnedXP)
  let level = character.level
  let attack = character.attack
  let maxHP = character.maxHP
  let currentHP = character.currentHP
  let levelsGained = 0

  while (currentXP >= calculateXPRequired(level)) {
    currentXP -= calculateXPRequired(level)
    level += 1
    attack += LEVEL_GAINS.attack
    maxHP += LEVEL_GAINS.maxHP
    currentHP += LEVEL_GAINS.maxHP
    levelsGained += 1
  }

  return {
    character: { ...character, currentXP, level, attack, maxHP, currentHP },
    levelsGained,
  }
}
