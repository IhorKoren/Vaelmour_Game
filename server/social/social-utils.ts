import { ITEM_CATALOG } from '../../shared/game-data/catalog'
import { CLASSES } from '../../src/data/config/balance'
import type { SocialPlayer } from '../../shared/social-types'
import type { SocialState, StoredPlayerProfile } from '../repositories/types'
import type { PresenceService } from './PresenceService'

export function memberGuildId(state: SocialState, playerId: string): string | null { return state.guildMembers.get(playerId)?.guildId ?? null }
export function canonicalPair(a: string, b: string): [string, string] { return a < b ? [a, b] : [b, a] }
export function isBlocked(state: SocialState, senderId: string, receiverId: string): boolean {
  return state.blocks.has(`${receiverId}:${senderId}`) || state.blocks.has(`${senderId}:${receiverId}`)
}

export function profileStats(profile: StoredPlayerProfile): { attack: number; maxHP: number } {
  const base = CLASSES[profile.classId]
  let attack = base.attack + profile.level - 1
  let maxHP = base.maxHP + (profile.level - 1) * 5
  for (const entry of Object.values(profile.equipment)) {
    if (!entry) continue
    attack += ITEM_CATALOG[entry.itemId]?.attack ?? 0
    maxHP += ITEM_CATALOG[entry.itemId]?.hp ?? 0
  }
  return { attack, maxHP }
}

export function publicPlayer(state: SocialState, playerId: string, presence: PresenceService): SocialPlayer {
  const profile = state.players.get(playerId)
  if (!profile) throw new Error('PLAYER_NOT_FOUND')
  const stats = profileStats(profile)
  const status = presence.get(playerId)
  return { playerId, name: profile.name, classId: profile.classId, level: profile.level, ...stats, guildId: memberGuildId(state, playerId), status, online: status !== 'OFFLINE' }
}
