import { useMemo, useEffect, useRef, useCallback } from 'react';
import { locations } from '../../data/locations';
import {
  getLocationRiskLabel,
  getBossForLocation
} from '../../game/formulas/enemyScaling';
import bossesJson from '../../data/generated/bosses.json';
import type { Enemy, HeroState } from '../../game/types';
import { getDisplayLocationName } from '../../utils/displayHelpers';
import { calculateDerivedStats } from '../../game/formulas/stats';
import { isHeroHpTooLow } from './combatDisplayHelpers';

import {
  CombatArena,
  CombatControls,
  CombatIdlePanel,
  CombatSearchingPanel,
  AutoHuntToggle
} from './components';
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
    heroAttacking,
    enemyAttacking,
    heroFlash,
    enemyFlash,
    victoryRewards,
    isEnemyDefeated,
    heroDefeated,
    startHunting,
    startBossFight,
    handleRetreat,
    handleReturn,
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
  const isLowHp = isHeroHpTooLow(hero.currentHp, derived.maxHp);

  return (
    <div className={`screen combat-screen ${huntState === 'idle' ? 'combat-screen--idle' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      
      <AutoHuntToggle
        isAutoHuntEnabled={isAutoHuntEnabled}
        setIsAutoHuntEnabled={setIsAutoHuntEnabled}
      />

      {/* 1. IDLE STATE PANEL */}
      {huntState === 'idle' && (
        <CombatIdlePanel
          locationName={getDisplayLocationName(currentLocation.id)}
          isLowHp={isLowHp}
          locationBoss={locationBoss}
          hero={hero}
          onStartHunting={startHunting}
          onStartBossFight={startBossFight}
        />
      )}

      {/* 2. SEARCHING STATE PANEL */}
      {huntState === 'searching' && (
        <CombatSearchingPanel
          locationId={currentLocation.id}
          onRetreat={handleRetreat}
        />
      )}

      {huntState !== 'idle' && huntState !== 'searching' && (
        <>
          <CombatArena
            huntState={huntState}
            enemy={enemy}
            enemyHp={enemyHp}
            hero={hero}
            enemyAttacking={enemyAttacking}
            heroAttacking={heroAttacking}
            enemyFlash={enemyFlash}
            heroFlash={heroFlash}
          />

          <CombatControls
            huntState={huntState}
            victoryRewards={victoryRewards}
            isEnemyDefeated={isEnemyDefeated}
            heroDefeated={heroDefeated}
            onRetreat={handleRetreat}
            onReturn={handleReturn}
          />
        </>
      )}

      {/* Safety Telegram Spacer block */}
      <div style={{ height: '80px', pointerEvents: 'none' }} />
    </div>
  );
}
