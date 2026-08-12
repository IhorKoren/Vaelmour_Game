import { describe, expect, it } from 'vitest'
import { EconomyService } from './EconomyService'
import { createMemoryDatabase, InMemoryPlayerRepository } from '../repositories/InMemoryPlayerRepository'
import { PlayerStateService } from '../players/PlayerStateService'
import { RoomManager } from '../rooms/RoomManager'

async function setup(names = ['Alice', 'Bob', 'Cara']) {
  const database = createMemoryDatabase(); const repository = new InMemoryPlayerRepository(database)
  const players = new PlayerStateService(repository); let clock = 1_000
  const economy = new EconomyService(repository, () => clock++)
  const ids: Record<string, string> = {}
  for (const name of names) { const id = name.toLowerCase(); ids[name] = id; await players.getOrCreate({ playerId: id, character: { name, classId: 'alchemist', level: 1 } }); economy.setAvailability(id, true) }
  return { database, repository, players, economy, ids }
}

async function fund(players: PlayerStateService, playerId: string, amount: number, ref = crypto.randomUUID()) { await players.awardProgression(playerId, 1, 0, amount, `fund:${ref}`) }
async function item(players: PlayerStateService, playerId: string, itemId = 'rift_essence', quantity = 1) { return players.addItemForTesting(playerId, itemId, quantity) }
async function profile(repository: InMemoryPlayerRepository, playerId: string) { return repository.economyRead((state) => state.players.get(playerId)!) }

