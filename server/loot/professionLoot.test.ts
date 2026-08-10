import { describe, expect, it } from 'vitest'
import { generateProfessionLoot } from './professionLoot'

const always = () => 0

describe('profession loot pools', () => {
  it('correct profession gets the high-chance profession pool', () => {
    const result = generateProfessionLoot([{ id: 'smith', classId: 'blacksmith', alive: true }], 0, 'mob', { random: always, resourceChance: { combatClass: 0, correctProfession: 1 }, recipeChance: { mob: 0, elite: 0, boss: 0 } })
    expect(result.personal.smith.resources.rift_iron).toBe(1)
  })

  it('multiple same-profession players do not multiply loot pool', () => {
    const result = generateProfessionLoot([{ id: 'a', classId: 'alchemist', alive: true }, { id: 'b', classId: 'alchemist', alive: true }], 0, 'mob', { random: always, resourceChance: { combatClass: 0, correctProfession: 1 }, recipeChance: { mob: 0, elite: 0, boss: 0 } })
    const total = Object.values(result.personal).reduce((sum, loot) => sum + Object.values(loot.resources).reduce((a, b) => a + b, 0), 0)
    expect(result.professionPoolRolls.alchemist).toBe(1)
    expect(total).toBe(1)
  })

  it('recipe only rolls if a matching profession exists', () => {
    const result = generateProfessionLoot([{ id: 'warrior', classId: 'warrior', alive: true }], 0, 'boss', { random: always, resourceChance: { combatClass: 0, correctProfession: 0 }, recipeChance: { mob: 1, elite: 1, boss: 1 } })
    expect(Object.values(result.recipeRolls).reduce((a, b) => a + b, 0)).toBe(0)
  })

  it('duplicate profession members create one recipe roll', () => {
    const result = generateProfessionLoot([{ id: 'a', classId: 'jeweler', alive: true }, { id: 'b', classId: 'jeweler', alive: true }], 0, 'boss', { random: always, resourceChance: { combatClass: 0, correctProfession: 0 }, recipeChance: { mob: 1, elite: 1, boss: 1 } })
    expect(result.recipeRolls.jeweler).toBe(1)
  })

  it('recipe is awarded to only one eligible profession member', () => {
    const result = generateProfessionLoot([{ id: 'a', classId: 'blacksmith', alive: true }, { id: 'b', classId: 'blacksmith', alive: true }], 0, 'boss', { random: always, resourceChance: { combatClass: 0, correctProfession: 0 }, recipeChance: { mob: 1, elite: 1, boss: 1 } })
    expect(Object.values(result.personal).reduce((sum, loot) => sum + loot.recipeIds.length, 0)).toBe(1)
  })

  it('dead profession player does not participate in future loot', () => {
    const result = generateProfessionLoot([{ id: 'dead', classId: 'alchemist', alive: false }, { id: 'alive', classId: 'alchemist', alive: true }], 0, 'boss', { random: always, resourceChance: { combatClass: 0, correctProfession: 1 }, recipeChance: { mob: 1, elite: 1, boss: 1 } })
    expect(result.personal.dead).toEqual({ resources: {}, recipeIds: [] })
    expect(Object.keys(result.personal.alive.resources)).toHaveLength(1)
    expect(result.personal.alive.recipeIds).toHaveLength(1)
  })
})
