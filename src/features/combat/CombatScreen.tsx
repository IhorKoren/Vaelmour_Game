import { useMemo, useEffect, useRef, useCallback } from 'react';
import { locations } from '../../data/locations';
import { Panel } from '../../components/ui/Panel';
import { canStartBossEncounter } from '../../game/formulas/bossUnlocks';
import {
  getLocationRiskLabel,
  getBossForLocation
} from '../../game/formulas/enemyScaling';
import bossesJson from '../../data/generated/bosses.json';
import type { Enemy, HeroState } from '../../game/types';
import { getDisplayLocationName } from '../../utils/displayHelpers';
import { calculateDerivedStats } from '../../game/formulas/stats';

import { CombatArena, CombatControls, CombatLog } from './components';
import { useCombatSession } from './hooks/useCombatSession';
import { calculateVictoryRewards } from './services/combatRewards';

type Props = {
  hero: HeroState;
  onHeroChange: (hero: HeroState) => void;
  selectedLocationId: string;
  onCombatStateChange?: (isFighting: boolean) => void;
};

export function CombatScreen({ hero, onHeroChange, selectedLocationId, onCombatStateChange }: Props) {
  const currentLocation = useMemo(() => {
    return locations.find((l) => l.id === selectedLocationId) ?? locations[0];
  }, [selectedLocationId]);

  const locationBoss = useMemo(() => {
    if (!currentLocation?.bossOrKeyEnemy || currentLocation.bossOrKeyEnemy === 'None') {
      return null;
    }
    return getBossForLocation(currentLocation.name, currentLocation.bossOrKeyEnemy, bossesJson);
  }, [currentLocation]);

  const riskRaw = useMemo(() => getLocationRiskLabel(hero, currentLocation), [hero, currentLocation]);
  const latestHero = useRef(hero);

  useEffect(() => {
    latestHero.current = hero;
  }, [hero]);

  const onVictoryCalculations = useCallback((enemy: Enemy, heroDamageLog: string) => {
    return calculateVictoryRewards(
      enemy,
      latestHero.current,
      riskRaw,
      currentLocation,
      heroDamageLog
    );
  }, [riskRaw, currentLocation]);

  const {
    huntState,
    enemy,
    enemyHp,
    log,
    heroRage,
    heroAttacking,
    enemyAttacking,
    heroFlash,
    enemyFlash,
    rageFlash,
    victoryRewards,
    availableSkills,
    skillCooldowns,
    isEnemyDefeated,
    heroDefeated,
    startHunting,
    startBossFight,
    handleRetreat,
    handleReturn,
    handleUseSkill,
    isAutoHuntEnabled,
    setIsAutoHuntEnabled
  } = useCombatSession({
    hero,
    onHeroChange,
    selectedLocationId,
    onCombatStateChange,
    onVictoryCalculations
  });

  const derived = useMemo(() => calculateDerivedStats(hero.stats, hero.baseHp, undefined, hero), [hero]);
  const isLowHp = hero.currentHp < derived.maxHp * 0.20;

  return (
    <div className={`screen combat-screen ${huntState === 'idle' ? 'combat-screen--idle' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      
      {/* Auto-hunt toggle widget */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        justifyContent: 'center',
        margin: '0',
        padding: '8px 12px',
        background: 'rgba(20,13,9,0.3)',
        borderRadius: '6px',
        border: '1px solid rgba(212,163,115,0.15)',
        width: '100%'
      }}>
        <input
          type="checkbox"
          id="auto-hunt-checkbox"
          checked={isAutoHuntEnabled}
          onChange={(e) => setIsAutoHuntEnabled(e.target.checked)}
          style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
        />
        <label htmlFor="auto-hunt-checkbox" style={{ fontSize: '13px', cursor: 'pointer', color: 'var(--color-bronze-light)', userSelect: 'none', fontWeight: 'bold' }}>
          🔄 Автополювання
        </label>
      </div>

      {/* 1. IDLE STATE PANEL */}
      {huntState === 'idle' && (
        <section className="hunt-start-panel" aria-label="Початок полювання">
          <div className="hunt-start-panel__location">
            <span>{getDisplayLocationName(currentLocation.id)}</span>
          </div>

          {isLowHp && (
            <div style={{
              margin: '8px 0',
              padding: '10px',
              background: 'rgba(163, 46, 46, 0.15)',
              border: '1.5px solid #a32e2e',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#ff4d4d',
              textAlign: 'center',
              fontWeight: 'bold',
              lineHeight: '1.4'
            }}>
              ⚠️ Здоров’я занизьке для бою. Дочекайся відновлення хоча б до 20%.
            </div>
          )}

          <button
            className="hunt-start-button"
            type="button"
            onClick={startHunting}
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
                  onClick={startBossFight}
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
      )}

      {/* 2. SEARCHING STATE PANEL */}
      {huntState === 'searching' && (
        <Panel title="Розвідка території">
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <div className="hunt-emblem hunt-emblem--search" aria-hidden="true" />
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--color-gold-gilded)', fontSize: '16px' }}>
              Шукаємо ворога...
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 16px 0' }}>
              Ваш герой обережно обстежує околиці локації <strong>{getDisplayLocationName(currentLocation.id)}</strong> у пошуках здобичі.
            </p>
            <button
              className="secondary-button"
              type="button"
              onClick={handleRetreat}
              style={{ width: '100%', minHeight: '38px', border: '1px solid rgba(212,163,115,0.25)', background: 'rgba(20,13,9,0.3)', color: 'var(--color-text-muted)' }}
            >
              🛡️ Зупинити пошук
            </button>
          </div>
        </Panel>
      )}

      {huntState !== 'idle' && huntState !== 'searching' && (
        <>
          <CombatArena
            huntState={huntState}
            enemy={enemy}
            enemyHp={enemyHp}
            hero={hero}
            heroRage={heroRage}
            enemyAttacking={enemyAttacking}
            heroAttacking={heroAttacking}
            enemyFlash={enemyFlash}
            heroFlash={heroFlash}
            rageFlash={rageFlash}
          />

          <CombatControls
            huntState={huntState}
            victoryRewards={victoryRewards}
            hero={hero}
            heroRage={heroRage}
            availableSkills={availableSkills}
            skillCooldowns={skillCooldowns}
            isEnemyDefeated={isEnemyDefeated}
            heroDefeated={heroDefeated}
            onUseSkill={handleUseSkill}
            onRetreat={handleRetreat}
            onReturn={handleReturn}
          />

          <CombatLog log={log} />
        </>
      )}

      {/* Safety Telegram Spacer block */}
      <div style={{ height: '80px', pointerEvents: 'none' }} />
    </div>
  );
}
