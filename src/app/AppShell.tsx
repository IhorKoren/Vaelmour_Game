import { Suspense, lazy, startTransition, useEffect, useMemo, useRef, useState } from 'react';

import { BottomNavigation } from '../components/layout/BottomNavigation';
import { TopStatusBar } from '../components/layout/TopStatusBar';
import { createInitialHero } from '../game/createInitialHero';
import { applyAutoEquipPreset } from '../game/autoEquipPreset';
import {
  applyOfflineHealthRegen,
  flushPendingSaveGame,
  loadGame,
  normalizeHeroState,
  scheduleSaveGame,
} from '../game/save/saveSystem';
import { locations } from '../data/locations';
import { calculateDerivedStats, xpToNextLevel } from '../game/formulas/stats';
import { useDerivedStats } from '../game/hooks/useDerivedStats';
import { checkLevelUp } from '../game/formulas/progression';
import { updateQuestProgressOnLocationChanged } from '../game/formulas/quests';
import type { AppTab } from './tabs';
import { shouldApplyPassiveHealthRegen } from './regenRules';
import { decideFullHealthNotification } from '../telegram/fullHealthNotificationRules';
import { sendFullHealthNotification } from '../telegram/telegramNotifications';
import {
  flushCloudPlayerSave,
  forceCloudPlayerSave,
  loadCloudPlayerSave,
  scheduleCloudPlayerSave,
} from '../telegram/playerCloudSave';
import type { HeroState } from '../game/types';

const CombatScreen = lazy(async () => {
  const module = await import('../features/combat/CombatScreen');

  return { default: module.CombatScreen };
});

const CharacterScreen = lazy(async () => {
  const module = await import('../features/character/CharacterScreen');

  return { default: module.CharacterScreen };
});

const InventoryScreen = lazy(async () => {
  const module = await import('../features/inventory/InventoryScreen');

  return { default: module.InventoryScreen };
});

const QuestsScreen = lazy(async () => {
  const module = await import('../features/quests/QuestsScreen');

  return { default: module.QuestsScreen };
});

const MapScreen = lazy(async () => {
  const module = await import('../features/map/MapScreen');

  return { default: module.MapScreen };
});

const ShopScreen = lazy(async () => {
  const module = await import('../features/shop/ShopScreen');

  return { default: module.ShopScreen };
});

function createStartupHero(): HeroState {
  return applyAutoEquipPreset(loadGame()?.hero ?? createInitialHero());
}

function getCriticalHeroSnapshot(hero: HeroState): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { currentHp, maxHp, ...criticalHeroState } = hero;

  return JSON.stringify(criticalHeroState);
}

function isCriticalHeroChange(previousHero: HeroState, nextHero: HeroState): boolean {
  return getCriticalHeroSnapshot(previousHero) !== getCriticalHeroSnapshot(nextHero);
}

