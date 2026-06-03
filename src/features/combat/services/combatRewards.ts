import type { Enemy, HeroState, Location } from '../../../game/types';
import { skills } from '../../../data/skills';
import { items } from '../../../data/items';
import { recipes } from '../../../data/recipes';
import { recipeDrops } from '../../../data/recipeDrops';
import { calculateDerivedStats } from '../../../game/formulas/stats';
import { getEnemyXpReward, getEnemyGoldReward } from '../../../game/formulas/rewards';
import { rollLootDrop, rollGeneratedEquipmentDrop } from '../../../game/formulas/loot';
import { checkLevelUp } from '../../../game/formulas/progression';
import {
  updateQuestProgressOnEnemyKilled,
  updateQuestProgressOnBattleWon,
  updateQuestProgressOnMaterialGained
} from '../../../game/formulas/quests';
import { getNewlyUnlockedSkills } from '../../../game/formulas/skills';
import {
  getDisplayEnemyName,
  getDisplayItemName,
  getDisplaySkillName,
  formatRarity
} from '../../../utils/displayHelpers';
import type { GeneratedEquipmentItem } from '../../../game/types';

interface VictoryRewards {
  gold: number;
  xp: number;
  material?: { id: string; name: string; rarity: string } | null;
  equipment?: GeneratedEquipmentItem | null;
}

interface VictoryCalculationResult {
  rewardedHero: HeroState;
  victoryRewards: VictoryRewards;
  logLines: string[];
}

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

export function calculateVictoryRewards(
  enemy: Enemy,
  hero: HeroState,
  riskRaw: 'Safe' | 'Risky' | 'Dangerous',
  currentLocation: Location,
  heroDamageLog: string
): VictoryCalculationResult {
  const xpReward = getEnemyXpReward(enemy);
  const goldReward = getEnemyGoldReward(enemy, Math.random, hero);
  const lootResult = rollLootDrop(enemy, items, riskRaw);
  const generatedEquipmentDrop = rollGeneratedEquipmentDrop(enemy, hero, currentLocation.id);
  const knownRecipeIds = getKnownRecipeIds(hero);
  const learnedRecipe = rollLearnedRecipe(enemy, currentLocation.name, knownRecipeIds);
  const nextKnownRecipeIds = learnedRecipe
    ? Array.from(new Set([...knownRecipeIds, learnedRecipe.id]))
    : knownRecipeIds;

  const updatedInventory = [...hero.inventory];
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

  const totalXp = hero.xp + xpReward;
  const levelUpResult = checkLevelUp(hero.level, totalXp);
  const didLevelUp = levelUpResult.newLevel > hero.level;
  const newlyUnlocked = getNewlyUnlockedSkills(hero.level, levelUpResult.newLevel, skills);

  let nextHeroLevel = hero.level;
  let nextHeroXp = totalXp;
  let nextStatPoints = hero.unspentStatPoints;

  if (didLevelUp) {
    nextHeroLevel = levelUpResult.newLevel;
    nextHeroXp = levelUpResult.remainingXp;
    nextStatPoints += levelUpResult.statPointsGained;
  }

  const nextDerived = calculateDerivedStats(hero.stats, hero.baseHp, undefined, hero);

  let nextDefeatedBossIds = hero.defeatedBossIds ?? [];
  if (enemy.rank === 'boss' && !nextDefeatedBossIds.includes(enemy.id)) {
    nextDefeatedBossIds = [...nextDefeatedBossIds, enemy.id];
  }

  const rewardedHero: HeroState = {
    ...hero,
    level: nextHeroLevel,
    xp: nextHeroXp,
    unspentStatPoints: nextStatPoints,
    gold: hero.gold + goldReward,
    knownRecipeIds: nextKnownRecipeIds,
    inventory: updatedInventory,
    maxHp: nextDerived.maxHp,
    currentHp: didLevelUp ? nextDerived.maxHp : Math.min(nextDerived.maxHp, hero.currentHp),
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
    .replace(new RegExp(hero.name, 'g'), 'Ви')
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
}
