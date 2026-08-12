import type { ContentTier } from '../types'

export interface FloorDefinition {
  floorNumber: number
  recommendedLevel: { min: number; max: number }
  encounterEnemyIds: string[]
  bossId: string
  resourceTier: ContentTier
  unlockRequiresFloor?: number
}

export interface RiftDefinition {
  id: string
  name: string
  description: string
  theme: string
  recommendedPartySize: { min: number; max: number }
  unlockRequires?: { riftId: string; floorNumber: number }
  floors: FloorDefinition[]
}
