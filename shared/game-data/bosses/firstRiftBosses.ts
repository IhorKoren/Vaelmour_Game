import type { EnemyDefinition } from '../enemies/types'

export const FIRST_RIFT_BOSSES: Record<string, EnemyDefinition> = {
  f1_mordar: {
    id: 'f1_mordar', name: 'Mordar, Heart of the Rift', type: 'BOSS', level: 10, maxHP: 1800, attack: 384,
    attackZoneWeights: { head: 1, body: 1.4, legs: 1 }, defenseZoneWeights: { head: 1.4, body: 1, legs: 1 },
    targeting: 'RANDOM', baseXP: 240, baseCoins: 110, lootTier: 1, bossPattern: { groupAttackEvery: 3 },
  },
  f2_veskara: {
    id: 'f2_veskara', name: 'Veskara, the Fractured Eye', type: 'BOSS', level: 20, maxHP: 3600, attack: 265,
    attackZoneWeights: { head: 1, body: 2.3, legs: 1 }, defenseZoneWeights: { head: 1.7, body: 1, legs: 1 },
    targeting: 'LOWEST_HP', baseXP: 430, baseCoins: 185, lootTier: 2,
    bossPattern: { groupAttackEvery: 3, cycleLength: 3, cycleWeights: [{ head: 2.5, body: 1, legs: 1 }, { head: 1, body: 2.5, legs: 1 }] },
  },
  f3_nhal: {
    id: 'f3_nhal', name: "Nhal, Sovereign of Ruin", type: 'BOSS', level: 35, maxHP: 5900, attack: 280,
    attackZoneWeights: { head: 1.4, body: 1.4, legs: 1 }, defenseZoneWeights: { head: 1, body: 1.4, legs: 1.4 },
    targeting: 'HIGHEST_HP', baseXP: 720, baseCoins: 310, lootTier: 3,
    bossPattern: { groupAttackEvery: 3, cycleLength: 3, shiftAfterGroup: true, cycleWeights: [{ head: 2.6, body: 1, legs: 1 }, { head: 1, body: 1, legs: 2.6 }, { head: 1, body: 2.6, legs: 1 }] },
  },
}
