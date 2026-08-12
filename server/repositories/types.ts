import type { CharacterClass } from '../../src/types/game'
import type { EquipmentState, InventoryEntry, PlayerRiftProgress } from '../../shared/game-data/types'
import type { ProfessionJobRecord, ProfessionProgressRecord } from '../../shared/professions'
import type { DirectTrade, MarketFill, MarketOrder, PartySlotReservation, ReservedItemEntry } from '../../shared/economy-types'
import type {
  ChatReadRecord, FriendRequestRecord, FriendshipRecord, GuildApplicationRecord, GuildInviteRecord, GuildMemberRecord,
  GuildPermissionRecord, GuildRecord, GuildStorageItem, GuildStorageLogRecord, PersistentChatMessage, PlayerBlockRecord,
  PrivateConversationRecord,
} from '../../shared/social-types'

export interface StoredPlayerProfile {
  accountId: string
  playerId: string
  name: string
  nameKey: string
  classId: CharacterClass
  level: number
  currentXP: number
  coins: number
  reservedCoins: number
  inventory: InventoryEntry[]
  storage: InventoryEntry[]
  equipment: EquipmentState
  learnedRecipes: Set<string>
  reservedItems: ReservedItemEntry[]
  riftProgress?: Record<string, PlayerRiftProgress>
  professionProgress?: ProfessionProgressRecord
  professionJobs?: ProfessionJobRecord[]
}

export interface AccountSetup {
  name: string
  classId: CharacterClass
  level: number
  /** Test adapter compatibility only; PostgreSQL always generates the player id. */
  legacyPlayerId?: string
}

export type LedgerReason = 'RIFT_REWARD' | 'CRAFT_FEE' | 'AUCTION_BUY' | 'AUCTION_SELL' | 'TRADE' | 'PARTY_SLOT' | 'ADMIN'
  | 'MARKET_BUY_RESERVE' | 'MARKET_BUY_RELEASE' | 'MARKET_BUY' | 'MARKET_SELL' | 'MARKET_BUY_ORDER_FEE' | 'MARKET_TRANSACTION_FEE'
  | 'DIRECT_TRADE' | 'PARTY_SLOT_RESERVE' | 'PARTY_SLOT_REFUND' | 'PARTY_SLOT_PAYMENT'
  | 'GUILD_CREATION'

export interface LedgerWrite {
  amount: number
  reason: LedgerReason
  referenceId?: string
}

export interface RepositoryOperation {
  key: string
  type: string
  referenceId?: string
  ledger?: LedgerWrite
}

export interface RepositoryTransactionResult {
  profile: StoredPlayerProfile
  applied: boolean
}

export interface AdminAuditWrite {
  adminTelegramUserId: string
  action: string
  targetPlayerId: string
  reason: string
  details: Record<string, unknown>
}

export interface CoinLedgerRecord extends LedgerWrite {
  id: string
  playerId: string
  resultingBalance: number
  createdAt: Date
}

export interface PlayerRepository {
  initialize(devTokenHash: string, setup: AccountSetup | null, starter: (accountId: string, playerId: string, setup: AccountSetup) => StoredPlayerProfile): Promise<StoredPlayerProfile>
  initializeAccount(accountId: string, setup: AccountSetup | null, starter: (accountId: string, playerId: string, setup: AccountSetup) => StoredPlayerProfile): Promise<StoredPlayerProfile>
  read(playerId: string): Promise<StoredPlayerProfile | null>
  transact(playerId: string, operation: RepositoryOperation, mutate: (profile: StoredPlayerProfile) => void): Promise<RepositoryTransactionResult>
  adminTransact?(playerId: string, operation: RepositoryOperation, audit: AdminAuditWrite, mutate: (profile: StoredPlayerProfile) => void): Promise<RepositoryTransactionResult>
  ledger(playerId: string): Promise<CoinLedgerRecord[]>
  resetByDevTokenHash(devTokenHash: string): Promise<boolean>
  disconnect(): Promise<void>
}

export interface EconomyState {
  players: Map<string, StoredPlayerProfile>
  marketOrders: Map<string, MarketOrder>
  marketFills: MarketFill[]
  trades: Map<string, DirectTrade>
  partySlotReservations: Map<string, PartySlotReservation>
  ledger: CoinLedgerRecord[]
}

export interface EconomyTransactionResult<T> { value: T; applied: boolean; referenceId?: string }

export interface DurableExpeditionStart {
  expeditionId: string
  playSessionId: string
  roomId: string
  riftId: string
  floor: number
  playerIds: string[]
}

