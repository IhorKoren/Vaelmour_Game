import type { RiftDefinition } from './types'

export const FIRST_RIFT: RiftDefinition = {
  id: 'first_rift',
  name: 'Перший Розлом',
  description: 'Три шари викривленої реальності та перша повна експедиційна прогресія.',
  floors: [
    { floorNumber: 1, recommendedLevel: { min: 1, max: 10 }, resourceTier: 1,
      encounterEnemyIds: ['f1_ash_rat', 'f1_hollow_guard', 'f1_sporeling', 'f1_shardling', 'f1_iron_maw'], bossId: 'f1_mordar' },
    { floorNumber: 2, recommendedLevel: { min: 8, max: 20 }, resourceTier: 2, unlockRequiresFloor: 1,
      encounterEnemyIds: ['f2_mire_stalker', 'f2_echo_knight', 'f2_blight_moth', 'f2_crystal_hound', 'f2_mire_stalker', 'f2_vein_reaper', 'f2_marrow_sentinel'], bossId: 'f2_veskara' },
    { floorNumber: 3, recommendedLevel: { min: 18, max: 35 }, resourceTier: 3, unlockRequiresFloor: 2,
      encounterEnemyIds: ['f3_void_crawler', 'f3_rune_devourer', 'f3_blood_oracle', 'f3_obsidian_beast', 'f3_void_crawler', 'f3_rune_devourer', 'f3_soul_forge', 'f3_rift_harbinger', 'f3_soul_forge'], bossId: 'f3_nhal' },
  ],
}

export function floorDefinition(floorNumber: number) {
  return FIRST_RIFT.floors.find((floor) => floor.floorNumber === floorNumber)
}
