import { randomUUID } from 'node:crypto'
import type { EquipmentSlot as GameEquipmentSlot, EquipmentState, InventoryEntry } from '../../shared/game-data/types'
import type { DirectTrade as DomainTrade, MarketFill as DomainFill, MarketOrder as DomainOrder, PartySlotReservation as DomainSlot } from '../../shared/economy-types'
import type { ChatReadRecord, FriendRequestRecord, FriendshipRecord, GuildApplicationRecord, GuildInviteRecord, GuildMemberRecord, GuildPermissionRecord, GuildRecord, GuildStorageItem, GuildStorageLogRecord, PersistentChatMessage, PlayerBlockRecord, PrivateConversationRecord } from '../../shared/social-types'
import type { CharacterClass as GameCharacterClass } from '../../src/types/game'
import { ITEM_CATALOG } from '../../shared/game-data/catalog'
import { RECIPES } from '../../shared/game-data/recipes'
import { CharacterClass, CoinLedgerReason, EquipmentSlot, ItemLocation, Prisma, type PrismaClient } from '../generated/prisma/client'
import type { AdminAuditWrite, EconomyState, EconomyTransactionResult, AccountSetup, DurableExpeditionStart, StoredPlayerProfile, RepositoryOperation, RepositoryTransactionResult, CoinLedgerRecord, SocialRepository, SocialState } from './types'
import { cloneEconomyState, cloneProfile, cloneSocialState } from './types'

const SLOTS: GameEquipmentSlot[] = ['weapon', 'head', 'chest', 'hands', 'legs', 'feet', 'ring1', 'ring2', 'amulet']

type PlayerRow = Prisma.PlayerGetPayload<{ include: { items: true; learnedRecipes: true; professionProgress: true; professionJobs: true } }>

