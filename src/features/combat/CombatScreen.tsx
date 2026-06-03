import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { enemies } from '../../data/enemies';
import { skills } from '../../data/skills';
import { locations } from '../../data/locations';
import { items } from '../../data/items';
import { recipes } from '../../data/recipes';
import { recipeDrops } from '../../data/recipeDrops';
import { Panel } from '../../components/ui/Panel';
import { calculateEnemyDamage, calculateHeroDamage } from '../../game/formulas/combat';
import { calculateDerivedStats } from '../../game/formulas/stats';
import { selectWeightedEnemy } from '../../game/formulas/spawn';
import { getEnemyXpReward, getEnemyGoldReward } from '../../game/formulas/rewards';
import { rollLootDrop, rollGeneratedEquipmentDrop } from '../../game/formulas/loot';
import {
  clampRage,
  getRageFromDamageDealt,
  getRageFromDamageTaken,
  canUseSkill,
  spendRage,
  getSkillRageCost
} from '../../game/formulas/combatMechanics';
import {
  getEffectiveWeaponStats,
  getEffectiveArmorStats,
  applyWeaponDurabilityLoss,
  applyArmorDurabilityLoss
} from '../../game/formulas/equipment';
import { calculateSecondaryStats, getEffectiveAttackSpeed } from '../../game/formulas/secondaryStats';
import {
  scaleEnemyForLocation,
  getLocationRiskLabel,
  rollEliteOrNormal,
  getBossForLocation
} from '../../game/formulas/enemyScaling';
import bossesJson from '../../data/generated/bosses.json';
import { canStartBossEncounter } from '../../game/formulas/bossUnlocks';
import { checkLevelUp } from '../../game/formulas/progression';
import {
  updateQuestProgressOnEnemyKilled,
  updateQuestProgressOnBattleWon,
  updateQuestProgressOnMaterialGained
} from '../../game/formulas/quests';
import type { Enemy, HeroState, Skill } from '../../game/types';
import {
  isSkillUnlocked,
  getNewlyUnlockedSkills
} from '../../game/formulas/skills';
import { COMBAT_ATTACK_INTERVAL_MULTIPLIER } from '../../game/constants';
import {
  getDisplayEnemyName,
  getDisplayLocationName,
  getDisplayItemName,
  formatRarity,
  formatItemType,
  formatEquipmentSummary,
  getDisplaySkillName
} from '../../utils/displayHelpers';
import type { GeneratedEquipmentItem } from '../../game/types';

import arenaBg from '../../assets/generated/blackfang_gate_background_mobile.jpg';
import heroWanderer from '../../assets/generated/hero_vaelmour_back_mobile.png';
import blackfangBrigand from '../../assets/generated/enemy_blackfang_brigand_mobile.png';
import thornRotHound from '../../assets/generated/enemy_thorn_rot_hound_mobile.png';

const AUTO_KNOWN_RECIPE_IDS = recipes
  .filter((recipe) => recipe.unlockMethod?.toLowerCase().includes('auto-known'))
  .map((recipe) => recipe.id);
const MAX_COMBAT_LOG_ENTRIES = 6;

function EnemyVectorSVG({ family, name }: { family?: string; name?: string }) {
  const isBoss = family === 'boss' || name?.toLowerCase().includes('alpha') || name?.toLowerCase().includes('captain') || name?.toLowerCase().includes('warden') || name?.toLowerCase().includes('lord');
  
  if (isBoss) {
    return (
      <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="enemy-sprite-front">
        <path d="M50 25 C40 25 36 32 36 42 C36 55 24 62 20 85 L80 85 C76 62 64 55 64 42 C64 32 60 25 50 25 Z" fill="#1c0d0c" stroke="#dfa84c" strokeWidth="2" />
        <path d="M38 25 L42 12 L46 20 L50 10 L54 20 L58 12 L62 25 Z" fill="#dfa84c" stroke="#664627" strokeWidth="1" />
        <circle cx="50" cy="55" r="7" fill="#ff4d4d" />
        <path d="M46 55 Q 50 45 54 55" stroke="#dfa84c" strokeWidth="1" />
      </svg>
    );
  }

  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="enemy-sprite-front">
      <path d="M50 20 C42 20 38 26 38 35 C38 48 26 55 22 75 C30 85 70 85 78 75 C74 55 62 48 62 35 C62 26 58 20 50 20 Z" fill="#2d1310" stroke="#8c6747" strokeWidth="1.5" />
      <path d="M42 22 L58 22 L50 10 Z" fill="#8c6747" />
      <path d="M44 26 L56 26 L50 32 Z" fill="#1c110a" />
      <path d="M25 35 L40 50 M40 35 L25 50" stroke="#a87343" strokeWidth="2" />
    </svg>
  );
}

