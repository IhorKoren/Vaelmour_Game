import type { EnemyDefinition, EnemyType, TargetingMode } from './types'
import type { Zone } from '../../../src/types/game'

const even: Record<Zone, number> = { head: 1, body: 1, legs: 1 }
const body: Record<Zone, number> = { head: 1, body: 2.5, legs: 1 }
const head: Record<Zone, number> = { head: 2.5, body: 1, legs: 1 }
const legs: Record<Zone, number> = { head: 1, body: 1, legs: 2.5 }

function enemy(id: string, name: string, type: EnemyType, level: number, maxHP: number, attack: number,
  attackZoneWeights: Record<Zone, number>, defenseZoneWeights: Record<Zone, number>, targeting: TargetingMode,
  baseXP: number, baseCoins: number, lootTier: 4 | 5 | 6): EnemyDefinition {
  return { id, name, type, level, maxHP, attack, attackZoneWeights, defenseZoneWeights, targeting, baseXP, baseCoins, lootTier }
}

export const SECOND_RIFT_ENEMIES: Record<string, EnemyDefinition> = Object.fromEntries([
  enemy('srf1_cinder_thrall', 'Cinder Thrall', 'NORMAL', 36, 2600, 185, body, even, 'RANDOM', 260, 92, 4),
  enemy('srf1_ash_widow', 'Ash Widow', 'NORMAL', 38, 2450, 195, legs, head, 'LOWEST_HP', 275, 97, 4),
  enemy('srf1_bone_lantern', 'Bone Lantern', 'NORMAL', 40, 2850, 202, head, body, 'HIGHEST_HP', 290, 102, 4),
  enemy('srf1_slag_hound', 'Slag Hound', 'NORMAL', 41, 3100, 210, even, legs, 'LOWEST_HP', 305, 108, 4),
  enemy('srf1_furnace_warden', 'Furnace Warden', 'ELITE', 43, 4200, 228, body, head, 'HIGHEST_HP', 430, 155, 4),
  enemy('srf1_charred_seer', 'Charred Seer', 'ELITE', 44, 3950, 238, head, legs, 'LOWEST_HP', 455, 165, 4),

  enemy('srf2_gloom_leech', 'Gloom Leech', 'NORMAL', 45, 3350, 220, legs, body, 'LOWEST_HP', 350, 122, 5),
  enemy('srf2_grave_miner', 'Grave Miner', 'NORMAL', 47, 3700, 230, body, even, 'HIGHEST_HP', 370, 130, 5),
  enemy('srf2_pale_myrmidon', 'Pale Myrmidon', 'NORMAL', 49, 4000, 240, head, head, 'HIGHEST_HP', 390, 138, 5),
  enemy('srf2_sulfur_wraith', 'Sulfur Wraith', 'NORMAL', 51, 3650, 248, even, legs, 'RANDOM', 410, 145, 5),
  enemy('srf2_ossuary_giant', 'Ossuary Giant', 'ELITE', 53, 5400, 268, body, body, 'HIGHEST_HP', 575, 205, 5),
  enemy('srf2_dusk_inquisitor', 'Dusk Inquisitor', 'ELITE', 54, 5050, 278, head, legs, 'LOWEST_HP', 610, 218, 5),

  enemy('srf3_nightglass_spawn', 'Nightglass Spawn', 'NORMAL', 55, 4200, 240, legs, even, 'RANDOM', 470, 165, 6),
  enemy('srf3_ember_revenant', 'Ember Revenant', 'NORMAL', 57, 4500, 250, body, head, 'HIGHEST_HP', 495, 175, 6),
  enemy('srf3_starved_seraph', 'Starved Seraph', 'NORMAL', 59, 4350, 258, head, legs, 'LOWEST_HP', 520, 184, 6),
  enemy('srf3_abyssal_templar', 'Abyssal Templar', 'NORMAL', 61, 4900, 268, even, body, 'HIGHEST_HP', 550, 195, 6),
  enemy('srf3_pyrewrought_colossus', 'Pyrewrought Colossus', 'ELITE', 63, 6500, 295, body, body, 'HIGHEST_HP', 760, 275, 6),
  enemy('srf3_eclipse_harrower', 'Eclipse Harrower', 'ELITE', 64, 6150, 305, head, even, 'LOWEST_HP', 805, 292, 6),
].map((definition) => [definition.id, definition]))
