import type { HeroState } from '../../../game/types';
import heroWanderer from '../../../assets/generated/hero_vaelmour_back_mobile.png';

interface CombatHeroPanelProps {
  hero: HeroState;
  heroAttacking: boolean;
  heroFlash: { damage: number; isCrit: boolean; id: number } | null;
}

export function CombatHeroPanel({
  hero,
  heroAttacking,
  heroFlash
}: CombatHeroPanelProps) {
  return (
    <>
      <div className="hero-status-plate">
        <span className="status-plate__name">{hero.name}</span>
        <div className="status-plate__hp-bar" title={`HP: ${hero.currentHp}/${hero.maxHp}`}>
          <div className="status-plate__hp-fill" style={{ width: `${Math.max(0, Math.min(100, (hero.currentHp / Math.max(1, hero.maxHp)) * 100))}%` }} />
          <span className="status-plate__hp-text">{hero.currentHp} / {hero.maxHp}</span>
        </div>
      </div>

      <div className={`combat-actor hero-actor ${heroAttacking ? 'unit-attacking' : ''}`}>
        <div className="combat-actor__sprite-container">
          <div className="combat-actor__rune-bg" />
          <img src={heroWanderer} className="hero-sprite-back idle-bob" alt={hero.name} decoding="async" style={{ objectFit: 'contain' }} />
          <div className="combat-actor__shadow" />
        </div>

        {heroFlash && (
          <div key={heroFlash.id} className={`damage-flash ${heroFlash.isCrit ? 'crit' : ''}`}>
            -{heroFlash.damage}
          </div>
        )}
      </div>
    </>
  );
}