export default function AppShell() {
  const [activeTab, setActiveTab] = useState<AppTab>('combat');

  const [hero, setHero] = useState<HeroState>(() => createStartupHero());

  // Shared state mapping selected locations
  const [selectedLocationId, setSelectedLocationId] = useState<string>(locations[0].id);

  // Active combat state reported by CombatScreen.
  // Passive/global HP regen is blocked during active combat.
  const [isFighting, setIsFighting] = useState(false);

  const [cloudSaveChecked, setCloudSaveChecked] = useState(false);
  const derived = useDerivedStats(hero);
  const isStartupReady = cloudSaveChecked;

  const [fullHealthNotificationSent, setFullHealthNotificationSent] = useState(() => {
    const save = loadGame();

    if (save?.hero) {
      const heroWithPreset = applyAutoEquipPreset(save.hero);
      const derived = calculateDerivedStats(
        heroWithPreset.stats,
        heroWithPreset.baseHp,
        undefined,
        heroWithPreset,
      );

      return heroWithPreset.currentHp >= derived.maxHp;
    }

    // Prevent immediate notification on new game / first cold start
    return true;
  });
  const wasBelowFullHpRef = useRef(false);

  // Load cloud save from Supabase once on startup
  useEffect(() => {
    let cancelled = false;

    const loadFromCloud = async () => {
      const cloudSave = await loadCloudPlayerSave();

      if (cancelled) {
        return;
      }

      if (cloudSave?.hero) {
        const normalizedCloudHero = normalizeHeroState(cloudSave.hero);
        const regeneratedCloudSave =
          applyOfflineHealthRegen({
            hero: normalizedCloudHero,
            updatedAt: cloudSave.updatedAt,
          }) ?? {
            hero: normalizedCloudHero,
            updatedAt: cloudSave.updatedAt,
          };

        const restoredHero = applyAutoEquipPreset(regeneratedCloudSave.hero);
        const restoredUpdatedAt = regeneratedCloudSave.updatedAt;
        const restoredLocationId = cloudSave.selectedLocationId ?? locations[0].id;

        setHero(restoredHero);
        setSelectedLocationId(restoredLocationId);

        scheduleSaveGame({
          hero: restoredHero,
          updatedAt: restoredUpdatedAt,
        });

        const derived = calculateDerivedStats(
          restoredHero.stats,
          restoredHero.baseHp,
          undefined,
          restoredHero,
        );

        setFullHealthNotificationSent(restoredHero.currentHp >= derived.maxHp);

        const cloudSaveWasUpdatedByStartupProcessing =
          restoredHero.currentHp !== cloudSave.hero.currentHp ||
          restoredHero.maxHp !== cloudSave.hero.maxHp ||
          restoredUpdatedAt !== cloudSave.updatedAt ||
          getCriticalHeroSnapshot(restoredHero) !== getCriticalHeroSnapshot(cloudSave.hero);

        if (cloudSaveWasUpdatedByStartupProcessing) {
          void forceCloudPlayerSave({
            hero: restoredHero,
            selectedLocationId: restoredLocationId,
            updatedAt: restoredUpdatedAt,
          });
        }

        console.info('[Cloud Save] Applied cloud save with startup processing.', {
          beforeHp: cloudSave.hero.currentHp,
          afterHp: restoredHero.currentHp,
          maxHp: derived.maxHp,
          selectedLocationId: restoredLocationId,
          cloudSaveWasUpdatedByStartupProcessing,
          updatedAt: restoredUpdatedAt,
        });
      }

      setCloudSaveChecked(true);
    };

    void loadFromCloud();

    return () => {
      cancelled = true;
    };
  }, []);

  // Track hero health transitions and notify once per below-full -> full cycle outside combat.
  useEffect(() => {
    const decision = decideFullHealthNotification({
      currentHp: hero.currentHp,
      maxHp: derived.maxHp,
      isFighting,
      wasBelowFullHp: wasBelowFullHpRef.current,
      notificationSent: fullHealthNotificationSent,
    });

    if (decision === 'reset_cycle') {
      if (fullHealthNotificationSent || !wasBelowFullHpRef.current) {
        console.info('[Telegram Notifications] Full HP cycle reset after damage or partial healing.', {
          currentHp: hero.currentHp,
          maxHp: derived.maxHp,
        });
      }

      wasBelowFullHpRef.current = true;

      if (fullHealthNotificationSent) {
        setFullHealthNotificationSent(false);
      }

      return;
    }

    if (decision === 'skip_in_combat') {
      console.info('[Telegram Notifications] Full HP notification skipped during active combat.');
      return;
    }

    if (decision === 'skip_already_sent') {
      console.info('[Telegram Notifications] Full HP notification already sent for current cycle.');
      return;
    }

    if (decision === 'skip_not_full') {
      return;
    }

    console.info('[Telegram Notifications] Full HP reached outside combat. Notification should be sent.', {
      currentHp: hero.currentHp,
      maxHp: derived.maxHp,
    });

    wasBelowFullHpRef.current = false;
    setFullHealthNotificationSent(true);

    void sendFullHealthNotification().then((result) => {
      console.info('[Telegram Notifications] Full HP notification completed.', {
        success: result.success,
        skipped: result.skipped,
        reason: result.reason,
        messageSent: result.messageSent,
      });
    });
  }, [hero.currentHp, derived.maxHp, fullHealthNotificationSent, isFighting]);

  // Debounced cloud save to Supabase.
  // Wait until cloud load is checked to avoid overwriting cloud save with old localStorage data.
  useEffect(() => {
    if (!cloudSaveChecked) {
      return;
    }

    scheduleCloudPlayerSave({
      hero,
      selectedLocationId,
      updatedAt: new Date().toISOString(),
    });
  }, [hero, selectedLocationId, cloudSaveChecked]);

  // Flush local save and cloud save when player backgrounds/closes the WebApp
  useEffect(() => {
    const flushOnBackground = () => {
      if (document.hidden) {
        flushPendingSaveGame();
        void flushCloudPlayerSave(true);
      }
    };

    const flushOnUnload = () => {
      flushPendingSaveGame();
      void flushCloudPlayerSave(true);
    };

    document.addEventListener('visibilitychange', flushOnBackground);
    window.addEventListener('beforeunload', flushOnUnload);

    return () => {
      document.removeEventListener('visibilitychange', flushOnBackground);
      window.removeEventListener('beforeunload', flushOnUnload);

      flushPendingSaveGame();
      void flushCloudPlayerSave(true);
    };
  }, []);

  // Real-time passive health regeneration loop.
  // Passive regen is intentionally blocked during active combat.
  useEffect(() => {
    const interval = setInterval(() => {
      setHero((currentHero) => {
        const currentDerived = calculateDerivedStats(
          currentHero.stats,
          currentHero.baseHp,
          undefined,
          currentHero,
        );

        if (!shouldApplyPassiveHealthRegen({
          currentHp: currentHero.currentHp,
          maxHp: currentDerived.maxHp,
          healthRegen: currentDerived.healthRegen,
          isFighting,
        })) return currentHero;

        const nextHp = Math.min(currentDerived.maxHp, currentHero.currentHp + currentDerived.healthRegen);

        if (nextHp === currentHero.currentHp) return currentHero;

        const updatedHero: HeroState = {
          ...currentHero,
          currentHp: nextHp,
          maxHp: currentDerived.maxHp,
        };

        scheduleSaveGame({
          hero: updatedHero,
          updatedAt: new Date().toISOString(),
        });

        return updatedHero;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isFighting]);

  // Apply offline local HP regeneration when player returns to the game.
  // This remains blocked during active combat to avoid extra healing from focus/visibility events mid-fight.
  useEffect(() => {
    const syncOfflineProgress = () => {
      if (document.hidden || isFighting) return;

      const progressedSave = applyOfflineHealthRegen(loadGame());

      if (!progressedSave) return;

      const progressedHero = applyAutoEquipPreset(progressedSave.hero);

      setHero(progressedHero);

      scheduleSaveGame({
        hero: progressedHero,
        updatedAt: progressedSave.updatedAt,
      });
    };

    window.addEventListener('focus', syncOfflineProgress);
    document.addEventListener('visibilitychange', syncOfflineProgress);

    return () => {
      window.removeEventListener('focus', syncOfflineProgress);
      document.removeEventListener('visibilitychange', syncOfflineProgress);
    };
  }, [isFighting]);

  const status = useMemo(
    () => ({
      level: hero.level,
      xp: hero.xp,
      nextLevelXp: xpToNextLevel(hero.level),
      gold: hero.gold,
      hp: hero.currentHp,
      maxHp: hero.maxHp,
    }),
    [hero],
  );

  function saveHeroLocally(nextHero: HeroState) {
    scheduleSaveGame({
      hero: nextHero,
      updatedAt: new Date().toISOString(),
    });
  }

  function forceSaveHeroToCloud(nextHero: HeroState, nextSelectedLocationId = selectedLocationId) {
    if (!cloudSaveChecked) {
      return;
    }

    void forceCloudPlayerSave({
      hero: nextHero,
      selectedLocationId: nextSelectedLocationId,
      updatedAt: new Date().toISOString(),
    });
  }

  function handleHeroChange(nextHero: HeroState) {
    const levelUpResult = checkLevelUp(nextHero.level, nextHero.xp);
    const didLevelUp = levelUpResult.newLevel > nextHero.level;

    const leveledHero: HeroState = didLevelUp
      ? {
          ...nextHero,
          level: levelUpResult.newLevel,
          xp: levelUpResult.remainingXp,
          unspentStatPoints: nextHero.unspentStatPoints + levelUpResult.statPointsGained,
        }
      : nextHero;

    const derived = calculateDerivedStats(leveledHero.stats, leveledHero.baseHp, undefined, leveledHero);

    const normalizedHero: HeroState = {
      ...leveledHero,
      maxHp: derived.maxHp,
      currentHp: didLevelUp ? derived.maxHp : Math.min(derived.maxHp, leveledHero.currentHp),
    };

    const shouldForceCloudSave = isCriticalHeroChange(hero, normalizedHero);

    setHero(normalizedHero);
    saveHeroLocally(normalizedHero);

    if (shouldForceCloudSave) {
      forceSaveHeroToCloud(normalizedHero);
    }
  }

  function handleLocationChange(nextLocationId: string) {
    setSelectedLocationId(nextLocationId);

    const nextHero = updateQuestProgressOnLocationChanged(hero, nextLocationId);

    handleHeroChange(nextHero);

    if (cloudSaveChecked) {
      void forceCloudPlayerSave({
        hero: nextHero,
        selectedLocationId: nextLocationId,
        updatedAt: new Date().toISOString(),
      });
    }

    handleTabChange('combat');
  }

  function handleTabChange(nextTab: AppTab) {
    startTransition(() => {
      setActiveTab(nextTab);
    });
  }

  function renderActiveScreen() {
    if (!isStartupReady) {
      return (
        <div className="screen screen-loading">
          <div className="panel screen-loading__panel">
            <h2 className="panel__title">Р—Р°РІР°РЅС‚Р°Р¶РµРЅРЅСЏ</h2>
            <p className="screen-loading__text">
              Р—РІС–СЂСЏС”РјРѕ Р»РѕРєР°Р»СЊРЅРµ С‚Р° С…РјР°СЂРЅРµ Р·Р±РµСЂРµР¶РµРЅРЅСЏ...
            </p>
          </div>
        </div>
      );
    }

    if (activeTab === 'combat') {
      return (
        <CombatScreen
          hero={hero}
          onHeroChange={handleHeroChange}
          selectedLocationId={selectedLocationId}
          onCombatStateChange={setIsFighting}
        />
      );
    }

    if (activeTab === 'character') {
      return <CharacterScreen hero={hero} onHeroChange={handleHeroChange} />;
    }

    if (activeTab === 'inventory') {
      return <InventoryScreen hero={hero} onHeroChange={handleHeroChange} />;
    }

    if (activeTab === 'quests') {
      return <QuestsScreen hero={hero} onHeroChange={handleHeroChange} />;
    }

    if (activeTab === 'map') {
      return (
        <MapScreen
          hero={hero}
          selectedLocationId={selectedLocationId}
          onSelectLocation={handleLocationChange}
        />
      );
    }

    return <ShopScreen hero={hero} onHeroChange={handleHeroChange} />;
  }

  return (
    <div className={`app-shell app-shell--${activeTab}`}>
      <TopStatusBar status={status} />

      <main className="app-main">
        <Suspense
          fallback={
            <div className="screen screen-loading">
              <div className="panel screen-loading__panel">
                <h2 className="panel__title">Завантаження</h2>
                <p className="screen-loading__text">Підвантажуємо оптимізований екран...</p>
              </div>
            </div>
          }
        >
          {renderActiveScreen()}
        </Suspense>
      </main>

      {isStartupReady ? (
        <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      ) : null}
    </div>
  );
}
