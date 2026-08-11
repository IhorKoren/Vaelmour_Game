import type { EnemyDefinition, EnemyType, TargetingMode } from './types'
import type { Zone } from '../../../src/types/game'
import { FIRST_RIFT_ENEMY_ATTACK_SCALE } from '../balance'

const even: Record<Zone, number> = { head: 1, body: 1, legs: 1 }
const body: Record<Zone, number> = { head: 1, body: 2.4, legs: 1 }
const head: Record<Zone, number> = { head: 2.4, body: 1, legs: 1 }
const legs: Record<Zone, number> = { head: 1, body: 1, legs: 2.4 }

function enemy(id: string, name: string, type: EnemyType, level: number, maxHP: number, attack: number,
  attackZoneWeights: Record<Zone, number>, defenseZoneWeights: Record<Zone, number>, targeting: TargetingMode,
  baseXP: number, baseCoins: number, lootTier: 1 | 2 | 3): EnemyDefinition {
  const attackScale = FIRST_RIFT_ENEMY_ATTACK_SCALE[lootTier]
  return { id, name, type, level, maxHP, attack: Math.round(attack * attackScale), attackZoneWeights, defenseZoneWeights, targeting, baseXP, baseCoins, lootTier }
}

export const FIRST_RIFT_ENEMIES: Record<string, EnemyDefinition> = Object.fromEntries([
  enemy('f1_ash_rat', 'Ashfang Scavenger', 'NORMAL', 2, 480, 54, body, even, 'RANDOM', 42, 14, 1),
  enemy('f1_hollow_guard', 'Hollow Guard', 'NORMAL', 4, 620, 62, head, body, 'HIGHEST_HP', 50, 18, 1),
  enemy('f1_sporeling', 'Gloom Sporeling', 'NORMAL', 5, 540, 68, legs, head, 'LOWEST_HP', 55, 20, 1),
  enemy('f1_shardling', 'Glass Shardling', 'NORMAL', 6, 700, 70, even, legs, 'RANDOM', 62, 23, 1),
  enemy('f1_iron_maw', 'Ironmaw Ravager', 'ELITE', 8, 1100, 82, body, head, 'HIGHEST_HP', 105, 44, 1),
  enemy('f2_mire_stalker', 'Mire Stalker', 'NORMAL', 10, 1050, 90, legs, body, 'LOWEST_HP', 90, 32, 2),
  enemy('f2_echo_knight', 'Echo Knight', 'NORMAL', 12, 1250, 96, head, head, 'HIGHEST_HP', 100, 36, 2),
  enemy('f2_blight_moth', 'Blightwing Moth', 'NORMAL', 14, 1120, 103, even, legs, 'RANDOM', 112, 40, 2),
  enemy('f2_crystal_hound', 'Crystal Hound', 'NORMAL', 16, 1350, 108, body, even, 'LOWEST_HP', 124, 45, 2),
  enemy('f2_vein_reaper', 'Vein Reaper', 'ELITE', 18, 1850, 122, head, body, 'LOWEST_HP', 180, 72, 2),
  enemy('f2_marrow_sentinel', 'Marrow Sentinel', 'ELITE', 19, 2050, 118, body, head, 'HIGHEST_HP', 195, 78, 2),
  enemy('f3_void_crawler', 'Void Crawler', 'NORMAL', 20, 1800, 126, legs, even, 'RANDOM', 155, 55, 3),
  enemy('f3_rune_devourer', 'Rune Devourer', 'NORMAL', 23, 2050, 135, head, body, 'HIGHEST_HP', 172, 62, 3),
  enemy('f3_blood_oracle', 'Blood Oracle', 'NORMAL', 25, 1900, 144, body, head, 'LOWEST_HP', 188, 68, 3),
  enemy('f3_obsidian_beast', 'Obsidian Beast', 'NORMAL', 27, 2300, 150, even, legs, 'RANDOM', 205, 74, 3),
  enemy('f3_soul_forge', 'Living Soulforge', 'ELITE', 30, 3000, 166, body, body, 'HIGHEST_HP', 285, 105, 3),
  enemy('f3_rift_harbinger', 'Rift Harbinger', 'ELITE', 32, 3300, 174, head, legs, 'LOWEST_HP', 310, 115, 3),
].map((definition) => [definition.id, definition]))
