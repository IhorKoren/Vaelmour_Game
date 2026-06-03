import { useMemo, useEffect, useRef, useCallback } from 'react';
import { skills } from '../../data/skills';
import { locations } from '../../data/locations';
import { items } from '../../data/items';
import { recipes } from '../../data/recipes';
import { recipeDrops } from '../../data/recipeDrops';
import { Panel } from '../../components/ui/Panel';
import { calculateDerivedStats } from '../../game/formulas/stats';
import { canStartBossEncounter } from '../../game/formulas/bossUnlocks';
import { getEnemyXpReward, getEnemyGoldReward } from '../../game/formulas/rewards';
import { rollLootDrop, rollGeneratedEquipmentDrop } from '../../game/formulas/loot';
import {
  getLocationRiskLabel,
  getBossForLocation
} from '../../game/formulas/enemyScaling';
import bossesJson from '../../data/generated/bosses.json';
import { checkLevelUp } from '../../game/formulas/progression';
import {
  updateQuestProgressOnEnemyKilled,
  updateQuestProgressOnBattleWon,
  updateQuestProgressOnMaterialGained
} from '../../game/formulas/quests';
import type { Enemy, HeroState } from '../../game/types';
import {
  getNewlyUnlockedSkills
} from '../../game/formulas/skills';
import {
  getDisplayEnemyName,
  getDisplayLocationName,
  getDisplayItemName,
  getDisplaySkillName,
  formatRarity
} from '../../utils/displayHelpers';

import { CombatArena } from './components/CombatArena';
import { CombatControls } from './components/CombatControls';
import { CombatLog } from './components/CombatLog';
import { useCombatSession } from './hooks/useCombatSession';

const AUTO_KNOWN_RECIPE_IDS = recipes
  .filter((recipe) => recipe.unlockMethod?.toLowerCase().includes('auto-known'))
  .map((recipe) => recipe.id);

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
    const xpReward = getEnemyXpReward(enemy);
    const goldReward = getEnemyGoldReward(enemy, Math.random, latestHero.current);
    const lootResult = rollLootDrop(enemy, items, riskRaw);
    const generatedEquipmentDrop = rollGeneratedEquipmentDrop(enemy, latestHero.current, currentLocation.id);
    const knownRecipeIds = getKnownRecipeIds(latestHero.current);
    const learnedRecipe = rollLearnedRecipe(enemy, currentLocation.name, knownRecipeIds);
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
    if (enemy.rank === 'boss' && !nextDefeatedBossIds.includes(enemy.id)) {
      nextDefeatedBossIds = [...nextDefeatedBossIds, enemy.id];
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
      enemy.id,
      enemy.family ?? '',
      enemy.rank ?? 'normal'
    );
    questedHero = updateQuestProgressOnBattleWon(questedHero);
    if (lootResult.dropped && lootResult.itemId) {
      questedHero = updateQuestProgressOnMaterialGained(questedHero, lootResult.itemId, 1);
    }

    let lootMessage = 'Здобич: Ресурсів не знайдено.';
    if (lootResult.dropped && lootResult.itemId) {
      const ukrName = getDisplayItemName(lootResult.itemId);
      const ukrRarity = formatRarity(lootResult.itemRarity ?? 'common');
      lootMessage = `Здобич: Знайдено ${ukrName} (${ukrRarity}).`;
    }

    let translatedDmgLog = heroDamageLog;
    const enemyName = getDisplayEnemyName(enemy.id);
    translatedDmgLog = translatedDmgLog
      .replace(new RegExp(latestHero.current.name, 'g'), 'Ви')
      .replace(new RegExp(enemy.name, 'g'), enemyName)
      .replace(/attacks/i, 'атакуєте')
      .replace(/deals/i, 'завдаючи')
      .replace(/damage/i, 'шкоди')
      .replace(/critical hit/i, 'КРИТИЧНИЙ УДАР')
      .replace(/dodges/i, 'ухиляється')
      .replace(/misses/i, 'промахується');

    const victoryMessage = enemy.rank === 'elite'
      ? `⭐️ ПЕРЕМОГА НАД ЕЛІТНИМ ВОРОГОМ ${enemy.name}! Отримано ${xpReward} XP, ${goldReward} золота.`
      : (enemy.rank === 'boss'
          ? `👑 ЛЕГЕНДАРНА ПЕРЕМОГА НАД БОСОМ ${enemy.name}! Отримано ${xpReward} XP, ${goldReward} золота.`
          : `Перемога! Отримано ${xpReward} XP, ${goldReward} золота.`);

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

    return {
      rewardedHero: questedHero,
      victoryRewards: {
        gold: goldReward,
        xp: xpReward,
        material: (lootResult.dropped && lootResult.itemId)
          ? { id: lootResult.itemId, name: lootResult.itemName ?? lootResult.itemId, rarity: lootResult.itemRarity ?? 'common' }
          : null,
        equipment: (generatedEquipmentDrop.dropped && generatedEquipmentDrop.item)
          ? generatedEquipmentDrop.item
          : null
      },
      logLines
    };
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
    handleUseSkill
  } = useCombatSession({
    hero,
    onHeroChange,
    selectedLocationId,
    onCombatStateChange,
    onVictoryCalculations
  });

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
