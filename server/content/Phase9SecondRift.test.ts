import { describe, expect, it } from 'vitest'
import { ITEM_CATALOG } from '../../shared/game-data/catalog'
import { PHASE7_ITEMS, PHASE7_RECIPES, PHASE7_RESOURCES, POTION_HEAL_PERCENT } from '../../shared/game-data/phase7Catalog'
import { ENEMY_CATALOG, floorEncounters } from '../../shared/game-data/rifts'
import { SECOND_RIFT } from '../../shared/game-data/rifts/secondRift'
import { validateContent } from './validateContent'
import { createRiftEnemy } from '../combat/firstRiftEnemyFactory'

describe('Phase 9 Second Rift content', () => {
  it('defines the Ashen Deep as three sequential Tier IV-VI floors', () => {
    expect(SECOND_RIFT.theme).toContain('volcanic necropolis')
    expect(SECOND_RIFT.unlockRequires).toEqual({ riftId: 'first_rift', floorNumber: 3 })
    expect(SECOND_RIFT.floors.map((floor) => floor.resourceTier)).toEqual([4, 5, 6])
    expect(SECOND_RIFT.floors.map((floor) => floor.unlockRequiresFloor)).toEqual([undefined, 1, 2])
  })

  it.each([1, 2, 3])('Second Rift Floor %i has six encounters and its boss last', (floor) => {
    const encounters = floorEncounters('second_rift', floor)
    expect(encounters).toHaveLength(7)
    expect(encounters.slice(0, -1).every((enemy) => enemy.type !== 'BOSS')).toBe(true)
    expect(encounters.at(-1)?.type).toBe('BOSS')
    expect(encounters.every((enemy) => enemy.lootTier === floor + 3)).toBe(true)
  })

  it('adds 18 mobs/elites and three bosses', () => {
    const ids = SECOND_RIFT.floors.flatMap((floor) => [...floor.encounterEnemyIds, floor.bossId])
    expect(new Set(ids)).toHaveLength(21)
    expect(ids.filter((id) => ENEMY_CATALOG[id].type === 'BOSS')).toHaveLength(3)
  })

  it.each([1, 2, 3, 4, 5])('applies explicit Second Rift scaling for %i player(s)', (partySize) => {
    const enemy = createRiftEnemy('second_rift', 1, 0, partySize)
    expect(enemy.maxHP).toBeGreaterThan(0)
    expect(enemy.attack).toBeGreaterThan(0)
    if (partySize > 1) expect(enemy.maxHP).toBeGreaterThan(createRiftEnemy('second_rift', 1, 0, partySize - 1).maxHP)
  })

  it('Phase 9.1 tuning changes only Second Rift solo/duo scaling', () => {
    const baseline3 = createRiftEnemy('second_rift', 3, 0, 3)
    const baseline4 = createRiftEnemy('second_rift', 3, 0, 4)
    const baseline5 = createRiftEnemy('second_rift', 3, 0, 5)
    expect([baseline3.maxHP, baseline4.maxHP, baseline5.maxHP]).toEqual([2856, 3570, 4200])
    expect([baseline3.attack, baseline4.attack, baseline5.attack]).toEqual([202, 218, 240])
    expect(createRiftEnemy('second_rift', 2, 0, 1).attack).toBeLessThan(220 * 0.4)
    expect(createRiftEnemy('second_rift', 3, 0, 2).attack).toBeLessThan(240 * 0.62)
  })

  it.each([4, 5, 6])('Tier %i has resources, all class gear, jewelry, potion, and recipes', (tier) => {
    expect(Object.values(PHASE7_RESOURCES).filter((resource) => resource.tier === tier)).toHaveLength(9)
    expect(Object.values(PHASE7_ITEMS).filter((item) => item.tier === tier && item.category === 'equipment')).toHaveLength(30)
    expect(Object.values(PHASE7_ITEMS).filter((item) => item.tier === tier && item.category === 'jewelry')).toHaveLength(6)
    expect(Object.values(PHASE7_RECIPES).filter((recipe) => recipe.tier === tier)).toHaveLength(37)
    expect(POTION_HEAL_PERCENT[tier as 4 | 5 | 6]).toBeGreaterThan(POTION_HEAL_PERCENT[(tier - 1) as 3 | 4 | 5])
  })

  it('keeps class and profession restrictions generic', () => {
    expect(ITEM_CATALOG.rift_t6_warrior_weapon.allowedClass).toBe('warrior')
    expect(PHASE7_RECIPES.recipe_rift_t6_warrior_weapon.profession).toBe('blacksmith')
    expect(PHASE7_RECIPES.recipe_rift_t6_alchemist_weapon.profession).toBe('alchemist')
    expect(PHASE7_RECIPES.recipe_rift_t6_jeweler_weapon.profession).toBe('jeweler')
    expect(PHASE7_RECIPES.recipe_rift_t6_attack_ring.profession).toBe('jeweler')
  })

  it('passes extended orphan and progression validation', () => expect(validateContent()).toEqual([]))
})
