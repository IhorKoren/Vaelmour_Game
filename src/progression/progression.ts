import { LEVEL_ATTACK_GAIN, LEVEL_HP_GAIN } from '../data/config/balance'
import type { Character, ProgressionResult } from '../types/game'

export function calculateXPRequired(level: number): number {
  return Math.round(100 * Math.pow(level, 1.35))
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
    attack += LEVEL_ATTACK_GAIN
    maxHP += LEVEL_HP_GAIN
    currentHP += LEVEL_HP_GAIN
    levelsGained += 1
  }

  return {
    character: { ...character, currentXP, level, attack, maxHP, currentHP },
    levelsGained,
  }
}
