import { canStartBossEncounter } from '../../../game/formulas/bossUnlocks';
import type { HeroState, Enemy } from '../../../game/types';
import { CombatLowHpWarning } from './CombatLowHpWarning';

interface CombatIdlePanelProps {
  locationName: string;
  isLowHp: boolean;
  locationBoss: Enemy | null;
  hero: HeroState;
  onStartHunting: () => void;
  onStartBossFight: () => void;
}

export function CombatIdlePanel({
  locationName,
  isLowHp,
  locationBoss,
  hero,
  onStartHunting,
  onStartBossFight
}: CombatIdlePanelProps) {
  return (
    <section className="hunt-start-panel" aria-label="Початок полювання">
      <div className="hunt-start-panel__location">
        <span>{locationName}</span>
      </div>

      <CombatLowHpWarning isLowHp={isLowHp} />

      <button
        className="hunt-start-button"
        type="button"
        onClick={onStartHunting}
        disabled={isLowHp}
        style={isLowHp ? {
          opacity: 0.5,
          cursor: 'not-allowed',
          background: 'rgba(30, 30, 30, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'var(--color-text-muted)',
          boxShadow: 'none'
        } : {}}
      >
        Шукати ворога
      </button>

      {locationBoss && (() => {
        const unlockStatus = canStartBossEncounter(hero, locationBoss);
        const isBossDisabled = isLowHp || !unlockStatus.unlocked;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', marginTop: '10px' }}>
            <button
              className="hunt-start-button boss-trigger-button"
              type="button"
              onClick={onStartBossFight}
              disabled={isBossDisabled}
              style={{
                background: !isBossDisabled ? 'linear-gradient(180deg, #a32e2e, #611515)' : 'rgba(30, 15, 15, 0.4)',
                color: !isBossDisabled ? '#ffffff' : 'var(--color-text-muted)',
                border: !isBossDisabled ? '1.5px solid var(--color-gold-gilded)' : '1px dashed rgba(212, 163, 115, 0.15)',
                boxShadow: !isBossDisabled ? '0 0 10px rgba(163, 46, 46, 0.5)' : 'none',
                cursor: !isBossDisabled ? 'pointer' : 'not-allowed',
                opacity: !isBossDisabled ? 1 : 0.6
              }}
            >
              💀 Бій з Босом: {locationBoss.name}
            </button>
            {!unlockStatus.unlocked && (
              <span style={{ fontSize: '11px', color: '#ff4d4d', textAlign: 'center', fontStyle: 'italic', fontWeight: 'bold', marginTop: '2px' }}>
                ⚠️ {unlockStatus.reason}
              </span>
            )}
          </div>
        );
      })()}
    </section>
  );
}
