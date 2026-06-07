import type { HeroState, Recipe, Armor, EquipmentSlot } from '../../game/types';
import { weapons } from '../../data/weapons';
import { armors } from '../../data/armors';
import { shields } from '../../data/shields';
import { items } from '../../data/items';
import { resolveItemDefinitionByIdOrName } from '../../data/itemResolver';
import { getDisplayLocationName, getDisplayEnemyName } from '../../utils/displayHelpers';
import { getLiveRecipeUnlockRule, isStarterRecipeId } from '../../data/recipeDropSources';
import { getEquippableSlot } from '../../game/formulas/equipment';
import { createGeneratedEquipmentItem } from '../../game/equipment/generatedEquipment';
import { updateQuestProgressOnCraftCompleted } from '../../game/formulas/quests';
import { getMaterialDisplaySourceHint, getMaterialTaxonomy } from '../../data/materialTaxonomy';

export function usesCatalystOrRareMaterial(recipe: Recipe): boolean {
  if (!recipe.materials) return false;
  return recipe.materials.some((m) => {
    const item = items.find((i) => i.id.toLowerCase() === m.id.toLowerCase());
    if (!item) return false;
    const isRareOrEpic = item.rarity === 'rare' || item.rarity === 'epic';
    const taxonomy = getMaterialTaxonomy(m.id);
    const isCatalyst = taxonomy?.category === 'catalyst';
    return isRareOrEpic || isCatalyst;
  });
}

export function rollCraftRarity(recipe: Recipe, random: () => number = Math.random): string {
  const isImproved = usesCatalystOrRareMaterial(recipe);
  const roll = random() * 100;
  if (isImproved) {
    if (roll < 5) return 'epic';
    if (roll < 20) return 'rare';
    if (roll < 55) return 'uncommon';
    return 'common';
  } else {
    if (roll < 2) return 'epic';
    if (roll < 10) return 'rare';
    if (roll < 35) return 'uncommon';
    return 'common';
  }
}

export type CraftingBlockedReason =
  | 'INVALID_RECIPE'
  | 'UNRESOLVED_OUTPUT'
  | 'RECIPE_NOT_LEARNED'
  | 'LEVEL_TOO_LOW'
  | 'NOT_ENOUGH_GOLD'
  | 'MISSING_MATERIALS';

export interface BlockedReasonInfo {
  reason: CraftingBlockedReason;
  text: string;
}

export function resolveCraftResult(resultId: string) {
  if (!resultId) return null;
  const lowerId = resultId.toLowerCase();
  const match =
    weapons.find(w => w.id.toLowerCase() === lowerId) ??
    armors.find(a => a.id.toLowerCase() === lowerId) ??
    shields.find(s => s.id.toLowerCase() === lowerId) ??
    items.find(i => i.id.toLowerCase() === lowerId) ??
    resolveItemDefinitionByIdOrName(resultId, weapons) ??
    resolveItemDefinitionByIdOrName(resultId, armors) ??
    resolveItemDefinitionByIdOrName(resultId, shields) ??
    resolveItemDefinitionByIdOrName(resultId, items);

  if (match) {
    const weaponsSet = new Set(weapons.map(w => w.id.toLowerCase()));
    const armorsSet = new Set(armors.map(a => a.id.toLowerCase()));
    const shieldsSet = new Set(shields.map(s => s.id.toLowerCase()));
    const matchIdLower = match.id.toLowerCase();

    let cat = 'category' in match ? (match as Record<string, unknown>).category as string : 'crafted';
    if (weaponsSet.has(matchIdLower)) cat = 'weapon';
    else if (armorsSet.has(matchIdLower)) cat = (match as Armor).archetype || 'chest';
    else if (shieldsSet.has(matchIdLower)) cat = 'shield';

    return { ...match, category: cat };
  }
  return null;
}

