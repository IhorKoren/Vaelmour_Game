import type { HeroState } from '../types';

export type BossUnlockResult = {
  unlocked: boolean;
  reason?: string;
};

/**
 * Checks if a hero can start a fight with the given boss.
 * Requirements:
 * - Hero level must be at least boss.level - 2.
 */
export function canStartBossEncounter(hero: HeroState, boss: { level?: number }): BossUnlockResult {
  const bossLevel = boss.level ?? 1;
  const minRequiredLevel = Math.max(1, bossLevel - 2);
  if (hero.level < minRequiredLevel) {
    return {
      unlocked: false,
      reason: `Бос заблокований: потрібен рівень ${minRequiredLevel}.`
    };
  }
  return { unlocked: true };
}
