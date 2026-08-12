import { describe, expect, it } from 'vitest'
import { AUTO_POTION_THRESHOLD_BY_TIER, selectAutoPotion } from '../../shared/game-data/autoBattle'
import { SIMULATION_BALANCE_CONFIG } from '../../shared/game-data/balance'

const potions = [
  { itemId: 'lesser', quantity: 1, healPercent: 0.25 },
  { itemId: 'cinder', quantity: 1, healPercent: 0.50 },
  { itemId: 'eclipse', quantity: 1, healPercent: 0.60 },
]

describe('shared Auto Battle potion policy', () => {
  it('keeps production and simulator on the same threshold object', () => {
    expect(SIMULATION_BALANCE_CONFIG.autoPotionThresholdByTier).toBe(AUTO_POTION_THRESHOLD_BY_TIER)
  })

  it('does not potion while HP is healthy', () => {
    expect(selectAutoPotion({ currentHP: 700, maxHP: 1000, potionCooldown: 0, contentTier: 6, potions })).toBeNull()
  })

  it('does not potion on cooldown or without inventory', () => {
    expect(selectAutoPotion({ currentHP: 100, maxHP: 1000, potionCooldown: 1, contentTier: 6, potions })).toBeNull()
    expect(selectAutoPotion({ currentHP: 100, maxHP: 1000, potionCooldown: 0, contentTier: 6, potions: [] })).toBeNull()
  })

  it('avoids a high-overheal potion when a weaker potion adequately heals', () => {
    expect(selectAutoPotion({ currentHP: 280, maxHP: 1000, potionCooldown: 0, contentTier: 1, potions })?.potionItemId).toBe('cinder')
  })

  it('uses the strongest potion at critical HP', () => {
    expect(selectAutoPotion({ currentHP: 100, maxHP: 1000, potionCooldown: 0, contentTier: 6, potions })?.potionItemId).toBe('eclipse')
  })

  it('ignores unavailable potion tiers', () => {
    expect(selectAutoPotion({ currentHP: 100, maxHP: 1000, potionCooldown: 0, contentTier: 6, potions: potions.map((potion) => ({ ...potion, quantity: potion.itemId === 'cinder' ? 1 : 0 })) })?.potionItemId).toBe('cinder')
  })
})
