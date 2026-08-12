import { describe, expect, it } from 'vitest'
import { FIRST_RIFT } from '../../shared/game-data/rifts/firstRift'
import { ENEMY_CATALOG, floorEncounters } from '../../shared/game-data/rifts'
import { PHASE7_ITEMS, PHASE7_RECIPES, PHASE7_RESOURCES, POTION_HEAL_PERCENT } from '../../shared/game-data/phase7Catalog'
import { ITEMS } from '../../shared/game-data/items'
import { RECIPES } from '../../shared/game-data/recipes'
import { validateContent } from './validateContent'

describe('Phase 7 data-driven content', () => {
  it('defines exactly three First Rift floors', () => expect(FIRST_RIFT.floors).toHaveLength(3))
  it.each([[1, 6], [2, 8], [3, 10]])('Floor %i has %i encounters', (floor, count) => expect(floorEncounters(floor)).toHaveLength(count))
  it.each([1, 2, 3])('Floor %i boss is always final', (floor) => {
    const encounters = floorEncounters(floor)
    expect(encounters.at(-1)?.type).toBe('BOSS')
    expect(encounters.slice(0, -1).every((enemy) => enemy.type !== 'BOSS')).toBe(true)
  })
  it('has all requested First Rift enemy references', () => expect(new Set(FIRST_RIFT.floors.flatMap((floor) => [...floor.encounterEnemyIds, floor.bossId]))).toHaveLength(20))
  it('contains four new normal enemies per floor', () => {
    for (const floor of FIRST_RIFT.floors) expect(new Set(floor.encounterEnemyIds.filter((id) => ENEMY_CATALOG[id].type === 'NORMAL'))).toHaveLength(4)
  })
  it('defines 27 profession resources across three tiers', () => {
    expect(Object.values(PHASE7_RESOURCES).filter((resource) => (resource.tier ?? 0) <= 3)).toHaveLength(27)
    for (const tier of [1, 2, 3]) for (const profession of ['blacksmith', 'alchemist', 'jeweler'])
      expect(Object.values(PHASE7_RESOURCES).filter((resource) => resource.tier === tier && resource.profession === profession)).toHaveLength(3)
  })
  it('generates all 90 original class equipment pieces with stable ids', () => expect(Object.values(PHASE7_ITEMS).filter((item) => item.category === 'equipment' && (item.tier ?? 0) <= 3)).toHaveLength(90))
  it('generates all 18 universally equippable jewelry pieces', () => {
    const jewelry = Object.values(PHASE7_ITEMS).filter((item) => item.category === 'jewelry' && (item.tier ?? 0) <= 3)
    expect(jewelry).toHaveLength(18)
    expect(jewelry.every((item) => item.allowedClass === undefined)).toBe(true)
  })
  it('preserves class restrictions on class gear', () => expect(PHASE7_ITEMS.rift_t2_warrior_chest.allowedClass).toBe('warrior'))
  it.each([1, 2, 3])('Tier %i recipes produce same-tier items', (tier) => {
    const recipes = Object.values(PHASE7_RECIPES).filter((recipe) => recipe.tier === tier)
    expect(recipes.length).toBeGreaterThan(0)
    expect(recipes.every((recipe) => ITEMS[recipe.outputItemId].tier === tier)).toBe(true)
  })
  it('keeps profession crafting responsibilities', () => {
    expect(PHASE7_RECIPES.recipe_rift_t1_warrior_weapon.profession).toBe('blacksmith')
    expect(PHASE7_RECIPES.recipe_rift_t1_alchemist_weapon.profession).toBe('alchemist')
    expect(PHASE7_RECIPES.recipe_rift_t1_jeweler_weapon.profession).toBe('jeweler')
  })
  it('preserves the original potion tiers', () => expect(Object.fromEntries(Object.entries(POTION_HEAL_PERCENT).filter(([tier]) => Number(tier) <= 3))).toEqual({ 1: 0.25, 2: 0.35, 3: 0.45 }))
  it('has globally usable deterministic catalog ids', () => {
    expect(new Set(Object.keys(ITEMS)).size).toBe(Object.keys(ITEMS).length)
    expect(new Set(Object.keys(RECIPES)).size).toBe(Object.keys(RECIPES).length)
  })
  it('passes the full content validator', () => expect(validateContent()).toEqual([]))
})
