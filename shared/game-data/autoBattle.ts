import type { ContentTier } from './types'

export const AUTO_POTION_THRESHOLD_BY_TIER: Record<ContentTier, number> = {
  1: 0.28,
  2: 0.24,
  3: 0.21,
  4: 0.21,
  5: 0.20,
  6: 0.18,
}

export const AUTO_CRITICAL_HP_RATIO = 0.15
export const AUTO_MIN_MISSING_HP_COVERAGE = 0.69

export interface AutoPotionOption {
  itemId: string
  quantity: number
  healPercent: number
}

export interface AutoPotionDecision {
  potionItemId: string
  healPercent: number
  expectedHeal: number
  expectedOverheal: number
}

export interface AutoPotionInput {
  currentHP: number
  maxHP: number
  potionCooldown: number
  contentTier: ContentTier
  potions: AutoPotionOption[]
}

/** Shared deterministic policy used by production Auto Battle and the simulator. */
export function selectAutoPotion(input: AutoPotionInput): AutoPotionDecision | null {
  if (input.maxHP <= 0 || input.currentHP <= 0 || input.potionCooldown > 0) return null
  if (input.currentHP / input.maxHP > AUTO_POTION_THRESHOLD_BY_TIER[input.contentTier]) return null

  const missingHP = Math.max(0, input.maxHP - input.currentHP)
  const available = input.potions
    .filter((potion) => potion.quantity > 0 && potion.healPercent > 0)
    .map((potion) => {
      const expectedHeal = Math.floor(input.maxHP * potion.healPercent)
      return { ...potion, expectedHeal, expectedOverheal: Math.max(0, expectedHeal - missingHP) }
    })
    .sort((a, b) => a.expectedHeal - b.expectedHeal || a.itemId.localeCompare(b.itemId))
  if (available.length === 0) return null

  const critical = input.currentHP / input.maxHP <= AUTO_CRITICAL_HP_RATIO
  const adequate = critical ? null : available.find((potion) => potion.expectedHeal >= missingHP * AUTO_MIN_MISSING_HP_COVERAGE)
  const selected = adequate ?? available.at(-1)!
  return { potionItemId: selected.itemId, healPercent: selected.healPercent, expectedHeal: selected.expectedHeal, expectedOverheal: selected.expectedOverheal }
}
