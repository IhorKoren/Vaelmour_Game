import type { HeroState } from '../../../game/types';
import heroWanderer from '../../../assets/generated/hero_vaelmour_back_mobile.png';

interface CombatHeroPanelProps {
  hero: HeroState;
  heroRage: number;
  heroAttacking: boolean;
  heroFlash: { damage: number; isCrit: boolean; id: number } | null;
  rageFlash: { amount: number; id: number } | null;
}

export function CombatHeroPanel({
  hero,
  heroRage,
  heroAttacking,
  heroFlash,
  rageFlash
}: CombatHeroPanelProps) {
  return (
    <>
      <div className="hero-status-plate">
        <span className="status-plate__name">{hero.name}</span>
        <div className="status-plate__hp-bar" title={`HP: ${hero.currentHp}/${hero.maxHp}`}>
          <div className="status-plate__hp-fill" style={{ width: `${Math.max(0, Math.min(100, (hero.currentHp / Math.max(1, hero.maxHp)) * 100))}%` }} />
          <span className="status-plate__hp-text">{hero.currentHp} / {hero.maxHp}</span>
        </div>
        <div className="status-plate__rage-bar" title={`Лють: ${heroRage}/100`}>
          <div className="status-plate__rage-fill" style={{ width: `${heroRage}%` }} />
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
        {rageFlash && (
          <div key={rageFlash.id} className="damage-flash rage-gain">
            +{rageFlash.amount} Лють
          </div>
        )}
      </div>
    </>
  );
}
