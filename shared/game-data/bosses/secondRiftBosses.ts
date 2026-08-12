import type { EnemyDefinition } from '../enemies/types'

export const SECOND_RIFT_BOSSES: Record<string, EnemyDefinition> = {
  srf1_vuldra: {
    id: 'srf1_vuldra', name: 'Vuldra, Mother of Cinders', type: 'BOSS', level: 45, maxHP: 6900, attack: 305,
    attackZoneWeights: { head: 1, body: 2.1, legs: 1 }, defenseZoneWeights: { head: 1.8, body: 1, legs: 1 },
    targeting: 'LOWEST_HP', baseXP: 850, baseCoins: 360, lootTier: 4,
    bossPattern: { groupAttackEvery: 3, cycleLength: 3, cycleWeights: [{ head: 1, body: 2.7, legs: 1 }, { head: 1, body: 1, legs: 2.7 }] },
  },
  srf2_malgor: {
    id: 'srf2_malgor', name: 'Malgor, Keeper of the Ossuary', type: 'BOSS', level: 55, maxHP: 8800, attack: 355,
    attackZoneWeights: { head: 1.7, body: 1.3, legs: 1 }, defenseZoneWeights: { head: 1, body: 1.8, legs: 1 },
    targeting: 'HIGHEST_HP', baseXP: 1120, baseCoins: 470, lootTier: 5,
    bossPattern: { groupAttackEvery: 3, cycleLength: 3, shiftAfterGroup: true, cycleWeights: [{ head: 2.8, body: 1, legs: 1 }, { head: 1, body: 2.8, legs: 1 }] },
  },
  srf3_astaroth: {
    id: 'srf3_astaroth', name: 'Astaroth, Crown of the Ashen Deep', type: 'BOSS', level: 65, maxHP: 11000, attack: 395,
    attackZoneWeights: { head: 1.4, body: 1.4, legs: 1.4 }, defenseZoneWeights: { head: 1.4, body: 1, legs: 1.4 },
    targeting: 'LOWEST_HP', baseXP: 1480, baseCoins: 610, lootTier: 6,
    bossPattern: { groupAttackEvery: 3, cycleLength: 3, shiftAfterGroup: true, cycleWeights: [{ head: 2.9, body: 1, legs: 1 }, { head: 1, body: 1, legs: 2.9 }, { head: 1, body: 2.9, legs: 1 }] },
  },
}
