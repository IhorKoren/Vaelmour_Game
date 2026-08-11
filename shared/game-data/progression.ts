export const XP_CURVE = { base: 100, exponent: 1.35 } as const
export const LEVEL_GAINS = { attack: 1, maxHP: 5 } as const

export const XP_PENALTY_BRACKETS = [
  { maxLevelDifference: 3, multiplier: 1 },
  { maxLevelDifference: 6, multiplier: 0.75 },
  { maxLevelDifference: 10, multiplier: 0.5 },
  { maxLevelDifference: 15, multiplier: 0.25 },
  { maxLevelDifference: Number.POSITIVE_INFINITY, multiplier: 0.1 },
] as const

export function xpRequired(level: number): number {
  return Math.round(XP_CURVE.base * Math.pow(level, XP_CURVE.exponent))
}

export function xpMultiplier(playerLevel: number, enemyLevel: number): number {
  const difference = playerLevel - enemyLevel
  return XP_PENALTY_BRACKETS.find((bracket) => difference <= bracket.maxLevelDifference)!.multiplier
}

export function adjustedEnemyXP(baseXP: number, playerLevel: number, enemyLevel: number): number {
  return Math.round(baseXP * xpMultiplier(playerLevel, enemyLevel))
}
