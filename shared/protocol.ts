import type { Character, CharacterClass, CombatAction, EncounterReward, Enemy, Zone } from '../src/types/game'
import type { EquipmentSlot, EquipmentState, InventoryEntry, PersonalEncounterReward, PersonalLoot, PlayerRiftProgress } from './game-data/types'
import type { MarketSnapshot, TradeSnapshot } from './economy-types'
import type {
  ChatChannel, ChatHistorySnapshot, FriendsSnapshot, GuildListItem, GuildRank, GuildSnapshot, GuildStorageLogView,
  GuildStorageSnapshot, PersistentChatMessage, PresenceStatus, PrivateConversationView, SocialPlayer, UnreadSnapshot,
} from './social-types'

export const PROTOCOL_VERSION = 3
export const DEV_MIN_PARTY_SIZE = 2
export const MAX_PARTY_SIZE = 5
export const RECONNECT_GRACE_MS = 60_000

export type ConnectionState = 'connected' | 'reconnecting' | 'offline'
export type RoomPhase = 'LOBBY' | 'COMBAT' | 'POST_ENCOUNTER' | 'FINISHED' | 'FAILED'
export type ExpeditionVote = 'CONTINUE' | 'EXIT'

export interface DevIdentity {
  /** Production/staging WebSocket credential obtained from the HTTP auth exchange. */
  sessionToken?: string
  /** Opaque local session credential. Server maps it to Account/Player ids. */
  devToken?: string
  /** Legacy test field; never authoritative in PostgreSQL runtime. */
  playerId?: string
  /** Used only for atomic first-account initialization. */
  character?: Pick<Character, 'name' | 'classId' | 'level'>
}

export interface PublicPartyMember {
  id: string
  name: string
  classId: CharacterClass
  level: number
  attack: number
  maxHP: number
  currentHP: number
  alive: boolean
  ready: boolean
  connected: boolean
  confirmed: boolean
  autoBattle: boolean
  potionCooldown: number
  potionQuantity: number
  potionQuantities: Record<string, number>
  isLeader: boolean
}

export interface PartyApplication {
  playerId: string
  name: string
  classId: CharacterClass
  level: number
  attack: number
  maxHP: number
  slotOfferCoins: number
}

export interface PartySummary {
  id: string
  leaderName: string
  playerCount: number
  maxPlayers: number
  phase: RoomPhase
  riftId: string
  floorNumber: number
}

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  message: string
  timestamp: number
}

export interface PartySnapshot {
  id: string
  phase: RoomPhase
  leaderId: string
  locked: boolean
  members: PublicPartyMember[]
  applications: PartyApplication[]
  chat: ChatMessage[]
  riftId: string
  floorNumber: number
}

export interface CombatSnapshot {
  roomId: string
  riftId: string
  floorNumber: number
  phase: RoomPhase
  leaderId: string
  encounterIndex: number
  encounterTotal: number
  round: number
  roundEndsAt: number | null
  serverNow: number
  enemy: Enemy | null
  party: PublicPartyMember[]
  log: string[]
  reward: EncounterReward | null
  personalReward: PersonalEncounterReward | null
  expeditionLoot: PersonalLoot
  accumulated: { xp: number; coins: number; loot: string[] }
  votes: Record<string, ExpeditionVote>
}

export interface CharacterState {
  playerId: string
  name: string
  classId: CharacterClass
  level: number
  currentXP: number
  xpRequired: number
  attack: number
  maxHP: number
  currentHP: number
  coins: number
  reservedCoins: number
  availableCoins: number
  inventory: InventoryEntry[]
  storage: InventoryEntry[]
  equipment: EquipmentState
  learnedRecipes: string[]
  riftProgress: Record<string, PlayerRiftProgress>
}

