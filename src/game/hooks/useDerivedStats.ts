import { useMemo } from 'react';
import type { HeroState } from '../types';
import { calculateDerivedStats } from '../formulas/stats';

export function useDerivedStats(hero: HeroState) {
  return useMemo(
    () => calculateDerivedStats(hero.stats, hero.baseHp, undefined, hero),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      hero.stats.strength,
      hero.stats.agility,
      hero.stats.vitality,
      hero.baseHp,
      hero.equipment,
      hero.equipmentDurability,
      hero.equippedGeneratedItems,
      hero.equipmentAffixes
    ]
  );
}