describe('Phase 5 Market', () => {
  it('trades a Tier VI item through the generic Market path', async () => { const c = await setup(); const e = await item(c.players, 'alice', 'rift_t6_alchemist_weapon'); await c.economy.createSellOrder('alice', e.entryId, 1, 250, 't6-sell'); await fund(c.players, 'bob', 300); await c.economy.buyNow('bob', 'rift_t6_alchemist_weapon', 1, 't6-buy'); expect((await c.players.snapshot('bob')).inventory.some((entry) => entry.itemId === 'rift_t6_alchemist_weapon')).toBe(true) })
  it('create sell order reserves item', async () => { const c = await setup(); const e = await item(c.players, 'alice', 'rift_essence', 10); await c.economy.createSellOrder('alice', e.entryId, 4, 5, 'sell'); expect(await c.players.countItem('alice', 'rift_essence')).toBe(14); expect((await profile(c.repository, 'alice')).reservedItems[0].quantity).toBe(4) })
  it('cannot sell equipped item', async () => { const c = await setup(); const e = await item(c.players, 'alice', 'crafted_alchemist_weapon'); await c.players.equip('alice', e.entryId); await expect(c.economy.createSellOrder('alice', e.entryId, 1, 5, 'sell')).rejects.toThrow() })
  it('cannot sell more than owned stack', async () => { const c = await setup(); const e = await item(c.players, 'alice', 'rift_essence', 2); await expect(c.economy.createSellOrder('alice', e.entryId, 99, 5, 'sell')).rejects.toThrow() })
  it('cancel sell order returns remaining item and releases the escrow reference', async () => { const c = await setup(); const e = await item(c.players, 'alice', 'rift_essence', 4); const snap = await c.economy.createSellOrder('alice', e.entryId, 4, 5, 'sell'); const order = snap.myOrders[0]; await c.economy.cancelMarketOrder('alice', order.id, 'cancel'); expect((await profile(c.repository, 'alice')).reservedItems).toHaveLength(0); expect(await c.players.countItem('alice', 'rift_essence')).toBe(12); expect((await c.repository.economyRead((state) => state.marketOrders.get(order.id)))?.escrowItemId).toBeUndefined() })
  it('create buy order reserves coins', async () => { const c = await setup(); await fund(c.players, 'bob', 1000); await c.economy.createBuyOrder('bob', 'rift_iron', 10, 10, 'buy'); expect(await c.economy.wallet('bob')).toEqual({ coins: 999, reservedCoins: 100, availableCoins: 899 }) })
  it('buy order fee is deducted', async () => { const c = await setup(); await fund(c.players, 'bob', 100); await c.economy.createBuyOrder('bob', 'rift_iron', 10, 5, 'buy'); expect((await c.economy.wallet('bob')).coins).toBe(99); expect((await c.players.ledger('bob')).some((entry) => entry.reason === 'MARKET_BUY_ORDER_FEE' && entry.amount === -1)).toBe(true) })
  it('cancel buy order refunds reserve but not fee', async () => { const c = await setup(); await fund(c.players, 'bob', 100); const snap = await c.economy.createBuyOrder('bob', 'rift_iron', 10, 5, 'buy'); await c.economy.cancelMarketOrder('bob', snap.myOrders[0].id, 'cancel'); expect(await c.economy.wallet('bob')).toEqual({ coins: 99, reservedCoins: 0, availableCoins: 99 }) })
  it('lowest sell is matched first', async () => { const c = await setup(); await fund(c.players, 'bob', 100); const a = await item(c.players, 'alice', 'rift_iron'); const x = await item(c.players, 'cara', 'rift_iron'); await c.economy.createSellOrder('alice', a.entryId, 1, 10, 'a'); await c.economy.createSellOrder('cara', x.entryId, 1, 5, 'c'); await c.economy.createBuyOrder('bob', 'rift_iron', 1, 10, 'b'); const fills = await c.repository.economyRead((s) => s.marketFills); expect(fills[0].sellerId).toBe('cara') })
  it('highest buy is matched first', async () => { const c = await setup(); await fund(c.players, 'bob', 100); await fund(c.players, 'cara', 100); await c.economy.createBuyOrder('bob', 'rift_iron', 1, 5, 'b'); await c.economy.createBuyOrder('cara', 'rift_iron', 1, 10, 'c'); const e = await item(c.players, 'alice', 'rift_iron'); await c.economy.createSellOrder('alice', e.entryId, 1, 5, 'a'); expect((await c.repository.economyRead((s) => s.marketFills))[0].buyerId).toBe('cara') })
  it('price-time priority chooses oldest at equal price', async () => { const c = await setup(); const a = await item(c.players, 'alice', 'rift_iron'); const x = await item(c.players, 'cara', 'rift_iron'); await c.economy.createSellOrder('alice', a.entryId, 1, 5, 'old'); await c.economy.createSellOrder('cara', x.entryId, 1, 5, 'new'); await fund(c.players, 'bob', 100); await c.economy.createBuyOrder('bob', 'rift_iron', 1, 5, 'buy'); expect((await c.repository.economyRead((s) => s.marketFills))[0].sellerId).toBe('alice') })
  it('partial fill works', async () => { const c = await setup(); const e = await item(c.players, 'alice', 'rift_iron', 10); await c.economy.createSellOrder('alice', e.entryId, 10, 5, 'sell'); await fund(c.players, 'bob', 100); await c.economy.createBuyOrder('bob', 'rift_iron', 3, 5, 'buy'); const order = (await c.economy.market('alice', 'rift_iron')).myOrders[0]; expect([order.status, order.remainingQuantity]).toEqual(['PARTIALLY_FILLED', 7]) })
  it('individual equipment cannot be double-sold', async () => { const c = await setup(); const e = await item(c.players, 'alice', 'crafted_alchemist_weapon'); await c.economy.createSellOrder('alice', e.entryId, 1, 50, 'one'); await expect(c.economy.createSellOrder('alice', e.entryId, 1, 50, 'two')).rejects.toThrow() })
  it('market settlement transfers ownership', async () => { const c = await setup(); const e = await item(c.players, 'alice', 'crafted_alchemist_weapon'); await c.economy.createSellOrder('alice', e.entryId, 1, 50, 'sell'); await fund(c.players, 'bob', 100); await c.economy.createBuyOrder('bob', 'crafted_alchemist_weapon', 1, 50, 'buy'); expect((await c.players.snapshot('bob')).inventory.some((x) => x.entryId === e.entryId)).toBe(true) })
  it('seller receives coins minus configured fee', async () => { const c = await setup(); const e = await item(c.players, 'alice', 'rift_iron'); await c.economy.createSellOrder('alice', e.entryId, 1, 100, 'sell'); await fund(c.players, 'bob', 200); await c.economy.createBuyOrder('bob', 'rift_iron', 1, 100, 'buy'); expect((await c.economy.wallet('alice')).availableCoins).toBe(98) })
  it('duplicate settlement is idempotent', async () => { const c = await setup(); const e = await item(c.players, 'alice', 'rift_iron'); await c.economy.createSellOrder('alice', e.entryId, 1, 10, 'sell'); await fund(c.players, 'bob', 100); await Promise.all([c.economy.createBuyOrder('bob', 'rift_iron', 1, 10, 'same'), c.economy.createBuyOrder('bob', 'rift_iron', 1, 10, 'same')]); expect((await c.repository.economyRead((s) => s.marketFills))).toHaveLength(1) })
  it('concurrent buyers cannot buy same equipment', async () => { const c = await setup(); const e = await item(c.players, 'alice', 'crafted_alchemist_weapon'); await c.economy.createSellOrder('alice', e.entryId, 1, 50, 'sell'); await fund(c.players, 'bob', 100); await fund(c.players, 'cara', 100); await Promise.all([c.economy.createBuyOrder('bob', e.itemId, 1, 50, 'b'), c.economy.createBuyOrder('cara', e.itemId, 1, 50, 'c')]); const owners = await Promise.all(['bob', 'cara'].map(async (id) => (await c.players.snapshot(id)).inventory.some((x) => x.entryId === e.entryId))); expect(owners.filter(Boolean)).toHaveLength(1) })
  it('buy-now crosses sell book correctly', async () => { const c = await setup(); const e = await item(c.players, 'alice', 'rift_iron', 2); await c.economy.createSellOrder('alice', e.entryId, 2, 7, 'sell'); await fund(c.players, 'bob', 100); await c.economy.buyNow('bob', 'rift_iron', 2, 'now'); expect(await c.players.countItem('bob', 'rift_iron')).toBe(2) })
  it('sell-now crosses buy book correctly', async () => { const c = await setup(); await fund(c.players, 'bob', 100); await c.economy.createBuyOrder('bob', 'rift_iron', 2, 7, 'buy'); const e = await item(c.players, 'alice', 'rift_iron', 2); await c.economy.sellNow('alice', e.entryId, 2, 'now'); expect((await c.repository.economyRead((s) => s.marketFills))).toHaveLength(1) })
  it('BUY_NOW never cancels an older buy order for the same item', async () => {
    const c = await setup(); await fund(c.players, 'bob', 1_000)
    const old = await c.economy.createBuyOrder('bob', 'rift_iron', 2, 3, 'old-buy')
    const oldId = old.createdOrderId!
    const sell = await item(c.players, 'alice', 'rift_iron', 1)
    await c.economy.createSellOrder('alice', sell.entryId, 1, 7, 'liquidity')
    await c.economy.buyNow('bob', 'rift_iron', 1, 'instant-buy')
    const state = await c.repository.economyRead((s) => s)
    expect(state.marketOrders.get(oldId)?.status).toBe('OPEN')
    expect(state.marketOrders.get(oldId)?.remainingQuantity).toBe(2)
  })
  it('SELL_NOW never cancels an older sell order for the same item', async () => {
    const c = await setup(); await fund(c.players, 'bob', 1_000)
    const oldEntry = await item(c.players, 'alice', 'rift_iron', 2)
    const old = await c.economy.createSellOrder('alice', oldEntry.entryId, 1, 20, 'old-sell')
    const oldId = old.createdOrderId!
    await c.economy.createBuyOrder('bob', 'rift_iron', 1, 7, 'liquidity')
    const instantEntry = (await c.players.snapshot('alice')).inventory.find((entry) => entry.itemId === 'rift_iron')!
    await c.economy.sellNow('alice', instantEntry.entryId, 1, 'instant-sell')
    const state = await c.repository.economyRead((s) => s)
    expect(state.marketOrders.get(oldId)?.status).toBe('OPEN')
    expect(state.marketOrders.get(oldId)?.remainingQuantity).toBe(1)
  })
})

