import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Enemy, HeroState, Skill } from '../../../game/types';
import { skills } from '../../../data/skills';
import { locations } from '../../../data/locations';
import { calculateEnemyDamage, calculateHeroDamage } from '../../../game/formulas/combat';
import {
  clampRage,
  getRageFromDamageDealt,
  getRageFromDamageTaken,
  canUseSkill,
  spendRage,
  getSkillRageCost
} from '../../../game/formulas/combatMechanics';
import {
  getEffectiveWeaponStats,
  getEffectiveArmorStats,
  applyWeaponDurabilityLoss,
  applyArmorDurabilityLoss
} from '../../../game/formulas/equipment';
import { calculateSecondaryStats, getEffectiveAttackSpeed } from '../../../game/formulas/secondaryStats';
import { getBossForLocation } from '../../../game/formulas/enemyScaling';
import bossesJson from '../../../data/generated/bosses.json';
import { isSkillUnlocked } from '../../../game/formulas/skills';
import { COMBAT_ATTACK_INTERVAL_MULTIPLIER } from '../../../game/constants';
import type { GeneratedEquipmentItem } from '../../../game/types';
import { getDisplayEnemyName } from '../../../utils/displayHelpers';
import { buildEncounterStartLog, createEncounterEnemy } from '../services/combatEnemyService';
import { prependCombatLogEntries } from '../services/combatLogService';
import { clearCombatTimeout } from '../services/combatTimerService';

const MAX_COMBAT_LOG_ENTRIES = 6;

type HuntState = 'idle' | 'searching' | 'fighting' | 'victory' | 'defeat';

interface VictoryRewards {
  gold: number;
  xp: number;
  material?: { id: string; name: string; rarity: string } | null;
  equipment?: GeneratedEquipmentItem | null;
}

interface BleedState { damage: number; ticksRemaining: number }
interface StaggerState { skipsRemaining: number }
interface TimedBuffState { expiresAt: number; value: number }

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

