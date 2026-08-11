export interface FloorDefinition {
  floorNumber: number
  recommendedLevel: { min: number; max: number }
  encounterEnemyIds: string[]
  bossId: string
  resourceTier: 1 | 2 | 3
  unlockRequiresFloor?: number
}

export interface RiftDefinition {
  id: string
  name: string
  description: string
  floors: FloorDefinition[]
}
