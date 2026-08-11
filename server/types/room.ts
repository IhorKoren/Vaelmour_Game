import type { WebSocket } from 'ws'
import type { Character, CombatAction, EncounterReward, Enemy } from '../../src/types/game'
import type { ChatMessage, ExpeditionVote, RoomPhase, ServerMessage } from '../../shared/protocol'
import type { PersonalEncounterReward, PersonalLoot } from '../../shared/game-data/types'

export interface ClientPeer {
  connectionId: string
  send: (message: ServerMessage) => void
  close?: () => void
  socket?: WebSocket
}

export interface RoomMember {
  character: Character
  connected: boolean
  peer: ClientPeer | null
  ready: boolean
  autoBattle: boolean
  potionCooldown: number
  expeditionPotions: number
  expeditionPotionQuantities: Record<string, number>
  disconnectedAt: number | null
}

export interface RoomState {
  id: string
  expeditionId: string | null
  playSessionId: string | null
  expeditionStartedAt: number | null
  encounterStartedAt: number | null
  phase: RoomPhase
  leaderId: string
  riftId: string
  floorNumber: number
  members: Map<string, RoomMember>
  applications: Map<string, Character>
  slotOffers: Map<string, number>
  encounterIndex: number
  enemy: Enemy | null
  round: number
  roundEndsAt: number | null
  actions: Map<string, CombatAction>
  log: string[]
  chat: ChatMessage[]
  reward: EncounterReward | null
  accumulated: { xp: number; coins: number; loot: string[] }
  personalRewards: Map<string, PersonalEncounterReward>
  expeditionLoot: Map<string, PersonalLoot>
  extracted: boolean
  votes: Map<string, ExpeditionVote>
  roundTimer: ReturnType<typeof setTimeout> | null
  resolving: boolean
}
