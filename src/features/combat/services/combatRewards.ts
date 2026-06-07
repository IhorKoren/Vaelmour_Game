import type { Enemy, HeroState, Location } from '../../../game/types';
import { items } from '../../../data/items';
import { recipes } from '../../../data/recipes';
import { STARTER_RECIPE_IDS, rollLiveRecipeUnlock } from '../../../data/recipeDropSources';
import { calculateDerivedStats } from '../../../game/formulas/stats';
import { getEnemyXpReward, getEnemyGoldReward } from '../../../game/formulas/rewards';
import { rollLootDrop, rollGeneratedEquipmentDrop } from '../../../game/formulas/loot';
import { checkLevelUp } from '../../../game/formulas/progression';
import {
  updateQuestProgressOnEnemyKilled,
  updateQuestProgressOnBattleWon,
  updateQuestProgressOnMaterialGained
} from '../../../game/formulas/quests';
import {
  getDisplayEnemyName,
  getDisplayItemName,
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

const AUTO_KNOWN_RECIPE_IDS = [...STARTER_RECIPE_IDS];
const recipeNameById = new Map(recipes.map((recipe) => [recipe.id, recipe.name]));

function getKnownRecipeIds(hero: HeroState): string[] {
  return Array.from(new Set([...(hero.knownRecipeIds ?? AUTO_KNOWN_RECIPE_IDS), ...AUTO_KNOWN_RECIPE_IDS]));
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
  const lootResult = rollLootDrop(enemy, items, riskRaw, Math.random, currentLocation);
  const generatedEquipmentDrop = rollGeneratedEquipmentDrop(enemy, hero, currentLocation.id);
  const knownRecipeIds = getKnownRecipeIds(hero);
  const pityRecord = hero.recipeDropPity ?? {};
  const { learnedRecipe, updatedPity } = rollLiveRecipeUnlock(
    enemy.name,
    currentLocation.id,
    knownRecipeIds,
    pityRecord
  );
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
    recipeDropPity: updatedPity,
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
    ? `Перемога над елітним ворогом ${enemy.name}! Отримано ${xpReward} XP, ${goldReward} золота.`
    : (enemy.rank === 'boss'
        ? `Легендарна перемога над босом ${enemy.name}! Отримано ${xpReward} XP, ${goldReward} золота.`
        : `Перемога! Отримано ${xpReward} XP, ${goldReward} золота.`);

  const logLines = [
    victoryMessage,
    lootMessage
  ];

  if (learnedRecipe) {
    const recipeName = recipeNameById.get(learnedRecipe.id) ?? learnedRecipe.id;
    logLines.unshift(`Вивчено креслення: ${getDisplayItemName(recipeName)}.`);
  }

  if (didLevelUp) {
    logLines.unshift(`Новий рівень! Досягнуто ${levelUpResult.newLevel} рівня. Отримано ${levelUpResult.statPointsGained} очок характеристик.`);
  }

  if (translatedDmgLog.trim()) {
    logLines.push(translatedDmgLog);
  }

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
