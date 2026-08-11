import type { CharacterClass } from '../../src/types/game'

export type Profession = 'blacksmith' | 'alchemist' | 'jeweler'
export type ContentTier = 1 | 2 | 3
export type ItemCategory = 'equipment' | 'jewelry' | 'consumable' | 'resource' | 'recipe'
export type RecipeCategory = 'equipment' | 'consumables' | 'jewelry'
export type ItemEquipType = 'weapon' | 'head' | 'chest' | 'hands' | 'legs' | 'feet' | 'ring' | 'amulet'
export type EquipmentSlot = 'weapon' | 'head' | 'chest' | 'hands' | 'legs' | 'feet' | 'ring1' | 'ring2' | 'amulet'

export interface ItemDefinition {
  id: string
  name: string
  category: ItemCategory
  icon: string
  stackable: boolean
  equipType?: ItemEquipType
  allowedClass?: CharacterClass
  attack?: number
  hp?: number
  recipeId?: string
  tier?: ContentTier
  potionHealPercent?: number
}

export interface RecipeDefinition {
  id: string
  name: string
  profession: Profession
  category: RecipeCategory
  outputItemId: string
  outputQuantity: number
  targetClass?: CharacterClass
  requirements: Record<string, number>
  tier?: ContentTier
}

export interface ResourceDefinition {
  id: string
  name: string
  profession: Profession
  icon: string
  tier?: ContentTier
  role?: 'COMMON' | 'SECONDARY' | 'CORE'
}

export interface PlayerRiftProgress {
  riftId: string
  highestUnlockedFloor: number
  highestCompletedFloor: number
  completionCount: Record<number, number>
}

export interface InventoryEntry {
  entryId: string
  itemId: string
  quantity: number
}

export type EquipmentState = Record<EquipmentSlot, InventoryEntry | null>

export interface PersonalLoot {
  resources: Record<string, number>
  recipeIds: string[]
}

export interface PersonalEncounterReward extends PersonalLoot {
  xp: number
  coins: number
}
