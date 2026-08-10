import { randomUUID } from 'node:crypto'
import { ITEM_CATALOG } from '../../shared/game-data/catalog'
import { MARKET_FEES } from '../../shared/game-data/economy'
import type { InventoryEntry } from '../../shared/game-data/types'
import type { DirectTrade, MarketFill, MarketOrder, MarketSnapshot, PartySlotReservation, TradeSnapshot } from '../../shared/economy-types'
import type { CoinLedgerRecord, EconomyRepository, EconomyState, LedgerReason, StoredPlayerProfile } from '../repositories/types'
import { EconomyError } from '../players/PlayerStateService'

export interface TradeOfferInput { items: Array<{ entryId: string; quantity: number }>; coins: number }

export class EconomyService {
  private readonly online = new Set<string>()
  private readonly combatLocked = new Set<string>()

  constructor(readonly repository: EconomyRepository, private readonly now: () => number = Date.now) {}

  setAvailability(playerId: string, online: boolean, combatLocked = false): void {
    if (online) this.online.add(playerId); else this.online.delete(playerId)
    if (combatLocked) this.combatLocked.add(playerId); else this.combatLocked.delete(playerId)
  }

  async wallet(playerId: string): Promise<{ coins: number; reservedCoins: number; availableCoins: number }> {
    return this.repository.economyRead((state) => {
      const player = this.player(state, playerId)
      return { coins: player.coins + player.reservedCoins, reservedCoins: player.reservedCoins, availableCoins: player.coins }
    })
  }

  async market(playerId: string, selectedItemId: string | null = null): Promise<MarketSnapshot> {
    return this.repository.economyRead((state) => this.marketSnapshot(state, playerId, selectedItemId))
  }

  async createSellOrder(playerId: string, entryId: string, quantity: number, pricePerUnit: number, operationId: string): Promise<MarketSnapshot> {
    this.positive(quantity, 'quantity'); this.positive(pricePerUnit, 'price')
    const result = await this.repository.economyTransact(playerId, `market:sell:${playerId}:${operationId}`, 'CREATE_SELL_ORDER', (state) => {
      const player = this.player(state, playerId)
      const index = player.inventory.findIndex((entry) => entry.entryId === entryId)
      if (index < 0) throw new EconomyError('ITEM_NOT_AVAILABLE', 'Item must be in Inventory.')
      const source = player.inventory[index]
      const definition = ITEM_CATALOG[source.itemId]
      if (!definition) throw new EconomyError('UNKNOWN_ITEM', 'Unknown item.')
      if (!definition.stackable && quantity !== 1) throw new EconomyError('INVALID_QUANTITY', 'Equipment quantity must be one.')
      if (quantity > source.quantity) throw new EconomyError('NOT_ENOUGH_ITEMS', 'Not enough available items.')
      const escrowId = quantity === source.quantity ? source.entryId : randomUUID()
      source.quantity -= quantity
      if (source.quantity === 0) player.inventory.splice(index, 1)
      player.reservedItems.push({ entryId: escrowId, itemId: source.itemId, quantity, location: 'MARKET_ESCROW' })
      const createdAt = this.now()
      const order: MarketOrder = {
        id: randomUUID(), playerId, itemId: source.itemId, escrowItemId: escrowId, side: 'SELL', pricePerUnit,
        originalQuantity: quantity, remainingQuantity: quantity, reservedCoins: 0, status: 'OPEN', createdAt, updatedAt: createdAt,
      }
      state.marketOrders.set(order.id, order)
      this.match(state, order.itemId)
      return order.itemId
    })
    return this.market(playerId, result.applied ? result.value : null)
  }