function getGeneratedEnemyArt(enemy: Enemy): string | null {
  const signature = `${enemy.id} ${enemy.name} ${enemy.family ?? ''} ${enemy.archetype ?? ''}`.toLowerCase();
  if (signature.includes('boss') || signature.includes('lord') || signature.includes('alpha')) {
    return null;
  }
  if (signature.includes('brigand') || signature.includes('raider') || signature.includes('guard') || signature.includes('human')) {
    return blackfangBrigand;
  }
  if (signature.includes('wolf') || signature.includes('fang') || signature.includes('hound') || signature.includes('stalker')) {
    return thornRotHound;
  }
  return blackfangBrigand;
}

function getKnownRecipeIds(hero: HeroState): string[] {
  return Array.from(new Set([...(hero.knownRecipeIds ?? AUTO_KNOWN_RECIPE_IDS), ...AUTO_KNOWN_RECIPE_IDS]));
}

function rollLearnedRecipe(enemy: Enemy, locationName: string, knownRecipeIds: string[]): { id: string; name: string } | null {
  const known = new Set(knownRecipeIds);
  const enemySignature = `${enemy.id} ${enemy.name} ${enemy.family ?? ''} ${enemy.archetype ?? ''}`
    .toLowerCase()
    .replace(/[_-]/g, ' ');
  const locationSignature = locationName.toLowerCase();

  for (const rule of recipeDrops) {
    if (known.has(rule.recipe_id)) continue;

    const sourceLocation = rule.source_location.toLowerCase();
    const sourceMatches =
      sourceLocation.includes('any') ||
      sourceLocation.includes(locationSignature) ||
      locationSignature.includes(sourceLocation);

    const enemySources = rule.drops_from
      .split(new RegExp('[/,;+]'))
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);

    const enemyMatches = enemySources.some((source) => {
      if (source.includes('elite')) return enemySignature.includes('elite');
      if (source.includes('zone milestone')) return false;
      return enemySignature.includes(source);
    });

    const chance = Number.parseFloat(rule.recipe_drop_chance);
    if (sourceMatches && enemyMatches && Number.isFinite(chance) && Math.random() * 100 <= chance) {
      const recipe = recipes.find((item) => item.id === rule.recipe_id);
      return recipe ? { id: recipe.id, name: recipe.name } : null;
    }
  }

  return null;
}

type Props = {
  hero: HeroState;
  onHeroChange: (hero: HeroState) => void;
  selectedLocationId: string;
  onCombatStateChange?: (isFighting: boolean) => void;
};

type HuntState = 'idle' | 'searching' | 'fighting' | 'victory' | 'defeat';

type VictoryRewards = {
  gold: number;
  xp: number;
  material?: { id: string; name: string; rarity: string } | null;
  equipment?: GeneratedEquipmentItem | null;
};
type BleedState = { damage: number; ticksRemaining: number };
type StaggerState = { skipsRemaining: number };
type TimedBuffState = { expiresAt: number; value: number };