export function useCombatSession({
  hero,
  onHeroChange,
  selectedLocationId,
  onCombatStateChange,
  onVictoryCalculations
}: UseCombatSessionProps) {
  const [huntState, setHuntState] = useState<HuntState>('idle');
  
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const victoryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const weapon = useMemo(() => getEffectiveWeaponStats(hero), [hero]);
  const armor = useMemo(() => getEffectiveArmorStats(hero), [hero]);
  const availableSkills = useMemo(
    () => skills.filter((skill) => skill.weaponTypes.includes('all') || skill.weaponTypes.includes(weapon.type)),
    [weapon.type]
  );
  
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
  
  const [log, setLog] = useState<string[]>(['Приготуйтеся до полювання. Оберіть локацію на карті та почніть бій!']);
  const [heroRage, setHeroRage] = useState(0);

  const [heroAttacking, setHeroAttacking] = useState(false);
  const [enemyAttacking, setEnemyAttacking] = useState(false);
  
  const [heroFlash, setHeroFlash] = useState<{ damage: number; isCrit: boolean; id: number } | null>(null);
  const [enemyFlash, setEnemyFlash] = useState<{ damage: number; isCrit: boolean; id: number } | null>(null);
  const [rageFlash, setRageFlash] = useState<{ amount: number; id: number } | null>(null);

  const [encounterId, setEncounterId] = useState(0);
  const [enemyBleed, setEnemyBleed] = useState<BleedState | null>(null);
  const [heroBleed, setHeroBleed] = useState<BleedState | null>(null);
  const [enemyStagger, setEnemyStagger] = useState<StaggerState | null>(null);
  const [heroStagger, setHeroStagger] = useState<StaggerState | null>(null);
  const [guardedReduction, setGuardedReduction] = useState(0);
  const [frenziedSwingsBuff, setFrenziedSwingsBuff] = useState<TimedBuffState | null>(null);
  const [enemyPoiseShred, setEnemyPoiseShred] = useState<TimedBuffState | null>(null);
  const [skillCooldowns, setSkillCooldowns] = useState<Record<string, number>>({});
  const flashIdCounter = useRef(0);
  const rewardGrantedRef = useRef(false);
  const [victoryRewards, setVictoryRewards] = useState<VictoryRewards | null>(null);
  const appendCombatLog = useCallback((entry: string, maxEntries = MAX_COMBAT_LOG_ENTRIES) => {
    setLog((previous) => [entry, ...previous].slice(0, maxEntries));
  }, []);

  // Sync state on location switch
  useEffect(() => {
    clearCombatTimeout(searchTimeoutRef);
    clearCombatTimeout(victoryTimeoutRef);
    
    const resetTimer = setTimeout(() => {
      setHuntState('idle');
      setLog(['Ви змінили локацію. Приготуйтеся до нового полювання.']);
      setHeroRage(0);
      setRageFlash(null);
      setEncounterId((id) => id + 1);
      
      setHeroAttacking(false);
      setEnemyAttacking(false);
      setHeroFlash(null);
      setEnemyFlash(null);
      setEnemyBleed(null);
      setHeroBleed(null);
      setEnemyStagger(null);
      setHeroStagger(null);
      setGuardedReduction(0);
      setFrenziedSwingsBuff(null);
      setEnemyPoiseShred(null);
      setSkillCooldowns({});
      rewardGrantedRef.current = false;
      setVictoryRewards(null);
    }, 0);

    return () => clearTimeout(resetTimer);
  }, [selectedLocationId]);

  // Report active fighting state back to parent shell
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

  const latestHero = useRef(hero);
  const latestEnemy = useRef(enemy);
  const latestEnemyHp = useRef(enemyHp);
  const latestOnHeroChange = useRef(onHeroChange);
  const latestHeroRage = useRef(heroRage);
  const latestEnemyBleed = useRef<BleedState | null>(enemyBleed);
  const latestHeroBleed = useRef<BleedState | null>(heroBleed);
  const latestEnemyStagger = useRef<StaggerState | null>(enemyStagger);
  const latestHeroStagger = useRef<StaggerState | null>(heroStagger);

  useEffect(() => {
    latestHero.current = hero;
    latestEnemy.current = enemy;
    latestEnemyHp.current = enemyHp;
    latestOnHeroChange.current = onHeroChange;
    latestHeroRage.current = heroRage;
    latestEnemyBleed.current = enemyBleed;
    latestHeroBleed.current = heroBleed;
    latestEnemyStagger.current = enemyStagger;
    latestHeroStagger.current = heroStagger;
  }, [hero, enemy, enemyHp, onHeroChange, heroRage, enemyBleed, heroBleed, enemyStagger, heroStagger]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      clearCombatTimeout(searchTimeoutRef);
      clearCombatTimeout(victoryTimeoutRef);
    };
  }, []);

  const startHunting = useCallback(() => {
    clearCombatTimeout(searchTimeoutRef);
    clearCombatTimeout(victoryTimeoutRef);
    
    setVictoryRewards(null);
    setHuntState('searching');
    setLog(['Шукаємо ворога...']);
    
    const id = setTimeout(() => {
      const finalEnemy = createEncounterEnemy(currentLocation);
      setEnemy(finalEnemy);
      setEnemyHp(finalEnemy.hp);
      setEnemyBleed(null);
      setHeroBleed(null);
      setEnemyStagger(null);
      setHeroStagger(null);
      setGuardedReduction(0);
      setFrenziedSwingsBuff(null);
      setEnemyPoiseShred(null);
      setSkillCooldowns({});
      setLog([buildEncounterStartLog(finalEnemy)]);
      setHeroRage(0);
      setHuntState('fighting');
      rewardGrantedRef.current = false;
      setEncounterId((prev) => prev + 1);
    }, 1500);
    searchTimeoutRef.current = id;
  }, [currentLocation]);

  const startBossFight = useCallback(() => {
    if (!locationBoss) return;
    clearCombatTimeout(searchTimeoutRef);
    clearCombatTimeout(victoryTimeoutRef);

    setVictoryRewards(null);
    setHuntState('searching');
    setLog([`Викликаємо боса локації: ${locationBoss.name}...`]);

    const id = setTimeout(() => {
      setEnemy(locationBoss);
      setEnemyHp(locationBoss.hp);
      setEnemyBleed(null);
      setHeroBleed(null);
      setEnemyStagger(null);
      setHeroStagger(null);
      setGuardedReduction(0);
      setFrenziedSwingsBuff(null);
      setEnemyPoiseShred(null);
      setSkillCooldowns({});
      setLog([`🚨 БОС З’ЯВИВСЯ! Перед вами постає ${locationBoss.name} (${locationBoss.level ?? 1} рівень).`]);
      setHeroRage(0);
      setHuntState('fighting');
      rewardGrantedRef.current = false;
      setEncounterId((prev) => prev + 1);
    }, 1500);
    searchTimeoutRef.current = id;
  }, [locationBoss]);

  const handleRetreat = useCallback(() => {
    clearCombatTimeout(searchTimeoutRef);
    clearCombatTimeout(victoryTimeoutRef);
    setHeroRage(0);
    setHuntState('idle');
    setLog(['Ви успішно припинили полювання та повернулися до табору.']);
  }, []);

  const handleReturn = useCallback(() => {
    clearCombatTimeout(searchTimeoutRef);
    clearCombatTimeout(victoryTimeoutRef);
    // Safe complete heal on returning to camp
    latestOnHeroChange.current({ ...latestHero.current, currentHp: latestHero.current.maxHp });
    setHeroRage(0);
    setHuntState('idle');
    setLog(['Ви повернулися до табору. Ваші сили повністю відновлені.']);
  }, []);

  const processVictoryRewards = useCallback((nextEnemyHp: number, heroDamageLog: string) => {
    if (nextEnemyHp > 0) return;
    if (rewardGrantedRef.current) return;
    rewardGrantedRef.current = true;

    setHuntState('victory');

    const result = onVictoryCalculations(latestEnemy.current, heroDamageLog);
    
    setVictoryRewards(result.victoryRewards);
    setLog((previous) =>
      prependCombatLogEntries(previous, result.logLines, MAX_COMBAT_LOG_ENTRIES),
    );
    
    // Pass reward hero back to shell
    latestOnHeroChange.current(result.rewardedHero);

    // Automatically hunt the next enemy in 2 seconds
    const id = setTimeout(() => {
      setVictoryRewards(null);
      setHuntState('searching');
      const nextId = setTimeout(() => {
        const finalEnemy = createEncounterEnemy(currentLocation);
        setEnemy(finalEnemy);
        setEnemyHp(finalEnemy.hp);
        setLog([buildEncounterStartLog(finalEnemy)]);
        setHuntState('fighting');
        rewardGrantedRef.current = false;
        setEncounterId((prev) => prev + 1);
      }, 1500);
      searchTimeoutRef.current = nextId;
    }, 2000);
    victoryTimeoutRef.current = id;
  }, [currentLocation, onVictoryCalculations]);

  const basicAttackSkill = useMemo<Skill>(() => ({
    id: 'basic_attack',
    name: 'Звичайна атака',
    weaponTypes: ['all'],
    cooldown: 0,
    cost: 0,
    scaling: '0.5',
    tags: ['basic'],
    description: 'Звичайний фізичний випад.'
  }), []);

  const isCombatActive = huntState === 'fighting' && enemyHp > 0 && hero.currentHp > 0;

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

  function isTimedBuffActive(buff: TimedBuffState | null): boolean {
    return Boolean(buff && buff.expiresAt > Date.now());
  }

  useEffect(() => {
    if (!isCombatActive) {
      return;
    }

    let heroTimeoutId: ReturnType<typeof setTimeout>;
    let enemyTimeoutId: ReturnType<typeof setTimeout>;

    // Trigger basic attack for Hero
    const runHeroAttack = () => {
      if (latestHeroStagger.current?.skipsRemaining) {
        setHeroStagger((current) => current && current.skipsRemaining > 1 ? { skipsRemaining: current.skipsRemaining - 1 } : null);
        appendCombatLog('⚠️ Ви приголомшені й пропускаєте атаку.');
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
        appendCombatLog(`☠️ Ви втрачаєте ${bleedDamage} HP від кровотечі.`);
        if (nextHeroFromBleed.currentHp <= 0) {
          handleReturn();
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
        skill: basicAttackSkill,
        enemy: latestEnemy.current,
        currentEnemyHp: latestEnemyHp.current,
        targetBleeding: Boolean(latestEnemyBleed.current)
      });

      const nextEnemyHp = Math.max(0, latestEnemyHp.current - heroDamage.damage);

      setHeroAttacking(true);
      setTimeout(() => setHeroAttacking(false), 200);

      const frenzyBonus = isTimedBuffActive(frenziedSwingsBuff) ? frenziedSwingsBuff!.value : 0;
      const rageGain = getRageFromDamageDealt(heroDamage.damage, secondary.rageFromAttacks + frenzyBonus);
      const nextRage = clampRage(latestHeroRage.current + rageGain);
      setHeroRage(nextRage);

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
      const effectiveEnemyPoise = Math.max(0, (latestEnemy.current.poise ?? 0) - (isTimedBuffActive(enemyPoiseShred) ? enemyPoiseShred!.value : 0));
      const staggerChance = heroDamage.staggerApplied ? Math.max(0.05, Math.min(0.75, heroDamage.staggerApplied - effectiveEnemyPoise)) : 0;
      if (staggerChance > 0 && Math.random() < staggerChance) {
        setEnemyStagger({ skipsRemaining: 1 });
      }

      if (prevDurability > 25 && nextDurability <= 25 && nextDurability > 0) {
        appendCombatLog(`⚠️ Ваша зброя (${currentWeapon.name}) сильно пошкоджена!`, 8);
      } else if (prevDurability > 0 && nextDurability === 0) {
        appendCombatLog(`🚨 Ваша зброя (${currentWeapon.name}) зламана!`, 8);
      }

      flashIdCounter.current += 1;
      setRageFlash({
        amount: rageGain,
        id: flashIdCounter.current
      });

      if (heroDamage.damage > 0) {
        flashIdCounter.current += 1;
        setEnemyFlash({
          damage: heroDamage.damage,
          isCrit: heroDamage.crit,
          id: flashIdCounter.current
        });
      }

      setEnemyHp(nextEnemyHp);

      let translatedDmgLog = heroDamage.log;
      const enemyName = getDisplayEnemyName(latestEnemy.current.id);
      translatedDmgLog = translatedDmgLog
        .replace(new RegExp(latestHero.current.name, 'g'), 'Ви')
        .replace(new RegExp(latestEnemy.current.name, 'g'), enemyName)
        .replace(/attacks/i, 'атакуєте')
        .replace(/deals/i, 'завдаючи')
        .replace(/damage/i, 'шкоди')
        .replace(/critical hit/i, 'КРИТИЧНИЙ УДАР')
        .replace(/dodges/i, 'ухиляється')
        .replace(/misses/i, 'промахується');

      if (nextEnemyHp <= 0) {
        processVictoryRewards(nextEnemyHp, translatedDmgLog);
        return;
      }

      appendCombatLog(translatedDmgLog);
    };

    // Trigger basic attack for Enemy
    const runEnemyAttack = () => {
      if (latestEnemyStagger.current?.skipsRemaining) {
        setEnemyStagger((current) => current && current.skipsRemaining > 1 ? { skipsRemaining: current.skipsRemaining - 1 } : null);
        appendCombatLog('🔨 Ворог приголомшений і пропускає атаку.');
        return;
      }

      if (latestEnemyBleed.current?.ticksRemaining) {
        const bleedDamage = latestEnemyBleed.current.damage;
        const nextEnemyHpFromBleed = Math.max(0, latestEnemyHp.current - bleedDamage);
        setEnemyHp(nextEnemyHpFromBleed);
        setEnemyBleed((current) => current && current.ticksRemaining > 1 ? { ...current, ticksRemaining: current.ticksRemaining - 1 } : null);
        appendCombatLog(`☠️ ${getDisplayEnemyName(latestEnemy.current.id)} втрачає ${bleedDamage} HP від кровотечі.`);
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

      let incomingDamage = enemyDamage.damage;
      if (guardedReduction > 0) {
        incomingDamage = Math.max(1, Math.round(incomingDamage * (1 - guardedReduction)));
        setGuardedReduction(0);
      }

      const nextHero = {
        ...heroWithLoss,
        currentHp: Math.max(0, heroWithLoss.currentHp - incomingDamage)
      };
      const rageFromTakingDamage = getRageFromDamageTaken(incomingDamage);
      setHeroRage((current) => clampRage(current + rageFromTakingDamage));

      if (enemyDamage.counterDamage && enemyDamage.counterDamage > 0) {
        const nextEnemyHpAfterCounter = Math.max(0, latestEnemyHp.current - enemyDamage.counterDamage);
        setEnemyHp(nextEnemyHpAfterCounter);
        appendCombatLog(`↩️ Контрудар завдає ${enemyDamage.counterDamage} шкоди ворогу.`);
        if (nextEnemyHpAfterCounter <= 0) {
          latestOnHeroChange.current(nextHero);
          processVictoryRewards(nextEnemyHpAfterCounter, 'counter');
          return;
        }
      }

      const enemySignature = `${latestEnemy.current.name} ${latestEnemy.current.notes ?? ''} ${latestEnemy.current.archetype ?? ''}`.toLowerCase();
      if (incomingDamage > 0 && enemySignature.includes('bleed') && Math.random() < Math.max(0.08, 0.2 - secondary.bleedResistance)) {
        const bleedDamage = Math.max(1, Math.round(latestEnemy.current.attack * (0.08 + Math.max(0, 0.18 - secondary.bleedResistance))));
        applyBleedToHero(bleedDamage, 3);
      }
      if (incomingDamage > 0 && (enemySignature.includes('stagger') || enemySignature.includes('brute')) && Math.random() < Math.max(0.05, 0.18 - secondary.staggerResistance - secondary.poise)) {
        setHeroStagger({ skipsRemaining: 1 });
      }

      setEnemyAttacking(true);
      setTimeout(() => setEnemyAttacking(false), 200);

      if (enemyDamage.damage > 0) {
        flashIdCounter.current += 1;
        setHeroFlash({
          damage: incomingDamage,
          isCrit: enemyDamage.crit,
          id: flashIdCounter.current
        });
      }

      latestOnHeroChange.current(nextHero);

      if (nextHero.currentHp <= 0) {
        clearCombatTimeout(searchTimeoutRef);
        clearCombatTimeout(victoryTimeoutRef);
        const retreatedHero = {
          ...nextHero,
          currentHp: 1
        };
        latestHero.current = retreatedHero;
        latestOnHeroChange.current(retreatedHero);
        setHeroRage(0);
        setHuntState('idle');
        setHeroAttacking(false);
        setEnemyAttacking(false);
        setHeroFlash(null);
        setEnemyFlash(null);
        setRageFlash(null);
        appendCombatLog('Герой зазнав поразки, отримав 1 HP і автоматично відступив до табору.');
        return;
      }

      let translatedDmgLog = enemyDamage.log;
      const enemyName = getDisplayEnemyName(latestEnemy.current.id);
      translatedDmgLog = translatedDmgLog
        .replace(new RegExp(latestHero.current.name, 'g'), 'Ви')
        .replace(new RegExp(latestEnemy.current.name, 'g'), enemyName)
        .replace(/attacks/i, 'атакує')
        .replace(/deals/i, 'завдаючи')
        .replace(/damage/i, 'шкоди')
        .replace(/critical hit/i, 'КРИТИЧНИЙ УДАР')
        .replace(/dodges/i, 'ухиляється')
        .replace(/misses/i, 'промахується');

      appendCombatLog(translatedDmgLog);

      if (prevDurability > 25 && nextDurability <= 25 && nextDurability > 0) {
        appendCombatLog(`⚠️ Ваш обладунок (${currentArmor.name}) сильно пошкоджений!`);
      } else if (prevDurability > 0 && nextDurability === 0) {
        appendCombatLog(`🚨 Ваш обладунок (${currentArmor.name}) зламаний!`);
      }
    };

    const scheduleHeroAttack = () => {
      if (latestEnemyHp.current <= 0 || latestHero.current.currentHp <= 0) return;
      const currentWeapon = getEffectiveWeaponStats(latestHero.current);
      const currentSpeed = getEffectiveAttackSpeed(latestHero.current, currentWeapon) * (1 + (isTimedBuffActive(frenziedSwingsBuff) ? frenziedSwingsBuff!.value : 0));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isCombatActive,
    encounterId,
    basicAttackSkill,
    processVictoryRewards
  ]);

  const handleUseSkill = useCallback((skillId: string) => {
    if (isEnemyDefeated || heroDefeated || huntState !== 'fighting') {
      return;
    }

    const skill = availableSkills.find((item) => item.id === skillId) ?? availableSkills[0];
    
    if (!isSkillUnlocked(latestHero.current.level, skill)) {
      return;
    }

    const skillCost = getSkillRageCost(skill.name, skill.rageCost ?? skill.cost ?? 0);
    const cooldownEndsAt = skillCooldowns[skill.id] ?? 0;

    if (!canUseSkill(latestHeroRage.current, skillCost) || cooldownEndsAt > Date.now()) {
      return;
    }

    const nextRage = spendRage(latestHeroRage.current, skillCost);
    setHeroRage(nextRage);

    const prevDurability = latestHero.current.equipmentDurability?.weapon ?? 100;
    const heroWithLoss = applyWeaponDurabilityLoss(latestHero.current, 1);
    const nextDurability = heroWithLoss.equipmentDurability?.weapon ?? 100;
    latestOnHeroChange.current(heroWithLoss);

    if (prevDurability > 25 && nextDurability <= 25 && nextDurability > 0) {
      appendCombatLog(`⚠️ Ваша зброя (${weapon.name}) сильно пошкоджена!`);
    } else if (prevDurability > 0 && nextDurability === 0) {
      appendCombatLog(`🚨 Ваша зброя (${weapon.name}) зламана!`);
    }

    setSkillCooldowns((current) => ({
      ...current,
      [skill.id]: Date.now() + ((skill.cooldownSeconds ?? skill.cooldown ?? 0) * 1000)
    }));

    if (skill.id === 'skill_08_axe_frenzied_swings') {
      setFrenziedSwingsBuff({ expiresAt: Date.now() + 6000, value: 0.12 });
    }

    const heroDamage = calculateHeroDamage({
      hero: heroWithLoss,
      weapon,
      armor,
      skill,
      enemy: latestEnemy.current,
      currentEnemyHp: latestEnemyHp.current,
      targetBleeding: Boolean(latestEnemyBleed.current)
    });
    const secondary = calculateSecondaryStats(heroWithLoss);
    const frenzyBonus = skill.id === 'skill_08_axe_frenzied_swings' || isTimedBuffActive(frenziedSwingsBuff) ? 0.15 : 0;
    const rageRefund = heroDamage.rageRefund ?? 0;
    if (rageRefund > 0) {
      setHeroRage((current: number) => clampRage(current + rageRefund));
    }
    if (heroDamage.bleedApplied) {
      applyBleedToEnemy(heroDamage.bleedApplied.damage, heroDamage.bleedApplied.ticks);
    }
    if (skill.id === 'skill_25_axe_bloodstorm' && heroDamage.damage > 0) {
      applyBleedToEnemy(Math.max(1, Math.round(heroDamage.damage * 0.3)), 5);
    }
    if (heroDamage.poiseShred) {
      setEnemyPoiseShred({ expiresAt: Date.now() + 6000, value: heroDamage.poiseShred });
    }
    if (heroDamage.nextHitDamageReduction) {
      setGuardedReduction(heroDamage.nextHitDamageReduction);
    }
    if ((heroDamage.staggerApplied ?? 0) > 0) {
      const poiseShredValue = enemyPoiseShred && isTimedBuffActive(enemyPoiseShred) ? enemyPoiseShred.value : 0;
      const effectiveEnemyPoise = Math.max(0, (latestEnemy.current.poise ?? 0) - poiseShredValue);
      if (Math.random() < Math.max(0.05, Math.min(0.75, (heroDamage.staggerApplied ?? 0) - effectiveEnemyPoise))) {
        setEnemyStagger({ skipsRemaining: 1 });
      }
    }
    if (heroDamage.damage > 0) {
      const rageFromSkillDamage = getRageFromDamageDealt(heroDamage.damage, secondary.rageFromAttacks + frenzyBonus);
      setHeroRage((current: number) => clampRage(current + rageFromSkillDamage));
    }
    const nextEnemyHp = Math.max(0, latestEnemyHp.current - heroDamage.damage);

    setHeroAttacking(true);
    setTimeout(() => setHeroAttacking(false), 200);

    if (heroDamage.damage > 0) {
      flashIdCounter.current += 1;
      setEnemyFlash({
        damage: heroDamage.damage,
        isCrit: heroDamage.crit,
        id: flashIdCounter.current
      });
    }

    setEnemyHp(nextEnemyHp);

    let translatedDmgLog = heroDamage.log;
    const enemyName = getDisplayEnemyName(latestEnemy.current.id);
    translatedDmgLog = translatedDmgLog
      .replace(new RegExp(heroWithLoss.name, 'g'), 'Ви')
      .replace(new RegExp(latestEnemy.current.name, 'g'), enemyName)
      .replace(/attacks/i, 'атакуєте')
      .replace(/deals/i, 'завдаючи')
      .replace(/damage/i, 'шкоди')
      .replace(/critical hit/i, 'КРИТИЧНИЙ УДАР')
      .replace(/dodges/i, 'ухиляється')
      .replace(/misses/i, 'промахується');

    if (nextEnemyHp <= 0) {
      processVictoryRewards(nextEnemyHp, translatedDmgLog);
      return;
    }

    appendCombatLog(translatedDmgLog);
  }, [
    isEnemyDefeated,
    heroDefeated,
    huntState,
    availableSkills,
    skillCooldowns,
    weapon,
    armor,
    frenziedSwingsBuff,
    enemyPoiseShred,
    processVictoryRewards,
    appendCombatLog
  ]);

  return {
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
    currentLocation,
    locationBoss,
    startHunting,
    startBossFight,
    handleRetreat,
    handleReturn,
    handleUseSkill
  };
}