export class PrismaPlayerRepository implements SocialRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async initialize(devTokenHash: string, setup: AccountSetup | null, starter: (accountId: string, playerId: string, setup: AccountSetup) => StoredPlayerProfile): Promise<StoredPlayerProfile> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${devTokenHash}))`
      const existing = await tx.account.findUnique({ where: { devTokenHash }, include: { player: { include: { items: true, learnedRecipes: true, professionProgress: true, professionJobs: true } } } })
      if (existing?.player) return this.fromRow(existing.player)
      if (!setup) throw new Error('ACCOUNT_SETUP_REQUIRED')
      const account = existing ?? await tx.account.create({ data: { devTokenHash } })
      const playerId = crypto.randomUUID()
      const profile = starter(account.id, playerId, setup)
      const row = await tx.player.create({
        data: {
          id: playerId, accountId: account.id, name: profile.name, nameKey: profile.nameKey, classId: profile.classId as CharacterClass,
          level: profile.level, currentXP: profile.currentXP, coins: profile.coins, reservedCoins: profile.reservedCoins,
          riftProgress: (profile.riftProgress ?? {}) as unknown as Prisma.InputJsonValue,
          items: { createMany: { data: this.itemRows(profile) } },
          learnedRecipes: { createMany: { data: [...profile.learnedRecipes].map((recipeId) => ({ recipeId })) } },
        },
        include: { items: true, learnedRecipes: true, professionProgress: true, professionJobs: true },
      })
      return this.fromRow(row)
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  }

  async initializeAccount(accountId: string, setup: AccountSetup | null, starter: (accountId: string, playerId: string, setup: AccountSetup) => StoredPlayerProfile): Promise<StoredPlayerProfile> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${accountId}))`
      const account = await tx.account.findUnique({ where: { id: accountId }, include: { player: { include: { items: true, learnedRecipes: true, professionProgress: true, professionJobs: true } } } })
      if (!account) throw new Error('ACCOUNT_NOT_FOUND')
      if (account.player) return this.fromRow(account.player)
      if (!setup) throw new Error('ACCOUNT_SETUP_REQUIRED')
      const playerId = randomUUID()
      const profile = starter(accountId, playerId, setup)
      const row = await tx.player.create({
        data: {
          id: playerId, accountId, name: profile.name, nameKey: profile.nameKey, classId: profile.classId as CharacterClass,
          level: profile.level, currentXP: profile.currentXP, coins: profile.coins, reservedCoins: profile.reservedCoins,
          riftProgress: (profile.riftProgress ?? {}) as unknown as Prisma.InputJsonValue,
          items: { createMany: { data: this.itemRows(profile) } },
          learnedRecipes: { createMany: { data: [...profile.learnedRecipes].map((recipeId) => ({ recipeId })) } },
        },
        include: { items: true, learnedRecipes: true, professionProgress: true, professionJobs: true },
      })
      return this.fromRow(row)
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  }

  async read(playerId: string): Promise<StoredPlayerProfile | null> {
    const row = await this.prisma.player.findUnique({ where: { id: playerId }, include: { items: true, learnedRecipes: true, professionProgress: true, professionJobs: true } })
    return row ? this.fromRow(row) : null
  }

  async transact(playerId: string, operation: RepositoryOperation, mutate: (profile: StoredPlayerProfile) => void): Promise<RepositoryTransactionResult> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`player:${playerId}`}))`
          const duplicate = await tx.economyOperation.findUnique({ where: { operationKey: operation.key } })
          const row = await tx.player.findUnique({ where: { id: playerId }, include: { items: true, learnedRecipes: true, professionProgress: true, professionJobs: true } })
          if (!row) throw new Error('PLAYER_NOT_FOUND')
          if (duplicate) return { profile: this.fromRow(row), applied: false }

          const profile = this.fromRow(row)
          mutate(profile)
          await tx.player.update({ where: { id: playerId }, data: { level: profile.level, currentXP: profile.currentXP, coins: profile.coins, reservedCoins: profile.reservedCoins, riftProgress: (profile.riftProgress ?? {}) as unknown as Prisma.InputJsonValue, version: { increment: 1 } } })
          await tx.itemEntry.deleteMany({ where: { playerId, location: { in: [ItemLocation.INVENTORY, ItemLocation.STORAGE, ItemLocation.EQUIPPED] } } })
          const itemRows = this.itemRows(profile).filter((item) => item.location !== ItemLocation.MARKET_ESCROW && item.location !== ItemLocation.TRADE_ESCROW)
          if (itemRows.length) await tx.itemEntry.createMany({ data: itemRows.map((item) => ({ ...item, playerId })) })
          await tx.learnedRecipe.deleteMany({ where: { playerId } })
          if (profile.learnedRecipes.size) await tx.learnedRecipe.createMany({ data: [...profile.learnedRecipes].map((recipeId) => ({ playerId, recipeId })) })
          await this.persistProfession(tx, profile)
          if (operation.ledger) await tx.coinLedgerEntry.create({ data: {
            playerId, amount: operation.ledger.amount, resultingBalance: profile.coins,
            reason: operation.ledger.reason as CoinLedgerReason, referenceId: operation.ledger.referenceId,
          } })
          await tx.economyOperation.create({ data: { playerId, operationKey: operation.key, type: operation.type, referenceId: operation.referenceId } })
          return { profile: cloneProfile(profile), applied: true }
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 2) continue
        throw error
      }
    }
    throw new Error('TRANSACTION_RETRY_EXHAUSTED')
  }

  async adminTransact(playerId: string, operation: RepositoryOperation, audit: AdminAuditWrite, mutate: (profile: StoredPlayerProfile) => void): Promise<RepositoryTransactionResult> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`player:${playerId}`}))`
      const duplicate = await tx.economyOperation.findUnique({ where: { operationKey: operation.key } })
      const row = await tx.player.findUnique({ where: { id: playerId }, include: { items: true, learnedRecipes: true, professionProgress: true, professionJobs: true } })
      if (!row) throw new Error('PLAYER_NOT_FOUND')
      if (duplicate) return { profile: this.fromRow(row), applied: false }
      const profile = this.fromRow(row)
      mutate(profile)
      await tx.player.update({ where: { id: playerId }, data: { level: profile.level, currentXP: profile.currentXP, coins: profile.coins, reservedCoins: profile.reservedCoins, riftProgress: (profile.riftProgress ?? {}) as unknown as Prisma.InputJsonValue, version: { increment: 1 } } })
      await tx.itemEntry.deleteMany({ where: { playerId, location: { in: [ItemLocation.INVENTORY, ItemLocation.STORAGE, ItemLocation.EQUIPPED] } } })
      const itemRows = this.itemRows(profile).filter((item) => item.location !== ItemLocation.MARKET_ESCROW && item.location !== ItemLocation.TRADE_ESCROW)
      if (itemRows.length) await tx.itemEntry.createMany({ data: itemRows.map((item) => ({ ...item, playerId })) })
      await tx.learnedRecipe.deleteMany({ where: { playerId } })
      if (profile.learnedRecipes.size) await tx.learnedRecipe.createMany({ data: [...profile.learnedRecipes].map((recipeId) => ({ playerId, recipeId })) })
      await this.persistProfession(tx, profile)
      if (operation.ledger) await tx.coinLedgerEntry.create({ data: { playerId, amount: operation.ledger.amount, resultingBalance: profile.coins, reason: operation.ledger.reason as CoinLedgerReason, referenceId: operation.ledger.referenceId } })
      await tx.adminAuditLog.create({ data: { ...audit, details: audit.details as Prisma.InputJsonValue } })
      await tx.economyOperation.create({ data: { playerId, operationKey: operation.key, type: operation.type, referenceId: operation.referenceId } })
      return { profile: cloneProfile(profile), applied: true }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  }

  async ledger(playerId: string): Promise<CoinLedgerRecord[]> {
    const rows = await this.prisma.coinLedgerEntry.findMany({ where: { playerId }, orderBy: { createdAt: 'asc' } })
    return rows.map((row) => ({
      id: row.id, playerId: row.playerId, amount: row.amount, resultingBalance: row.resultingBalance,
      reason: row.reason, referenceId: row.referenceId ?? undefined, createdAt: row.createdAt,
    }))
  }

  async economyRead<T>(read: (state: EconomyState) => T): Promise<T> {
    return this.prisma.$transaction(async (tx) => read(await this.loadEconomy(tx)))
  }

  async economyTransact<T>(playerId: string, operationKey: string, operationType: string, mutate: (state: EconomyState) => T, resultReference?: (value: T) => string | undefined): Promise<EconomyTransactionResult<T>> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`player:${playerId}`}))`
          const duplicate = await tx.economyOperation.findUnique({ where: { operationKey } })
          if (duplicate) return { value: undefined as T, applied: false, referenceId: duplicate.referenceId ?? undefined }
          const state = await this.loadEconomy(tx)
          const before = cloneEconomyState(state)
          const value = mutate(state)
          await this.persistEconomy(tx, before, state)
          const anchorId = state.players.has(playerId) ? playerId : state.players.keys().next().value
          const referenceId = resultReference?.(value) ?? operationKey.slice(0, 150)
          if (anchorId) await tx.economyOperation.create({ data: { playerId: anchorId, operationKey, type: operationType, referenceId } })
          return { value, applied: true, referenceId }
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 2) continue
        throw error
      }
    }
    throw new Error('TRANSACTION_RETRY_EXHAUSTED')
  }

  async startExpeditionTransact(playerId: string, operationKey: string, marker: DurableExpeditionStart, mutate: (state: EconomyState) => void): Promise<{ applied: boolean; marker: DurableExpeditionStart }> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`player:${playerId}`}))`
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`party:${marker.roomId}`}))`
          const duplicate = await tx.economyOperation.findUnique({ where: { operationKey } })
          if (duplicate) {
            const existing = await tx.activeExpedition.findUnique({ where: { roomId: marker.roomId } })
            if (!existing) throw new Error('DURABLE_EXPEDITION_MARKER_MISSING')
            return { applied: false, marker: { expeditionId: existing.expeditionId, playSessionId: existing.playSessionId, roomId: existing.roomId, riftId: existing.riftId, floor: existing.floor, playerIds: Array.isArray(existing.playerIds) ? existing.playerIds.filter((id): id is string => typeof id === 'string') : [] } }
          }
          const state = await this.loadEconomy(tx)
          const before = cloneEconomyState(state)
          mutate(state)
          await this.persistEconomy(tx, before, state)
          await tx.activeExpedition.create({ data: { ...marker, playerIds: marker.playerIds as Prisma.InputJsonValue, status: 'ACTIVE' } })
          await tx.economyOperation.create({ data: { playerId, operationKey, type: 'RIFT_START', referenceId: marker.expeditionId } })
          return { applied: true, marker }
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 2) continue
        throw error
      }
    }
    throw new Error('TRANSACTION_RETRY_EXHAUSTED')
  }

  async socialRead<T>(read: (state: SocialState) => T): Promise<T> {
    return this.prisma.$transaction(async (tx) => read(await this.loadSocial(tx)))
  }

  async socialTransact<T>(playerId: string, operationKey: string, operationType: string, mutate: (state: SocialState) => T): Promise<EconomyTransactionResult<T>> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`player:${playerId}`}))`
          const duplicate = await tx.economyOperation.findUnique({ where: { operationKey } })
          if (duplicate) return { value: undefined as T, applied: false }
          const state = await this.loadSocial(tx)
          const before = cloneSocialState(state)
          const value = mutate(state)
          await this.persistSocial(tx, before, state)
          const anchorId = state.players.has(playerId) ? playerId : state.players.keys().next().value
          if (anchorId) await tx.economyOperation.create({ data: { playerId: anchorId, operationKey, type: operationType, referenceId: operationKey.slice(0, 150) } })
          return { value, applied: true }
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 2) continue
        throw error
      }
    }
    throw new Error('TRANSACTION_RETRY_EXHAUSTED')
  }

  async resetByDevTokenHash(devTokenHash: string): Promise<boolean> {
    const result = await this.prisma.account.deleteMany({ where: { devTokenHash } })
    return result.count > 0
  }

  async disconnect(): Promise<void> { await this.prisma.$disconnect() }

  private async loadEconomy(tx: Prisma.TransactionClient): Promise<EconomyState> {
    const [players, orders, fills, trades, slots, ledger] = await Promise.all([
      tx.player.findMany({ include: { items: true, learnedRecipes: true, professionProgress: true, professionJobs: true } }),
      tx.marketOrder.findMany(), tx.marketFill.findMany(),
      tx.directTrade.findMany({ include: { items: true, coins: true } }),
      tx.partySlotReservation.findMany(), tx.coinLedgerEntry.findMany(),
    ])
    return {
      players: new Map(players.map((row) => [row.id, this.fromRow(row)])),
      marketOrders: new Map(orders.map((row) => [row.id, {
        id: row.id, playerId: row.playerId, itemId: row.itemId, escrowItemId: row.escrowItemId ?? undefined,
        side: row.side, pricePerUnit: row.pricePerUnit, originalQuantity: row.originalQuantity,
        remainingQuantity: row.remainingQuantity, reservedCoins: row.reservedCoins, status: row.status,
        createdAt: row.createdAt.getTime(), updatedAt: row.updatedAt.getTime(),
      } satisfies DomainOrder])),
      marketFills: fills.map((row) => ({ id: row.id, itemId: row.itemId, buyOrderId: row.buyOrderId, sellOrderId: row.sellOrderId, buyerId: row.buyerId, sellerId: row.sellerId, unitPrice: row.unitPrice, quantity: row.quantity, createdAt: row.createdAt.getTime() } satisfies DomainFill)),
      trades: new Map(trades.map((row) => [row.id, {
        id: row.id, requesterId: row.requesterId, receiverId: row.receiverId, status: row.status, revision: row.revision,
        requesterConfirmedRevision: row.requesterConfirmedRevision, receiverConfirmedRevision: row.receiverConfirmedRevision,
        items: row.items.map((item) => ({ id: item.id, tradeId: item.tradeId, playerId: item.playerId, itemEntryId: item.itemEntryId, itemId: item.itemId, quantity: item.quantity })),
        coins: Object.fromEntries(row.coins.map((coin) => [coin.playerId, coin.amount])), createdAt: row.createdAt.getTime(), updatedAt: row.updatedAt.getTime(),
      } satisfies DomainTrade])),
      partySlotReservations: new Map(slots.map((row) => [row.id, { id: row.id, roomId: row.roomId, applicantId: row.applicantId, leaderId: row.leaderId, amount: row.amount, status: row.status, expiresAt: row.expiresAt.getTime(), createdAt: row.createdAt.getTime(), updatedAt: row.updatedAt.getTime() } satisfies DomainSlot])),
      ledger: ledger.map((row) => ({ id: row.id, playerId: row.playerId, amount: row.amount, resultingBalance: row.resultingBalance, reason: row.reason, referenceId: row.referenceId ?? undefined, createdAt: row.createdAt })),
    }
  }

  private async persistEconomy(tx: Prisma.TransactionClient, before: EconomyState, input: EconomyState): Promise<void> {
    const state = cloneEconomyState(input)
    const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right)
    const profileValue = (profile: StoredPlayerProfile | undefined) => profile && { ...profile, learnedRecipes: [...profile.learnedRecipes].sort() }

    const removedTrades = [...before.trades.keys()].filter((id) => !state.trades.has(id))
    if (removedTrades.length) await tx.directTrade.deleteMany({ where: { id: { in: removedTrades } } })
    const removedOrders = [...before.marketOrders.keys()].filter((id) => !state.marketOrders.has(id))
    if (removedOrders.length) await tx.marketOrder.deleteMany({ where: { id: { in: removedOrders } } })
    const removedSlots = [...before.partySlotReservations.keys()].filter((id) => !state.partySlotReservations.has(id))
    if (removedSlots.length) await tx.partySlotReservation.deleteMany({ where: { id: { in: removedSlots } } })

    for (const profile of state.players.values()) {
      if (same(profileValue(before.players.get(profile.playerId)), profileValue(profile))) continue
      await tx.player.update({ where: { id: profile.playerId }, data: { level: profile.level, currentXP: profile.currentXP, coins: profile.coins, reservedCoins: profile.reservedCoins, riftProgress: (profile.riftProgress ?? {}) as unknown as Prisma.InputJsonValue, version: { increment: 1 } } })
      await tx.itemEntry.deleteMany({ where: { playerId: profile.playerId, location: { in: [ItemLocation.INVENTORY, ItemLocation.STORAGE, ItemLocation.EQUIPPED] } } })
      const items = this.itemRows(profile)
      const personalItems = items.filter((item) => item.location === ItemLocation.INVENTORY || item.location === ItemLocation.STORAGE || item.location === ItemLocation.EQUIPPED)
      if (personalItems.length) await tx.itemEntry.createMany({ data: personalItems.map((item) => ({ ...item, playerId: profile.playerId })) })
      const desiredReserved = new Map(items.filter((item) => item.location === ItemLocation.MARKET_ESCROW || item.location === ItemLocation.TRADE_ESCROW).map((item) => [item.id, item]))
      const previousReserved = this.itemRows(before.players.get(profile.playerId)!).filter((item) => item.location === ItemLocation.MARKET_ESCROW || item.location === ItemLocation.TRADE_ESCROW)
      const removedReserved = previousReserved.filter((item) => !desiredReserved.has(item.id)).map((item) => item.id)
      if (removedReserved.length) await tx.itemEntry.deleteMany({ where: { id: { in: removedReserved }, playerId: profile.playerId } })
      for (const item of desiredReserved.values()) {
        await tx.itemEntry.upsert({ where: { id: item.id }, create: { ...item, playerId: profile.playerId }, update: { itemId: item.itemId, quantity: item.quantity, location: item.location, equipmentSlot: null } })
      }
      await tx.learnedRecipe.deleteMany({ where: { playerId: profile.playerId } })
      if (profile.learnedRecipes.size) await tx.learnedRecipe.createMany({ data: [...profile.learnedRecipes].map((recipeId) => ({ playerId: profile.playerId, recipeId })) })
    }

    for (const order of state.marketOrders.values()) {
      if (same(before.marketOrders.get(order.id), order)) continue
      const data = { playerId: order.playerId, itemId: order.itemId, escrowItemId: order.escrowItemId, side: order.side, pricePerUnit: order.pricePerUnit, originalQuantity: order.originalQuantity, remainingQuantity: order.remainingQuantity, reservedCoins: order.reservedCoins, status: order.status, createdAt: new Date(order.createdAt), updatedAt: new Date(order.updatedAt) }
      await tx.marketOrder.upsert({ where: { id: order.id }, create: { id: order.id, ...data }, update: data })
    }
    const knownFills = new Set(before.marketFills.map((fill) => fill.id))
    const addedFills = state.marketFills.filter((fill) => !knownFills.has(fill.id))
    if (addedFills.length) await tx.marketFill.createMany({ data: addedFills.map((fill) => ({ ...fill, createdAt: new Date(fill.createdAt) })) })

    for (const trade of state.trades.values()) {
      if (same(before.trades.get(trade.id), trade)) continue
      const data = { requesterId: trade.requesterId, receiverId: trade.receiverId, status: trade.status, revision: trade.revision, requesterConfirmedRevision: trade.requesterConfirmedRevision, receiverConfirmedRevision: trade.receiverConfirmedRevision, createdAt: new Date(trade.createdAt), updatedAt: new Date(trade.updatedAt) }
      await tx.directTrade.upsert({ where: { id: trade.id }, create: { id: trade.id, ...data }, update: data })
      await tx.tradeOfferItem.deleteMany({ where: { tradeId: trade.id } })
      await tx.tradeOfferCoin.deleteMany({ where: { tradeId: trade.id } })
      if (trade.items.length) await tx.tradeOfferItem.createMany({ data: trade.items })
      const coins = Object.entries(trade.coins).map(([coinPlayerId, amount]) => ({ id: randomUUID(), tradeId: trade.id, playerId: coinPlayerId, amount }))
      if (coins.length) await tx.tradeOfferCoin.createMany({ data: coins })
    }

    for (const slot of state.partySlotReservations.values()) {
      if (same(before.partySlotReservations.get(slot.id), slot)) continue
      const data = { roomId: slot.roomId, applicantId: slot.applicantId, leaderId: slot.leaderId, amount: slot.amount, status: slot.status, expiresAt: new Date(slot.expiresAt), createdAt: new Date(slot.createdAt), updatedAt: new Date(slot.updatedAt) }
      await tx.partySlotReservation.upsert({ where: { id: slot.id }, create: { id: slot.id, ...data }, update: data })
    }

    const existingLedger = new Set(before.ledger.map((row) => row.id))
    const added = state.ledger.filter((entry) => !existingLedger.has(entry.id))
    if (added.length) await tx.coinLedgerEntry.createMany({ data: added.map((entry) => ({ id: entry.id, playerId: entry.playerId, amount: entry.amount, resultingBalance: entry.resultingBalance, reason: entry.reason as CoinLedgerReason, referenceId: entry.referenceId, createdAt: entry.createdAt })) })
  }

  private async loadSocial(tx: Prisma.TransactionClient): Promise<SocialState> {
    const [players, guilds, members, applications, invites, permissions, storage, logs, requests, friendships, blocks, conversations, messages, reads, ledger] = await Promise.all([
      tx.player.findMany({ include: { items: true, learnedRecipes: true, professionProgress: true, professionJobs: true } }), tx.guild.findMany(), tx.guildMember.findMany(),
      tx.guildApplication.findMany(), tx.guildInvite.findMany(), tx.guildRankPermission.findMany(), tx.guildStorageItem.findMany(),
      tx.guildStorageLog.findMany(), tx.friendRequest.findMany(), tx.friendship.findMany(), tx.playerBlock.findMany(),
      tx.privateConversation.findMany(), tx.socialChatMessage.findMany(), tx.chatReadState.findMany(), tx.coinLedgerEntry.findMany(),
    ])
    return {
      players: new Map(players.map((row) => [row.id, this.fromRow(row)])),
      guilds: new Map(guilds.map((row) => [row.id, { id: row.id, name: row.name, nameKey: row.nameKey, tag: row.tag, tagKey: row.tagKey, description: row.description, messageOfTheDay: row.messageOfTheDay, leaderPlayerId: row.leaderPlayerId, createdAt: row.createdAt.getTime(), updatedAt: row.updatedAt.getTime() } satisfies GuildRecord])),
      guildMembers: new Map(members.map((row) => [row.playerId, { guildId: row.guildId, playerId: row.playerId, rank: row.rank, joinedAt: row.joinedAt.getTime() } satisfies GuildMemberRecord])),
      guildApplications: new Map(applications.map((row) => [row.id, { id: row.id, guildId: row.guildId, playerId: row.playerId, message: row.message ?? undefined, status: row.status, createdAt: row.createdAt.getTime() } satisfies GuildApplicationRecord])),
      guildInvites: new Map(invites.map((row) => [row.id, { id: row.id, guildId: row.guildId, playerId: row.playerId, invitedByPlayerId: row.invitedByPlayerId, status: row.status, createdAt: row.createdAt.getTime(), expiresAt: row.expiresAt?.getTime() } satisfies GuildInviteRecord])),
      guildPermissions: new Map(permissions.map((row) => [`${row.guildId}:${row.rank}`, { guildId: row.guildId, rank: row.rank, canDeposit: row.canDeposit, canWithdraw: row.canWithdraw } satisfies GuildPermissionRecord])),
      guildStorageItems: new Map(storage.map((row) => [row.id, { id: row.id, guildId: row.guildId, itemId: row.itemId, quantity: row.quantity, createdAt: row.createdAt.getTime(), updatedAt: row.updatedAt.getTime() } satisfies GuildStorageItem])),
      guildStorageLogs: logs.map((row) => ({ id: row.id, guildId: row.guildId, playerId: row.playerId, action: row.action, itemId: row.itemId, itemEntryId: row.itemEntryId ?? undefined, quantity: row.quantity, createdAt: row.createdAt.getTime() } satisfies GuildStorageLogRecord)),
      friendRequests: new Map(requests.map((row) => [row.id, { id: row.id, requesterId: row.requesterId, receiverId: row.receiverId, status: row.status, createdAt: row.createdAt.getTime() } satisfies FriendRequestRecord])),
      friendships: new Map(friendships.map((row) => [row.id, { id: row.id, playerLowId: row.playerLowId, playerHighId: row.playerHighId, createdAt: row.createdAt.getTime() } satisfies FriendshipRecord])),
      blocks: new Map(blocks.map((row) => [`${row.blockerId}:${row.blockedId}`, { blockerId: row.blockerId, blockedId: row.blockedId, createdAt: row.createdAt.getTime() } satisfies PlayerBlockRecord])),
      conversations: new Map(conversations.map((row) => [row.id, { id: row.id, playerLowId: row.playerLowId, playerHighId: row.playerHighId, createdAt: row.createdAt.getTime(), updatedAt: row.updatedAt.getTime() } satisfies PrivateConversationRecord])),
      chatMessages: messages.map((row) => ({ id: row.id, channel: row.channel, senderId: row.senderId, senderName: row.senderName, text: row.text, guildId: row.guildId ?? undefined, roomId: row.roomId ?? undefined, conversationId: row.conversationId ?? undefined, createdAt: row.createdAt.getTime() } satisfies PersistentChatMessage)),
      chatReads: new Map(reads.map((row) => [`${row.playerId}:${row.channelKey}`, { playerId: row.playerId, channelKey: row.channelKey, lastReadAt: row.lastReadAt.getTime() } satisfies ChatReadRecord])),
      ledger: ledger.map((row) => ({ id: row.id, playerId: row.playerId, amount: row.amount, resultingBalance: row.resultingBalance, reason: row.reason, referenceId: row.referenceId ?? undefined, createdAt: row.createdAt })),
    }
  }

  private async persistSocial(tx: Prisma.TransactionClient, before: SocialState, input: SocialState): Promise<void> {
    const state = cloneSocialState(input)
    const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right)
    const profileValue = (profile: StoredPlayerProfile | undefined) => profile && { ...profile, learnedRecipes: [...profile.learnedRecipes].sort() }
    const removed = <T>(oldMap: Map<string, T>, nextMap: Map<string, T>) => [...oldMap.keys()].filter((id) => !nextMap.has(id))

    const removedGuilds = removed(before.guilds, state.guilds)
    if (removedGuilds.length) await tx.guild.deleteMany({ where: { id: { in: removedGuilds } } })
    const removedApplications = removed(before.guildApplications, state.guildApplications)
    if (removedApplications.length) await tx.guildApplication.deleteMany({ where: { id: { in: removedApplications } } })
    const removedInvites = removed(before.guildInvites, state.guildInvites)
    if (removedInvites.length) await tx.guildInvite.deleteMany({ where: { id: { in: removedInvites } } })
    const removedRequests = removed(before.friendRequests, state.friendRequests)
    if (removedRequests.length) await tx.friendRequest.deleteMany({ where: { id: { in: removedRequests } } })
    const removedFriendships = removed(before.friendships, state.friendships)
    if (removedFriendships.length) await tx.friendship.deleteMany({ where: { id: { in: removedFriendships } } })
    const removedConversations = removed(before.conversations, state.conversations)
    if (removedConversations.length) await tx.privateConversation.deleteMany({ where: { id: { in: removedConversations } } })
    for (const key of removed(before.guildMembers, state.guildMembers)) {
      const value = before.guildMembers.get(key)!
      await tx.guildMember.deleteMany({ where: { guildId: value.guildId, playerId: value.playerId } })
    }
    for (const key of removed(before.guildPermissions, state.guildPermissions)) {
      const value = before.guildPermissions.get(key)!
      await tx.guildRankPermission.deleteMany({ where: { guildId: value.guildId, rank: value.rank } })
    }
    for (const key of removed(before.guildStorageItems, state.guildStorageItems)) await tx.guildStorageItem.deleteMany({ where: { id: key } })
    for (const key of removed(before.blocks, state.blocks)) {
      const value = before.blocks.get(key)!
      await tx.playerBlock.deleteMany({ where: { blockerId: value.blockerId, blockedId: value.blockedId } })
    }
    for (const key of removed(before.chatReads, state.chatReads)) {
      const value = before.chatReads.get(key)!
      await tx.chatReadState.deleteMany({ where: { playerId: value.playerId, channelKey: value.channelKey } })
    }

    for (const profile of state.players.values()) {
      if (same(profileValue(before.players.get(profile.playerId)), profileValue(profile))) continue
      await tx.player.update({ where: { id: profile.playerId }, data: { coins: profile.coins, reservedCoins: profile.reservedCoins, version: { increment: 1 } } })
      await tx.itemEntry.deleteMany({ where: { playerId: profile.playerId, location: { in: [ItemLocation.INVENTORY, ItemLocation.STORAGE, ItemLocation.EQUIPPED] } } })
      const personalItems = this.itemRows(profile).filter((item) => item.location === ItemLocation.INVENTORY || item.location === ItemLocation.STORAGE || item.location === ItemLocation.EQUIPPED)
      if (personalItems.length) await tx.itemEntry.createMany({ data: personalItems.map((item) => ({ ...item, playerId: profile.playerId })) })
    }

    for (const value of state.guilds.values()) {
      if (same(before.guilds.get(value.id), value)) continue
      const data = { name: value.name, nameKey: value.nameKey, tag: value.tag, tagKey: value.tagKey, description: value.description, messageOfTheDay: value.messageOfTheDay, leaderPlayerId: value.leaderPlayerId, createdAt: new Date(value.createdAt), updatedAt: new Date(value.updatedAt) }
      await tx.guild.upsert({ where: { id: value.id }, create: { id: value.id, ...data }, update: data })
    }
    for (const value of state.guildMembers.values()) {
      if (same(before.guildMembers.get(value.playerId), value)) continue
      const data = { rank: value.rank, joinedAt: new Date(value.joinedAt) }
      await tx.guildMember.upsert({ where: { guildId_playerId: { guildId: value.guildId, playerId: value.playerId } }, create: { guildId: value.guildId, playerId: value.playerId, ...data }, update: data })
    }
    for (const value of state.guildApplications.values()) {
      if (same(before.guildApplications.get(value.id), value)) continue
      const data = { guildId: value.guildId, playerId: value.playerId, message: value.message, status: value.status, createdAt: new Date(value.createdAt) }
      await tx.guildApplication.upsert({ where: { id: value.id }, create: { id: value.id, ...data }, update: data })
    }
    for (const value of state.guildInvites.values()) {
      if (same(before.guildInvites.get(value.id), value)) continue
      const data = { guildId: value.guildId, playerId: value.playerId, invitedByPlayerId: value.invitedByPlayerId, status: value.status, createdAt: new Date(value.createdAt), expiresAt: value.expiresAt ? new Date(value.expiresAt) : null }
      await tx.guildInvite.upsert({ where: { id: value.id }, create: { id: value.id, ...data }, update: data })
    }
    for (const [key, value] of state.guildPermissions) {
      if (same(before.guildPermissions.get(key), value)) continue
      const data = { canDeposit: value.canDeposit, canWithdraw: value.canWithdraw }
      await tx.guildRankPermission.upsert({ where: { guildId_rank: { guildId: value.guildId, rank: value.rank } }, create: { guildId: value.guildId, rank: value.rank, ...data }, update: data })
    }
    for (const value of state.guildStorageItems.values()) {
      if (same(before.guildStorageItems.get(value.id), value)) continue
      const data = { guildId: value.guildId, itemId: value.itemId, quantity: value.quantity, createdAt: new Date(value.createdAt), updatedAt: new Date(value.updatedAt) }
      await tx.guildStorageItem.upsert({ where: { id: value.id }, create: { id: value.id, ...data }, update: data })
    }
    for (const value of state.friendRequests.values()) {
      if (same(before.friendRequests.get(value.id), value)) continue
      const data = { requesterId: value.requesterId, receiverId: value.receiverId, status: value.status, createdAt: new Date(value.createdAt) }
      await tx.friendRequest.upsert({ where: { id: value.id }, create: { id: value.id, ...data }, update: data })
    }
    for (const value of state.friendships.values()) {
      if (same(before.friendships.get(value.id), value)) continue
      const data = { playerLowId: value.playerLowId, playerHighId: value.playerHighId, createdAt: new Date(value.createdAt) }
      await tx.friendship.upsert({ where: { id: value.id }, create: { id: value.id, ...data }, update: data })
    }
    for (const [key, value] of state.blocks) {
      if (same(before.blocks.get(key), value)) continue
      await tx.playerBlock.upsert({ where: { blockerId_blockedId: { blockerId: value.blockerId, blockedId: value.blockedId } }, create: { ...value, createdAt: new Date(value.createdAt) }, update: {} })
    }
    for (const value of state.conversations.values()) {
      if (same(before.conversations.get(value.id), value)) continue
      const data = { playerLowId: value.playerLowId, playerHighId: value.playerHighId, createdAt: new Date(value.createdAt), updatedAt: new Date(value.updatedAt) }
      await tx.privateConversation.upsert({ where: { id: value.id }, create: { id: value.id, ...data }, update: data })
    }
    for (const [key, value] of state.chatReads) {
      if (same(before.chatReads.get(key), value)) continue
      await tx.chatReadState.upsert({ where: { playerId_channelKey: { playerId: value.playerId, channelKey: value.channelKey } }, create: { ...value, lastReadAt: new Date(value.lastReadAt) }, update: { lastReadAt: new Date(value.lastReadAt) } })
    }

    const previousLogs = new Set(before.guildStorageLogs.map((value) => value.id))
    const addedLogs = state.guildStorageLogs.filter((value) => !previousLogs.has(value.id))
    if (addedLogs.length) await tx.guildStorageLog.createMany({ data: addedLogs.map((value) => ({ ...value, itemEntryId: value.itemEntryId ?? null, createdAt: new Date(value.createdAt) })) })
    const previousMessages = new Set(before.chatMessages.map((value) => value.id))
    const addedMessages = state.chatMessages.filter((value) => !previousMessages.has(value.id))
    if (addedMessages.length) await tx.socialChatMessage.createMany({ data: addedMessages.map((value) => ({ id: value.id, channel: value.channel, senderId: value.senderId, senderName: value.senderName, text: value.text, guildId: value.guildId ?? null, roomId: value.roomId ?? null, conversationId: value.conversationId ?? null, createdAt: new Date(value.createdAt) })) })
    const existingLedger = new Set(before.ledger.map((row) => row.id))
    const added = state.ledger.filter((entry) => !existingLedger.has(entry.id))
    if (added.length) await tx.coinLedgerEntry.createMany({ data: added.map((entry) => ({ id: entry.id, playerId: entry.playerId, amount: entry.amount, resultingBalance: entry.resultingBalance, reason: entry.reason as CoinLedgerReason, referenceId: entry.referenceId, createdAt: entry.createdAt })) })
  }

  private fromRow(row: PlayerRow): StoredPlayerProfile {
    const equipment = Object.fromEntries(SLOTS.map((slot) => [slot, null])) as EquipmentState
    const inventory: InventoryEntry[] = []
    const storage: InventoryEntry[] = []
    const reservedItems: StoredPlayerProfile['reservedItems'] = []
    for (const item of row.items) {
      const definition = ITEM_CATALOG[item.itemId]
      if (!definition || item.quantity <= 0) throw new Error(`INVALID_PERSISTED_ITEM:${item.id}`)
      const entry = { entryId: item.id, itemId: item.itemId, quantity: item.quantity }
      if (item.location === ItemLocation.INVENTORY) inventory.push(entry)
      else if (item.location === ItemLocation.STORAGE) storage.push(entry)
      else if (item.location === ItemLocation.MARKET_ESCROW || item.location === ItemLocation.TRADE_ESCROW) reservedItems.push({ ...entry, location: item.location })
      else if (item.equipmentSlot) {
        const slot = item.equipmentSlot as GameEquipmentSlot
        const validSlot = definition.equipType === 'ring' ? slot === 'ring1' || slot === 'ring2' : definition.equipType === slot
        if (!validSlot || item.quantity !== 1 || (definition.allowedClass && definition.allowedClass !== row.classId)) throw new Error(`INVALID_PERSISTED_EQUIPMENT:${item.id}`)
        equipment[slot] = entry
      }
    }
    if (row.learnedRecipes.some((learned) => !RECIPES[learned.recipeId])) throw new Error('INVALID_PERSISTED_RECIPE')
    return {
      accountId: row.accountId, playerId: row.id, name: row.name, nameKey: row.nameKey, classId: row.classId as GameCharacterClass,
      level: row.level, currentXP: row.currentXP, coins: row.coins, reservedCoins: row.reservedCoins, inventory, storage, equipment,
      learnedRecipes: new Set(row.learnedRecipes.map((recipe) => recipe.recipeId)), reservedItems,
      riftProgress: row.riftProgress && typeof row.riftProgress === 'object' && !Array.isArray(row.riftProgress)
        ? row.riftProgress as unknown as StoredPlayerProfile['riftProgress'] : {},
      professionProgress: row.professionProgress ? { profession: row.professionProgress.profession, level: row.professionProgress.level, xp: row.professionProgress.xp } : undefined,
      professionJobs: row.professionJobs.map((job) => ({
        id: job.id, profession: job.profession, activityId: job.activityId, resourceId: job.resourceId, tier: job.tier as 1 | 2 | 3 | 4 | 5 | 6,
        durationMinutes: job.durationMinutes, startedAt: job.startedAt.getTime(), completesAt: job.completesAt.getTime(), status: job.status,
        plannedQuantity: job.plannedQuantity, plannedXP: job.plannedXP, cancelledAt: job.cancelledAt?.getTime(), collectedAt: job.collectedAt?.getTime(),
      })),
    }
  }

  private async persistProfession(tx: Prisma.TransactionClient, profile: StoredPlayerProfile): Promise<void> {
    if (profile.professionProgress) {
      const progress = profile.professionProgress
      await tx.professionProgress.upsert({ where: { playerId: profile.playerId }, create: { playerId: profile.playerId, profession: progress.profession, level: progress.level, xp: progress.xp }, update: { profession: progress.profession, level: progress.level, xp: progress.xp } })
    }
    for (const job of profile.professionJobs ?? []) {
      const data = { playerId: profile.playerId, activePlayerKey: job.status === 'ACTIVE' ? profile.playerId : null, profession: job.profession, activityId: job.activityId, resourceId: job.resourceId, tier: job.tier, durationMinutes: job.durationMinutes, startedAt: new Date(job.startedAt), completesAt: new Date(job.completesAt), status: job.status, plannedQuantity: job.plannedQuantity, plannedXP: job.plannedXP, cancelledAt: job.cancelledAt ? new Date(job.cancelledAt) : null, collectedAt: job.collectedAt ? new Date(job.collectedAt) : null }
      await tx.professionJob.upsert({ where: { id: job.id }, create: { id: job.id, ...data }, update: data })
    }
  }

  private itemRows(profile: StoredPlayerProfile): Array<{ id: string; itemId: string; quantity: number; location: ItemLocation; equipmentSlot: EquipmentSlot | null }> {
    return [
      ...profile.inventory.map((entry) => ({ id: entry.entryId, itemId: entry.itemId, quantity: entry.quantity, location: ItemLocation.INVENTORY, equipmentSlot: null })),
      ...profile.storage.map((entry) => ({ id: entry.entryId, itemId: entry.itemId, quantity: entry.quantity, location: ItemLocation.STORAGE, equipmentSlot: null })),
      ...profile.reservedItems.map((entry) => ({ id: entry.entryId, itemId: entry.itemId, quantity: entry.quantity, location: entry.location as ItemLocation, equipmentSlot: null })),
      ...SLOTS.flatMap((slot) => profile.equipment[slot] ? [{ id: profile.equipment[slot]!.entryId, itemId: profile.equipment[slot]!.itemId, quantity: 1, location: ItemLocation.EQUIPPED, equipmentSlot: slot as EquipmentSlot }] : []),
    ]
  }
}