  async createBuyOrder(playerId: string, itemId: string, quantity: number, pricePerUnit: number, operationId: string): Promise<MarketSnapshot> {
    this.positive(quantity, 'quantity'); this.positive(pricePerUnit, 'price')
    if (!ITEM_CATALOG[itemId]) throw new EconomyError('UNKNOWN_ITEM', 'Unknown item.')
    if (!ITEM_CATALOG[itemId].stackable && quantity !== 1) throw new EconomyError('INVALID_QUANTITY', 'Equipment quantity must be one.')
    const result = await this.repository.economyTransact(playerId, `market:buy:${playerId}:${operationId}`, 'CREATE_BUY_ORDER', (state) => {
      const player = this.player(state, playerId)
      const reserve = quantity * pricePerUnit
      const fee = Math.ceil(reserve * MARKET_FEES.buyOrder)
      if (player.coins < reserve + fee) throw new EconomyError('INSUFFICIENT_AVAILABLE_COINS', 'Not enough available coins.')
      player.coins -= reserve + fee; player.reservedCoins += reserve
      const createdAt = this.now()
      const order: MarketOrder = {
        id: randomUUID(), playerId, itemId, side: 'BUY', pricePerUnit, originalQuantity: quantity,
        remainingQuantity: quantity, reservedCoins: reserve, status: 'OPEN', createdAt, updatedAt: createdAt,
      }
      state.marketOrders.set(order.id, order)
      this.ledger(state, player, -reserve, 'MARKET_BUY_RESERVE', order.id)
      if (fee) this.ledger(state, player, -fee, 'MARKET_BUY_ORDER_FEE', order.id)
      this.match(state, itemId)
      return itemId
    })
    return this.market(playerId, result.applied ? result.value : null)
  }

  async cancelMarketOrder(playerId: string, orderId: string, operationId: string): Promise<MarketSnapshot> {
    const result = await this.repository.economyTransact(playerId, `market:cancel:${playerId}:${operationId}`, 'CANCEL_MARKET_ORDER', (state) => {
      const order = state.marketOrders.get(orderId)
      if (!order || order.playerId !== playerId) throw new EconomyError('ORDER_NOT_OWNED', 'Order not found.')
      if (order.status !== 'OPEN' && order.status !== 'PARTIALLY_FILLED') throw new EconomyError('ORDER_CLOSED', 'Order is already closed.')
      const player = this.player(state, playerId)
      if (order.side === 'SELL') {
        const escrow = player.reservedItems.find((entry) => entry.entryId === order.escrowItemId && entry.location === 'MARKET_ESCROW')
        if (!escrow || escrow.quantity !== order.remainingQuantity) throw new EconomyError('ESCROW_MISMATCH', 'Sell escrow is invalid.')
        this.removeReserved(player, escrow.entryId)
        this.addInventory(player, escrow.itemId, escrow.quantity, escrow.entryId)
      } else {
        player.reservedCoins -= order.reservedCoins; player.coins += order.reservedCoins
        this.ledger(state, player, order.reservedCoins, 'MARKET_BUY_RELEASE', order.id)
        order.reservedCoins = 0
      }
      order.status = 'CANCELLED'; order.updatedAt = this.now()
      return order.itemId
    })
    return this.market(playerId, result.applied ? result.value : null)
  }

  async buyNow(playerId: string, itemId: string, quantity: number, operationId: string): Promise<MarketSnapshot> {
    const book = await this.market(playerId, itemId)
    const eligible = book.sellOrders.filter((order) => order.playerId !== playerId)
    let remaining = quantity; let limit = 0
    for (const order of eligible) { const used = Math.min(remaining, order.remainingQuantity); if (used) limit = order.pricePerUnit; remaining -= used; if (!remaining) break }
    if (remaining > 0 || limit <= 0) throw new EconomyError('INSUFFICIENT_MARKET_LIQUIDITY', 'Not enough sell liquidity.')
    const snapshot = await this.createBuyOrder(playerId, itemId, quantity, limit, `buy-now:${operationId}`)
    const open = snapshot.myOrders.find((order) => order.side === 'BUY' && order.itemId === itemId && (order.status === 'OPEN' || order.status === 'PARTIALLY_FILLED'))
    return open ? this.cancelMarketOrder(playerId, open.id, `buy-now-cancel:${operationId}`) : snapshot
  }

  async sellNow(playerId: string, entryId: string, quantity: number, operationId: string): Promise<MarketSnapshot> {
    const itemId = await this.repository.economyRead((state) => this.player(state, playerId).inventory.find((entry) => entry.entryId === entryId)?.itemId)
    if (!itemId) throw new EconomyError('ITEM_NOT_AVAILABLE', 'Item must be in Inventory.')
    const book = await this.market(playerId, itemId)
    const eligible = book.buyOrders.filter((order) => order.playerId !== playerId)
    let remaining = quantity; let limit = 0
    for (const order of eligible) { const used = Math.min(remaining, order.remainingQuantity); if (used) limit = order.pricePerUnit; remaining -= used; if (!remaining) break }
    if (remaining > 0 || limit <= 0) throw new EconomyError('INSUFFICIENT_MARKET_LIQUIDITY', 'Not enough buy liquidity.')
    const snapshot = await this.createSellOrder(playerId, entryId, quantity, limit, `sell-now:${operationId}`)
    const open = snapshot.myOrders.find((order) => order.side === 'SELL' && order.itemId === itemId && (order.status === 'OPEN' || order.status === 'PARTIALLY_FILLED'))
    return open ? this.cancelMarketOrder(playerId, open.id, `sell-now-cancel:${operationId}`) : snapshot
  }

