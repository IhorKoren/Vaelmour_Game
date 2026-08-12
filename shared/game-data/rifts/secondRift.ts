import type { RiftDefinition } from './types'

/** The Ashen Deep: a buried necropolis-furnace beneath a dead volcanic kingdom. */
export const SECOND_RIFT: RiftDefinition = {
  id: 'second_rift',
  name: 'Second Rift: The Ashen Deep',
  description: 'Descend through cinder warrens, the drowned ossuary, and the eclipsed crown-forge.',
  theme: 'A volcanic necropolis where dead smith-kings and abyssal flame have fused into one domain.',
  recommendedPartySize: { min: 3, max: 5 },
  unlockRequires: { riftId: 'first_rift', floorNumber: 3 },
  floors: [
    { floorNumber: 1, recommendedLevel: { min: 34, max: 45 }, resourceTier: 4,
      encounterEnemyIds: ['srf1_cinder_thrall', 'srf1_ash_widow', 'srf1_bone_lantern', 'srf1_slag_hound', 'srf1_furnace_warden', 'srf1_charred_seer'], bossId: 'srf1_vuldra' },
    { floorNumber: 2, recommendedLevel: { min: 44, max: 55 }, resourceTier: 5, unlockRequiresFloor: 1,
      encounterEnemyIds: ['srf2_gloom_leech', 'srf2_grave_miner', 'srf2_pale_myrmidon', 'srf2_sulfur_wraith', 'srf2_ossuary_giant', 'srf2_dusk_inquisitor'], bossId: 'srf2_malgor' },
    { floorNumber: 3, recommendedLevel: { min: 54, max: 65 }, resourceTier: 6, unlockRequiresFloor: 2,
      encounterEnemyIds: ['srf3_nightglass_spawn', 'srf3_ember_revenant', 'srf3_starved_seraph', 'srf3_abyssal_templar', 'srf3_pyrewrought_colossus', 'srf3_eclipse_harrower'], bossId: 'srf3_astaroth' },
  ],
}
