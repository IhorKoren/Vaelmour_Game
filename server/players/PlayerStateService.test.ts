import { describe, expect, it } from 'vitest'
import { ITEM_CATALOG, recipeItemId } from '../../shared/game-data/catalog'
import { CLASSES } from '../../src/data/config/balance'
import { EconomyError, PlayerStateService } from './PlayerStateService'

async function create(service: PlayerStateService, id: string, classId: 'warrior' | 'ranger' | 'blacksmith' | 'alchemist' | 'jeweler' = 'warrior', level = 1) {
  await service.getOrCreate({ playerId: id, character: { name: id, classId, level } })
}

describe('authoritative items, equipment and crafting', () => {
  it('enforces normalized unique names under concurrent creation', async () => {
    const service = new PlayerStateService()
    const results = await Promise.allSettled([
      service.getOrCreate({ playerId: 'one', character: { name: ' Éowyn ', classId: 'warrior', level: 1 } }),
      service.getOrCreate({ playerId: 'two', character: { name: 'E\u0301OWYN', classId: 'ranger', level: 1 } }),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
  })
  it('wrong class cannot equip item', async () => {
    const service = new PlayerStateService(); await create(service, 'warrior')
    const item = await service.addItemForTesting('warrior', 'forged_ranger_weapon')
    await expect(service.equip('warrior', item.entryId)).rejects.toBeInstanceOf(EconomyError)
  })

  it('correct class can equip item', async () => {
    const service = new PlayerStateService(); await create(service, 'warrior')
    const item = await service.addItemForTesting('warrior', 'forged_warrior_weapon')
    const state = await service.equip('warrior', item.entryId)
    expect(state.equipment.weapon?.itemId).toBe('forged_warrior_weapon')
  })

  it('equipment changes final Attack and HP', async () => {
    const service = new PlayerStateService(); await create(service, 'warrior')
    const before = await service.calculateStats('warrior')
    const weapon = await service.addItemForTesting('warrior', 'forged_warrior_weapon')
    const chest = await service.addItemForTesting('warrior', 'forged_warrior_chest')
    await service.equip('warrior', weapon.entryId); await service.equip('warrior', chest.entryId)
    const after = await service.calculateStats('warrior')
    expect(after.attack - before.attack).toBe(6)
    expect(after.maxHP - before.maxHP).toBe(30)
  })

  it('level bonus stacks with equipment bonus', async () => {
    const service = new PlayerStateService(); await create(service, 'warrior', 'warrior', 3)
    const ring = await service.addItemForTesting('warrior', 'attack_ring')
    await service.equip('warrior', ring.entryId)
    expect((await service.calculateStats('warrior')).attack).toBe(CLASSES.warrior.attack + 2 + 2 + 4)
  })

  it('crafting consumes exact resources', async () => {
    const service = new PlayerStateService(); await create(service, 'alchemist', 'alchemist')
    const essence = await service.countItem('alchemist', 'rift_essence')
    const blood = await service.countItem('alchemist', 'mutated_blood')
    await service.craft('alchemist', 'recipe_healing_potion')
    expect(await service.countItem('alchemist', 'rift_essence')).toBe(essence - 2)
    expect(await service.countItem('alchemist', 'mutated_blood')).toBe(blood - 1)
  })

  it('crafting cannot happen without learned recipe', async () => {
    const service = new PlayerStateService(); await create(service, 'warrior')
    await expect(service.craft('warrior', 'recipe_warrior_weapon')).rejects.toThrow()
  })

  it('crafting cannot happen without resources', async () => {
    const service = new PlayerStateService(); await create(service, 'alchemist', 'alchemist')
    const essence = (await service.snapshot('alchemist')).inventory.find((item) => item.itemId === 'rift_essence')!
    await service.move('alchemist', essence.entryId, true)
    await expect(service.craft('alchemist', 'recipe_healing_potion')).rejects.toThrow()
  })

  it('crafted item uses the server item definition', async () => {
    const service = new PlayerStateService(); await create(service, 'alchemist', 'alchemist')
    await service.craft('alchemist', 'recipe_alchemist_weapon')
    const crafted = (await service.snapshot('alchemist')).inventory.find((item) => item.itemId === 'crafted_alchemist_weapon')!
    expect(ITEM_CATALOG[crafted.itemId].attack).toBe(7)
    expect(crafted.quantity).toBe(1)
  })

  it('inventory and storage transfer preserves stack quantity', async () => {
    const service = new PlayerStateService(); await create(service, 'alchemist', 'alchemist')
    const potion = (await service.snapshot('alchemist')).inventory.find((item) => item.itemId === 'healing_potion')!
    await service.move('alchemist', potion.entryId, true, 3)
    const state = await service.snapshot('alchemist')
    const total = [...state.inventory, ...state.storage].filter((item) => item.itemId === 'healing_potion').reduce((sum, item) => sum + item.quantity, 0)
    expect(total).toBe(5)
  })

  it('client cannot equip an item belonging to another player', async () => {
    const service = new PlayerStateService(); await create(service, 'owner'); await create(service, 'attacker')
    const item = await service.addItemForTesting('owner', 'forged_warrior_weapon')
    await expect(service.equip('attacker', item.entryId)).rejects.toThrow()
  })

  it('profession recipe item can be learned once and is consumed', async () => {
    const service = new PlayerStateService(); await create(service, 'jeweler', 'jeweler')
    const recipe = await service.addItemForTesting('jeweler', recipeItemId('recipe_hp_ring'))
    const state = await service.learnRecipe('jeweler', recipe.entryId)
    expect(state.learnedRecipes).toContain('recipe_hp_ring')
    expect(state.inventory.some((item) => item.entryId === recipe.entryId)).toBe(false)
  })
})