  async requestTrade(requesterId: string, receiverName: string, operationId: string): Promise<TradeSnapshot> {
    return this.tradeMutation(requesterId, `trade:request:${requesterId}:${operationId}`, 'REQUEST_TRADE', (state) => {
      this.player(state, requesterId)
      const matches = [...state.players.values()].filter((profile) => profile.name === receiverName)
      if (matches.length !== 1) throw new EconomyError(matches.length ? 'AMBIGUOUS_PLAYER_NAME' : 'PLAYER_NOT_FOUND', matches.length ? 'Player name is not unique.' : 'Online player not found.')
      const receiver = matches[0]
      if (receiver.playerId === requesterId) throw new EconomyError('SELF_TRADE', 'Cannot trade with yourself.')
      this.assertTradeAvailable(state, requesterId); this.assertTradeAvailable(state, receiver.playerId)
      const now = this.now()
      const trade: DirectTrade = {
        id: randomUUID(), requesterId, receiverId: receiver.playerId, status: 'REQUESTED', revision: 0,
        requesterConfirmedRevision: null, receiverConfirmedRevision: null, items: [], coins: {}, createdAt: now, updatedAt: now,
      }
      state.trades.set(trade.id, trade)
      return trade.id
    })
  }

  async acceptTrade(playerId: string, tradeId: string, operationId: string): Promise<TradeSnapshot> {
    return this.tradeMutation(playerId, `trade:accept:${playerId}:${operationId}`, 'ACCEPT_TRADE', (state) => {
      const trade = this.trade(state, tradeId)
      if (trade.receiverId !== playerId || trade.status !== 'REQUESTED') throw new EconomyError('TRADE_NOT_ACCEPTABLE', 'Trade request cannot be accepted.')
      this.assertTradeAvailable(state, trade.requesterId, trade.id); this.assertTradeAvailable(state, trade.receiverId, trade.id)
      trade.status = 'ACTIVE'; trade.updatedAt = this.now(); return trade.id
    })
  }

  async declineTrade(playerId: string, tradeId: string, operationId: string): Promise<TradeSnapshot> {
    return this.closeTrade(playerId, tradeId, 'DECLINED', operationId)
  }

  async updateTradeOffer(playerId: string, tradeId: string, offer: TradeOfferInput, operationId: string): Promise<TradeSnapshot> {
    return this.tradeMutation(playerId, `trade:update:${playerId}:${operationId}`, 'UPDATE_TRADE_OFFER', (state) => {
      const trade = this.trade(state, tradeId); this.assertParticipant(trade, playerId)
      if (trade.status !== 'ACTIVE') throw new EconomyError('TRADE_NOT_ACTIVE', 'Trade is not active.')
      const player = this.player(state, playerId)
      this.releaseTradeOffer(player, trade)
      const coins = Math.floor(offer.coins)
      if (coins < 0 || player.coins < coins) throw new EconomyError('INSUFFICIENT_AVAILABLE_COINS', 'Not enough available coins.')
      const seen = new Set<string>()
      for (const requested of offer.items) {
        if (seen.has(requested.entryId)) throw new EconomyError('DUPLICATE_ITEM', 'Duplicate trade item.'); seen.add(requested.entryId)
        this.positive(requested.quantity, 'quantity')
        const index = player.inventory.findIndex((entry) => entry.entryId === requested.entryId)
        if (index < 0) throw new EconomyError('ITEM_NOT_AVAILABLE', 'Trade item must be in Inventory.')
        const source = player.inventory[index]; const definition = ITEM_CATALOG[source.itemId]
        if (!definition?.stackable && requested.quantity !== 1) throw new EconomyError('INVALID_QUANTITY', 'Equipment quantity must be one.')
        if (source.quantity < requested.quantity) throw new EconomyError('NOT_ENOUGH_ITEMS', 'Not enough available items.')
        const escrowId = requested.quantity === source.quantity ? source.entryId : randomUUID()
        source.quantity -= requested.quantity; if (!source.quantity) player.inventory.splice(index, 1)
        player.reservedItems.push({ entryId: escrowId, itemId: source.itemId, quantity: requested.quantity, location: 'TRADE_ESCROW' })
        trade.items.push({ id: randomUUID(), tradeId, playerId, itemEntryId: escrowId, itemId: source.itemId, quantity: requested.quantity })
      }
      player.coins -= coins; player.reservedCoins += coins; trade.coins[playerId] = coins
      trade.revision += 1; trade.requesterConfirmedRevision = null; trade.receiverConfirmedRevision = null; trade.updatedAt = this.now()
      return trade.id
    })
  }