export function getCraftingBlockedReason(
  recipe: Recipe | undefined,
  hero: HeroState,
  knownRecipeIds: Set<string>
): BlockedReasonInfo | null {
  if (!recipe || !recipe.id || !recipe.result || !recipe.materials || !Array.isArray(recipe.materials)) {
    return {
      reason: 'INVALID_RECIPE',
      text: 'РќРµРґС–Р№СЃРЅС– РґР°РЅС– СЂРµС†РµРїС‚Р°.'
    };
  }

  const outputItem = resolveCraftResult(recipe.result);
  if (!outputItem) {
    return {
      reason: 'UNRESOLVED_OUTPUT',
      text: 'РџРѕРјРёР»РєР°: РЅРµ РІРґР°Р»РѕСЃСЏ Р·РЅР°Р№С‚Рё РїСЂРµРґРјРµС‚ СЂРµР·СѓР»СЊС‚Р°С‚Сѓ РІ РєР°С‚Р°Р»РѕР·С–.'
    };
  }

  if (isStarterRecipeId(recipe.id)) {
    return {
      reason: 'RECIPE_NOT_LEARNED',
      text: 'Р¦РµР№ СЃС‚Р°СЂС‚РѕРІРёР№ СЂРµС†РµРїС‚ Р±С–Р»СЊС€Рµ РЅРµ РІРёРєРѕСЂРёСЃС‚РѕРІСѓС”С‚СЊСЃСЏ РґР»СЏ РєСЂР°С„С‚Сѓ.'
    };
  }

  if (!knownRecipeIds.has(recipe.id)) {
    const sourceText = getDisplayRecipeUnlockSource(recipe.id);
    return {
      reason: 'RECIPE_NOT_LEARNED',
      text: `Креслення ще не вивчено. Шукайте його тут: ${sourceText}.`
    };
  }

  if (hero.level < recipe.requiredLevel) {
    return {
      reason: 'LEVEL_TOO_LOW',
      text: `Замалий рівень героя. Для цього рецепта потрібен ${recipe.requiredLevel} рівень.`
    };
  }

  if (hero.gold < recipe.goldCost) {
    return {
      reason: 'NOT_ENOUGH_GOLD',
      text: `РќРµРґРѕСЃС‚Р°С‚РЅСЊРѕ Р·РѕР»РѕС‚Р° (РїРѕС‚СЂС–Р±РЅРѕ ${recipe.goldCost} Р·РѕР».).`
    };
  }

  const hasMaterials = recipe.materials.every((material) => {
    const stack = hero.inventory.find((item) => item.itemId.toLowerCase() === material.id.toLowerCase());
    return (stack?.qty ?? 0) >= material.qty;
  });

  if (!hasMaterials) {
    const missingMaterial = recipe.materials.find((material) => {
      const stack = hero.inventory.find((item) => item.itemId.toLowerCase() === material.id.toLowerCase());
      return (stack?.qty ?? 0) < material.qty;
    });
    const sourceHint = missingMaterial ? getMaterialDisplaySourceHint(missingMaterial.id) : null;
    return {
      reason: 'MISSING_MATERIALS',
      text: sourceHint
        ? `Недостатньо матеріалів для виготовлення. Спробуйте пошукати їх тут: ${sourceHint}.`
        : 'Недостатньо матеріалів для виготовлення.',
    };
  }

  return null;
}

export function getDisplayRecipeUnlockMethod(recipeId: string): string {
  const rule = getLiveRecipeUnlockRule(recipeId);
  if (!rule) {
    return 'РќРµРІС–РґРѕРјРѕ';
  }

  switch (rule.unlockType as string) {
    case 'starter':
      return 'РЎС‚Р°СЂС‚РѕРІРёР№ СЂРµС†РµРїС‚';
    case 'drop':
      return 'Р—РІРёС‡Р°Р№РЅРёР№ РґСЂРѕРї';
    case 'elite':
      return 'Р•Р»С–С‚РЅРёР№ РґСЂРѕРї';
    case 'boss':
      return 'РўСЂРѕС„РµР№ Р±РѕСЃР°';
    case 'quest':
      return 'РќР°РіРѕСЂРѕРґР° Р·Р° РєРІРµСЃС‚';
    default:
      return 'РќРµРІС–РґРѕРјРѕ';
  }
}

