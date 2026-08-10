import { describe, expect, it } from 'vitest'
import { recipeItemId } from '../../shared/game-data/catalog'
import { createMemoryDatabase, InMemoryPlayerRepository } from '../repositories/InMemoryPlayerRepository'
import { PlayerStateService } from '../players/PlayerStateService'

const SECRET = 'persistence-test-secret'

async function createPlayer(classId: 'warrior' | 'alchemist' | 'jeweler' = 'alchemist') {
  const database = createMemoryDatabase()
  const service = new PlayerStateService(new InMemoryPlayerRepository(database, false), SECRET)
  const token = `token-${crypto.randomUUID()}`
  const authenticated = await service.authenticate({ devToken: token, character: { name: 'Persist', classId, level: 1 } })
  return { database, service, token, playerId: authenticated.character.id, accountId: authenticated.accountId }
}

function restart(database: ReturnType<typeof createMemoryDatabase>) {
  return new PlayerStateService(new InMemoryPlayerRepository(database, false), SECRET)
}

describe('Phase 4 persistent player data', () => {
  it('player survives service restart', async () => {
    const context = await createPlayer()
    const loaded = await restart(context.database).authenticate({ devToken: context.token })
    expect(loaded.character.id).toBe(context.playerId)
    expect(loaded.accountId).toBe(context.accountId)
  })

  it('inventory survives reload', async () => {
    const context = await createPlayer()
    await context.service.addItemForTesting(context.playerId, 'rift_essence', 3)
    expect(await restart(context.database).countItem(context.playerId, 'rift_essence')).toBe(11)
  })

  it('storage survives reload', async () => {
    const context = await createPlayer()
    const potion = (await context.service.snapshot(context.playerId)).inventory.find((entry) => entry.itemId === 'healing_potion')!
    await context.service.move(context.playerId, potion.entryId, true, 2, 'store-reload')
    expect((await restart(context.database).snapshot(context.playerId)).storage.find((entry) => entry.itemId === 'healing_potion')?.quantity).toBe(2)
  })

  it('equipment survives reload', async () => {
    const context = await createPlayer()
    const weapon = await context.service.addItemForTesting(context.playerId, 'crafted_alchemist_weapon')
    await context.service.equip(context.playerId, weapon.entryId, 'weapon', 'equip-reload')
    expect((await restart(context.database).snapshot(context.playerId)).equipment.weapon?.entryId).toBe(weapon.entryId)
  })

  it('learned recipes survive reload', async () => {
    const context = await createPlayer('jeweler')
    const item = await context.service.addItemForTesting(context.playerId, recipeItemId('recipe_hp_ring'))
    await context.service.learnRecipe(context.playerId, item.entryId, 'learn-reload')
    expect((await restart(context.database).snapshot(context.playerId)).learnedRecipes).toContain('recipe_hp_ring')
  })

  it('coins survive reload', async () => {
    const context = await createPlayer()
    await context.service.awardProgression(context.playerId, 1, 0, 8, 'coins-reload')
    expect((await restart(context.database).snapshot(context.playerId)).coins).toBe(8)
  })

  it('XP and level survive reload', async () => {
    const context = await createPlayer()
    await context.service.awardProgression(context.playerId, 3, 17, 0, 'xp-reload')
    const state = await restart(context.database).snapshot(context.playerId)
    expect([state.level, state.currentXP]).toEqual([3, 17])
  })

  it('starter account initialization is atomic under concurrency', async () => {
    const database = createMemoryDatabase()
    const service = restart(database)
    const identity = { devToken: 'same-token', character: { name: 'One', classId: 'warrior' as const, level: 1 } }
    const [first, second] = await Promise.all([service.authenticate(identity), service.authenticate(identity)])
    expect(first.character.id).toBe(second.character.id)
    expect(first.accountId).toBe(second.accountId)
  })

  it('duplicate initialization does not duplicate starter items', async () => {
    const context = await createPlayer()
    await Promise.all([context.service.authenticate({ devToken: context.token }), context.service.authenticate({ devToken: context.token })])
    expect(await context.service.countItem(context.playerId, 'healing_potion')).toBe(5)
  })

  it('craft transaction rolls back when validation fails', async () => {
    const context = await createPlayer()
    const essence = (await context.service.snapshot(context.playerId)).inventory.find((entry) => entry.itemId === 'rift_essence')!
    await context.service.move(context.playerId, essence.entryId, true, undefined, 'remove-essence')
    const before = await context.service.snapshot(context.playerId)
    await expect(context.service.craft(context.playerId, 'recipe_healing_potion', 'failed-craft')).rejects.toThrow()
    expect(await context.service.snapshot(context.playerId)).toEqual(before)
  })

  it('concurrent craft cannot overspend resources', async () => {
    const context = await createPlayer()
    const state = await context.service.snapshot(context.playerId)
    const essence = state.inventory.find((entry) => entry.itemId === 'rift_essence')!
    const blood = state.inventory.find((entry) => entry.itemId === 'mutated_blood')!
    await context.service.move(context.playerId, essence.entryId, true, 4, 'limit-essence')
    await context.service.move(context.playerId, blood.entryId, true, 6, 'limit-blood')
    const results = await Promise.allSettled([
      context.service.craft(context.playerId, 'recipe_alchemist_weapon', 'craft-a'),
      context.service.craft(context.playerId, 'recipe_alchemist_weapon', 'craft-b'),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(await context.service.countItem(context.playerId, 'crafted_alchemist_weapon')).toBe(1)
  })

  it('learn recipe transaction rolls back on wrong profession', async () => {
    const context = await createPlayer('alchemist')
    const item = await context.service.addItemForTesting(context.playerId, recipeItemId('recipe_hp_ring'))
    await expect(context.service.learnRecipe(context.playerId, item.entryId, 'wrong-profession')).rejects.toThrow()
    expect((await context.service.snapshot(context.playerId)).inventory.some((entry) => entry.entryId === item.entryId)).toBe(true)
  })

  it('duplicate learned recipe is prevented', async () => {
    const context = await createPlayer('jeweler')
    const first = await context.service.addItemForTesting(context.playerId, recipeItemId('recipe_hp_ring'))
    const second = await context.service.addItemForTesting(context.playerId, recipeItemId('recipe_hp_ring'))
    await context.service.learnRecipe(context.playerId, first.entryId, 'learn-first')
    await expect(context.service.learnRecipe(context.playerId, second.entryId, 'learn-second')).rejects.toThrow()
    expect((await context.service.snapshot(context.playerId)).learnedRecipes.filter((id) => id === 'recipe_hp_ring')).toHaveLength(1)
  })

  it('inventory to storage move is atomic and quantity-safe', async () => {
    const context = await createPlayer()
    const potion = (await context.service.snapshot(context.playerId)).inventory.find((entry) => entry.itemId === 'healing_potion')!
    const state = await context.service.move(context.playerId, potion.entryId, true, 3, 'atomic-move')
    const total = [...state.inventory, ...state.storage].filter((entry) => entry.itemId === 'healing_potion').reduce((sum, entry) => sum + entry.quantity, 0)
    expect(total).toBe(5)
  })

  it('equip ownership and class validation remain enforced after restart', async () => {
    const context = await createPlayer('alchemist')
    const item = await context.service.addItemForTesting(context.playerId, 'forged_warrior_weapon')
    await expect(restart(context.database).equip(context.playerId, item.entryId, 'weapon', 'wrong-class')).rejects.toThrow()
  })

  it('coin reward writes a ledger entry', async () => {
    const context = await createPlayer()
    await context.service.awardProgression(context.playerId, 1, 4, 8, 'encounter-ledger')
    expect(await context.service.ledger(context.playerId)).toMatchObject([{ amount: 8, resultingBalance: 8, reason: 'RIFT_REWARD', referenceId: 'encounter-ledger' }])
  })

  it('duplicate encounter reward does not duplicate coins', async () => {
    const context = await createPlayer()
    await Promise.all([
      context.service.awardProgression(context.playerId, 1, 4, 8, 'same-encounter'),
      context.service.awardProgression(context.playerId, 1, 4, 8, 'same-encounter'),
    ])
    expect((await context.service.snapshot(context.playerId)).coins).toBe(8)
    expect(await context.service.ledger(context.playerId)).toHaveLength(1)
  })

  it('duplicate XP reward does not duplicate XP', async () => {
    const context = await createPlayer()
    const results = await Promise.all([
      context.service.awardProgression(context.playerId, 2, 7, 0, 'same-xp'),
      context.service.awardProgression(context.playerId, 2, 7, 0, 'same-xp'),
    ])
    expect(results.filter(Boolean)).toHaveLength(1)
    expect((await context.service.snapshot(context.playerId)).currentXP).toBe(7)
  })

  it('potion cannot be consumed twice concurrently', async () => {
    const context = await createPlayer()
    const potion = (await context.service.snapshot(context.playerId)).inventory.find((entry) => entry.itemId === 'healing_potion')!
    await context.service.move(context.playerId, potion.entryId, true, 4, 'leave-one')
    const results = await Promise.all([
      context.service.consumeItem(context.playerId, 'healing_potion', 1, 'potion-a'),
      context.service.consumeItem(context.playerId, 'healing_potion', 1, 'potion-b'),
    ])
    expect(results.filter(Boolean)).toHaveLength(1)
    expect(await context.service.countItem(context.playerId, 'healing_potion')).toBe(0)
  })

  it('successful extraction persists exactly once', async () => {
    const context = await createPlayer()
    const first = await context.service.commitLoot(context.playerId, { resources: { rift_essence: 4 }, recipeIds: [] }, 1, 'expedition-success')
    expect(first.applied).toBe(true)
    expect(await restart(context.database).countItem(context.playerId, 'rift_essence')).toBe(12)
  })

  it('duplicate extraction does not duplicate loot', async () => {
    const context = await createPlayer()
    const loot = { resources: { rift_essence: 4 }, recipeIds: [] }
    const results = await Promise.all([
      context.service.commitLoot(context.playerId, loot, 1, 'same-extraction'),
      context.service.commitLoot(context.playerId, loot, 1, 'same-extraction'),
    ])
    expect(results.filter((result) => result.applied)).toHaveLength(1)
    expect(await context.service.countItem(context.playerId, 'rift_essence')).toBe(12)
  })

  it('failed extraction persists configured retained amount', async () => {
    const context = await createPlayer()
    await context.service.commitLoot(context.playerId, { resources: { rift_essence: 5 }, recipeIds: [] }, 0.5, 'failed-extraction')
    expect(await context.service.countItem(context.playerId, 'rift_essence')).toBe(10)
  })

  it('reconnect does not duplicate economy state', async () => {
    const context = await createPlayer()
    await context.service.commitLoot(context.playerId, { resources: { rift_essence: 2 }, recipeIds: [] }, 1, 'before-reconnect')
    const next = restart(context.database)
    await Promise.all([next.authenticate({ devToken: context.token }), next.authenticate({ devToken: context.token })])
    expect(await next.countItem(context.playerId, 'rift_essence')).toBe(10)
  })
})
