import type { Enemy, HeroState } from '../../../game/types';
import arenaBg from '../../../assets/generated/blackfang_gate_background_mobile.jpg';
import { CombatEnemyPanel } from './CombatEnemyPanel';
import { CombatHeroPanel } from './CombatHeroPanel';

interface CombatArenaProps {
  huntState: 'fighting' | 'victory' | 'defeat';
  enemy: Enemy;
  enemyHp: number;
  hero: HeroState;
  heroRage: number;
  enemyAttacking: boolean;
  heroAttacking: boolean;
  enemyFlash: { damage: number; isCrit: boolean; id: number } | null;
  heroFlash: { damage: number; isCrit: boolean; id: number } | null;
  rageFlash: { amount: number; id: number } | null;
}

export function CombatArena({
  huntState,
  enemy,
  enemyHp,
  hero,
  heroRage,
  enemyAttacking,
  heroAttacking,
  enemyFlash,
  heroFlash,
  rageFlash
}: CombatArenaProps) {
  return (
    <div className="battle-arena" style={{ backgroundImage: `url(${arenaBg})` }}>
      <div className="battle-arena__ground" />
      
      <CombatEnemyPanel
        enemy={enemy}
        enemyHp={enemyHp}
        enemyAttacking={enemyAttacking}
        enemyFlash={enemyFlash}
        showStatusPlate={huntState === 'fighting'}
      />

      {/* Victory Floating tag overlay */}
      {huntState === 'victory' && (
        <div className="combat-result-banner combat-result-banner--victory">
          <span>Перемога</span>
          <strong>Ворог переможений</strong>
        </div>
      )}

      {/* Defeat Floating tag overlay */}
      {huntState === 'defeat' && (
        <div className="combat-result-banner combat-result-banner--defeat">
          <span>Поразка</span>
          <strong>Герой відступив</strong>
        </div>
      )}

      <CombatHeroPanel
        hero={hero}
        heroRage={heroRage}
        heroAttacking={heroAttacking}
        heroFlash={heroFlash}
        rageFlash={rageFlash}
      />
    </div>
  );
}
