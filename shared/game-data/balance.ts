export interface PartySizeScaling {
  hp: number
  attack: number
}

/** Applied once at expedition START. Depends only on the locked party size. */
export const PARTY_SIZE_SCALING: Record<number, PartySizeScaling> = {
  1: { hp: 0.32, attack: 0.40 },
  2: { hp: 0.52, attack: 0.62 },
  3: { hp: 0.68, attack: 0.84 },
  4: { hp: 0.85, attack: 0.91 },
  5: { hp: 1.00, attack: 1.00 },
}

/** Extra high-floor survivability tuning for undersized parties only. */
export const LOW_PARTY_FLOOR_MODIFIERS: Record<1 | 2, Record<1 | 2 | 3, PartySizeScaling>> = {
  1: { 1: { hp: 1.04, attack: 1.04 }, 2: { hp: 0.97, attack: 0.92 }, 3: { hp: 0.93, attack: 0.88 } },
  2: { 1: { hp: 1, attack: 1 }, 2: { hp: 0.98, attack: 0.97 }, 3: { hp: 0.97, attack: 0.94 } },
}

/** Independently verified undersized-party tuning for the Second Rift. */
export const SECOND_RIFT_LOW_PARTY_MODIFIERS: Record<1 | 2, Record<1 | 2 | 3, PartySizeScaling>> = {
  1: { 1: { hp: 0.97, attack: 0.925 }, 2: { hp: 0.98, attack: 0.92 }, 3: { hp: 1.00, attack: 0.90 } },
  2: { 1: { hp: 0.99, attack: 0.97 }, 2: { hp: 1.00, attack: 0.98 }, 3: { hp: 1.00, attack: 0.97 } },
}

export const RIFT_PARTY_SIZE_SCALING: Record<string, Record<number, PartySizeScaling>> = {
  first_rift: PARTY_SIZE_SCALING,
  second_rift: PARTY_SIZE_SCALING,
}

export const RIFT_LOW_PARTY_FLOOR_MODIFIERS: Record<string, Record<1 | 2, Record<1 | 2 | 3, PartySizeScaling>>> = {
  first_rift: LOW_PARTY_FLOOR_MODIFIERS,
  second_rift: SECOND_RIFT_LOW_PARTY_MODIFIERS,
}

export const FIRST_RIFT_ENEMY_ATTACK_SCALE: Record<1 | 2 | 3, number> = {
  1: 3.60,
  2: 1.68,
  3: 1.08,
}

export const PHASE7_BASELINE_RECIPE_DROP_CHANCE = { mob: 0.005, elite: 0.02, boss: 0.08 } as const
export const RECIPE_DROP_CHANCE = { mob: 0.0025, elite: 0.01, boss: 0.04 } as const

export const SIMULATION_BALANCE_CONFIG = {
  basicSmartPotionThresholdByTier: { 1: 0.37, 2: 0.30, 3: 0.30, 4: 0.29, 5: 0.28, 6: 0.27 },
  basicSmartMaxPotionUsersPerRound: 1,
  potionsPerPlayer: 4,
  manualReadySecondsPerRound: 10,
  autoSecondsPerRound: 30,
} as const

/** Gameplay hard limits. Recommendation is advisory and never gates START. */
export const PRODUCTION_MIN_PARTY_SIZE = 1
export const RECOMMENDED_PARTY_SIZE = { min: 3, max: 5 } as const