describe('Phase 8 idempotent transaction identity', () => {
  it('returns the original trade for an old retried operationId', async () => {
    const c = await setup()
    const original = await c.economy.requestTrade('alice', 'Bob', 'request-one')
    await c.economy.declineTrade('bob', original.id, 'decline-one')
    const newer = await c.economy.requestTrade('alice', 'Cara', 'request-two')
    const retried = await c.economy.requestTrade('alice', 'Bob', 'request-one')
    expect(retried.id).toBe(original.id)
    expect(retried.id).not.toBe(newer.id)
  })

  it('settles paid slots and creates the durable marker exactly once', async () => {
    const c = await setup(); await fund(c.players, 'bob', 100)
    await c.economy.reservePartySlot('atomic-room', 'bob', 'alice', 100, 'reserve')
    await c.economy.acceptPartySlot('atomic-room', 'bob', 'alice', 'accept')
    const marker = { expeditionId: crypto.randomUUID(), playSessionId: crypto.randomUUID(), roomId: 'atomic-room', riftId: 'first_rift', floor: 1, playerIds: ['alice', 'bob'] }
    expect((await c.economy.startExpedition(marker, 'alice', marker.playerIds)).applied).toBe(true)
    const retried = await c.economy.startExpedition({ ...marker, expeditionId: crypto.randomUUID(), playSessionId: crypto.randomUUID() }, 'alice', marker.playerIds)
    expect(retried.applied).toBe(false)
    expect(retried.marker.expeditionId).toBe(marker.expeditionId)
    expect(c.database.activeExpeditions).toHaveLength(1)
    expect((await c.economy.wallet('alice')).coins).toBe(100)
  })
})

