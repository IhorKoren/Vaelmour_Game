import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Enemy, HeroState } from '../../../game/types';
import { locations } from '../../../data/locations';
import { calculateEnemyDamage, calculateHeroDamage } from '../../../game/formulas/combat';
import {
  getEffectiveWeaponStats,
  getEffectiveArmorStats,
  applyWeaponDurabilityLoss,
  applyArmorDurabilityLoss
} from '../../../game/formulas/equipment';
import { calculateSecondaryStats, getEffectiveAttackSpeed } from '../../../game/formulas/secondaryStats';
import { getBossForLocation } from '../../../game/formulas/enemyScaling';
import bossesJson from '../../../data/generated/bosses.json';
import { COMBAT_ATTACK_INTERVAL_MULTIPLIER } from '../../../game/constants';
import type { GeneratedEquipmentItem } from '../../../game/types';
import { getDisplayEnemyName } from '../../../utils/displayHelpers';
import { createEncounterEnemy } from '../services/combatEnemyService';
import { clearCombatTimeout } from '../services/combatTimerService';

type HuntState = 'idle' | 'searching' | 'fighting' | 'victory' | 'defeat';

interface VictoryRewards {
  gold: number;
  xp: number;
  material?: { id: string; name: string; rarity: string } | null;
  equipment?: GeneratedEquipmentItem | null;
}

interface BleedState { damage: number; ticksRemaining: number }
interface StaggerState { skipsRemaining: number }

interface VictoryCalculationResult {
  rewardedHero: HeroState;
  victoryRewards: VictoryRewards;
  logLines: string[];
}

interface UseCombatSessionProps {
  hero: HeroState;
  onHeroChange: (hero: HeroState) => void;
  selectedLocationId: string;
  onCombatStateChange?: (isFighting: boolean) => void;
  onVictoryCalculations: (enemy: Enemy, heroDamageLog: string) => VictoryCalculationResult;
}

const IDLE_MESSAGE = 'Приготуйтеся до полювання. Оберіть локацію на карті та почніть бій!';