  async confirmTrade(playerId: string, tradeId: string, revision: number, operationId: string): Promise<TradeSnapshot> {
    return this.tradeMutation(playerId, `trade:confirm:${playerId}:${operationId}`, 'CONFIRM_TRADE', (state) => {
      const trade = this.trade(state, tradeId); this.assertParticipant(trade, playerId)
      if (trade.status !== 'ACTIVE') return trade.id
      if (revision !== trade.revision) throw new EconomyError('STALE_TRADE_REVISION', 'Trade changed — confirmation reset.')
      if (playerId === trade.requesterId) trade.requesterConfirmedRevision = revision; else trade.receiverConfirmedRevision = revision
      if (trade.requesterConfirmedRevision === revision && trade.receiverConfirmedRevision === revision) this.executeTrade(state, trade)
      trade.updatedAt = this.now(); return trade.id
    })
  }

  async cancelTrade(playerId: string, tradeId: string, operationId: string): Promise<TradeSnapshot> {
    return this.closeTrade(playerId, tradeId, 'CANCELLED', operationId)
  }

  async cancelTradesForDisconnect(playerId: string): Promise<TradeSnapshot[]> {
    const ids = await this.repository.economyRead((state) => [...state.trades.values()].filter((trade) => this.isParticipant(trade, playerId) && (trade.status === 'REQUESTED' || trade.status === 'ACTIVE')).map((trade) => trade.id))
    const cancelled: TradeSnapshot[] = []
    for (const id of ids) cancelled.push(await this.cancelTrade(playerId, id, `disconnect:${id}`))
    return cancelled
  }

  async reservePartySlot(roomId: string, applicantId: string, leaderId: string, amount: number, operationId: string): Promise<PartySlotReservation | null> {
    if (!Number.isInteger(amount) || amount < 0) throw new EconomyError('INVALID_SLOT_OFFER', 'Invalid slot offer.')
    if (!amount) return null
    const result = await this.repository.economyTransact(applicantId, `slot:reserve:${applicantId}:${operationId}`, 'PARTY_SLOT_RESERVE', (state) => {
      const player = this.player(state, applicantId)
      if (player.coins < amount) throw new EconomyError('INSUFFICIENT_AVAILABLE_COINS', 'Not enough available coins for slot offer.')
      const existing = [...state.partySlotReservations.values()].find((item) => item.roomId === roomId && item.applicantId === applicantId && item.status !== 'REFUNDED')
      if (existing) throw new EconomyError('SLOT_ALREADY_RESERVED', 'Slot offer already exists.')
      player.coins -= amount; player.reservedCoins += amount
      const now = this.now()
      const reservation: PartySlotReservation = { id: randomUUID(), roomId, applicantId, leaderId, amount, status: 'PRE_START', expiresAt: now + 60 * 60 * 1000, createdAt: now, updatedAt: now }
      state.partySlotReservations.set(reservation.id, reservation)
      this.ledger(state, player, -amount, 'PARTY_SLOT_RESERVE', reservation.id)
      return reservation
    })
    return result.applied ? result.value : this.repository.economyRead((state) => [...state.partySlotReservations.values()].find((item) => item.roomId === roomId && item.applicantId === applicantId) ?? null)
  }

  async acceptPartySlot(roomId: string, applicantId: string, leaderId: string, operationId: string): Promise<void> {
    await this.repository.economyTransact(leaderId, `slot:accept:${leaderId}:${operationId}`, 'PARTY_SLOT_ACCEPT', (state) => {
      const reservation = [...state.partySlotReservations.values()].find((item) => item.roomId === roomId && item.applicantId === applicantId && item.status === 'PRE_START')
      if (reservation) { if (reservation.leaderId !== leaderId) throw new EconomyError('LEADER_MISMATCH', 'Invalid slot leader.'); reservation.status = 'ACCEPTED'; reservation.updatedAt = this.now() }
    })
  }