describe('Phase 5 Direct Trade', () => {
  it('moves a Tier VI resource through Direct Trade', async () => { const c = await setup(); const e = await item(c.players, 'alice', 'astaroth_essence'); const t = await c.economy.requestTrade('alice', 'Bob', 't6-r'); await c.economy.acceptTrade('bob', t.id, 't6-a'); const x = await c.economy.updateTradeOffer('alice', t.id, { items: [{ entryId: e.entryId, quantity: 1 }], coins: 0 }, 't6-u'); await c.economy.confirmTrade('alice', t.id, x.revision, 't6-ca'); await c.economy.confirmTrade('bob', t.id, x.revision, 't6-cb'); expect(await c.players.countItem('bob', 'astaroth_essence')).toBe(1) })
  it('supports request and accept flow', async () => { const c = await setup(); const request = await c.economy.requestTrade('alice', 'Bob', 'r'); expect(request.status).toBe('REQUESTED'); expect((await c.economy.acceptTrade('bob', request.id, 'a')).status).toBe('ACTIVE') })
  it('rejects self trade', async () => { const c = await setup(); await expect(c.economy.requestTrade('alice', 'Alice', 'r')).rejects.toThrow() })
  it('rejects active expedition trade', async () => { const c = await setup(); c.economy.setAvailability('bob', true, true); await expect(c.economy.requestTrade('alice', 'Bob', 'r')).rejects.toThrow() })
  it('changing offer resets confirmations', async () => { const c = await setup(); const t = await c.economy.requestTrade('alice', 'Bob', 'r'); await c.economy.acceptTrade('bob', t.id, 'a'); await c.economy.confirmTrade('alice', t.id, 0, 'c'); const next = await c.economy.updateTradeOffer('bob', t.id, { items: [], coins: 0 }, 'u'); expect([next.requesterConfirmed, next.receiverConfirmed]).toEqual([false, false]) })
  it('requires both confirmations', async () => { const c = await setup(); const t = await c.economy.requestTrade('alice', 'Bob', 'r'); await c.economy.acceptTrade('bob', t.id, 'a'); expect((await c.economy.confirmTrade('alice', t.id, 0, 'c')).status).toBe('ACTIVE') })
  it('rejects stale revision confirmation', async () => { const c = await setup(); const t = await c.economy.requestTrade('alice', 'Bob', 'r'); await c.economy.acceptTrade('bob', t.id, 'a'); await c.economy.updateTradeOffer('alice', t.id, { items: [], coins: 0 }, 'u'); await expect(c.economy.confirmTrade('bob', t.id, 0, 'c')).rejects.toThrow() })
  it('atomically swaps items', async () => { const c = await setup(); const a = await item(c.players, 'alice', 'rift_iron'); const b = await item(c.players, 'bob', 'rift_crystal'); const t = await c.economy.requestTrade('alice', 'Bob', 'r'); await c.economy.acceptTrade('bob', t.id, 'a'); await c.economy.updateTradeOffer('alice', t.id, { items: [{ entryId: a.entryId, quantity: 1 }], coins: 0 }, 'ua'); const x = await c.economy.updateTradeOffer('bob', t.id, { items: [{ entryId: b.entryId, quantity: 1 }], coins: 0 }, 'ub'); await c.economy.confirmTrade('alice', t.id, x.revision, 'ca'); await c.economy.confirmTrade('bob', t.id, x.revision, 'cb'); expect(await c.players.countItem('alice', 'rift_crystal')).toBe(1); expect(await c.players.countItem('bob', 'rift_iron')).toBe(1) })
  it('atomically swaps coins', async () => { const c = await setup(); await fund(c.players, 'alice', 50); await fund(c.players, 'bob', 30); const t = await c.economy.requestTrade('alice', 'Bob', 'r'); await c.economy.acceptTrade('bob', t.id, 'a'); await c.economy.updateTradeOffer('alice', t.id, { items: [], coins: 20 }, 'ua'); const x = await c.economy.updateTradeOffer('bob', t.id, { items: [], coins: 5 }, 'ub'); await c.economy.confirmTrade('alice', t.id, x.revision, 'ca'); await c.economy.confirmTrade('bob', t.id, x.revision, 'cb'); expect((await c.economy.wallet('alice')).coins).toBe(35); expect((await c.economy.wallet('bob')).coins).toBe(45) })
  it('insufficient coins rolls back offer', async () => { const c = await setup(); const t = await c.economy.requestTrade('alice', 'Bob', 'r'); await c.economy.acceptTrade('bob', t.id, 'a'); await expect(c.economy.updateTradeOffer('alice', t.id, { items: [], coins: 1 }, 'u')).rejects.toThrow(); expect((await c.economy.wallet('alice')).reservedCoins).toBe(0) })
  it('missing item rolls back offer', async () => { const c = await setup(); const t = await c.economy.requestTrade('alice', 'Bob', 'r'); await c.economy.acceptTrade('bob', t.id, 'a'); await expect(c.economy.updateTradeOffer('alice', t.id, { items: [{ entryId: 'missing', quantity: 1 }], coins: 0 }, 'u')).rejects.toThrow(); expect((await profile(c.repository, 'alice')).reservedItems).toHaveLength(0) })
  it('disconnect cancels trade and releases escrow', async () => { const c = await setup(); const e = await item(c.players, 'alice', 'rift_iron'); const t = await c.economy.requestTrade('alice', 'Bob', 'r'); await c.economy.acceptTrade('bob', t.id, 'a'); await c.economy.updateTradeOffer('alice', t.id, { items: [{ entryId: e.entryId, quantity: 1 }], coins: 0 }, 'u'); await c.economy.cancelTradesForDisconnect('alice'); expect((await c.repository.economyRead((s) => s.trades.get(t.id)?.status))).toBe('CANCELLED'); expect((await profile(c.repository, 'alice')).reservedItems).toHaveLength(0) })
  it('trade item cannot simultaneously enter market', async () => { const c = await setup(); const e = await item(c.players, 'alice', 'rift_iron'); const t = await c.economy.requestTrade('alice', 'Bob', 'r'); await c.economy.acceptTrade('bob', t.id, 'a'); await c.economy.updateTradeOffer('alice', t.id, { items: [{ entryId: e.entryId, quantity: 1 }], coins: 0 }, 'u'); await expect(c.economy.createSellOrder('alice', e.entryId, 1, 5, 'sell')).rejects.toThrow() })
  it('duplicate final confirm cannot execute twice', async () => { const c = await setup(); await fund(c.players, 'alice', 20); const t = await c.economy.requestTrade('alice', 'Bob', 'r'); await c.economy.acceptTrade('bob', t.id, 'a'); const x = await c.economy.updateTradeOffer('alice', t.id, { items: [], coins: 10 }, 'u'); await c.economy.confirmTrade('alice', t.id, x.revision, 'ca'); await Promise.all([c.economy.confirmTrade('bob', t.id, x.revision, 'same'), c.economy.confirmTrade('bob', t.id, x.revision, 'same')]); expect((await c.economy.wallet('bob')).coins).toBe(10) })
})

