export interface PartySizeScaling {
  hp: number
  attack: number
}

/** Applied once at expedition START. Depends only on the locked party size. */
export const PARTY_SIZE_SCALING: Record<number, PartySizeScaling> = {
  2: { hp: 0.55, attack: 0.70 }, // Development/testing only; no balance target.
  3: { hp: 0.68, attack: 0.84 },
  4: { hp: 0.85, attack: 0.91 },
  5: { hp: 1.00, attack: 1.00 },
}

export const FIRST_RIFT_ENEMY_ATTACK_SCALE: Record<1 | 2 | 3, number> = {
  1: 3.60,
  2: 1.68,
  3: 1.08,
}

export const PHASE7_BASELINE_RECIPE_DROP_CHANCE = { mob: 0.005, elite: 0.02, boss: 0.08 } as const
export const RECIPE_DROP_CHANCE = { mob: 0.0025, elite: 0.01, boss: 0.04 } as const

export const SIMULATION_BALANCE_CONFIG = {
  basicSmartPotionThresholdByTier: { 1: 0.37, 2: 0.30, 3: 0.30 },
  basicSmartMaxPotionUsersPerRound: 1,
  potionsPerPlayer: 4,
  manualReadySecondsPerRound: 10,
  autoSecondsPerRound: 30,
} as const

export const PRODUCTION_MIN_PARTY_SIZE = 3
export const RECOMMENDED_PARTY_SIZE = 5
