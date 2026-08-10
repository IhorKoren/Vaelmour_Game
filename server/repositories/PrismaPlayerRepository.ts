import { randomUUID } from 'node:crypto'
import type { EquipmentSlot as GameEquipmentSlot, EquipmentState, InventoryEntry } from '../../shared/game-data/types'
import type { DirectTrade as DomainTrade, MarketFill as DomainFill, MarketOrder as DomainOrder, PartySlotReservation as DomainSlot } from '../../shared/economy-types'
import type { CharacterClass as GameCharacterClass } from '../../src/types/game'
import { ITEM_CATALOG } from '../../shared/game-data/catalog'
import { RECIPES } from '../../shared/game-data/recipes'
import { CharacterClass, CoinLedgerReason, EquipmentSlot, ItemLocation, Prisma, type PrismaClient } from '../generated/prisma/client'
import type { EconomyRepository, EconomyState, EconomyTransactionResult, AccountSetup, StoredPlayerProfile, RepositoryOperation, RepositoryTransactionResult, CoinLedgerRecord } from './types'
import { cloneEconomyState, cloneProfile } from './types'

const SLOTS: GameEquipmentSlot[] = ['weapon', 'head', 'chest', 'hands', 'legs', 'feet', 'ring1', 'ring2', 'amulet']

type PlayerRow = Prisma.PlayerGetPayload<{ include: { items: true; learnedRecipes: true } }>