describe('Phase 5 Paid Party Slot', () => {
  it('application can reserve coins', async () => { const c = await setup(); await fund(c.players, 'bob', 200); await c.economy.reservePartySlot('room', 'bob', 'alice', 120, 'r'); expect(await c.economy.wallet('bob')).toEqual({ coins: 200, reservedCoins: 120, availableCoins: 80 }) })
  it('insufficient available coins is rejected', async () => { const c = await setup(); await fund(c.players, 'bob', 50); await expect(c.economy.reservePartySlot('room', 'bob', 'alice', 120, 'r')).rejects.toThrow() })
  it('reject refunds reservation', async () => { const c = await setup(); await fund(c.players, 'bob', 120); await c.economy.reservePartySlot('room', 'bob', 'alice', 120, 'r'); await c.economy.refundPartySlot('room', 'bob', 'reject'); expect((await c.economy.wallet('bob')).availableCoins).toBe(120) })
  it('cancel application refunds reservation', async () => { const c = await setup(); await fund(c.players, 'bob', 120); await c.economy.reservePartySlot('room', 'bob', 'alice', 120, 'r'); await c.economy.refundPartySlot('room', 'bob', 'cancel'); expect((await c.economy.wallet('bob')).reservedCoins).toBe(0) })
  it('leave before start refunds reservation', async () => { const c = await setup(); await fund(c.players, 'bob', 120); await c.economy.reservePartySlot('room', 'bob', 'alice', 120, 'r'); await c.economy.acceptPartySlot('room', 'bob', 'alice', 'accept'); await c.economy.refundPartySlot('room', 'bob', 'leave'); expect((await c.economy.wallet('bob')).coins).toBe(120) })
  it('accepted applicant does not pay leader yet', async () => { const c = await setup(); await fund(c.players, 'bob', 120); await c.economy.reservePartySlot('room', 'bob', 'alice', 120, 'r'); await c.economy.acceptPartySlot('room', 'bob', 'alice', 'a'); expect((await c.economy.wallet('alice')).coins).toBe(0) })
  it('START transfers offer to leader', async () => { const c = await setup(); await fund(c.players, 'bob', 120); await c.economy.reservePartySlot('room', 'bob', 'alice', 120, 'r'); await c.economy.acceptPartySlot('room', 'bob', 'alice', 'a'); await c.economy.settlePartySlots('room', 'alice', ['alice', 'bob'], 'start'); expect((await c.economy.wallet('alice')).coins).toBe(120) })
  it('failed Rift does not refund completed payment', async () => { const c = await setup(); await fund(c.players, 'bob', 120); await c.economy.reservePartySlot('room', 'bob', 'alice', 120, 'r'); await c.economy.acceptPartySlot('room', 'bob', 'alice', 'a'); await c.economy.settlePartySlots('room', 'alice', ['alice', 'bob'], 'start'); await c.economy.cleanupOrphanedPartySlots(); expect((await c.economy.wallet('alice')).coins).toBe(120) })
  it('multiple paid members settle atomically', async () => { const c = await setup(); await fund(c.players, 'bob', 100); await fund(c.players, 'cara', 80); await c.economy.reservePartySlot('room', 'bob', 'alice', 100, 'b'); await c.economy.reservePartySlot('room', 'cara', 'alice', 80, 'c'); await c.economy.acceptPartySlot('room', 'bob', 'alice', 'ab'); await c.economy.acceptPartySlot('room', 'cara', 'alice', 'ac'); await c.economy.settlePartySlots('room', 'alice', ['alice', 'bob', 'cara'], 'start'); expect((await c.economy.wallet('alice')).coins).toBe(180) })
  it('failed one-member settlement prevents all payments', async () => { const c = await setup(); await fund(c.players, 'bob', 100); await fund(c.players, 'cara', 80); await c.economy.reservePartySlot('room', 'bob', 'alice', 100, 'b'); await c.economy.reservePartySlot('room', 'cara', 'alice', 80, 'c'); await c.economy.acceptPartySlot('room', 'bob', 'alice', 'ab'); await c.economy.acceptPartySlot('room', 'cara', 'alice', 'ac'); await c.repository.economyTransact('cara', 'corrupt', 'TEST', (s) => { s.players.get('cara')!.reservedCoins = 0 }); await expect(c.economy.settlePartySlots('room', 'alice', ['alice', 'bob', 'cara'], 'start')).rejects.toThrow(); expect((await c.economy.wallet('alice')).coins).toBe(0); expect((await c.economy.wallet('bob')).reservedCoins).toBe(100) })
  it('duplicate START does not pay twice', async () => { const c = await setup(); await fund(c.players, 'bob', 100); await c.economy.reservePartySlot('room', 'bob', 'alice', 100, 'b'); await c.economy.acceptPartySlot('room', 'bob', 'alice', 'a'); await Promise.all([c.economy.settlePartySlots('room', 'alice', ['alice', 'bob'], 'same'), c.economy.settlePartySlots('room', 'alice', ['alice', 'bob'], 'same')]); expect((await c.economy.wallet('alice')).coins).toBe(100) })
  it('server restart cleanup refunds orphaned reservations', async () => { const c = await setup(); await fund(c.players, 'bob', 100); await c.economy.reservePartySlot('room', 'bob', 'alice', 100, 'b'); const restarted = new EconomyService(new InMemoryPlayerRepository(c.database)); expect(await restarted.cleanupOrphanedPartySlots()).toBe(1); expect((await restarted.wallet('bob')).availableCoins).toBe(100) })
})