  async refundPartySlot(roomId: string, applicantId: string, operationId: string): Promise<void> {
    await this.repository.economyTransact(applicantId, `slot:refund:${applicantId}:${operationId}`, 'PARTY_SLOT_REFUND', (state) => {
      const reservation = [...state.partySlotReservations.values()].find((item) => item.roomId === roomId && item.applicantId === applicantId && (item.status === 'PRE_START' || item.status === 'ACCEPTED'))
      if (!reservation) return
      const player = this.player(state, applicantId)
      if (player.reservedCoins < reservation.amount) throw new EconomyError('RESERVATION_MISMATCH', 'Slot reservation is invalid.')
      player.reservedCoins -= reservation.amount; player.coins += reservation.amount
      reservation.status = 'REFUNDED'; reservation.updatedAt = this.now()
      this.ledger(state, player, reservation.amount, 'PARTY_SLOT_REFUND', reservation.id)
    })
  }

  async settlePartySlots(roomId: string, leaderId: string, memberIds: string[], operationId: string): Promise<void> {
    await this.repository.economyTransact(leaderId, `slot:settle:${roomId}:${operationId}`, 'PARTY_SLOT_PAYMENT', (state) => {
      const reservations = [...state.partySlotReservations.values()].filter((item) => item.roomId === roomId && item.status === 'ACCEPTED' && memberIds.includes(item.applicantId))
      const leader = this.player(state, leaderId)
      for (const reservation of reservations) {
        const applicant = this.player(state, reservation.applicantId)
        if (reservation.leaderId !== leaderId || applicant.reservedCoins < reservation.amount) throw new EconomyError('SLOT_SETTLEMENT_FAILED', 'Paid slot settlement failed.')
      }
      for (const reservation of reservations) {
        const applicant = this.player(state, reservation.applicantId)
        applicant.reservedCoins -= reservation.amount; leader.coins += reservation.amount
        reservation.status = 'SETTLED'; reservation.updatedAt = this.now()
        this.ledger(state, applicant, 0, 'PARTY_SLOT_PAYMENT', reservation.id)
        this.ledger(state, leader, reservation.amount, 'PARTY_SLOT_PAYMENT', reservation.id)
      }
    })
  }

  async cleanupOrphanedPartySlots(): Promise<number> {
    const result = await this.repository.economyTransact('system', `slot:cleanup:${randomUUID()}`, 'PARTY_SLOT_CLEANUP', (state) => {
      let count = 0
      for (const reservation of state.partySlotReservations.values()) {
        if (reservation.status !== 'PRE_START' && reservation.status !== 'ACCEPTED') continue
        const player = this.player(state, reservation.applicantId)
        if (player.reservedCoins < reservation.amount) throw new EconomyError('RESERVATION_MISMATCH', 'Orphaned slot reservation is invalid.')
        player.reservedCoins -= reservation.amount; player.coins += reservation.amount
        reservation.status = 'REFUNDED'; reservation.updatedAt = this.now(); count += 1
        this.ledger(state, player, reservation.amount, 'PARTY_SLOT_REFUND', reservation.id)
      }
      return count
    })
    return result.value ?? 0
  }

  async cleanupOrphanedTrades(): Promise<number> {
    const result = await this.repository.economyTransact('system', `trade:cleanup:${randomUUID()}`, 'TRADE_CLEANUP', (state) => {
      let count = 0
      for (const trade of state.trades.values()) {
        if (trade.status !== 'REQUESTED' && trade.status !== 'ACTIVE') continue
        this.releaseTradeOffer(this.player(state, trade.requesterId), trade)
        this.releaseTradeOffer(this.player(state, trade.receiverId), trade)
        trade.status = 'CANCELLED'; trade.updatedAt = this.now(); count += 1
      }
      return count
    })
    return result.value ?? 0
  }

  async partySlotOffer(roomId: string, applicantId: string): Promise<number> {
    return this.repository.economyRead((state) => [...state.partySlotReservations.values()].find((item) => item.roomId === roomId && item.applicantId === applicantId && item.status !== 'REFUNDED')?.amount ?? 0)
  }

  private match(state: EconomyState, itemId: string): void {
    while (true) {
      const buys = this.openOrders(state, itemId, 'BUY').sort((a, b) => b.pricePerUnit - a.pricePerUnit || a.createdAt - b.createdAt || a.id.localeCompare(b.id))
      const sells = this.openOrders(state, itemId, 'SELL').sort((a, b) => a.pricePerUnit - b.pricePerUnit || a.createdAt - b.createdAt || a.id.localeCompare(b.id))
      let pair: [MarketOrder, MarketOrder] | null = null
      for (const buy of buys) { const sell = sells.find((candidate) => candidate.playerId !== buy.playerId && buy.pricePerUnit >= candidate.pricePerUnit); if (sell) { pair = [buy, sell]; break } }
      if (!pair) return
      const [buy, sell] = pair
      const quantity = Math.min(buy.remainingQuantity, sell.remainingQuantity)
      const unitPrice = buy.createdAt < sell.createdAt || (buy.createdAt === sell.createdAt && buy.id < sell.id) ? buy.pricePerUnit : sell.pricePerUnit
      this.settleFill(state, buy, sell, quantity, unitPrice)
    }
  }