export interface EconomyRepository extends PlayerRepository {
  economyRead<T>(read: (state: EconomyState) => T): Promise<T>
  economyTransact<T>(playerId: string, operationKey: string, operationType: string, mutate: (state: EconomyState) => T, resultReference?: (value: T) => string | undefined): Promise<EconomyTransactionResult<T>>
  startExpeditionTransact(playerId: string, operationKey: string, marker: DurableExpeditionStart, mutate: (state: EconomyState) => void): Promise<{ applied: boolean; marker: DurableExpeditionStart }>
}

export interface SocialState {
  players: Map<string, StoredPlayerProfile>
  guilds: Map<string, GuildRecord>
  guildMembers: Map<string, GuildMemberRecord>
  guildApplications: Map<string, GuildApplicationRecord>
  guildInvites: Map<string, GuildInviteRecord>
  guildPermissions: Map<string, GuildPermissionRecord>
  guildStorageItems: Map<string, GuildStorageItem>
  guildStorageLogs: GuildStorageLogRecord[]
  friendRequests: Map<string, FriendRequestRecord>
  friendships: Map<string, FriendshipRecord>
  blocks: Map<string, PlayerBlockRecord>
  conversations: Map<string, PrivateConversationRecord>
  chatMessages: PersistentChatMessage[]
  chatReads: Map<string, ChatReadRecord>
  ledger: CoinLedgerRecord[]
}

export interface SocialRepository extends EconomyRepository {
  socialRead<T>(read: (state: SocialState) => T): Promise<T>
  socialTransact<T>(playerId: string, operationKey: string, operationType: string, mutate: (state: SocialState) => T): Promise<EconomyTransactionResult<T>>
}

export function cloneProfile(profile: StoredPlayerProfile): StoredPlayerProfile {
  return {
    ...profile,
    inventory: profile.inventory.map((entry) => ({ ...entry })),
    storage: profile.storage.map((entry) => ({ ...entry })),
    equipment: Object.fromEntries(Object.entries(profile.equipment).map(([slot, entry]) => [slot, entry ? { ...entry } : null])) as EquipmentState,
    learnedRecipes: new Set(profile.learnedRecipes),
    reservedItems: profile.reservedItems.map((entry) => ({ ...entry })),
    riftProgress: Object.fromEntries(Object.entries(profile.riftProgress ?? {}).map(([id, progress]) => [id, { ...progress, completionCount: { ...progress.completionCount } }])),
    professionProgress: profile.professionProgress ? { ...profile.professionProgress } : undefined,
    professionJobs: profile.professionJobs?.map((job) => ({ ...job })),
  }
}

export function cloneEconomyState(state: EconomyState): EconomyState {
  return {
    players: new Map([...state.players].map(([id, profile]) => [id, cloneProfile(profile)])),
    marketOrders: new Map([...state.marketOrders].map(([id, order]) => [id, { ...order }])),
    marketFills: state.marketFills.map((fill) => ({ ...fill })),
    trades: new Map([...state.trades].map(([id, trade]) => [id, { ...trade, items: trade.items.map((item) => ({ ...item })), coins: { ...trade.coins } }])),
    partySlotReservations: new Map([...state.partySlotReservations].map(([id, reservation]) => [id, { ...reservation }])),
    ledger: state.ledger.map((entry) => ({ ...entry })),
  }
}

export function cloneSocialState(state: SocialState): SocialState {
  return {
    players: new Map([...state.players].map(([id, profile]) => [id, cloneProfile(profile)])),
    guilds: new Map([...state.guilds].map(([id, value]) => [id, { ...value }])),
    guildMembers: new Map([...state.guildMembers].map(([id, value]) => [id, { ...value }])),
    guildApplications: new Map([...state.guildApplications].map(([id, value]) => [id, { ...value }])),
    guildInvites: new Map([...state.guildInvites].map(([id, value]) => [id, { ...value }])),
    guildPermissions: new Map([...state.guildPermissions].map(([id, value]) => [id, { ...value }])),
    guildStorageItems: new Map([...state.guildStorageItems].map(([id, value]) => [id, { ...value }])),
    guildStorageLogs: state.guildStorageLogs.map((value) => ({ ...value })),
    friendRequests: new Map([...state.friendRequests].map(([id, value]) => [id, { ...value }])),
    friendships: new Map([...state.friendships].map(([id, value]) => [id, { ...value }])),
    blocks: new Map([...state.blocks].map(([id, value]) => [id, { ...value }])),
    conversations: new Map([...state.conversations].map(([id, value]) => [id, { ...value }])),
    chatMessages: state.chatMessages.map((value) => ({ ...value })),
    chatReads: new Map([...state.chatReads].map(([id, value]) => [id, { ...value }])),
    ledger: state.ledger.map((value) => ({ ...value })),
  }
}
