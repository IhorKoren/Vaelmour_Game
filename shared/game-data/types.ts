import type { CharacterClass } from '../../src/types/game'

export type Profession = 'blacksmith' | 'alchemist' | 'jeweler'
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
}

export interface ResourceDefinition {
  id: string
  name: string
  profession: Profession
  icon: string
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