export function useCombatSession({
  hero,
  onHeroChange,
  selectedLocationId,
  onCombatStateChange,
  onVictoryCalculations
}: UseCombatSessionProps) {
  const [huntState, setHuntState] = useState<HuntState>('idle');
  const [statusMessage, setStatusMessage] = useState(IDLE_MESSAGE);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const victoryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  const currentLocation = useMemo(() => {
    return locations.find((l) => l.id === selectedLocationId) ?? locations[0];
  }, [selectedLocationId]);

  const locationBoss = useMemo(() => {
    if (!currentLocation?.bossOrKeyEnemy || currentLocation.bossOrKeyEnemy === 'None') {
      return null;
    }
    return getBossForLocation(currentLocation.name, currentLocation.bossOrKeyEnemy, bossesJson);
  }, [currentLocation]);

  const [enemy, setEnemy] = useState<Enemy>(() => createEncounterEnemy(currentLocation));
  const [enemyHp, setEnemyHp] = useState(enemy.hp);

  const [heroAttacking, setHeroAttacking] = useState(false);
  const [enemyAttacking, setEnemyAttacking] = useState(false);
  const [heroFlash, setHeroFlash] = useState<{ damage: number; isCrit: boolean; id: number } | null>(null);
  const [enemyFlash, setEnemyFlash] = useState<{ damage: number; isCrit: boolean; id: number } | null>(null);

  const [encounterId, setEncounterId] = useState(0);
  const encounterIdRef = useRef(0);
  const [isAutoHuntEnabled, setIsAutoHuntEnabled] = useState(true);

  const [enemyBleed, setEnemyBleed] = useState<BleedState | null>(null);
  const [heroBleed, setHeroBleed] = useState<BleedState | null>(null);
  const [enemyStagger, setEnemyStagger] = useState<StaggerState | null>(null);
  const [heroStagger, setHeroStagger] = useState<StaggerState | null>(null);
  const flashIdCounter = useRef(0);
  const rewardGrantedRef = useRef(false);
  const [victoryRewards, setVictoryRewards] = useState<VictoryRewards | null>(null);

  const latestHero = useRef(hero);
  const latestEnemy = useRef(enemy);
  const latestEnemyHp = useRef(enemyHp);
  const latestOnHeroChange = useRef(onHeroChange);
  const latestEnemyBleed = useRef<BleedState | null>(enemyBleed);
  const latestHeroBleed = useRef<BleedState | null>(heroBleed);
  const latestEnemyStagger = useRef<StaggerState | null>(enemyStagger);
  const latestHeroStagger = useRef<StaggerState | null>(heroStagger);

  useEffect(() => {
    latestHero.current = hero;
    latestEnemy.current = enemy;
    latestEnemyHp.current = enemyHp;
    latestOnHeroChange.current = onHeroChange;
    latestEnemyBleed.current = enemyBleed;
    latestHeroBleed.current = heroBleed;
    latestEnemyStagger.current = enemyStagger;
    latestHeroStagger.current = heroStagger;
  }, [hero, enemy, enemyHp, onHeroChange, enemyBleed, heroBleed, enemyStagger, heroStagger]);

  useEffect(() => {
    return () => {
      clearCombatTimeout(searchTimeoutRef);
      clearCombatTimeout(victoryTimeoutRef);
    };
  }, []);

  useEffect(() => {
    clearCombatTimeout(searchTimeoutRef);
    clearCombatTimeout(victoryTimeoutRef);
    encounterIdRef.current += 1;

    const resetTimer = setTimeout(() => {
      setHuntState('idle');
      setStatusMessage('Ви змінили локацію. Приготуйтеся до нового полювання.');
      setEncounterId(encounterIdRef.current);
      setHeroAttacking(false);
      setEnemyAttacking(false);
      setHeroFlash(null);
      setEnemyFlash(null);
      setEnemyBleed(null);
      setHeroBleed(null);
      setEnemyStagger(null);
      setHeroStagger(null);
      rewardGrantedRef.current = false;
      setVictoryRewards(null);
    }, 0);

    return () => clearTimeout(resetTimer);
  }, [selectedLocationId]);

  useEffect(() => {
    if (onCombatStateChange) {
      onCombatStateChange(huntState === 'fighting');
    }
    return () => {
      if (onCombatStateChange) {
        onCombatStateChange(false);
      }
    };
  }, [huntState, onCombatStateChange]);

  const isEnemyDefeated = enemyHp <= 0;
  const heroDefeated = hero.currentHp <= 0;

  function resetEncounterTransientState() {
    setEnemyBleed(null);
    setHeroBleed(null);
    setEnemyStagger(null);
    setHeroStagger(null);
    setHeroAttacking(false);
    setEnemyAttacking(false);
    setHeroFlash(null);
    setEnemyFlash(null);
  }

  function applyBleedToEnemy(amount: number, ticks: number) {
    setEnemyBleed((current) => {
      if (!current) return { damage: amount, ticksRemaining: ticks };
      return {
        damage: Math.max(current.damage, amount),
        ticksRemaining: Math.max(current.ticksRemaining, ticks)
      };
    });
  }

  function applyBleedToHero(amount: number, ticks: number) {
    setHeroBleed((current) => {
      if (!current) return { damage: amount, ticksRemaining: ticks };
      return {
        damage: Math.max(current.damage, amount),
        ticksRemaining: Math.max(current.ticksRemaining, ticks)
      };
    });
  }

  const triggerDefeat = useCallback((defeatedHero: HeroState) => {
    clearCombatTimeout(searchTimeoutRef);
    clearCombatTimeout(victoryTimeoutRef);

    encounterIdRef.current += 1;
    setEncounterId(encounterIdRef.current);

    const retreatedHero = {
      ...defeatedHero,
      currentHp: 1
    };
    latestHero.current = retreatedHero;
    latestOnHeroChange.current(retreatedHero);

    setHuntState('defeat');
    setStatusMessage('Герой зазнав поразки. Поверніться до табору та відновіть сили.');
    resetEncounterTransientState();
    setVictoryRewards(null);
  }, []);

  const startEncounter = useCallback((nextEnemy: Enemy, nextMessage: string) => {
    setEnemy(nextEnemy);
    setEnemyHp(nextEnemy.hp);
    resetEncounterTransientState();
    setStatusMessage(nextMessage);
    setHuntState('fighting');
    rewardGrantedRef.current = false;
  }, []);

  const startHunting = useCallback(() => {
    clearCombatTimeout(searchTimeoutRef);
    clearCombatTimeout(victoryTimeoutRef);

    encounterIdRef.current += 1;
    const localEncounterId = encounterIdRef.current;
    setEncounterId(localEncounterId);
    setVictoryRewards(null);
    setHuntState('searching');
    setStatusMessage('Шукаємо ворога...');

    const id = setTimeout(() => {
      if (encounterIdRef.current !== localEncounterId) return;
      const nextEnemy = createEncounterEnemy(currentLocation);
      startEncounter(nextEnemy, `Сутичка почалася: ${getDisplayEnemyName(nextEnemy.id)}.`);
    }, 1500);
    searchTimeoutRef.current = id;
  }, [currentLocation, startEncounter]);

  const startBossFight = useCallback(() => {
    if (!locationBoss) return;
    clearCombatTimeout(searchTimeoutRef);
    clearCombatTimeout(victoryTimeoutRef);

    encounterIdRef.current += 1;
    const localEncounterId = encounterIdRef.current;
    setEncounterId(localEncounterId);
    setVictoryRewards(null);
    setHuntState('searching');
    setStatusMessage(`Викликаємо боса локації: ${locationBoss.name}...`);

    const id = setTimeout(() => {
      if (encounterIdRef.current !== localEncounterId) return;
      startEncounter(locationBoss, `Бос з'явився: ${getDisplayEnemyName(locationBoss.id)}.`);
    }, 1500);
    searchTimeoutRef.current = id;
  }, [locationBoss, startEncounter]);

  const handleRetreat = useCallback(() => {
    clearCombatTimeout(searchTimeoutRef);
    clearCombatTimeout(victoryTimeoutRef);
    encounterIdRef.current += 1;
    setEncounterId(encounterIdRef.current);
    setHuntState('idle');
    setStatusMessage('Ви успішно припинили полювання та повернулися до табору.');
    setVictoryRewards(null);
    resetEncounterTransientState();
  }, []);

  const handleReturn = useCallback(() => {
    clearCombatTimeout(searchTimeoutRef);
    clearCombatTimeout(victoryTimeoutRef);
    encounterIdRef.current += 1;
    setEncounterId(encounterIdRef.current);
    setHuntState('idle');
    setStatusMessage('Ви повернулися до табору. Відновіть здоровʼя перед наступним походом.');
    setVictoryRewards(null);
    resetEncounterTransientState();
  }, []);

  const processVictoryRewards = useCallback((nextEnemyHp: number, heroDamageLog: string) => {
    if (nextEnemyHp > 0 || rewardGrantedRef.current) return;
    rewardGrantedRef.current = true;
    setHuntState('victory');

    const result = onVictoryCalculations(latestEnemy.current, heroDamageLog);
    setVictoryRewards(result.victoryRewards);
    setStatusMessage(result.logLines[0] ?? 'Перемога!');
    latestOnHeroChange.current(result.rewardedHero);

    if (isAutoHuntEnabled) {
      const localEncounterId = encounterIdRef.current;
      const id = setTimeout(() => {
        if (encounterIdRef.current !== localEncounterId) return;
        setVictoryRewards(null);
        setHuntState('searching');
        setStatusMessage('Шукаємо наступного ворога...');
        const nextId = setTimeout(() => {
          if (encounterIdRef.current !== localEncounterId) return;
          encounterIdRef.current += 1;
          const newLocalId = encounterIdRef.current;
          setEncounterId(newLocalId);
          const nextEnemy = createEncounterEnemy(currentLocation);
          startEncounter(nextEnemy, `Сутичка почалася: ${getDisplayEnemyName(nextEnemy.id)}.`);
        }, 1500);
        searchTimeoutRef.current = nextId;
      }, 2000);
      victoryTimeoutRef.current = id;
    }
  }, [currentLocation, isAutoHuntEnabled, onVictoryCalculations, startEncounter]);

  const isCombatActive = huntState === 'fighting' && enemyHp > 0 && hero.currentHp > 0;

  useEffect(() => {
    if (!isCombatActive) {
      return;
    }

    const localEncounterId = encounterIdRef.current;
    let heroTimeoutId: ReturnType<typeof setTimeout>;
    let enemyTimeoutId: ReturnType<typeof setTimeout>;

    const runHeroAttack = () => {
      if (encounterIdRef.current !== localEncounterId) return;

      if (latestHeroStagger.current?.skipsRemaining) {
        setHeroStagger((current) => current && current.skipsRemaining > 1 ? { skipsRemaining: current.skipsRemaining - 1 } : null);
        return;
      }

      if (latestHeroBleed.current?.ticksRemaining) {
        const bleedDamage = latestHeroBleed.current.damage;
        const nextHeroFromBleed = {
          ...latestHero.current,
          currentHp: Math.max(0, latestHero.current.currentHp - bleedDamage)
        };
        latestOnHeroChange.current(nextHeroFromBleed);
        setHeroBleed((current) => current && current.ticksRemaining > 1 ? { ...current, ticksRemaining: current.ticksRemaining - 1 } : null);
        if (nextHeroFromBleed.currentHp <= 0) {
          triggerDefeat(nextHeroFromBleed);
          return;
        }
      }

      if (latestEnemyHp.current <= 0 || latestHero.current.currentHp <= 0) return;

      const currentWeapon = getEffectiveWeaponStats(latestHero.current);
      const currentArmor = getEffectiveArmorStats(latestHero.current);
      const secondary = calculateSecondaryStats(latestHero.current);
      const heroDamage = calculateHeroDamage({
        hero: latestHero.current,
        weapon: currentWeapon,
        armor: currentArmor,
        enemy: latestEnemy.current,
        currentEnemyHp: latestEnemyHp.current
      });

      const nextEnemyHp = Math.max(0, latestEnemyHp.current - heroDamage.damage);
      setHeroAttacking(true);
      setTimeout(() => setHeroAttacking(false), 200);

      const prevDurability = latestHero.current.equipmentDurability?.weapon ?? 100;
      const heroWithDurabilityLoss = applyWeaponDurabilityLoss(latestHero.current, 1);
      const nextDurability = heroWithDurabilityLoss.equipmentDurability?.weapon ?? 100;
      const nextHero = {
        ...heroWithDurabilityLoss,
        currentHp: Math.min(heroWithDurabilityLoss.maxHp, heroWithDurabilityLoss.currentHp + (heroDamage.lifesteal ?? 0))
      };
      latestOnHeroChange.current(nextHero);

      const bleedChance = secondary.bleedChance + (currentWeapon.type === 'axe' ? 0.05 : 0);
      if (heroDamage.bleedApplied) {
        applyBleedToEnemy(heroDamage.bleedApplied.damage, heroDamage.bleedApplied.ticks);
      } else if (heroDamage.damage > 0 && (heroDamage.crit || Math.random() < bleedChance)) {
        const bleedDamage = Math.max(1, Math.round(heroDamage.damage * (0.12 + secondary.bleedDamage)));
        applyBleedToEnemy(bleedDamage, 3);
      }

      if (secondary.staggerPower > 0) {
        const effectiveEnemyPoise = Math.max(0, (latestEnemy.current.poise ?? 0));
        const staggerChance = Math.max(0, Math.min(0.75, secondary.staggerPower - effectiveEnemyPoise));
        if (staggerChance > 0 && Math.random() < staggerChance) {
          setEnemyStagger({ skipsRemaining: 1 });
        }
      }

      if (prevDurability > 25 && nextDurability <= 25 && nextDurability > 0) {
        setStatusMessage(`Ваша зброя (${currentWeapon.name}) сильно пошкоджена.`);
      } else if (prevDurability > 0 && nextDurability === 0) {
        setStatusMessage(`Ваша зброя (${currentWeapon.name}) зламана.`);
      }

      if (heroDamage.damage > 0) {
        flashIdCounter.current += 1;
        setEnemyFlash({
          damage: heroDamage.damage,
          isCrit: heroDamage.crit,
          id: flashIdCounter.current
        });
      }

      setEnemyHp(nextEnemyHp);

      if (nextEnemyHp <= 0) {
        processVictoryRewards(nextEnemyHp, heroDamage.log);
      }
    };

    const runEnemyAttack = () => {
      if (encounterIdRef.current !== localEncounterId) return;

      if (latestEnemyStagger.current?.skipsRemaining) {
        setEnemyStagger((current) => current && current.skipsRemaining > 1 ? { skipsRemaining: current.skipsRemaining - 1 } : null);
        return;
      }

      if (latestEnemyBleed.current?.ticksRemaining) {
        const bleedDamage = latestEnemyBleed.current.damage;
        const nextEnemyHpFromBleed = Math.max(0, latestEnemyHp.current - bleedDamage);
        setEnemyHp(nextEnemyHpFromBleed);
        setEnemyBleed((current) => current && current.ticksRemaining > 1 ? { ...current, ticksRemaining: current.ticksRemaining - 1 } : null);
        if (nextEnemyHpFromBleed <= 0) {
          processVictoryRewards(nextEnemyHpFromBleed, 'bleed');
          return;
        }
      }

      if (latestEnemyHp.current <= 0 || latestHero.current.currentHp <= 0) return;

      const currentArmor = getEffectiveArmorStats(latestHero.current);
      const secondary = calculateSecondaryStats(latestHero.current);
      const enemyDamage = calculateEnemyDamage({
        enemy: latestEnemy.current,
        hero: latestHero.current,
        armor: currentArmor
      });

      const prevDurability = latestHero.current.equipmentDurability?.chest ?? 100;
      const heroWithLoss = applyArmorDurabilityLoss(latestHero.current, 1);
      const nextDurability = heroWithLoss.equipmentDurability?.chest ?? 100;

      const nextHero = {
        ...heroWithLoss,
        currentHp: Math.max(0, heroWithLoss.currentHp - enemyDamage.damage)
      };

      if (enemyDamage.counterDamage && enemyDamage.counterDamage > 0) {
        const nextEnemyHpAfterCounter = Math.max(0, latestEnemyHp.current - enemyDamage.counterDamage);
        setEnemyHp(nextEnemyHpAfterCounter);
        if (nextEnemyHpAfterCounter <= 0) {
          latestOnHeroChange.current(nextHero);
          processVictoryRewards(nextEnemyHpAfterCounter, 'counter');
          return;
        }
      }

      const enemySignature = `${latestEnemy.current.name} ${latestEnemy.current.notes ?? ''} ${latestEnemy.current.archetype ?? ''}`.toLowerCase();
      if (enemyDamage.damage > 0 && enemySignature.includes('bleed') && Math.random() < Math.max(0.08, 0.2 - secondary.bleedResistance)) {
        const bleedDamage = Math.max(1, Math.round(latestEnemy.current.attack * (0.08 + Math.max(0, 0.18 - secondary.bleedResistance))));
        applyBleedToHero(bleedDamage, 3);
      }
      if (enemyDamage.damage > 0 && (enemySignature.includes('stagger') || enemySignature.includes('brute')) && Math.random() < Math.max(0.05, 0.18 - secondary.staggerResistance - secondary.poise)) {
        setHeroStagger({ skipsRemaining: 1 });
      }

      setEnemyAttacking(true);
      setTimeout(() => setEnemyAttacking(false), 200);

      if (enemyDamage.damage > 0) {
        flashIdCounter.current += 1;
        setHeroFlash({
          damage: enemyDamage.damage,
          isCrit: enemyDamage.crit,
          id: flashIdCounter.current
        });
      }

      latestOnHeroChange.current(nextHero);

      if (nextHero.currentHp <= 0) {
        triggerDefeat(nextHero);
        return;
      }

      if (prevDurability > 25 && nextDurability <= 25 && nextDurability > 0) {
        setStatusMessage(`Ваш обладунок (${currentArmor.name}) сильно пошкоджений.`);
      } else if (prevDurability > 0 && nextDurability === 0) {
        setStatusMessage(`Ваш обладунок (${currentArmor.name}) зламаний.`);
      }
    };

    const scheduleHeroAttack = () => {
      if (latestEnemyHp.current <= 0 || latestHero.current.currentHp <= 0) return;
      const currentWeapon = getEffectiveWeaponStats(latestHero.current);
      const currentSpeed = getEffectiveAttackSpeed(latestHero.current, currentWeapon);
      const speedSeconds = currentSpeed > 0 ? (1 / currentSpeed) : 2.0;

      heroTimeoutId = setTimeout(() => {
        runHeroAttack();
        scheduleHeroAttack();
      }, speedSeconds * 1000 * COMBAT_ATTACK_INTERVAL_MULTIPLIER);
    };

    const scheduleEnemyAttack = () => {
      if (latestEnemyHp.current <= 0 || latestHero.current.currentHp <= 0) return;
      const currentSpeed = latestEnemy.current.attackSpeed ?? 2.4;
      const speedSeconds = currentSpeed > 0 ? (1 / currentSpeed) : 2.4;

      enemyTimeoutId = setTimeout(() => {
        runEnemyAttack();
        scheduleEnemyAttack();
      }, speedSeconds * 1000 * COMBAT_ATTACK_INTERVAL_MULTIPLIER);
    };

    scheduleHeroAttack();
    scheduleEnemyAttack();

    return () => {
      clearTimeout(heroTimeoutId);
      clearTimeout(enemyTimeoutId);
    };
  }, [encounterId, isCombatActive, processVictoryRewards, triggerDefeat]);

  return {
    huntState,
    enemy,
    enemyHp,
    statusMessage,
    heroAttacking,
    enemyAttacking,
    heroFlash,
    enemyFlash,
    victoryRewards,
    isEnemyDefeated,
    heroDefeated,
    currentLocation,
    locationBoss,
    startHunting,
    startBossFight,
    handleRetreat,
    handleReturn,
    isAutoHuntEnabled,
    setIsAutoHuntEnabled
  };
}
