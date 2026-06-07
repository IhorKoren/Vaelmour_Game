import type { Enemy, HeroState } from '../../../game/types';
import arenaBg from '../../../assets/generated/blackfang_gate_background_mobile.jpg';
import { CombatEnemyPanel } from './CombatEnemyPanel';
import { CombatHeroPanel } from './CombatHeroPanel';

interface CombatArenaProps {
  huntState: 'fighting' | 'victory' | 'defeat';
  enemy: Enemy;
  enemyHp: number;
  hero: HeroState;
  enemyAttacking: boolean;
  heroAttacking: boolean;
  enemyFlash: { damage: number; isCrit: boolean; id: number } | null;
  heroFlash: { damage: number; isCrit: boolean; id: number } | null;
}

export function CombatArena({
  huntState,
  enemy,
  enemyHp,
  hero,
  enemyAttacking,
  heroAttacking,
  enemyFlash,
  heroFlash
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

      {huntState === 'victory' && (
        <div className="combat-result-banner combat-result-banner--victory">
          <span>Перемога</span>
          <strong>Ворог переможений</strong>
        </div>
      )}

      {huntState === 'defeat' && (
        <div className="combat-result-banner combat-result-banner--defeat">
          <span>Поразка</span>
          <strong>Герой відступив</strong>
        </div>
      )}

      <CombatHeroPanel
        hero={hero}
        heroAttacking={heroAttacking}
        heroFlash={heroFlash}
      />
    </div>
  );
}