export function getDisplayRecipeUnlockSource(recipeId: string): string {
  const rule = getLiveRecipeUnlockRule(recipeId);
  if (!rule) {
    return 'РќРµРІС–РґРѕРјРµ РґР¶РµСЂРµР»Рѕ';
  }

  if (rule.unlockType === 'starter') {
    return 'Р”РѕСЃС‚СѓРїРЅРёР№ РІС–Рґ РїРѕС‡Р°С‚РєСѓ';
  }

  const locationName = getDisplayLocationName(rule.locationId);
  if (rule.enemyNames.length === 0) {
    return locationName;
  }

  const translatedEnemies = rule.enemyNames
    .map((name) => getDisplayEnemyName(name) || name)
    .join(' / ');

  return `${locationName} (${translatedEnemies})`;
}

export function getSafeVisibleRecipes(recipes: Recipe[], knownRecipeIds: Set<string>, heroLevel: number): Recipe[] {
  return recipes.filter((recipe) => {
    // Hide level 1 auto-equipped starter recipes
    if (isStarterRecipeId(recipe.id)) {
      return false;
    }

    if (knownRecipeIds.has(recipe.id)) {
      return true;
    }

    // Safely preview recipes that are near player level progression
    return recipe.requiredLevel <= heroLevel + 3;
  });
}

export interface RecipeStatChip {
  label: string;
  value: string;
}

interface CatalogItemStats {
  minDamage?: number;
  maxDamage?: number;
  attackSpeed?: number;
  armor?: number;
  defense?: number;
  blockChance?: number;
  blockValue?: number;
  blockPower?: number;
  maxHp?: number;
  maxHealth?: number;
  hpBonus?: number;
  damageBonus?: number;
  dodgeBonus?: number;
  dodgeChance?: number;
  accuracy?: number;
  healthRegen?: number;
}

export function getRecipeStatChips(recipe: Recipe): RecipeStatChip[] {
  const item = resolveCraftResult(recipe.result);
  const chips: RecipeStatChip[] = [];
  if (!item) {
    return chips;
  }

  const stats = item as unknown as CatalogItemStats;
  const slot = getEquippableSlot(item);
  let slotLabel = 'РџСЂРµРґРјРµС‚';
  if (slot === 'weapon') slotLabel = 'Р—Р±СЂРѕСЏ';
  else if (slot === 'shield') slotLabel = 'Р©РёС‚';
  else if (slot === 'head') slotLabel = 'РЁРѕР»РѕРј';
  else if (slot === 'chest') slotLabel = 'РћР±Р»Р°РґСѓРЅРѕРє';
  else if (slot === 'hands') slotLabel = 'Р СѓРєР°РІРёС†С–';
  else if (slot === 'legs') slotLabel = 'РџРѕРЅРѕР¶С–';
  else if (slot === 'feet') slotLabel = 'Р§РѕР±РѕС‚Рё';
  else if (slot === 'ring1' || slot === 'ring2') slotLabel = 'РџРµСЂСЃС‚РµРЅСЊ';
  else if (slot === 'amulet') slotLabel = 'РђРјСѓР»РµС‚';

  chips.push({ label: 'РЎР»РѕС‚', value: slotLabel });

  // Damage / Speed: Weapon only
  if (slot === 'weapon') {
    const minDmg = stats.minDamage ?? 0;
    const maxDmg = stats.maxDamage ?? 0;
    const speed = stats.attackSpeed ?? 1.0;
    chips.push({ label: 'РЁРєРѕРґР°', value: `${minDmg}-${maxDmg}` });
    chips.push({ label: 'РЁРІРёРґРєС–СЃС‚СЊ', value: `${speed}` });
  } else {
    // Defense: Non-weapon and non-accessory slots
    if (slot !== 'ring1' && slot !== 'ring2' && slot !== 'amulet') {
      const def = stats.armor ?? stats.defense ?? 0;
      if (def > 0) {
        chips.push({ label: 'Р—Р°С…РёСЃС‚', value: `+${def}` });
      }
      if (slot === 'shield') {
        const blockChance = stats.blockChance ?? 0;
        const blockValue = stats.blockValue ?? stats.blockPower ?? 0;
        if (blockChance > 0) {
          chips.push({ label: 'Р‘Р»РѕРє', value: `${Math.round(blockChance * 100)}%` });
        }
        if (blockValue > 0) {
          chips.push({ label: 'РЎРёР»Р° Р±Р»РѕРєСѓ', value: `+${blockValue}` });
        }
      }
    }
  }

  // Bonuses: HP, regen, agility/strength percent boosts, dodge
  const maxHp = stats.maxHp ?? stats.maxHealth ?? 0;
  if (maxHp > 0) {
    chips.push({ label: 'Р‘РѕРЅСѓСЃ HP', value: `+${maxHp}` });
  }
  const hpBonus = stats.hpBonus ?? 0;
  if (hpBonus > 0) {
    chips.push({ label: 'Р‘РѕРЅСѓСЃ HP %', value: `+${Math.round(hpBonus * 100)}%` });
  }
  const dmgBonus = stats.damageBonus ?? 0;
  if (dmgBonus > 0) {
    chips.push({ label: 'Р‘РѕРЅСѓСЃ С€РєРѕРґРё', value: `+${Math.round(dmgBonus * 100)}%` });
  }
  const dodgeBonus = stats.dodgeBonus ?? stats.dodgeChance ?? 0;
  if (dodgeBonus > 0) {
    chips.push({ label: 'РЈС…РёР»РµРЅРЅСЏ', value: `+${Math.round(dodgeBonus * 100)}%` });
  }
  const accuracy = stats.accuracy ?? 0;
  if (accuracy > 0) {
    chips.push({ label: 'Р’Р»СѓС‡РЅС–СЃС‚СЊ', value: `+${Math.round(accuracy * 100)}%` });
  }
  const healthRegen = stats.healthRegen ?? 0;
  if (healthRegen > 0) {
    chips.push({ label: 'Р РµРіРµРЅРµСЂР°С†С–СЏ', value: `+${healthRegen} HP/5СЃ` });
  }

  return chips;
}