export function CombatScreen({ hero, onHeroChange, selectedLocationId, onCombatStateChange }: Props) {
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

  const [enemy, setEnemy] = useState<Enemy>(() => {
    const enemyPool = currentLocation?.enemies && currentLocation.enemies.length > 0 ? currentLocation.enemies : [];
    if (enemyPool.length === 0) {
      const defaultEnemy = enemies[0] || { id: 'safe_wolf', name: 'Safe Wolf', hp: 50, maxHp: 50, dmg: 5, xp: 10, gold: 5 };
      return scaleEnemyForLocation(defaultEnemy, currentLocation);
    }
    const baseEnemy = selectWeightedEnemy(enemyPool, enemies) || enemies[0];
    return scaleEnemyForLocation(baseEnemy, currentLocation);
  });
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
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (victoryTimeoutRef.current) clearTimeout(victoryTimeoutRef.current);
    
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

  const riskRaw = useMemo(() => getLocationRiskLabel(hero, currentLocation), [hero, currentLocation]);
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
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (victoryTimeoutRef.current) clearTimeout(victoryTimeoutRef.current);
    };
  }, []);

  const startHunting = useCallback(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (victoryTimeoutRef.current) clearTimeout(victoryTimeoutRef.current);
    
    setVictoryRewards(null);
    setHuntState('searching');
    setLog(['Шукаємо ворога...']);
    
    const id = setTimeout(() => {
      const enemyPool = currentLocation?.enemies && currentLocation.enemies.length > 0 ? currentLocation.enemies : [];
      let scaledEnemy: Enemy;
      if (enemyPool.length === 0) {
        console.warn("Enemy pool is missing or empty for location:", currentLocation?.id);
        const defaultEnemy = enemies[0] || { id: 'safe_wolf', name: 'Safe Wolf', hp: 50, maxHp: 50, dmg: 5, xp: 10, gold: 5 };
        scaledEnemy = scaleEnemyForLocation(defaultEnemy, currentLocation);
      } else {
        const baseEnemy = selectWeightedEnemy(enemyPool, enemies) || enemies[0];
        scaledEnemy = scaleEnemyForLocation(baseEnemy, currentLocation);
      }
      const finalEnemy = rollEliteOrNormal(scaledEnemy);
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
      const rankLabel = finalEnemy.rank === 'elite' ? '⭐️ ЕЛІТНИЙ ВОРОГ ⭐️: ' : '';
      setLog([`${rankLabel}Перед вами постає ${finalEnemy.name} (${finalEnemy.level ?? 1} рівень).`]);
      setHeroRage(0);
      setHuntState('fighting');
      rewardGrantedRef.current = false;
      setEncounterId((prev) => prev + 1);
    }, 1500);
    searchTimeoutRef.current = id;
  }, [currentLocation]);

  const startBossFight = useCallback(() => {
    if (!locationBoss) return;
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (victoryTimeoutRef.current) clearTimeout(victoryTimeoutRef.current);

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
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (victoryTimeoutRef.current) clearTimeout(victoryTimeoutRef.current);
    setHeroRage(0);
    setHuntState('idle');
    setLog(['Ви успішно припинили полювання та повернулися до табору.']);
  }, []);

  const handleReturn = useCallback(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (victoryTimeoutRef.current) clearTimeout(victoryTimeoutRef.current);
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

    const xpReward = getEnemyXpReward(latestEnemy.current);
    const goldReward = getEnemyGoldReward(latestEnemy.current, Math.random, latestHero.current);
    const lootResult = rollLootDrop(latestEnemy.current, items, riskRaw);
    const generatedEquipmentDrop = rollGeneratedEquipmentDrop(latestEnemy.current, latestHero.current, currentLocation.id);
    const knownRecipeIds = getKnownRecipeIds(latestHero.current);
    const learnedRecipe = rollLearnedRecipe(latestEnemy.current, currentLocation.name, knownRecipeIds);
    const nextKnownRecipeIds = learnedRecipe
      ? Array.from(new Set([...knownRecipeIds, learnedRecipe.id]))
      : knownRecipeIds;

    const updatedInventory = [...latestHero.current.inventory];
    if (lootResult.dropped && lootResult.itemId) {
      const existingStackIndex = updatedInventory.findIndex((stack) => stack.itemId.toLowerCase() === lootResult.itemId!.toLowerCase() && !stack.generatedItem && (!stack.affixes || stack.affixes.length === 0));
      if (existingStackIndex >= 0) {
        updatedInventory[existingStackIndex] = {
          ...updatedInventory[existingStackIndex],
          qty: updatedInventory[existingStackIndex].qty + 1
        };
      } else {
        updatedInventory.push({
          itemId: lootResult.itemId,
          qty: 1
        });
      }
    }
    if (generatedEquipmentDrop.dropped && generatedEquipmentDrop.item) {
      updatedInventory.push({
        itemId: generatedEquipmentDrop.item.id,
        qty: 1,
        affixes: generatedEquipmentDrop.item.affixes,
        durability: generatedEquipmentDrop.item.durability,
        rerollCount: 0,
        generatedItem: generatedEquipmentDrop.item
      });
    }

    const totalXp = latestHero.current.xp + xpReward;
    const levelUpResult = checkLevelUp(latestHero.current.level, totalXp);
    const didLevelUp = levelUpResult.newLevel > latestHero.current.level;
    const newlyUnlocked = getNewlyUnlockedSkills(latestHero.current.level, levelUpResult.newLevel, skills);

    let nextHeroLevel = latestHero.current.level;
    let nextHeroXp = totalXp;
    let nextStatPoints = latestHero.current.unspentStatPoints;

    if (didLevelUp) {
      nextHeroLevel = levelUpResult.newLevel;
      nextHeroXp = levelUpResult.remainingXp;
      nextStatPoints += levelUpResult.statPointsGained;
    }

    const nextDerived = calculateDerivedStats(latestHero.current.stats, latestHero.current.baseHp, undefined, latestHero.current);

    let nextDefeatedBossIds = latestHero.current.defeatedBossIds ?? [];
    if (latestEnemy.current.rank === 'boss' && !nextDefeatedBossIds.includes(latestEnemy.current.id)) {
      nextDefeatedBossIds = [...nextDefeatedBossIds, latestEnemy.current.id];
    }

    const rewardedHero: HeroState = {
      ...latestHero.current,
      level: nextHeroLevel,
      xp: nextHeroXp,
      unspentStatPoints: nextStatPoints,
      gold: latestHero.current.gold + goldReward,
      knownRecipeIds: nextKnownRecipeIds,
      inventory: updatedInventory,
      maxHp: nextDerived.maxHp,
      currentHp: didLevelUp ? nextDerived.maxHp : Math.min(nextDerived.maxHp, latestHero.current.currentHp),
      defeatedBossIds: nextDefeatedBossIds
    };

    let questedHero: HeroState = rewardedHero;
    questedHero = updateQuestProgressOnEnemyKilled(
      questedHero,
      latestEnemy.current.id,
      latestEnemy.current.family ?? '',
      latestEnemy.current.rank ?? 'normal'
    );
    questedHero = updateQuestProgressOnBattleWon(questedHero);
    if (lootResult.dropped && lootResult.itemId) {
      questedHero = updateQuestProgressOnMaterialGained(questedHero, lootResult.itemId, 1);
    }

    latestOnHeroChange.current(questedHero);

    let lootMessage = 'Здобич: Ресурсів не знайдено.';
    if (lootResult.dropped && lootResult.itemId) {
      const ukrName = getDisplayItemName(lootResult.itemId);
      const ukrRarity = formatRarity(lootResult.itemRarity ?? 'common');
      lootMessage = `Здобич: Знайдено ${ukrName} (${ukrRarity}).`;
    }

    let translatedDmgLog = heroDamageLog;
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

    const victoryMessage = latestEnemy.current.rank === 'elite'
      ? `⭐️ ПЕРЕМОГА НАД ЕЛІТНИМ ВОРОГОМ ${latestEnemy.current.name}! Отримано ${xpReward} XP, ${goldReward} золота.`
      : (latestEnemy.current.rank === 'boss'
          ? `👑 ЛЕГЕНДАРНА ПЕРЕМОГА НАД БОСОМ ${latestEnemy.current.name}! Отримано ${xpReward} XP, ${goldReward} золота.`
          : `Перемога! Отримано ${xpReward} XP, ${goldReward} золота.`);

    setVictoryRewards({
      gold: goldReward,
      xp: xpReward,
      material: (lootResult.dropped && lootResult.itemId)
        ? { id: lootResult.itemId, name: lootResult.itemName ?? lootResult.itemId, rarity: lootResult.itemRarity ?? 'common' }
        : null,
      equipment: (generatedEquipmentDrop.dropped && generatedEquipmentDrop.item)
        ? generatedEquipmentDrop.item
        : null
    });

    const logLines = [
      victoryMessage,
      lootMessage
    ];

    if (learnedRecipe) {
      logLines.unshift(`Вивчено креслення: ${getDisplayItemName(learnedRecipe.name)}.`);
    }

    if (didLevelUp) {
      logLines.unshift(`Новий рівень! Досягнуто ${levelUpResult.newLevel} рівня. Отримано ${levelUpResult.statPointsGained} очок характеристик.`);
      if (newlyUnlocked.length > 0) {
        newlyUnlocked.forEach((s) => {
          logLines.unshift(`Розблоковано вміння: ${getDisplaySkillName(s.name)}.`);
        });
      }
    }

    logLines.push(translatedDmgLog);

    setLog((previous) => [...logLines, ...previous].slice(0, MAX_COMBAT_LOG_ENTRIES));

    // Automatically hunt the next enemy in 2 seconds
    const id = setTimeout(() => {
      setVictoryRewards(null);
      setHuntState('searching');
      const nextId = setTimeout(() => {
        const enemyPool = currentLocation?.enemies && currentLocation.enemies.length > 0 ? currentLocation.enemies : [];
        let nextScaled: Enemy;
        if (enemyPool.length === 0) {
          const defaultEnemy = enemies[0] || { id: 'safe_wolf', name: 'Safe Wolf', hp: 50, maxHp: 50, dmg: 5, xp: 10, gold: 5 };
          nextScaled = scaleEnemyForLocation(defaultEnemy, currentLocation);
        } else {
          const nextBase = selectWeightedEnemy(enemyPool, enemies) || enemies[0];
          nextScaled = scaleEnemyForLocation(nextBase, currentLocation);
        }
        const finalEnemy = rollEliteOrNormal(nextScaled);
        setEnemy(finalEnemy);
        setEnemyHp(finalEnemy.hp);
        const rankLabel = finalEnemy.rank === 'elite' ? '⭐️ ЕЛІТНИЙ ВОРОГ ⭐️: ' : '';
        setLog([`${rankLabel}Перед вами постає ${finalEnemy.name} (${finalEnemy.level ?? 1} рівень).`]);
        setHuntState('fighting');
        rewardGrantedRef.current = false;
        setEncounterId((prev) => prev + 1);
      }, 1500);
      searchTimeoutRef.current = nextId;
    }, 2000);
    victoryTimeoutRef.current = id;
  }, [riskRaw, currentLocation]);

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
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (victoryTimeoutRef.current) clearTimeout(victoryTimeoutRef.current);
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
  }, [
    isCombatActive,
    encounterId,
    basicAttackSkill,
    processVictoryRewards
  ]);

  function handleUseSkill(skillId: string) {
    if (isEnemyDefeated || heroDefeated || huntState !== 'fighting') {
      return;
    }

    const skill = availableSkills.find((item) => item.id === skillId) ?? availableSkills[0];
    
    if (!isSkillUnlocked(hero.level, skill)) {
      return;
    }

    const skillCost = getSkillRageCost(skill.name, skill.rageCost ?? skill.cost ?? 0);
    const cooldownEndsAt = skillCooldowns[skill.id] ?? 0;

    if (!canUseSkill(heroRage, skillCost) || cooldownEndsAt > Date.now()) {
      return;
    }

    const nextRage = spendRage(heroRage, skillCost);
    setHeroRage(nextRage);

    const prevDurability = hero.equipmentDurability?.weapon ?? 100;
    const heroWithLoss = applyWeaponDurabilityLoss(hero, 1);
    const nextDurability = heroWithLoss.equipmentDurability?.weapon ?? 100;
    onHeroChange(heroWithLoss);

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
      enemy,
      currentEnemyHp: enemyHp,
      targetBleeding: Boolean(enemyBleed)
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
      const effectiveEnemyPoise = Math.max(0, (enemy.poise ?? 0) - poiseShredValue);
      if (Math.random() < Math.max(0.05, Math.min(0.75, (heroDamage.staggerApplied ?? 0) - effectiveEnemyPoise))) {
        setEnemyStagger({ skipsRemaining: 1 });
      }
    }
    if (heroDamage.damage > 0) {
      const rageFromSkillDamage = getRageFromDamageDealt(heroDamage.damage, secondary.rageFromAttacks + frenzyBonus);
      setHeroRage((current: number) => clampRage(current + rageFromSkillDamage));
    }
    const nextEnemyHp = Math.max(0, enemyHp - heroDamage.damage);

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
    const enemyName = getDisplayEnemyName(enemy.id);
    translatedDmgLog = translatedDmgLog
      .replace(new RegExp(hero.name, 'g'), 'Ви')
      .replace(new RegExp(enemy.name, 'g'), enemyName)
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
  }

  function renderLogEntry(entry: string, index: number) {
    let color: string;
    let fontWeight = 'normal';
    let prefix = '';

    if (entry.includes('Перемога!') || entry.includes('Здобич:') || entry.includes('Відновлено') || entry.includes('здоров’я')) {
      color = '#2d8249';
      fontWeight = 'bold';
    } else if (entry.includes('Новий рівень!') || entry.includes('Розблоковано вміння:')) {
      color = '#dfa84c';
      fontWeight = 'bold';
      prefix = '🔥 ';
    } else if (entry.includes('зламана!') || entry.includes('зламаний!')) {
      color = '#ff4d4d';
      fontWeight = 'bold';
      prefix = '🚨 ';
    } else if (entry.includes('пошкоджена!') || entry.includes('пошкоджений!')) {
      color = '#e65c00';
      fontWeight = 'bold';
      prefix = '⚠️ ';
    } else if (entry.includes('ухиляється') || entry.includes('промахується') || entry.includes('відступили')) {
      color = '#9b4dca';
      fontWeight = 'bold';
    } else if (entry.startsWith('Ви') || entry.includes('атакуєте') || entry.includes('Пошук') || entry.includes('полювання')) {
      color = '#eed1b3';
    } else {
      color = '#ff9999';
    }

    return (
      <li 
        key={`${entry}-${index}`}
        style={{ 
          color, 
          fontWeight, 
          fontSize: '12px',
          lineHeight: '1.45',
          borderBottom: '1px dashed rgba(212, 163, 115, 0.08)',
          paddingBottom: '5px',
          paddingTop: '5px',
          listStyleType: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        {prefix}{entry}
      </li>
    );
  }

  const enemyArt = useMemo(() => getGeneratedEnemyArt(enemy), [enemy]);

  return (
    <div className={`screen combat-screen ${huntState === 'idle' ? 'combat-screen--idle' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      
      {/* 1. IDLE STATE PANEL */}
      {huntState === 'idle' && (
        <section className="hunt-start-panel" aria-label="Початок полювання">
          <div className="hunt-start-panel__location">
            <span>{getDisplayLocationName(currentLocation.id)}</span>
          </div>
          <button
            className="hunt-start-button"
            type="button"
            onClick={startHunting}
          >
            Почати полювання
          </button>
          {locationBoss && (() => {
            const unlockStatus = canStartBossEncounter(hero, locationBoss);
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', marginTop: '10px' }}>
                <button
                  className="hunt-start-button boss-trigger-button"
                  type="button"
                  onClick={startBossFight}
                  disabled={!unlockStatus.unlocked}
                  style={{
                    background: unlockStatus.unlocked ? 'linear-gradient(180deg, #a32e2e, #611515)' : 'rgba(30, 15, 15, 0.4)',
                    color: unlockStatus.unlocked ? '#ffffff' : 'var(--color-text-muted)',
                    border: unlockStatus.unlocked ? '1.5px solid var(--color-gold-gilded)' : '1px dashed rgba(212, 163, 115, 0.15)',
                    boxShadow: unlockStatus.unlocked ? '0 0 10px rgba(163, 46, 46, 0.5)' : 'none',
                    cursor: unlockStatus.unlocked ? 'pointer' : 'not-allowed',
                    opacity: unlockStatus.unlocked ? 1 : 0.6
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
              🛡️ Відступити
            </button>
          </div>
        </Panel>
      )}

      {/* 3. FIGHTING / VICTORY / DEFEAT ARENA DISPLAY */}
      {huntState !== 'idle' && huntState !== 'searching' && (
        <>
          <div className="battle-arena" style={{ backgroundImage: `url(${arenaBg})` }}>
            <div className="battle-arena__ground" />
            
            {/* Render Enemy HP bar only if in active combat */}
            {huntState === 'fighting' && (
              <div className="enemy-status-plate">
                <span className="status-plate__name">
                  {enemy.rank === 'elite' || enemy.rank === 'boss' ? enemy.name : getDisplayEnemyName(enemy.id)}{' '}
                  {enemy.rank === 'elite' && (
                    <span style={{ color: 'var(--color-gold-gilded)', fontSize: '9px', fontWeight: 'bold', marginLeft: '4px', marginRight: '4px', textTransform: 'uppercase', border: '1px solid var(--color-gold-gilded)', borderRadius: '3px', padding: '0 4px', background: 'rgba(212,163,115,0.15)' }}>
                      Еліта
                    </span>
                  )}
                  {enemy.rank === 'boss' && (
                    <span style={{ color: '#ff4d4d', fontSize: '9px', fontWeight: 'bold', marginLeft: '4px', marginRight: '4px', textTransform: 'uppercase', border: '1px solid #ff4d4d', borderRadius: '3px', padding: '0 4px', background: 'rgba(255,77,77,0.15)' }}>
                      Бос
                    </span>
                  )}
                  <span style={{ color: 'var(--color-bronze-light)', fontSize: '9px', fontWeight: 'bold' }}>
                    Рів. {enemy.level ?? 1}
                  </span>
                </span>
                <div className="status-plate__hp-bar" title={`HP: ${enemyHp}/${enemy.hp}`}>
                  <div className="status-plate__hp-fill" style={{ width: `${Math.max(0, Math.min(100, (enemyHp / Math.max(1, enemy.hp)) * 100))}%` }} />
                  <span className="status-plate__hp-text">{enemyHp} / {enemy.hp}</span>
                </div>
              </div>
            )}

            {/* Victory Floating tag overlay */}
            {huntState === 'victory' && (
              <div className="combat-result-banner combat-result-banner--victory">
                <span>Перемога</span>
                <strong>Ворог переможений</strong>
              </div>
            )}

            {/* Defeat Floating tag overlay */}
            {huntState === 'defeat' && (
              <div className="combat-result-banner combat-result-banner--defeat">
                <span>Поразка</span>
                <strong>Герой відступив</strong>
              </div>
            )}

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

            {/* Enemy Actor Visual */}
            {huntState !== 'victory' && (
              <div className={`combat-actor enemy-actor ${enemyAttacking ? 'unit-attacking' : ''}`}>
                <div className="combat-actor__sprite-container enemy-portrait-idle">
                  <div className="combat-actor__rune-bg" />
                  {enemyArt ? (
                    <img src={enemyArt} className="enemy-sprite-front" alt={enemy.name} decoding="async" style={{ objectFit: 'contain' }} />
                  ) : (
                    <EnemyVectorSVG family={enemy.family} name={enemy.name} />
                  )}
                  <div className="combat-actor__shadow" />
                </div>

                {enemyFlash && (
                  <div key={enemyFlash.id} className={`damage-flash ${enemyFlash.isCrit ? 'crit' : ''}`}>
                    -{enemyFlash.damage}
                  </div>
                )}
              </div>
            )}

            {/* Hero Actor Visual */}
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
          </div>

          {/* ACTIVE STATE ACTIONS CONTROL BUTTON ROW */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {huntState === 'victory' && victoryRewards && (
              <Panel title="🏆 Нагорода за перемогу">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px 0' }}>
                  {/* Gold & XP row */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', color: '#dfa84c', fontWeight: 'bold' }}>
                      💰 {victoryRewards.gold} золота
                    </span>
                    <span style={{ fontSize: '13px', color: '#6ec1e4', fontWeight: 'bold' }}>
                      ✨ {victoryRewards.xp} XP
                    </span>
                  </div>

                  {/* Material drop */}
                  {victoryRewards.material && (
                    <div style={{ fontSize: '12px', color: '#eed1b3', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📦</span>
                      <span>{getDisplayItemName(victoryRewards.material.id)}</span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 'bold',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        border: `1px solid ${({'common':'#8c7865','uncommon':'#2d8249','rare':'#1e70a6','epic':'#9b4dca','legendary':'#dfa84c'} as Record<string,string>)[victoryRewards.material.rarity] ?? '#8c7865'}`,
                        color: ({'common':'#8c7865','uncommon':'#2d8249','rare':'#1e70a6','epic':'#9b4dca','legendary':'#dfa84c'} as Record<string,string>)[victoryRewards.material.rarity] ?? '#8c7865',
                        background: 'rgba(0,0,0,0.2)'
                      }}>
                        {formatRarity(victoryRewards.material.rarity)}
                      </span>
                    </div>
                  )}

                  {/* Generated equipment drop */}
                  {victoryRewards.equipment && (() => {
                    const eq = victoryRewards.equipment!;
                    const rarityColor = ({'common':'#8c7865','uncommon':'#2d8249','rare':'#1e70a6','epic':'#9b4dca','legendary':'#dfa84c'} as Record<string,string>)[eq.rarity] ?? '#8c7865';
                    const summary = formatEquipmentSummary(eq as unknown as Record<string, unknown>);
                    return (
                      <div style={{
                        marginTop: '4px',
                        padding: '8px',
                        borderRadius: '6px',
                        border: `1px solid ${rarityColor}`,
                        background: 'rgba(0,0,0,0.25)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <span style={{ fontSize: '13px' }}>⚔️</span>
                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: rarityColor }}>
                            {getDisplayItemName(eq.id, eq)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: summary ? '4px' : '0' }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 'bold',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            border: `1px solid ${rarityColor}`,
                            color: rarityColor,
                            background: 'rgba(0,0,0,0.2)'
                          }}>
                            {formatRarity(eq.rarity)}
                          </span>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 'bold',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            border: '1px solid rgba(212,163,115,0.25)',
                            color: 'var(--color-bronze-light)',
                            background: 'rgba(0,0,0,0.15)'
                          }}>
                            {formatItemType(eq.slot)}
                          </span>
                        </div>
                        {summary && (
                          <div style={{ fontSize: '11px', color: '#eed1b3', lineHeight: '1.4' }}>
                            {summary}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </Panel>
            )}

            {huntState === 'victory' && (
              <button
                className="secondary-button"
                type="button"
                onClick={handleRetreat}
                style={{ width: '100%', minHeight: '40px', fontSize: '13px', fontWeight: 'bold', border: '1px solid rgba(212,163,115,0.2)' }}
              >
                Відступити
              </button>
            )}

            {huntState === 'victory' && (
              <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px', fontStyle: 'italic' }}>
                ⏳ Наступний пошук розпочнеться автоматично...
              </div>
            )}

            {huntState === 'defeat' && (
              <div style={{ width: '100%', textAlign: 'center', padding: '6px' }}>
                <button
                  className="primary-button"
                  type="button"
                  onClick={handleReturn}
                  style={{ width: '100%', minHeight: '40px', fontSize: '14px', background: 'linear-gradient(180deg, var(--color-bronze), var(--color-bronze-dark))' }}
                >
                  Завершити полювання
                </button>
                <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '8px', fontStyle: 'italic' }}>
                  ℹ️ Система лікування та відновлення розробляється окремо. Здоров'я безкоштовно відновлено у таборі.
                </div>
              </div>
            )}
          </div>

          {/* Render Skills selection panel strictly during active fighting state */}
          {huntState === 'fighting' && (
            <Panel title="Вміння">
              <div className="skill-grid combat-skill-grid">
                {availableSkills.map((skill, index) => {
                  const skillCost = getSkillRageCost(skill.name, skill.rageCost ?? skill.cost ?? 0);
                  const unlocked = isSkillUnlocked(hero.level, skill);
                  const hasEnoughRage = canUseSkill(heroRage, skillCost);
                  const cooldownRemainingMs = Math.max(0, (skillCooldowns[skill.id] ?? 0) - Date.now());
                  const isOnCooldown = cooldownRemainingMs > 0;
                  
                  if (!unlocked) {
                    return (
                      <button
                        key={skill.id}
                        className={`ability-slot ability-slot--art-${index % 4} locked`}
                        type="button"
                        disabled
                      >
                        <div className="ability-slot__icon-container">🔒</div>
                        <div className="ability-slot__meta">
                          <span className="ability-slot__name">{getDisplaySkillName(skill.name)}</span>
                          <span className="ability-slot__cost">Рів. {skill.level} req</span>
                        </div>
                      </button>
                    );
                  }

                  const dispName = getDisplaySkillName(skill.name);
                  return (
                    <button
                      key={skill.id}
                      className={`ability-slot ability-slot--art-${index % 4}`}
                      type="button"
                      onClick={() => handleUseSkill(skill.id)}
                      disabled={!hasEnoughRage || isOnCooldown || isEnemyDefeated || heroDefeated}
                    >
                      <div className="ability-slot__icon-container">
                        {dispName.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="ability-slot__meta">
                        <span className="ability-slot__name">{dispName}</span>
                        <span className={`ability-slot__cost ${!hasEnoughRage ? 'low-rage' : ''}`}>
                          🔥 {skillCost} Лють {!hasEnoughRage && ' (мало)'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Panel>
          )}

          {/* Render active journal log only if fighting, victory or defeat */}
          <Panel title="Бойовий журнал">
            <div className="combat-log-container">
              <ul className="combat-log" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {log.map((entry, index) => renderLogEntry(entry, index))}
              </ul>
            </div>
          </Panel>
        </>
      )}

      {/* Safety Telegram Spacer block */}
      <div style={{ height: '80px', pointerEvents: 'none' }} />
    </div>
  );
}
