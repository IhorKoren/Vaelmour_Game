import { describe, expect, it } from 'vitest'
import { calculateDamage, canCharacterAct, generateEnemyAction, resolveBlock, resolveRound, tickPotionCooldown } from './engine'
import type { Character, Enemy, RoundInput } from '../types/game'

const player: Character = {
  id: 'player', name: 'Тест', classId: 'warrior', level: 1, currentXP: 0,
  attack: 100, maxHP: 1000, currentHP: 500, alive: true, ready: true,
}
const enemy: Enemy = { id: 'enemy', name: 'Тінь', kind: 'mob', attack: 100, maxHP: 500, currentHP: 500, attackCount: 0 }

function round(overrides: Partial<RoundInput> = {}) {
  return resolveRound({
    party: [player], enemy,
    actions: { player: { type: 'attack', attackZone: 'head', defendZone: 'body' } },
    enemyAction: { attackZone: 'head', defendZone: 'body', targetId: 'player', isGroupAttack: false },
    potionCooldown: 0, random: () => 0.5, ...overrides,
  })
}

describe('combat rules', () => {
  it('blocked attack deals zero damage', () => {
    expect(resolveBlock('head', 'head')).toBe(true)
    expect(calculateDamage(100, true, () => 0.5)).toBe(0)
  })

  it('unblocked attack deals damage', () => {
    expect(calculateDamage(100, false, () => 0.5)).toBe(100)
    expect(round().enemy.currentHP).toBe(400)
  })

  it('applies potion before incoming damage', () => {
    const result = round({ actions: { player: { type: 'potion', defendZone: 'body' } } })
    expect(result.party[0].currentHP).toBe(750)
  })

  it('potion prevents attacking that round', () => {
    const result = round({ actions: { player: { type: 'potion', defendZone: 'body' } } })
    expect(result.enemy.currentHP).toBe(500)
  })

  it('potion cooldown starts at 2 and counts down', () => {
    const used = round({ actions: { player: { type: 'potion', defendZone: 'body' } } })
    expect(used.potionCooldown).toBe(2)
    expect(tickPotionCooldown(used.potionCooldown)).toBe(1)
    expect(tickPotionCooldown(1)).toBe(0)
  })

  it('every third boss attack is a group attack', () => {
    const boss = { ...enemy, kind: 'boss' as const }
    expect(generateEnemyAction({ ...boss, attackCount: 0 }, [player], () => 0).isGroupAttack).toBe(false)
    expect(generateEnemyAction({ ...boss, attackCount: 1 }, [player], () => 0).isGroupAttack).toBe(false)
    expect(generateEnemyAction({ ...boss, attackCount: 2 }, [player], () => 0).isGroupAttack).toBe(true)
  })

  it('dead character cannot act', () => {
    const dead = { ...player, currentHP: 0, alive: false }
    const result = round({ party: [dead], actions: { player: { type: 'attack', attackZone: 'head', defendZone: 'body' } } })
    expect(canCharacterAct(dead)).toBe(false)
    expect(result.enemy.currentHP).toBe(500)
  })
})
