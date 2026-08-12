import { randomUUID } from 'node:crypto'
import type { DirectTrade, MarketFill, MarketOrder, PartySlotReservation } from '../../shared/economy-types'
import type { ChatReadRecord, FriendRequestRecord, FriendshipRecord, GuildApplicationRecord, GuildInviteRecord, GuildMemberRecord, GuildPermissionRecord, GuildRecord, GuildStorageItem, GuildStorageLogRecord, PersistentChatMessage, PlayerBlockRecord, PrivateConversationRecord } from '../../shared/social-types'
import type { AccountSetup, CoinLedgerRecord, DurableExpeditionStart, EconomyState, EconomyTransactionResult, RepositoryOperation, RepositoryTransactionResult, SocialRepository, SocialState, StoredPlayerProfile } from './types'
import { cloneEconomyState, cloneProfile, cloneSocialState } from './types'

export interface MemoryDatabase {
  tokenToAccount: Map<string, string>
  accountToPlayer: Map<string, string>
  players: Map<string, StoredPlayerProfile>
  operations: Set<string>
  operationReferences: Map<string, string>
  ledger: CoinLedgerRecord[]
  marketOrders: Map<string, MarketOrder>
  marketFills: MarketFill[]
  trades: Map<string, DirectTrade>
  partySlotReservations: Map<string, PartySlotReservation>
  activeExpeditions: Map<string, DurableExpeditionStart>
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
}

export function createMemoryDatabase(): MemoryDatabase {
  return {
    tokenToAccount: new Map(), accountToPlayer: new Map(), players: new Map(), operations: new Set(), operationReferences: new Map(), ledger: [],
    marketOrders: new Map(), marketFills: [], trades: new Map(), partySlotReservations: new Map(), activeExpeditions: new Map(),
    guilds: new Map(), guildMembers: new Map(), guildApplications: new Map(), guildInvites: new Map(), guildPermissions: new Map(),
    guildStorageItems: new Map(), guildStorageLogs: [], friendRequests: new Map(), friendships: new Map(), blocks: new Map(),
    conversations: new Map(), chatMessages: [], chatReads: new Map(),
  }
}