  private settleFill(state: EconomyState, buy: MarketOrder, sell: MarketOrder, quantity: number, unitPrice: number): void {
    const buyer = this.player(state, buy.playerId); const seller = this.player(state, sell.playerId)
    const escrow = seller.reservedItems.find((entry) => entry.entryId === sell.escrowItemId && entry.location === 'MARKET_ESCROW')
    if (!escrow || escrow.quantity < quantity) throw new EconomyError('ESCROW_MISMATCH', 'Market escrow is invalid.')
    const reservedRelease = buy.pricePerUnit * quantity; const gross = unitPrice * quantity
    if (buy.reservedCoins < reservedRelease || buyer.reservedCoins < reservedRelease) throw new EconomyError('RESERVATION_MISMATCH', 'Buy reservation is invalid.')
    buy.reservedCoins -= reservedRelease; buyer.reservedCoins -= reservedRelease
    const refund = reservedRelease - gross; if (refund) { buyer.coins += refund; this.ledger(state, buyer, refund, 'MARKET_BUY_RELEASE', `${buy.id}:${buy.originalQuantity - buy.remainingQuantity}`) }
    const fee = Math.ceil(gross * MARKET_FEES.transaction); seller.coins += gross
    this.ledger(state, buyer, 0, 'MARKET_BUY', `${buy.id}:${sell.id}:${buy.remainingQuantity}`)
    this.ledger(state, seller, gross, 'MARKET_SELL', `${buy.id}:${sell.id}:${sell.remainingQuantity}`)
    if (fee) { seller.coins -= fee; this.ledger(state, seller, -fee, 'MARKET_TRANSACTION_FEE', `${buy.id}:${sell.id}:${sell.remainingQuantity}`) }
    escrow.quantity -= quantity
    const definition = ITEM_CATALOG[escrow.itemId]
    if (!escrow.quantity) this.removeReserved(seller, escrow.entryId)
    this.addInventory(buyer, escrow.itemId, quantity, !definition?.stackable && !escrow.quantity ? escrow.entryId : undefined)
    buy.remainingQuantity -= quantity; sell.remainingQuantity -= quantity
    this.updateOrderStatus(buy); this.updateOrderStatus(sell)
    const fill: MarketFill = { id: randomUUID(), itemId: buy.itemId, buyOrderId: buy.id, sellOrderId: sell.id, buyerId: buyer.playerId, sellerId: seller.playerId, unitPrice, quantity, createdAt: this.now() }
    state.marketFills.push(fill)
  }

  private executeTrade(state: EconomyState, trade: DirectTrade): void {
    const a = this.player(state, trade.requesterId); const b = this.player(state, trade.receiverId)
    for (const offer of trade.items) {
      const owner = this.player(state, offer.playerId)
      const entry = owner.reservedItems.find((item) => item.entryId === offer.itemEntryId && item.location === 'TRADE_ESCROW')
      if (!entry || entry.quantity !== offer.quantity) throw new EconomyError('TRADE_ITEM_MISSING', 'Reserved trade item is missing.')
    }
    const aCoins = trade.coins[a.playerId] ?? 0; const bCoins = trade.coins[b.playerId] ?? 0
    if (a.reservedCoins < aCoins || b.reservedCoins < bCoins) throw new EconomyError('TRADE_COIN_MISMATCH', 'Reserved trade coins are missing.')
    for (const offer of trade.items) {
      const owner = offer.playerId === a.playerId ? a : b; const receiver = owner === a ? b : a
      const entry = owner.reservedItems.find((item) => item.entryId === offer.itemEntryId)!
      this.removeReserved(owner, entry.entryId); this.addInventory(receiver, entry.itemId, entry.quantity, ITEM_CATALOG[entry.itemId]?.stackable ? undefined : entry.entryId)
    }
    a.reservedCoins -= aCoins; b.reservedCoins -= bCoins; a.coins += bCoins; b.coins += aCoins
    this.ledger(state, a, bCoins - aCoins, 'DIRECT_TRADE', trade.id); this.ledger(state, b, aCoins - bCoins, 'DIRECT_TRADE', trade.id)
    trade.items = []; trade.coins = {}; trade.status = 'COMPLETED'
  }