export type ClientMessage =
  | { type: 'HELLO'; payload: DevIdentity }
  | { type: 'LIST_PARTIES' }
  | { type: 'CREATE_PARTY' }
  | { type: 'APPLY_TO_PARTY'; payload: { partyId: string; slotOfferCoins?: number; operationId: string } }
  | { type: 'CANCEL_APPLICATION'; payload: { partyId: string } }
  | { type: 'ACCEPT_APPLICATION'; payload: { applicantId: string } }
  | { type: 'REJECT_APPLICATION'; payload: { applicantId: string } }
  | { type: 'LEAVE_PARTY' }
  | { type: 'SET_READY'; payload: { ready: boolean } }
  | { type: 'START_EXPEDITION' }
  | { type: 'SELECT_RIFT_FLOOR'; payload: { floorNumber: number } }
  | { type: 'SUBMIT_ACTION'; payload: { round: number; attackZone?: Zone; defendZone: Zone; usePotion: boolean; potionItemId?: string } }
  | { type: 'SET_AUTO_BATTLE'; payload: { enabled: boolean } }
  | { type: 'POST_ENCOUNTER_VOTE'; payload: { vote: ExpeditionVote } }
  | { type: 'PARTY_CHAT_MESSAGE'; payload: { message: string } }
  | { type: 'GET_CHARACTER_STATE' }
  | { type: 'EQUIP_ITEM'; payload: { entryId: string; slot?: EquipmentSlot; operationId: string } }
  | { type: 'UNEQUIP_ITEM'; payload: { slot: EquipmentSlot; operationId: string } }
  | { type: 'MOVE_TO_STORAGE'; payload: { entryId: string; quantity?: number; operationId: string } }
  | { type: 'MOVE_FROM_STORAGE'; payload: { entryId: string; quantity?: number; operationId: string } }
  | { type: 'LEARN_RECIPE'; payload: { entryId: string; operationId: string } }
  | { type: 'CRAFT_ITEM'; payload: { recipeId: string; operationId: string } }
  | { type: 'GET_MARKET'; payload?: { itemId?: string } }
  | { type: 'GET_MY_ORDERS' }
  | { type: 'CREATE_SELL_ORDER'; payload: { entryId: string; quantity: number; pricePerUnit: number; operationId: string } }
  | { type: 'CREATE_BUY_ORDER'; payload: { itemId: string; quantity: number; pricePerUnit: number; operationId: string } }
  | { type: 'CANCEL_MARKET_ORDER'; payload: { orderId: string; operationId: string } }
  | { type: 'BUY_NOW'; payload: { itemId: string; quantity: number; operationId: string } }
  | { type: 'SELL_NOW'; payload: { entryId: string; quantity: number; operationId: string } }
  | { type: 'REQUEST_TRADE'; payload: { receiverName: string; operationId: string } }
  | { type: 'ACCEPT_TRADE'; payload: { tradeId: string; operationId: string } }
  | { type: 'DECLINE_TRADE'; payload: { tradeId: string; operationId: string } }
  | { type: 'UPDATE_TRADE_OFFER'; payload: { tradeId: string; items: Array<{ entryId: string; quantity: number }>; coins: number; operationId: string } }
  | { type: 'CONFIRM_TRADE'; payload: { tradeId: string; revision: number; operationId: string } }
  | { type: 'CANCEL_TRADE'; payload: { tradeId: string; operationId: string } }
  | { type: 'GET_GUILD_STATE' }
  | { type: 'SEARCH_GUILDS'; payload: { query?: string } }
  | { type: 'CREATE_GUILD'; payload: { name: string; tag: string; description?: string; messageOfTheDay?: string; operationId: string } }
  | { type: 'APPLY_TO_GUILD'; payload: { guildId: string; message?: string; operationId: string } }
  | { type: 'CANCEL_GUILD_APPLICATION'; payload: { applicationId: string; operationId: string } }
  | { type: 'ACCEPT_GUILD_APPLICATION'; payload: { applicationId: string; operationId: string } }
  | { type: 'REJECT_GUILD_APPLICATION'; payload: { applicationId: string; operationId: string } }
  | { type: 'INVITE_TO_GUILD'; payload: { playerName: string; operationId: string } }
  | { type: 'ACCEPT_GUILD_INVITE'; payload: { inviteId: string; operationId: string } }
  | { type: 'DECLINE_GUILD_INVITE'; payload: { inviteId: string; operationId: string } }
  | { type: 'LEAVE_GUILD'; payload: { operationId: string } }
  | { type: 'KICK_GUILD_MEMBER'; payload: { playerId: string; operationId: string } }
  | { type: 'SET_GUILD_RANK'; payload: { playerId: string; rank: Exclude<GuildRank, 'LEADER'>; operationId: string } }
  | { type: 'TRANSFER_GUILD_LEADERSHIP'; payload: { playerId: string; operationId: string } }
  | { type: 'UPDATE_GUILD'; payload: { description?: string; messageOfTheDay?: string; operationId: string } }
  | { type: 'UPDATE_GUILD_PERMISSIONS'; payload: { rank: Exclude<GuildRank, 'LEADER'>; canDeposit: boolean; canWithdraw: boolean; operationId: string } }
  | { type: 'DISBAND_GUILD'; payload: { confirmed: boolean; operationId: string } }
  | { type: 'GET_GUILD_STORAGE' }
  | { type: 'DEPOSIT_GUILD_STORAGE'; payload: { entryId: string; quantity?: number; operationId: string } }
  | { type: 'WITHDRAW_GUILD_STORAGE'; payload: { storageItemId: string; quantity?: number; operationId: string } }
  | { type: 'GET_GUILD_STORAGE_HISTORY'; payload?: { limit?: number } }
  | { type: 'SEARCH_PLAYER'; payload: { name: string } }
  | { type: 'GET_FRIENDS_STATE' }
  | { type: 'SEND_FRIEND_REQUEST'; payload: { playerName: string; operationId: string } }
  | { type: 'ACCEPT_FRIEND_REQUEST'; payload: { requestId: string; operationId: string } }
  | { type: 'DECLINE_FRIEND_REQUEST'; payload: { requestId: string; operationId: string } }
  | { type: 'REMOVE_FRIEND'; payload: { playerId: string; operationId: string } }
  | { type: 'BLOCK_PLAYER'; payload: { playerName: string; operationId: string } }
  | { type: 'UNBLOCK_PLAYER'; payload: { playerId: string; operationId: string } }
  | { type: 'SEND_CHAT_MESSAGE'; payload: { channel: Exclude<ChatChannel, 'GROUP'>; text: string; targetName?: string; conversationId?: string; operationId: string } }
  | { type: 'GET_CHAT_HISTORY'; payload: { channel: Exclude<ChatChannel, 'GROUP'>; conversationId?: string; beforeMessageId?: string; limit?: number } }
  | { type: 'GET_PRIVATE_CONVERSATIONS' }
  | { type: 'INVITE_TO_PARTY'; payload: { playerId: string } }

