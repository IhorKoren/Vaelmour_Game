export type CharacterClass = 'warrior' | 'ranger' | 'blacksmith' | 'alchemist' | 'jeweler'
export type Zone = 'head' | 'body' | 'legs'
export type GameMode = 'city' | 'rift'

export interface ClassDefinition {
  id: CharacterClass
  name: string
  title: string
  glyph: string
  attack: number
  maxHP: number
  description: string
}

export interface Character {
  id: string
  name: string
  classId: CharacterClass
  level: number
  currentXP: number
  attack: number
  maxHP: number
  currentHP: number
  alive: boolean
  ready: boolean
}

export interface Enemy {
  id: string
  name: string
  kind: 'mob' | 'elite' | 'boss'
  attack: number
  maxHP: number
  currentHP: number
  attackCount: number
  definitionId?: string
  level?: number
  attackZoneWeights?: Record<Zone, number>
  defenseZoneWeights?: Record<Zone, number>
  targeting?: 'RANDOM' | 'LOWEST_HP' | 'HIGHEST_HP'
  bossPattern?: {
    groupAttackEvery: number
    cycleLength?: number
    cycleWeights?: Array<Record<Zone, number>>
    shiftAfterGroup?: boolean
  }
}

export interface CombatAction {
  type: 'attack' | 'potion'
  attackZone?: Zone
  defendZone: Zone
  potionItemId?: string
}

export interface EnemyAction {
  attackZone: Zone
  defendZone: Zone
  targetId: string | null
  isGroupAttack: boolean
}

export interface RoundInput {
  party: Character[]
  enemy: Enemy
  actions: Record<string, CombatAction>
  enemyAction: EnemyAction
  potionCooldown: number
  /** Per-character cooldowns used by authoritative multiplayer rooms. */
  potionCooldowns?: Record<string, number>
  potionHealPercents?: Record<string, number>
  random?: () => number
}

export interface RoundResult {
  party: Character[]
  enemy: Enemy
  potionCooldown: number
  potionCooldowns?: Record<string, number>
  log: string[]
}

export interface ProgressionResult {
  character: Character
  levelsGained: number
}

export interface EncounterDefinition {
  name: string
  kind: 'mob' | 'elite' | 'boss'
  attack: number
  maxHP: number
  xp: number
  coins: number
  loot: string
}

export interface EncounterReward {
  xp: number
  coins: number
  loot: string
}
