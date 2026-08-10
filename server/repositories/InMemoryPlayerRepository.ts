import { randomUUID } from 'node:crypto'
import type { DirectTrade, MarketFill, MarketOrder, PartySlotReservation } from '../../shared/economy-types'
import type { AccountSetup, CoinLedgerRecord, EconomyRepository, EconomyState, EconomyTransactionResult, RepositoryOperation, RepositoryTransactionResult, StoredPlayerProfile } from './types'
import { cloneEconomyState, cloneProfile } from './types'

export interface MemoryDatabase {
  tokenToAccount: Map<string, string>
  accountToPlayer: Map<string, string>
  players: Map<string, StoredPlayerProfile>
  operations: Set<string>
  ledger: CoinLedgerRecord[]
  marketOrders: Map<string, MarketOrder>
  marketFills: MarketFill[]
  trades: Map<string, DirectTrade>
  partySlotReservations: Map<string, PartySlotReservation>
}

export function createMemoryDatabase(): MemoryDatabase {
  return {
    tokenToAccount: new Map(), accountToPlayer: new Map(), players: new Map(), operations: new Set(), ledger: [],
    marketOrders: new Map(), marketFills: [], trades: new Map(), partySlotReservations: new Map(),
  }
}

export class InMemoryPlayerRepository implements EconomyRepository {
  private queue: Promise<void> = Promise.resolve()

  constructor(private readonly database: MemoryDatabase = createMemoryDatabase(), private readonly preserveSetupPlayerId = true) {}

  async initialize(devTokenHash: string, setup: AccountSetup | null, starter: (accountId: string, playerId: string, setup: AccountSetup) => StoredPlayerProfile): Promise<StoredPlayerProfile> {
    return this.exclusive(async () => {
      const accountId = this.database.tokenToAccount.get(devTokenHash)
      if (accountId) {
        const playerId = this.database.accountToPlayer.get(accountId)!
        return cloneProfile(this.database.players.get(playerId)!)
      }
      if (!setup) throw new Error('ACCOUNT_SETUP_REQUIRED')
      const nextAccountId = randomUUID()
      const nextPlayerId = this.preserveSetupPlayerId && 'legacyPlayerId' in setup ? String(setup.legacyPlayerId) : randomUUID()
      const profile = starter(nextAccountId, nextPlayerId, setup)
      this.database.tokenToAccount.set(devTokenHash, nextAccountId)
      this.database.accountToPlayer.set(nextAccountId, nextPlayerId)
      this.database.players.set(nextPlayerId, cloneProfile(profile))
      return cloneProfile(profile)
    })
  }

  async read(playerId: string): Promise<StoredPlayerProfile | null> {
    const profile = this.database.players.get(playerId)
    return profile ? cloneProfile(profile) : null
  }

  async transact(playerId: string, operation: RepositoryOperation, mutate: (profile: StoredPlayerProfile) => void): Promise<RepositoryTransactionResult> {
    return this.exclusive(async () => {
      const stored = this.database.players.get(playerId)
      if (!stored) throw new Error('PLAYER_NOT_FOUND')
      if (this.database.operations.has(operation.key)) return { profile: cloneProfile(stored), applied: false }
      const working = cloneProfile(stored)
      mutate(working)
      this.database.players.set(playerId, cloneProfile(working))
      this.database.operations.add(operation.key)
      if (operation.ledger) this.database.ledger.push({
        id: randomUUID(), playerId, ...operation.ledger, resultingBalance: working.coins, createdAt: new Date(),
      })
      return { profile: cloneProfile(working), applied: true }
    })
  }

  async ledger(playerId: string): Promise<CoinLedgerRecord[]> {
    return this.database.ledger.filter((entry) => entry.playerId === playerId).map((entry) => ({ ...entry }))
  }

  async economyRead<T>(read: (state: EconomyState) => T): Promise<T> {
    return read(cloneEconomyState(this.economyState()))
  }

  async economyTransact<T>(playerId: string, operationKey: string, operationType: string, mutate: (state: EconomyState) => T): Promise<EconomyTransactionResult<T>> {
    return this.exclusive(async () => {
      const current = this.economyState()
      if (this.database.operations.has(operationKey)) return { value: undefined as T, applied: false }
      const working = cloneEconomyState(current)
      const value = mutate(working)
      this.database.players = working.players
      this.database.marketOrders = working.marketOrders
      this.database.marketFills = working.marketFills
      this.database.trades = working.trades
      this.database.partySlotReservations = working.partySlotReservations
      this.database.ledger = working.ledger
      this.database.operations.add(operationKey)
      void playerId; void operationType
      return { value, applied: true }
    })
  }

  async resetByDevTokenHash(devTokenHash: string): Promise<boolean> {
    return this.exclusive(async () => {
      const accountId = this.database.tokenToAccount.get(devTokenHash)
      if (!accountId) return false
      const playerId = this.database.accountToPlayer.get(accountId)!
      this.database.players.delete(playerId)
      this.database.accountToPlayer.delete(accountId)
      this.database.tokenToAccount.delete(devTokenHash)
      this.database.ledger = this.database.ledger.filter((entry) => entry.playerId !== playerId)
      const removedOrderIds = new Set([...this.database.marketOrders.values()].filter((order) => order.playerId === playerId).map((order) => order.id))
      for (const id of removedOrderIds) this.database.marketOrders.delete(id)
      this.database.marketFills = this.database.marketFills.filter((fill) => !removedOrderIds.has(fill.buyOrderId) && !removedOrderIds.has(fill.sellOrderId))
      for (const [id, trade] of this.database.trades) if (trade.requesterId === playerId || trade.receiverId === playerId) this.database.trades.delete(id)
      for (const [id, reservation] of this.database.partySlotReservations) if (reservation.applicantId === playerId || reservation.leaderId === playerId) this.database.partySlotReservations.delete(id)
      return true
    })
  }

  async disconnect(): Promise<void> {}

  private async exclusive<T>(action: () => Promise<T>): Promise<T> {
    let release!: () => void
    const previous = this.queue
    this.queue = new Promise<void>((resolve) => { release = resolve })
    await previous
    try { return await action() } finally { release() }
  }


  private economyState(): EconomyState {
    return {
      players: this.database.players,
      marketOrders: this.database.marketOrders,
      marketFills: this.database.marketFills,
      trades: this.database.trades,
      partySlotReservations: this.database.partySlotReservations,
      ledger: this.database.ledger,
    }
  }
}