export type ServerMessage =
  | { type: 'WELCOME'; payload: { accountId: string; playerId: string; protocolVersion: number } }
  | { type: 'PARTY_LIST'; payload: PartySummary[] }
  | { type: 'PARTY_STATE'; payload: PartySnapshot | null }
  | { type: 'EXPEDITION_STARTED'; payload: CombatSnapshot }
  | { type: 'COMBAT_SNAPSHOT'; payload: CombatSnapshot }
  | { type: 'ROUND_STARTED'; payload: CombatSnapshot }
  | { type: 'ROUND_RESOLVED'; payload: CombatSnapshot }
  | { type: 'ENCOUNTER_RESULT'; payload: CombatSnapshot }
  | { type: 'EXPEDITION_RESULT'; payload: CombatSnapshot }
  | { type: 'PARTY_CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'CHARACTER_STATE'; payload: CharacterState }
  | { type: 'INVENTORY_UPDATE'; payload: CharacterState }
  | { type: 'EQUIPMENT_UPDATE'; payload: CharacterState }
  | { type: 'STORAGE_UPDATE'; payload: CharacterState }
  | { type: 'CRAFT_RESULT'; payload: { recipeId: string; state: CharacterState } }
  | { type: 'LOOT_UPDATE'; payload: { state: CharacterState; extracted: PersonalLoot } }
  | { type: 'MARKET_SNAPSHOT'; payload: MarketSnapshot }
  | { type: 'TRADE_REQUEST'; payload: TradeSnapshot }
  | { type: 'TRADE_STATE'; payload: TradeSnapshot }
  | { type: 'TRADE_COMPLETED'; payload: TradeSnapshot }
  | { type: 'TRADE_CANCELLED'; payload: TradeSnapshot }
  | { type: 'ECONOMY_UPDATE'; payload: CharacterState }
  | { type: 'GUILD_STATE'; payload: GuildSnapshot }
  | { type: 'GUILD_LIST'; payload: GuildListItem[] }
  | { type: 'GUILD_STORAGE_UPDATE'; payload: GuildStorageSnapshot }
  | { type: 'GUILD_STORAGE_HISTORY'; payload: GuildStorageLogView[] }
  | { type: 'FRIENDS_STATE'; payload: FriendsSnapshot }
  | { type: 'PLAYER_SEARCH_RESULT'; payload: SocialPlayer }
  | { type: 'PRESENCE_UPDATE'; payload: { playerId: string; status: PresenceStatus } }
  | { type: 'CHAT_MESSAGE'; payload: PersistentChatMessage }
  | { type: 'CHAT_HISTORY'; payload: ChatHistorySnapshot }
  | { type: 'PRIVATE_CONVERSATIONS'; payload: PrivateConversationView[] }
  | { type: 'UNREAD_UPDATE'; payload: UnreadSnapshot }
  | { type: 'PARTY_INVITE'; payload: { partyId: string; inviterId: string; inviterName: string } }
  | { type: 'ERROR'; payload: { code: string; message: string } }

export function isZone(value: unknown): value is Zone {
  return value === 'head' || value === 'body' || value === 'legs'
}

export function toCombatAction(payload: Extract<ClientMessage, { type: 'SUBMIT_ACTION' }>['payload']): CombatAction {
  return payload.usePotion
    ? { type: 'potion', defendZone: payload.defendZone, potionItemId: payload.potionItemId }
    : { type: 'attack', attackZone: payload.attackZone, defendZone: payload.defendZone }
}