export class InMemoryPlayerRepository implements SocialRepository {
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
      if ([...this.database.players.values()].some((player) => player.nameKey === profile.nameKey)) throw new Error('PLAYER_NAME_TAKEN')
      this.database.tokenToAccount.set(devTokenHash, nextAccountId)
      this.database.accountToPlayer.set(nextAccountId, nextPlayerId)
      this.database.players.set(nextPlayerId, cloneProfile(profile))
      return cloneProfile(profile)
    })
  }

  async initializeAccount(accountId: string, setup: AccountSetup | null, starter: (accountId: string, playerId: string, setup: AccountSetup) => StoredPlayerProfile): Promise<StoredPlayerProfile> {
    return this.exclusive(async () => {
      const existingPlayerId = this.database.accountToPlayer.get(accountId)
      if (existingPlayerId) return cloneProfile(this.database.players.get(existingPlayerId)!)
      if (!setup) throw new Error('ACCOUNT_SETUP_REQUIRED')
      const playerId = this.preserveSetupPlayerId && setup.legacyPlayerId ? setup.legacyPlayerId : randomUUID()
      const profile = starter(accountId, playerId, setup)
      if ([...this.database.players.values()].some((player) => player.nameKey === profile.nameKey)) throw new Error('PLAYER_NAME_TAKEN')
      this.database.accountToPlayer.set(accountId, playerId)
      this.database.players.set(playerId, cloneProfile(profile))
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

  async economyTransact<T>(playerId: string, operationKey: string, operationType: string, mutate: (state: EconomyState) => T, resultReference?: (value: T) => string | undefined): Promise<EconomyTransactionResult<T>> {
    return this.exclusive(async () => {
      const current = this.economyState()
      if (this.database.operations.has(operationKey)) return { value: undefined as T, applied: false, referenceId: this.database.operationReferences.get(operationKey) }
      const working = cloneEconomyState(current)
      const value = mutate(working)
      this.database.players = working.players
      this.database.marketOrders = working.marketOrders
      this.database.marketFills = working.marketFills
      this.database.trades = working.trades
      this.database.partySlotReservations = working.partySlotReservations
      this.database.ledger = working.ledger
      this.database.operations.add(operationKey)
      const referenceId = resultReference?.(value)
      if (referenceId) this.database.operationReferences.set(operationKey, referenceId)
      void playerId; void operationType
      return { value, applied: true, referenceId }
    })
  }

  async startExpeditionTransact(_playerId: string, operationKey: string, marker: DurableExpeditionStart, mutate: (state: EconomyState) => void): Promise<{ applied: boolean; marker: DurableExpeditionStart }> {
    return this.exclusive(async () => {
      if (this.database.operations.has(operationKey)) {
        const existing = [...this.database.activeExpeditions.values()].find((item) => item.roomId === marker.roomId)
        if (!existing) throw new Error('DURABLE_EXPEDITION_MARKER_MISSING')
        return { applied: false, marker: { ...existing, playerIds: [...existing.playerIds] } }
      }
      const working = cloneEconomyState(this.economyState())
      mutate(working)
      this.database.players = working.players
      this.database.marketOrders = working.marketOrders
      this.database.marketFills = working.marketFills
      this.database.trades = working.trades
      this.database.partySlotReservations = working.partySlotReservations
      this.database.ledger = working.ledger
      this.database.activeExpeditions.set(marker.expeditionId, { ...marker, playerIds: [...marker.playerIds] })
      this.database.operations.add(operationKey)
      return { applied: true, marker: { ...marker, playerIds: [...marker.playerIds] } }
    })
  }

  async socialRead<T>(read: (state: SocialState) => T): Promise<T> {
    return read(cloneSocialState(this.socialState()))
  }

  async socialTransact<T>(playerId: string, operationKey: string, operationType: string, mutate: (state: SocialState) => T): Promise<EconomyTransactionResult<T>> {
    return this.exclusive(async () => {
      if (this.database.operations.has(operationKey)) return { value: undefined as T, applied: false }
      const working = cloneSocialState(this.socialState())
      const value = mutate(working)
      this.database.players = working.players
      this.database.guilds = working.guilds; this.database.guildMembers = working.guildMembers
      this.database.guildApplications = working.guildApplications; this.database.guildInvites = working.guildInvites
      this.database.guildPermissions = working.guildPermissions; this.database.guildStorageItems = working.guildStorageItems
      this.database.guildStorageLogs = working.guildStorageLogs; this.database.friendRequests = working.friendRequests
      this.database.friendships = working.friendships; this.database.blocks = working.blocks
      this.database.conversations = working.conversations; this.database.chatMessages = working.chatMessages
      this.database.chatReads = working.chatReads; this.database.ledger = working.ledger
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
      const ledGuildIds = new Set([...this.database.guilds.values()].filter((guild) => guild.leaderPlayerId === playerId).map((guild) => guild.id))
      for (const guildId of ledGuildIds) this.database.guilds.delete(guildId)
      for (const [id, member] of this.database.guildMembers) if (member.playerId === playerId) this.database.guildMembers.delete(id)
      for (const [id, member] of this.database.guildMembers) if (ledGuildIds.has(member.guildId)) this.database.guildMembers.delete(id)
      for (const [id, value] of this.database.guildApplications) if (value.playerId === playerId) this.database.guildApplications.delete(id)
      for (const [id, value] of this.database.guildApplications) if (ledGuildIds.has(value.guildId)) this.database.guildApplications.delete(id)
      for (const [id, value] of this.database.guildInvites) if (value.playerId === playerId || value.invitedByPlayerId === playerId) this.database.guildInvites.delete(id)
      for (const [id, value] of this.database.guildInvites) if (ledGuildIds.has(value.guildId)) this.database.guildInvites.delete(id)
      for (const [id, value] of this.database.guildPermissions) if (ledGuildIds.has(value.guildId)) this.database.guildPermissions.delete(id)
      for (const [id, value] of this.database.guildStorageItems) if (ledGuildIds.has(value.guildId)) this.database.guildStorageItems.delete(id)
      this.database.guildStorageLogs = this.database.guildStorageLogs.filter((value) => !ledGuildIds.has(value.guildId) && value.playerId !== playerId)
      for (const [id, value] of this.database.friendRequests) if (value.requesterId === playerId || value.receiverId === playerId) this.database.friendRequests.delete(id)
      for (const [id, value] of this.database.friendships) if (value.playerLowId === playerId || value.playerHighId === playerId) this.database.friendships.delete(id)
      for (const [id, value] of this.database.blocks) if (value.blockerId === playerId || value.blockedId === playerId) this.database.blocks.delete(id)
      for (const [id, value] of this.database.conversations) if (value.playerLowId === playerId || value.playerHighId === playerId) this.database.conversations.delete(id)
      this.database.chatMessages = this.database.chatMessages.filter((value) => value.senderId !== playerId && (!value.guildId || !ledGuildIds.has(value.guildId)))
      for (const [id, value] of this.database.chatReads) if (value.playerId === playerId) this.database.chatReads.delete(id)
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

  private socialState(): SocialState {
    return {
      players: this.database.players, guilds: this.database.guilds, guildMembers: this.database.guildMembers,
      guildApplications: this.database.guildApplications, guildInvites: this.database.guildInvites,
      guildPermissions: this.database.guildPermissions, guildStorageItems: this.database.guildStorageItems,
      guildStorageLogs: this.database.guildStorageLogs, friendRequests: this.database.friendRequests,
      friendships: this.database.friendships, blocks: this.database.blocks, conversations: this.database.conversations,
      chatMessages: this.database.chatMessages, chatReads: this.database.chatReads, ledger: this.database.ledger,
    }
  }
}
