import type { Zone } from '../../../src/types/game'
import type { ContentTier, Profession } from '../types'

export type EnemyType = 'NORMAL' | 'ELITE' | 'BOSS'
export type TargetingMode = 'RANDOM' | 'LOWEST_HP' | 'HIGHEST_HP'

export interface BossPatternDefinition {
  groupAttackEvery: number
  cycleLength?: number
  cycleWeights?: Array<Record<Zone, number>>
  shiftAfterGroup?: boolean
}

export interface LootTableDefinition {
  tier: ContentTier
  resourceChances: Record<'NORMAL' | 'ELITE' | 'BOSS', { common: number; secondary: number; core: number }>
  recipeChance: Record<'NORMAL' | 'ELITE' | 'BOSS', number>
  professions: Profession[]
}

export interface EnemyDefinition {
  id: string
  name: string
  type: EnemyType
  level: number
  maxHP: number
  attack: number
  attackZoneWeights: Record<Zone, number>
  defenseZoneWeights: Record<Zone, number>
  targeting: TargetingMode
  baseXP: number
  baseCoins: number
  lootTier: ContentTier
  bossPattern?: BossPatternDefinition
}
