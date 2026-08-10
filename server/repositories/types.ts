import type { CharacterClass } from '../../src/types/game'
import type { EquipmentState, InventoryEntry } from '../../shared/game-data/types'
import type { DirectTrade, MarketFill, MarketOrder, PartySlotReservation, ReservedItemEntry } from '../../shared/economy-types'

export interface StoredPlayerProfile {
  accountId: string
  playerId: string
  name: string
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

export interface CoinLedgerRecord extends LedgerWrite {
  id: string
  playerId: string
  resultingBalance: number
  createdAt: Date
}

export interface PlayerRepository {
  initialize(devTokenHash: string, setup: AccountSetup | null, starter: (accountId: string, playerId: string, setup: AccountSetup) => StoredPlayerProfile): Promise<StoredPlayerProfile>
  read(playerId: string): Promise<StoredPlayerProfile | null>
  transact(playerId: string, operation: RepositoryOperation, mutate: (profile: StoredPlayerProfile) => void): Promise<RepositoryTransactionResult>
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

export interface EconomyTransactionResult<T> { value: T; applied: boolean }

export interface EconomyRepository extends PlayerRepository {
  economyRead<T>(read: (state: EconomyState) => T): Promise<T>
  economyTransact<T>(playerId: string, operationKey: string, operationType: string, mutate: (state: EconomyState) => T): Promise<EconomyTransactionResult<T>>
}

export function cloneProfile(profile: StoredPlayerProfile): StoredPlayerProfile {
  return {
    ...profile,
    inventory: profile.inventory.map((entry) => ({ ...entry })),
    storage: profile.storage.map((entry) => ({ ...entry })),
    equipment: Object.fromEntries(Object.entries(profile.equipment).map(([slot, entry]) => [slot, entry ? { ...entry } : null])) as EquipmentState,
    learnedRecipes: new Set(profile.learnedRecipes),
    reservedItems: profile.reservedItems.map((entry) => ({ ...entry })),
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