  private async closeTrade(playerId: string, tradeId: string, status: 'CANCELLED' | 'DECLINED', operationId: string): Promise<TradeSnapshot> {
    return this.tradeMutation(playerId, `trade:close:${playerId}:${operationId}`, status, (state) => {
      const trade = this.trade(state, tradeId); this.assertParticipant(trade, playerId)
      if (trade.status === 'COMPLETED') return trade.id
      for (const id of [trade.requesterId, trade.receiverId]) this.releaseTradeOffer(this.player(state, id), trade)
      trade.status = status; trade.requesterConfirmedRevision = null; trade.receiverConfirmedRevision = null; trade.updatedAt = this.now(); return trade.id
    })
  }

  private async tradeMutation(playerId: string, key: string, type: string, mutate: (state: EconomyState) => string): Promise<TradeSnapshot> {
    const result = await this.repository.economyTransact(playerId, key, type, mutate)
    const tradeId = result.applied ? result.value : await this.repository.economyRead((state) => [...state.trades.values()].find((trade) => this.isParticipant(trade, playerId) && (trade.status === 'REQUESTED' || trade.status === 'ACTIVE' || trade.status === 'COMPLETED'))?.id)
    if (!tradeId) throw new EconomyError('TRADE_NOT_FOUND', 'Trade not found.')
    return this.repository.economyRead((state) => this.tradeSnapshot(state, this.trade(state, tradeId)))
  }

  private releaseTradeOffer(player: StoredPlayerProfile, trade: DirectTrade): void {
    for (const offer of trade.items.filter((item) => item.playerId === player.playerId)) {
      const entry = player.reservedItems.find((item) => item.entryId === offer.itemEntryId && item.location === 'TRADE_ESCROW')
      if (entry) { this.removeReserved(player, entry.entryId); this.addInventory(player, entry.itemId, entry.quantity, entry.entryId) }
    }
    trade.items = trade.items.filter((item) => item.playerId !== player.playerId)
    const coins = trade.coins[player.playerId] ?? 0
    if (coins) {
      if (player.reservedCoins < coins) throw new EconomyError('TRADE_COIN_MISMATCH', 'Reserved trade coins are missing.')
      player.reservedCoins -= coins; player.coins += coins
    }
    delete trade.coins[player.playerId]
  }

  private marketSnapshot(state: EconomyState, playerId: string, selectedItemId: string | null): MarketSnapshot {
    this.player(state, playerId)
    const active = [...state.marketOrders.values()].filter((order) => order.status === 'OPEN' || order.status === 'PARTIALLY_FILLED')
    const ids = new Set([...Object.keys(ITEM_CATALOG), ...active.map((order) => order.itemId)])
    const items = [...ids].map((itemId) => {
      const definition = ITEM_CATALOG[itemId]; const sells = active.filter((order) => order.itemId === itemId && order.side === 'SELL'); const buys = active.filter((order) => order.itemId === itemId && order.side === 'BUY')
      return { itemId, name: definition?.name ?? itemId, category: definition?.category ?? 'resource' as const, icon: definition?.icon ?? '·', lowestSell: sells.length ? Math.min(...sells.map((order) => order.pricePerUnit)) : null, highestBuy: buys.length ? Math.max(...buys.map((order) => order.pricePerUnit)) : null, sellQuantity: sells.reduce((sum, order) => sum + order.remainingQuantity, 0), buyQuantity: buys.reduce((sum, order) => sum + order.remainingQuantity, 0) }
    }).sort((a, b) => a.name.localeCompare(b.name))
    const selected = selectedItemId && ITEM_CATALOG[selectedItemId] ? selectedItemId : items[0]?.itemId ?? null
    const playerName = (id: string) => state.players.get(id)?.name ?? 'Unknown'
    const sells = selected ? this.openOrders(state, selected, 'SELL').sort((a, b) => a.pricePerUnit - b.pricePerUnit || a.createdAt - b.createdAt) : []
    const buys = selected ? this.openOrders(state, selected, 'BUY').sort((a, b) => b.pricePerUnit - a.pricePerUnit || a.createdAt - b.createdAt) : []
    return { items, selectedItemId: selected, sellOrders: sells.map((order) => ({ ...order, playerName: playerName(order.playerId) })), buyOrders: buys.map((order) => ({ ...order, playerName: playerName(order.playerId) })), recentFills: state.marketFills.filter((fill) => !selected || fill.itemId === selected).sort((a, b) => b.createdAt - a.createdAt).slice(0, 20), myOrders: [...state.marketOrders.values()].filter((order) => order.playerId === playerId).sort((a, b) => b.createdAt - a.createdAt).map((order) => ({ ...order })) }
  }