describe('Phase 5 cross-system reservations', () => {
  it('Buy Order reserve reduces available coins', async () => { const c = await setup(); await fund(c.players, 'alice', 100); await c.economy.createBuyOrder('alice', 'rift_iron', 5, 10, 'b'); expect((await c.economy.wallet('alice')).availableCoins).toBe(49) })
  it('Party Slot reserve reduces available coins', async () => { const c = await setup(); await fund(c.players, 'bob', 100); await c.economy.reservePartySlot('room', 'bob', 'alice', 60, 's'); expect((await c.economy.wallet('bob')).availableCoins).toBe(40) })
  it('Trade cannot spend reserved coins', async () => { const c = await setup(); await fund(c.players, 'alice', 100); await c.economy.createBuyOrder('alice', 'rift_iron', 5, 10, 'b'); const t = await c.economy.requestTrade('alice', 'Bob', 'r'); await c.economy.acceptTrade('bob', t.id, 'a'); await expect(c.economy.updateTradeOffer('alice', t.id, { items: [], coins: 50 }, 'u')).rejects.toThrow() })
  it('Sell Order item cannot enter Trade', async () => { const c = await setup(); const e = await item(c.players, 'alice', 'rift_iron'); await c.economy.createSellOrder('alice', e.entryId, 1, 5, 's'); const t = await c.economy.requestTrade('alice', 'Bob', 'r'); await c.economy.acceptTrade('bob', t.id, 'a'); await expect(c.economy.updateTradeOffer('alice', t.id, { items: [{ entryId: e.entryId, quantity: 1 }], coins: 0 }, 'u')).rejects.toThrow() })
  it('Trade item cannot enter Sell Order', async () => { const c = await setup(); const e = await item(c.players, 'alice', 'rift_iron'); const t = await c.economy.requestTrade('alice', 'Bob', 'r'); await c.economy.acceptTrade('bob', t.id, 'a'); await c.economy.updateTradeOffer('alice', t.id, { items: [{ entryId: e.entryId, quantity: 1 }], coins: 0 }, 'u'); await expect(c.economy.createSellOrder('alice', e.entryId, 1, 5, 's')).rejects.toThrow() })
})