export function executeCraftTransaction(
  recipe: Recipe,
  hero: HeroState,
  rollSuccess: (chance: number) => boolean,
  randomRarityChance: () => number = Math.random
): { success: boolean; hero: HeroState } {
  const knownRecipeIds = new Set(hero.knownRecipeIds ?? []);
  const blocked = getCraftingBlockedReason(recipe, hero, knownRecipeIds);
  if (blocked) {
    return { success: false, hero };
  }

  const outputItem = resolveCraftResult(recipe.result);
  if (!outputItem) {
    return { success: false, hero };
  }

  const nextInventory = hero.inventory
    .map((stack) => {
      const required = recipe.materials.find((item) => item.id.toLowerCase() === stack.itemId.toLowerCase());
      return required ? { ...stack, qty: stack.qty - required.qty } : stack;
    })
    .filter((stack) => stack.qty > 0);

  const isSuccess = rollSuccess(recipe.successChance);

  if (isSuccess) {
    const slot = getEquippableSlot(outputItem);
    const isEquip = slot !== null;

    if (isEquip) {
      const rolledRarity = rollCraftRarity(recipe, randomRarityChance);
      const generated = createGeneratedEquipmentItem({
        slot: slot as EquipmentSlot,
        level: recipe.requiredLevel,
        rarity: rolledRarity
      });
      nextInventory.push({
        itemId: generated.id,
        qty: 1,
        affixes: generated.affixes,
        durability: generated.durability,
        rerollCount: 0,
        generatedItem: generated
      });
    } else {
      const resultId = outputItem.id;
      const existingResult = nextInventory.find((stack) => stack.itemId.toLowerCase() === resultId.toLowerCase() && (!stack.affixes || stack.affixes.length === 0));
      if (existingResult) {
        existingResult.qty += 1;
      } else {
        nextInventory.push({ itemId: resultId, qty: 1 });
      }
    }
  }

  const nextHero = {
    ...hero,
    gold: hero.gold - recipe.goldCost,
    inventory: nextInventory
  };

  return {
    success: isSuccess,
    hero: isSuccess ? updateQuestProgressOnCraftCompleted(nextHero) : nextHero
  };
}
