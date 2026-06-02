import { Suspense, lazy, startTransition, useEffect, useMemo, useState } from 'react';
import { BottomNavigation } from '../components/layout/BottomNavigation';
import { TopStatusBar } from '../components/layout/TopStatusBar';
import { createInitialHero } from '../game/createInitialHero';
import { applyOfflineHealthRegen, flushPendingSaveGame, loadGame, scheduleSaveGame } from '../game/save/saveSystem';
import { locations } from '../data/locations';
import { calculateDerivedStats, xpToNextLevel } from '../game/formulas/stats';
import { checkLevelUp } from '../game/formulas/progression';
import { updateQuestProgressOnLocationChanged } from '../game/formulas/quests';
import type { AppTab } from './tabs';
import { sendFullHealthNotification } from '../telegram/telegramNotifications';
import { flushCloudPlayerSave, scheduleCloudPlayerSave } from '../telegram/playerCloudSave';
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

export default function AppShell() {
  const [activeTab, setActiveTab] = useState<AppTab>('combat');
  const [hero, setHero] = useState<HeroState>(() => loadGame()?.hero ?? createInitialHero());
  
  // Shared state mapping selected locations
  const [selectedLocationId, setSelectedLocationId] = useState<string>(locations[0].id);

  // Active combat state reported by CombatScreen
  const [isFighting, setIsFighting] = useState(false);

  const [fullHealthNotificationSent, setFullHealthNotificationSent] = useState(() => {
    const save = loadGame();
    if (save?.hero) {
      const derived = calculateDerivedStats(save.hero.stats, save.hero.baseHp, undefined, save.hero);
      return save.hero.currentHp >= derived.maxHp;
    }
    return true; // Prevent immediate notification on new game / first cold start
  });

  // Track hero health transitions to trigger Telegram notifications only when player is away
useEffect(() => {
  const derived = calculateDerivedStats(hero.stats, hero.baseHp, undefined, hero);

  const isBelowFullHp = hero.currentHp < derived.maxHp;
  const isFullHp = hero.currentHp >= derived.maxHp;

  if (isBelowFullHp) {
    setFullHealthNotificationSent(false);
    return;
  }

  if (!isFullHp || fullHealthNotificationSent) {
    return;
  }

  setFullHealthNotificationSent(true);

  const telegramWebApp = (
    window as Window & {
      Telegram?: {
        WebApp?: {
          isActive?: boolean;
        };
      };
    }
  ).Telegram?.WebApp;

  const playerIsAway =
    document.hidden ||
    document.visibilityState === 'hidden' ||
    !document.hasFocus() ||
    telegramWebApp?.isActive === false;

  if (!playerIsAway) {
    console.info('[Telegram Notifications] Full HP reached, but player is active. Notification skipped.');
    return;
  }

  console.info('[Telegram Notifications] Full HP reached while player is away. Sending notification.');
  void sendFullHealthNotification();
}, [hero.currentHp, hero.maxHp, fullHealthNotificationSent]);
  useEffect(() => {
  scheduleCloudPlayerSave({
    hero,
    selectedLocationId,
    updatedAt: new Date().toISOString(),
  });
}, [hero, selectedLocationId]);
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
    };
  }, []);



  // Real-time health regeneration loop.
  useEffect(() => {
    const interval = setInterval(() => {
      setHero((currentHero) => {
        // Regeneration is blocked during active combat
        if (isFighting) return currentHero;
        if (currentHero.currentHp <= 0) return currentHero;

        const currentDerived = calculateDerivedStats(currentHero.stats, currentHero.baseHp, undefined, currentHero);
        if (currentDerived.healthRegen <= 0) return currentHero;
        if (currentHero.currentHp >= currentDerived.maxHp) return currentHero;

        const nextHp = Math.min(currentDerived.maxHp, currentHero.currentHp + currentDerived.healthRegen);
        if (nextHp === currentHero.currentHp) return currentHero;

        const updatedHero = {
          ...currentHero,
          currentHp: nextHp,
          maxHp: currentDerived.maxHp
        };
        // Auto-save the regenerated HP
        scheduleSaveGame({ hero: updatedHero, updatedAt: new Date().toISOString() });
        return updatedHero;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isFighting]);

  useEffect(() => {
    const syncOfflineProgress = () => {
      if (document.hidden || isFighting) return;

      const progressedSave = applyOfflineHealthRegen(loadGame());
      if (!progressedSave) return;

      setHero(progressedSave.hero);
      scheduleSaveGame(progressedSave);
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
      maxHp: hero.maxHp
    }),
    [hero]
  );

  function handleHeroChange(nextHero: HeroState) {
    const levelUpResult = checkLevelUp(nextHero.level, nextHero.xp);
    const didLevelUp = levelUpResult.newLevel > nextHero.level;

    const leveledHero: HeroState = didLevelUp
      ? {
          ...nextHero,
          level: levelUpResult.newLevel,
          xp: levelUpResult.remainingXp,
          unspentStatPoints: nextHero.unspentStatPoints + levelUpResult.statPointsGained
        }
      : nextHero;

    const derived = calculateDerivedStats(leveledHero.stats, leveledHero.baseHp, undefined, leveledHero);
    const normalizedHero: HeroState = {
      ...leveledHero,
      maxHp: derived.maxHp,
      currentHp: didLevelUp
        ? derived.maxHp
        : Math.min(derived.maxHp, leveledHero.currentHp)
    };

    setHero(normalizedHero);
    scheduleSaveGame({ hero: normalizedHero, updatedAt: new Date().toISOString() });
  }

  function handleTabChange(nextTab: AppTab) {
    startTransition(() => {
      setActiveTab(nextTab);
    });
  }

  function renderActiveScreen() {
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
          onSelectLocation={(locId) => {
            setSelectedLocationId(locId);
            const nextHero = updateQuestProgressOnLocationChanged(hero, locId);
            handleHeroChange(nextHero);
            handleTabChange('combat');
          }}
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
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