export class PrismaPlayerRepository implements EconomyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async initialize(devTokenHash: string, setup: AccountSetup | null, starter: (accountId: string, playerId: string, setup: AccountSetup) => StoredPlayerProfile): Promise<StoredPlayerProfile> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('first-rift-phase5-economy'))`
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${devTokenHash}))`
      const existing = await tx.account.findUnique({ where: { devTokenHash }, include: { player: { include: { items: true, learnedRecipes: true } } } })
      if (existing?.player) return this.fromRow(existing.player)
      if (!setup) throw new Error('ACCOUNT_SETUP_REQUIRED')
      const account = existing ?? await tx.account.create({ data: { devTokenHash } })
      const playerId = crypto.randomUUID()
      const profile = starter(account.id, playerId, setup)
      const row = await tx.player.create({
        data: {
          id: playerId, accountId: account.id, name: profile.name, classId: profile.classId as CharacterClass,
          level: profile.level, currentXP: profile.currentXP, coins: profile.coins, reservedCoins: profile.reservedCoins,
          items: { createMany: { data: this.itemRows(profile) } },
          learnedRecipes: { createMany: { data: [...profile.learnedRecipes].map((recipeId) => ({ recipeId })) } },
        },
        include: { items: true, learnedRecipes: true },
      })
      return this.fromRow(row)
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  }

  async read(playerId: string): Promise<StoredPlayerProfile | null> {
    const row = await this.prisma.player.findUnique({ where: { id: playerId }, include: { items: true, learnedRecipes: true } })
    return row ? this.fromRow(row) : null
  }

  async transact(playerId: string, operation: RepositoryOperation, mutate: (profile: StoredPlayerProfile) => void): Promise<RepositoryTransactionResult> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('first-rift-phase5-economy'))`
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${playerId}))`
          const duplicate = await tx.economyOperation.findUnique({ where: { operationKey: operation.key } })
          const row = await tx.player.findUnique({ where: { id: playerId }, include: { items: true, learnedRecipes: true } })
          if (!row) throw new Error('PLAYER_NOT_FOUND')
          if (duplicate) return { profile: this.fromRow(row), applied: false }

          const profile = this.fromRow(row)
          mutate(profile)
          await tx.player.update({ where: { id: playerId }, data: { level: profile.level, currentXP: profile.currentXP, coins: profile.coins, reservedCoins: profile.reservedCoins, version: { increment: 1 } } })
          await tx.itemEntry.deleteMany({ where: { playerId, location: { in: [ItemLocation.INVENTORY, ItemLocation.STORAGE, ItemLocation.EQUIPPED] } } })
          const itemRows = this.itemRows(profile).filter((item) => item.location !== ItemLocation.MARKET_ESCROW && item.location !== ItemLocation.TRADE_ESCROW)
          if (itemRows.length) await tx.itemEntry.createMany({ data: itemRows.map((item) => ({ ...item, playerId })) })
          await tx.learnedRecipe.deleteMany({ where: { playerId } })
          if (profile.learnedRecipes.size) await tx.learnedRecipe.createMany({ data: [...profile.learnedRecipes].map((recipeId) => ({ playerId, recipeId })) })
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

  async economyTransact<T>(playerId: string, operationKey: string, operationType: string, mutate: (state: EconomyState) => T): Promise<EconomyTransactionResult<T>> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('first-rift-phase5-economy'))`
          const duplicate = await tx.economyOperation.findUnique({ where: { operationKey } })
          if (duplicate) return { value: undefined as T, applied: false }
          const state = await this.loadEconomy(tx)
          const value = mutate(state)
          await this.persistEconomy(tx, state)
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
      tx.player.findMany({ include: { items: true, learnedRecipes: true } }),
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

  private async persistEconomy(tx: Prisma.TransactionClient, input: EconomyState): Promise<void> {
    const state = cloneEconomyState(input)
    await tx.tradeOfferItem.deleteMany(); await tx.tradeOfferCoin.deleteMany(); await tx.directTrade.deleteMany()
    await tx.marketFill.deleteMany(); await tx.marketOrder.deleteMany(); await tx.partySlotReservation.deleteMany()
    await tx.itemEntry.deleteMany(); await tx.learnedRecipe.deleteMany()
    for (const profile of state.players.values()) {
      await tx.player.update({ where: { id: profile.playerId }, data: { level: profile.level, currentXP: profile.currentXP, coins: profile.coins, reservedCoins: profile.reservedCoins, version: { increment: 1 } } })
      const items = this.itemRows(profile)
      if (items.length) await tx.itemEntry.createMany({ data: items.map((item) => ({ ...item, playerId: profile.playerId })) })
      if (profile.learnedRecipes.size) await tx.learnedRecipe.createMany({ data: [...profile.learnedRecipes].map((recipeId) => ({ playerId: profile.playerId, recipeId })) })
    }
    if (state.marketOrders.size) await tx.marketOrder.createMany({ data: [...state.marketOrders.values()].map((order) => ({ id: order.id, playerId: order.playerId, itemId: order.itemId, escrowItemId: order.escrowItemId, side: order.side, pricePerUnit: order.pricePerUnit, originalQuantity: order.originalQuantity, remainingQuantity: order.remainingQuantity, reservedCoins: order.reservedCoins, status: order.status, createdAt: new Date(order.createdAt), updatedAt: new Date(order.updatedAt) })) })
    if (state.marketFills.length) await tx.marketFill.createMany({ data: state.marketFills.map((fill) => ({ ...fill, createdAt: new Date(fill.createdAt) })) })
    if (state.trades.size) await tx.directTrade.createMany({ data: [...state.trades.values()].map((trade) => ({ id: trade.id, requesterId: trade.requesterId, receiverId: trade.receiverId, status: trade.status, revision: trade.revision, requesterConfirmedRevision: trade.requesterConfirmedRevision, receiverConfirmedRevision: trade.receiverConfirmedRevision, createdAt: new Date(trade.createdAt), updatedAt: new Date(trade.updatedAt) })) })
    const tradeItems = [...state.trades.values()].flatMap((trade) => trade.items)
    if (tradeItems.length) await tx.tradeOfferItem.createMany({ data: tradeItems })
    const tradeCoins = [...state.trades.values()].flatMap((trade) => Object.entries(trade.coins).map(([coinPlayerId, amount]) => ({ id: randomUUID(), tradeId: trade.id, playerId: coinPlayerId, amount })))
    if (tradeCoins.length) await tx.tradeOfferCoin.createMany({ data: tradeCoins })
    if (state.partySlotReservations.size) await tx.partySlotReservation.createMany({ data: [...state.partySlotReservations.values()].map((slot) => ({ id: slot.id, roomId: slot.roomId, applicantId: slot.applicantId, leaderId: slot.leaderId, amount: slot.amount, status: slot.status, expiresAt: new Date(slot.expiresAt), createdAt: new Date(slot.createdAt), updatedAt: new Date(slot.updatedAt) })) })
    const existingLedger = new Set((await tx.coinLedgerEntry.findMany({ select: { id: true } })).map((row) => row.id))
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
      accountId: row.accountId, playerId: row.id, name: row.name, classId: row.classId as GameCharacterClass,
      level: row.level, currentXP: row.currentXP, coins: row.coins, reservedCoins: row.reservedCoins, inventory, storage, equipment,
      learnedRecipes: new Set(row.learnedRecipes.map((recipe) => recipe.recipeId)), reservedItems,
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