describe('Phase 5 paid slot RoomManager integration', () => {
  async function roomSetup() {
    const c = await setup(['Leader', 'Blacksmith'])
    const manager = new RoomManager({ playerStates: c.players, economy: c.economy, autoTimers: false })
    await manager.connect({ playerId: 'leader', character: { name: 'Leader', classId: 'warrior', level: 1 } }, { connectionId: 'leader-c', send: () => undefined })
    await manager.connect({ playerId: 'blacksmith', character: { name: 'Blacksmith', classId: 'blacksmith', level: 1 } }, { connectionId: 'smith-c', send: () => undefined })
    await fund(c.players, 'blacksmith', 120)
    const room = manager.createParty('leader')!
    return { ...c, manager, room }
  }
  it('application reserves offered coins through RoomManager', async () => { const c = await roomSetup(); expect(await c.manager.applyToParty('blacksmith', c.room.id, 120, 'apply')).toBe(true); expect((await c.economy.wallet('blacksmith')).reservedCoins).toBe(120); await c.manager.dispose() })
  it('leader accept delays payment until successful START', async () => { const c = await roomSetup(); await c.manager.applyToParty('blacksmith', c.room.id, 120, 'apply'); await c.manager.reviewApplication('leader', 'blacksmith', true); expect((await c.economy.wallet('leader')).coins).toBe(0); c.manager.setReady('leader', true); c.manager.setReady('blacksmith', true); expect(await c.manager.startExpedition('leader')).toBe(true); expect((await c.economy.wallet('leader')).coins).toBe(120); await c.manager.dispose() })
  it('reject and cancel paths refund before START', async () => { const c = await roomSetup(); await c.manager.applyToParty('blacksmith', c.room.id, 120, 'apply'); await c.manager.reviewApplication('leader', 'blacksmith', false); expect((await c.economy.wallet('blacksmith')).availableCoins).toBe(120); await c.manager.dispose() })
})