  private tradeSnapshot(state: EconomyState, trade: DirectTrade): TradeSnapshot {
    const offers: TradeSnapshot['offers'] = {}
    for (const id of [trade.requesterId, trade.receiverId]) offers[id] = { items: trade.items.filter((item) => item.playerId === id).map((item) => ({ entryId: item.itemEntryId, itemId: item.itemId, quantity: item.quantity })), coins: trade.coins[id] ?? 0 }
    return { id: trade.id, requesterId: trade.requesterId, receiverId: trade.receiverId, requesterName: this.player(state, trade.requesterId).name, receiverName: this.player(state, trade.receiverId).name, status: trade.status, revision: trade.revision, requesterConfirmed: trade.requesterConfirmedRevision === trade.revision, receiverConfirmed: trade.receiverConfirmedRevision === trade.revision, offers, updatedAt: trade.updatedAt }
  }

  private assertTradeAvailable(state: EconomyState, playerId: string, exceptTradeId?: string): void {
    if (!this.online.has(playerId)) throw new EconomyError('PLAYER_OFFLINE', 'Both players must be online.')
    if (this.combatLocked.has(playerId)) throw new EconomyError('EXPEDITION_LOCKED', 'Trade is unavailable during combat.')
    if ([...state.trades.values()].some((trade) => trade.id !== exceptTradeId && this.isParticipant(trade, playerId) && (trade.status === 'REQUESTED' || trade.status === 'ACTIVE'))) throw new EconomyError('ACTIVE_TRADE_EXISTS', 'Player already has an active trade.')
  }

  private openOrders(state: EconomyState, itemId: string, side: 'BUY' | 'SELL'): MarketOrder[] { return [...state.marketOrders.values()].filter((order) => order.itemId === itemId && order.side === side && (order.status === 'OPEN' || order.status === 'PARTIALLY_FILLED')) }
  private updateOrderStatus(order: MarketOrder): void { order.status = order.remainingQuantity === 0 ? 'FILLED' : order.remainingQuantity === order.originalQuantity ? 'OPEN' : 'PARTIALLY_FILLED'; order.updatedAt = this.now() }
  private player(state: EconomyState, playerId: string): StoredPlayerProfile { const player = state.players.get(playerId); if (!player) throw new EconomyError('PLAYER_NOT_FOUND', 'Player not found.'); return player }
  private trade(state: EconomyState, id: string): DirectTrade { const trade = state.trades.get(id); if (!trade) throw new EconomyError('TRADE_NOT_FOUND', 'Trade not found.'); return trade }
  private isParticipant(trade: DirectTrade, id: string): boolean { return trade.requesterId === id || trade.receiverId === id }
  private assertParticipant(trade: DirectTrade, id: string): void { if (!this.isParticipant(trade, id)) throw new EconomyError('NOT_TRADE_PARTICIPANT', 'Not a trade participant.') }
  private positive(value: number, field: string): void { if (!Number.isSafeInteger(value) || value <= 0) throw new EconomyError('INVALID_AMOUNT', `Invalid ${field}.`) }
  private removeReserved(player: StoredPlayerProfile, entryId: string): void { const index = player.reservedItems.findIndex((entry) => entry.entryId === entryId); if (index >= 0) player.reservedItems.splice(index, 1) }
  private addInventory(player: StoredPlayerProfile, itemId: string, quantity: number, preferredId?: string): InventoryEntry { const definition = ITEM_CATALOG[itemId]; const existing = definition?.stackable ? player.inventory.find((entry) => entry.itemId === itemId) : undefined; if (existing) { existing.quantity += quantity; return existing } const entry = { entryId: preferredId ?? randomUUID(), itemId, quantity }; player.inventory.push(entry); return entry }
  private ledger(state: EconomyState, player: StoredPlayerProfile, amount: number, reason: LedgerReason, referenceId: string): void { const record: CoinLedgerRecord = { id: randomUUID(), playerId: player.playerId, amount, reason, referenceId, resultingBalance: player.coins, createdAt: new Date(this.now()) }; state.ledger.push(record) }
}
