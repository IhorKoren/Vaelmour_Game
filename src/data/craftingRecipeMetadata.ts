import { equipmentCatalog, EQUIPMENT_LEVELS } from './equipmentCatalog';
import { isStarterRecipeId } from './recipeDropSources';
import { recipes } from './recipes';
import {
  getMaterialCategoryLabel,
  getMaterialDisplaySourceHint,
  summarizeMaterialCategories
} from './materialTaxonomy';
import type { Recipe } from '../game/types';

export const CRAFTING_SLOT_METADATA = [
  {
    slot: 'weapon',
    slotLabel: 'Р—Р±СЂРѕСЏ',
    purposeTemplate: 'РџРѕРєСЂР°С‰СѓС” С‚РµРјРї Р±Р»РёР¶РЅСЊРѕРіРѕ Р±РѕСЋ С‚Р° РІС–РґРєСЂРёРІР°С” РїСЂРѕСЃС‚С–СЂ РґР»СЏ РЅР°СЃС‚СѓРїР°Р»СЊРЅРёС… Р°С„С–РєСЃС–РІ.',
    sourceHint: 'РљСѓР·РЅСЏСЂСЃСЊРєС– С€Р°Р±Р»РѕРЅРё РІС–РґРєСЂРёРІР°СЋС‚СЊСЃСЏ С‡РµСЂРµР· РїСЂРѕРіСЂРµСЃ С– РЅРѕРІС– С‚РёСЂРѕРІС– РєСЂРµСЃР»РµРЅРЅСЏ.',
    affixBehavior: 'РџС–СЃР»СЏ РєСЂР°С„С‚Сѓ РјРѕР¶Рµ РѕС‚СЂРёРјР°С‚Рё РЅР°СЃС‚СѓРїР°Р»СЊРЅС– Р°С„С–РєСЃРё: С€РєРѕРґР°, РєСЂРёС‚, С€РІРёРґРєС–СЃС‚СЊ, РїСЂРѕР±РёС‚С‚СЏ.'
  },
  {
    slot: 'shield',
    slotLabel: 'Р©РёС‚',
    purposeTemplate: 'РџРѕСЃРёР»СЋС” Р±Р»РѕРє, РІРёС‚СЂРёРјРєСѓ С‚Р° С„СЂРѕРЅС‚РѕРІСѓ Р¶РёРІСѓС‡С–СЃС‚СЊ.',
    sourceHint: 'РќР°Р№РєСЂР°С‰Рµ РїСЂР°С†СЋС” СЏРє Р·Р°С…РёСЃРЅР° РіС–Р»РєР° РґР»СЏ СЃС‚С–Р№РєРёС… Р±С–Р»РґС–РІ РєСѓР·РЅС–.',
    affixBehavior: 'РџС–СЃР»СЏ РєСЂР°С„С‚Сѓ РјРѕР¶Рµ РѕС‚СЂРёРјР°С‚Рё Р·Р°С…РёСЃРЅС– Р°С„С–РєСЃРё: Р±Р»РѕРє, Р±СЂРѕРЅСЏ, HP, Р·РЅРёР¶РµРЅРЅСЏ С€РєРѕРґРё.'
  },
  {
    slot: 'head',
    slotLabel: 'Р“РѕР»РѕРІР°',
    purposeTemplate: 'Р”Р°С” СЂР°РЅРЅС–Р№ Р°Р±Рѕ РїСЂРѕРјС–Р¶РЅРёР№ Р·Р°РїР°СЃ Р·Р°С…РёСЃС‚Сѓ С‚Р° РґРѕРїРѕРјС–Р¶РЅРёС… СЃС‚Р°С‚С–РІ.',
    sourceHint: 'РЎС…РµРјРё С†С–С”С— РєР°С‚РµРіРѕСЂС–С— РїС–РґС‚СЂРёРјСѓСЋС‚СЊ Р±Р°Р·РѕРІСѓ СЂРµРјС–СЃРЅРёС‡Сѓ РїСЂРѕРіСЂРµСЃС–СЋ Р±СЂРѕРЅС–.',
    affixBehavior: 'РџС–СЃР»СЏ РєСЂР°С„С‚Сѓ РјРѕР¶Рµ РѕС‚СЂРёРјР°С‚Рё СѓС‚РёР»С–С‚Р°СЂРЅС– Р°Р±Рѕ Р·Р°С…РёСЃРЅС– Р°С„С–РєСЃРё.'
  },
  {
    slot: 'chest',
    slotLabel: 'РќР°РіСЂСѓРґРЅРёРє',
    purposeTemplate: 'Р„ РіРѕР»РѕРІРЅРѕСЋ РѕРїРѕСЂРѕСЋ РІРёР¶РёРІР°РЅРЅСЏ С‚Р° Р±Р°Р·РѕРІРѕРіРѕ Р·Р°С…РёСЃС‚Сѓ РІ РЅРѕРІРѕРјСѓ С‚РёСЂС–.',
    sourceHint: 'РџРѕС‚СЂРµР±СѓС” РЅР°РґС–Р№РЅРёС… С‚РёСЂРѕРІРёС… РјР°С‚РµСЂС–Р°Р»С–РІ С– С„РѕСЂРјСѓС” РѕСЃРЅРѕРІСѓ Р±СЂРѕРЅСЊРѕРІРѕРіРѕ Р°РїРіСЂРµР№РґСѓ.',
    affixBehavior: 'РџС–СЃР»СЏ РєСЂР°С„С‚Сѓ РјРѕР¶Рµ РѕС‚СЂРёРјР°С‚Рё Р·Р°С…РёСЃРЅС– Р°С„С–РєСЃРё Р· Р°РєС†РµРЅС‚РѕРј РЅР° Р±СЂРѕРЅСЋ Р№ РІРёС‚СЂРёРІР°Р»С–СЃС‚СЊ.'
  },
  {
    slot: 'hands',
    slotLabel: 'Р СѓРєР°РІРёС†С–',
    purposeTemplate: 'РџС–РґСЃРёР»СЋС” С‚РѕС‡РЅС–СЃС‚СЊ, РєРѕРЅС‚СЂРѕР»СЊ С‚РµРјРїСѓ С‚Р° РґРѕРїРѕРјС–Р¶РЅС– Р±РѕР№РѕРІС– Р±РѕРЅСѓСЃРё.',
    sourceHint: 'РЎР»СѓРіСѓС” Р»РµРіС€РёРј СЂРµРјС–СЃРЅРёС‡РёРј Р°РїРіСЂРµР№РґРѕРј РјС–Р¶ РѕСЃРЅРѕРІРЅРёРјРё Р±СЂРѕРЅСЊРѕРІРёРјРё СЃС‚СЂРёР±РєР°РјРё.',
    affixBehavior: 'РџС–СЃР»СЏ РєСЂР°С„С‚Сѓ РјРѕР¶Рµ РѕС‚СЂРёРјР°С‚Рё С‚РѕС‡РЅС–СЃС‚СЊ, С€РІРёРґРєС–СЃС‚СЊ С– РґРѕРїРѕРјС–Р¶РЅС– Р±РѕР№РѕРІС– Р°С„С–РєСЃРё.'
  },
  {
    slot: 'legs',
    slotLabel: 'РџРѕРЅРѕР¶С–',
    purposeTemplate: 'Р”РѕРґР°С” Р·Р°РїР°СЃ Р¶РёРІСѓС‡РѕСЃС‚С– С‚Р° СЃС‚Р°Р±С–Р»СЊРЅРѕСЃС‚С– РґР»СЏ РґРѕРІС€РёС… Р±РѕС—РІ.',
    sourceHint: 'РќР°Р№РєСЂР°С‰Рµ Р·Р°С…РѕРґРёС‚СЊ СЏРє РЅР°РґС–Р№РЅРёР№ СЂРµРјС–СЃРЅРёС‡РёР№ Р°РїРіСЂРµР№Рґ СЃРµСЂРµРґРЅСЊРѕС— С‚Р° РїС–Р·РЅСЊРѕС— РіСЂРё.',
    affixBehavior: 'РџС–СЃР»СЏ РєСЂР°С„С‚Сѓ РјРѕР¶Рµ РѕС‚СЂРёРјР°С‚Рё HP, Р±СЂРѕРЅСЋ С‚Р° РІРёС‚СЂРёРІР°Р»С– РґРѕРїРѕРјС–Р¶РЅС– Р°С„С–РєСЃРё.'
  },
  {
    slot: 'feet',
    slotLabel: 'Р§РѕР±РѕС‚Рё',
    purposeTemplate: 'РџС–РґРєСЂРµСЃР»СЋС” РјРѕР±С–Р»СЊРЅС–СЃС‚СЊ, СѓС…РёР»РµРЅРЅСЏ С‚Р° С‚РµРјРї РїРµСЂРµСЃСѓРІР°РЅРЅСЏ РІ Р±РѕСЋ.',
    sourceHint: 'РџРµСЂРµРІР°Р¶РЅРѕ СЃРїРёСЂР°С”С‚СЊСЃСЏ РЅР° Р»РµРіС€С– РјР°С‚РµСЂС–Р°Р»Рё С‚Р° СЂСѓС…Р»РёРІС– Р±РѕР№РѕРІС– РјРѕС‚РёРІРё.',
    affixBehavior: 'РџС–СЃР»СЏ РєСЂР°С„С‚Сѓ РјРѕР¶Рµ РѕС‚СЂРёРјР°С‚Рё Р°С„С–РєСЃРё РЅР° СѓС…РёР»РµРЅРЅСЏ, С€РІРёРґРєС–СЃС‚СЊ С– Р»РµРіРєСѓ СѓС‚РёР»С–С‚Сѓ.'
  },
  {
    slot: 'ring',
    slotLabel: 'РџРµСЂСЃС‚РµРЅСЊ',
    purposeTemplate: 'Р¤РѕСЂРјСѓС” Р±С–Р»РґС–РІРЅРёР№ Р°РєС†РµРЅС‚ С– РїС–РґСЃРёР»СЋС” РґРѕРїРѕРјС–Р¶РЅС– СЂРѕР»С– РіРµСЂРѕСЏ.',
    sourceHint: 'Р®РІРµР»С–СЂРЅС– СЃС…РµРјРё РєСЂР°С‰Рµ РІС–РґС‡СѓРІР°СЋС‚СЊСЃСЏ СЏРє РЅР°РіРѕСЂРѕРґР° Р·Р° СЃС‚Р°Р»РёР№ СЂРµРјС–СЃРЅРёС‡РёР№ РїСЂРѕРіСЂРµСЃ.',
    affixBehavior: 'РџС–СЃР»СЏ РєСЂР°С„С‚Сѓ РјРѕР¶Рµ РѕС‚СЂРёРјР°С‚Рё Р±С–Р»РґС–РІРЅС– Р°Р±Рѕ СѓС‚РёР»С–С‚Р°СЂРЅС– Р°С„С–РєСЃРё Р·Р°Р»РµР¶РЅРѕ РІС–Рґ СЂРѕР»С–.'
  },
  {
    slot: 'amulet',
    slotLabel: 'РђРјСѓР»РµС‚',
    purposeTemplate: 'Р”Р°С” СЃРёР»СЊРЅРёР№ РґРѕРїРѕРјС–Р¶РЅРёР№ Р°РєС†РµРЅС‚ С– Р·Р°РєСЂС–РїР»СЋС” СЃС‚РёР»СЊ Р·Р±С–СЂРєРё.',
    sourceHint: 'РђРјСѓР»РµС‚РЅС– СЃС…РµРјРё РґРѕР±СЂРµ РїРѕС”РґРЅСѓСЋС‚СЊСЃСЏ Р· С‚РµРјР°С‚РёС‡РЅРёРјРё РјР°С‚РµСЂС–Р°Р»Р°РјРё С‚Р° С‚РёСЂРѕРІРёРјРё РІСѓР·Р»Р°РјРё.',
    affixBehavior: 'РџС–СЃР»СЏ РєСЂР°С„С‚Сѓ РјРѕР¶Рµ РѕС‚СЂРёРјР°С‚Рё С†С–РЅРЅС– Р°С„С–РєСЃРё РЅР° РІРёР¶РёРІР°РЅРЅСЏ, СѓС‚РёР»С–С‚Сѓ С‚Р° СЂРѕР»СЊРѕРІС– Р±РѕРЅСѓСЃРё.'
  }
] as const;

export const CRAFTING_RECIPE_METADATA_OVERRIDES: ReadonlyArray<{
  recipeId: string;
  purposeText?: string;
  sourceHint?: string;
}> = [
  {
    recipeId: 'recipe_weapon_blade_lvl_01',
    purposeText: 'РџРѕС‡Р°С‚РєРѕРІРёР№ РєСЂР°С„С‚ Р·Р±СЂРѕС— РґР»СЏ РїРµСЂС€РѕРіРѕ РїРµСЂРµС…РѕРґСѓ РІС–Рґ СЃС‚Р°СЂС‚РѕРІРѕРіРѕ СЃРїРѕСЂСЏРґР¶РµРЅРЅСЏ РґРѕ СЃС‚Р°Р±С–Р»СЊРЅС–С€РѕРіРѕ Р±Р»РёР¶РЅСЊРѕРіРѕ Р±РѕСЋ.'
  },
  {
    recipeId: 'recipe_weapon_blade_lvl_03',
    purposeText: 'Перша помітна заміна стартової зброї. Дає відчутний приріст темпу бою ще до виходу з початкової зони.',
    sourceHint: 'Креслення приходить із першого квесту коваля на Околицях Розбитої дороги (LOC_001), а також може випасти там із ворогів.',
  },
  {
    recipeId: 'recipe_feet_boots_lvl_03',
    purposeText: 'Ранній захисний крафт із лісових трофеїв, який показує, що не всі апгрейди привязані до зброї.',
    sourceHint: 'Нагорода за квест у Лісі Чорного Ікла (LOC_002) або випадкова здобич на Околицях Розбитої дороги (LOC_001).',
  },
  {
    recipeId: 'recipe_shield_guard_lvl_03',
    sourceHint: 'Можна знайти як випадкову здобич на Околицях Розбитої дороги (LOC_001).',
  },
  {
    recipeId: 'recipe_head_helmet_lvl_03',
    sourceHint: 'Можна знайти як випадкову здобич на Околицях Розбитої дороги (LOC_001).',
  },
  {
    recipeId: 'recipe_chest_armor_lvl_03',
    sourceHint: 'Можна знайти як випадкову здобич на Околицях Розбитої дороги (LOC_001).',
  },
  {
    recipeId: 'recipe_hands_gloves_lvl_03',
    sourceHint: 'Можна знайти як випадкову здобич на Околицях Розбитої дороги (LOC_001).',
  },
  {
    recipeId: 'recipe_legs_pants_lvl_03',
    sourceHint: 'Можна знайти як випадкову здобич на Околицях Розбитої дороги (LOC_001).',
  },
  {
    recipeId: 'recipe_ring_band_lvl_03',
    sourceHint: 'Можна знайти як випадкову здобич на Околицях Розбитої дороги (LOC_001).',
  },
  {
    recipeId: 'recipe_amulet_charm_lvl_03',
    sourceHint: 'Можна знайти як випадкову здобич на Околицях Розбитої дороги (LOC_001).',
  },
  {
    recipeId: 'recipe_shield_guard_lvl_06',
    purposeText: 'Перший міцніший захисний предмет для входу в 5-6 рівень і рейдерські бої.',
    sourceHint: 'Відкривається після квесту Табору рейдерів, коли герой уже бачив емблеми та залізні кріплення цієї зони.',
  },
  {
    recipeId: 'recipe_amulet_charm_lvl_30',
    sourceHint: 'Р¤С–РЅР°Р»СЊРЅРёР№ Р°РјСѓР»РµС‚РЅРёР№ С€Р°Р±Р»РѕРЅ РґР»СЏ РїС–Р·РЅСЊРѕС— РєСѓР·РЅС–, СЂРѕР·СЂР°С…РѕРІР°РЅРёР№ РЅР° РІРёСЃРѕРєРѕС‚РёСЂРѕРІС– РјР°С‚РµСЂС–Р°Р»Рё С‚Р° СЃРёР»СЊРЅС– Р°С„С–РєСЃРё.'
  }
] as const;

type CraftingSlotMetadataEntry = (typeof CRAFTING_SLOT_METADATA)[number];
type CraftingRecipeOverrideEntry = (typeof CRAFTING_RECIPE_METADATA_OVERRIDES)[number];

export type CraftingRecipeMetadata = {
  recipeId: string;
  slot: CraftingSlotMetadataEntry['slot'] | 'other';
  slotLabel: string;
  levelStep: number;
  purposeText: string;
  sourceHint: string;
  materialCategorySummary: string;
  materialSourceHints: string[];
  expectedAffixBehavior: string;
  rarity: string;
  craftingTier: number;
};

const slotMetadataBySlot = new Map<string, CraftingSlotMetadataEntry>(
  CRAFTING_SLOT_METADATA.map((entry) => [entry.slot, entry])
);

const overridesByRecipeId = new Map<string, CraftingRecipeOverrideEntry>(
  CRAFTING_RECIPE_METADATA_OVERRIDES.map((entry) => [entry.recipeId, entry])
);

function resolveRecipeSlot(recipe: Recipe): CraftingSlotMetadataEntry['slot'] | 'other' {
  const catalogMatch = equipmentCatalog.find((item) => item.id.toLowerCase() === recipe.result.toLowerCase());

  if (catalogMatch) {
    return catalogMatch.slot;
  }

  const itemType = (recipe.itemType ?? '').toLowerCase();

  if (itemType.includes('shield')) return 'shield';
  if (itemType.includes('amulet') || itemType.includes('charm')) return 'amulet';
  if (itemType.includes('ring')) return 'ring';
  if (['weapon', 'sword', 'axe', 'hammer'].includes(itemType)) return 'weapon';
  if (itemType.includes('head')) return 'head';
  if (itemType.includes('chest') || itemType.includes('armor')) return 'chest';
  if (itemType.includes('hands')) return 'hands';
  if (itemType.includes('legs')) return 'legs';
  if (itemType.includes('feet')) return 'feet';

  return 'other';
}

function defaultPurposeText(recipe: Recipe, slotLabel: string, slotMetadata: CraftingSlotMetadataEntry | null): string {
  if (!slotMetadata) {
    return `РЎР»СѓР¶РёС‚СЊ СЂРµРјС–СЃРЅРёС‡РёРј РїРѕРєСЂР°С‰РµРЅРЅСЏРј РґР»СЏ РїСЂРµРґРјРµС‚Р° СЂС–РІРЅСЏ ${recipe.requiredLevel}.`;
  }

  return `${slotLabel} СЂС–РІРЅСЏ ${recipe.requiredLevel} РґР»СЏ РЅРѕРІРѕРіРѕ С‚РёСЂРѕРІРѕРіРѕ СЃС‚СЂРёР±РєР°. ${slotMetadata.purposeTemplate}`;
}

function defaultSourceHint(recipe: Recipe, slotMetadata: CraftingSlotMetadataEntry | null): string {
  if (isStarterRecipeId(recipe.id)) {
    return 'РЎС‚Р°СЂС‚РѕРІР° РєСѓР·РЅСЏСЂСЃСЊРєР° СЃС…РµРјР°, РґРѕСЃС‚СѓРїРЅР° Р±РµР· РґРѕРґР°С‚РєРѕРІРѕРіРѕ РїРѕС€СѓРєСѓ СЂРµС†РµРїС‚Р°.';
  }

  return slotMetadata?.sourceHint ?? 'РЎС…РµРјР° РІС–РґРєСЂРёРІР°С”С‚СЊСЃСЏ СЂР°Р·РѕРј С–Р· РєСѓР·РЅСЏСЂСЃСЊРєРёРј РїСЂРѕРіСЂРµСЃРѕРј С†СЊРѕРіРѕ С‚РёСЂСѓ.';
}

function deriveMaterialSourceHints(recipe: Recipe): string[] {
  return recipe.materials.map((material) => {
    const categoryLabel = getMaterialCategoryLabel(material.id);
    return `${categoryLabel}: ${getMaterialDisplaySourceHint(material.id)}`;
  });
}

export function getCraftingRecipeMetadata(recipe: Recipe): CraftingRecipeMetadata {
  const slot = resolveRecipeSlot(recipe);
  const slotMetadata = slot === 'other' ? null : (slotMetadataBySlot.get(slot) ?? null);
  const override = overridesByRecipeId.get(recipe.id);
  const slotLabel = slotMetadata?.slotLabel ?? 'РџСЂРµРґРјРµС‚';

  return {
    recipeId: recipe.id,
    slot,
    slotLabel,
    levelStep: recipe.requiredLevel,
    purposeText: override?.purposeText ?? defaultPurposeText(recipe, slotLabel, slotMetadata),
    sourceHint: override?.sourceHint ?? defaultSourceHint(recipe, slotMetadata),
    materialCategorySummary: summarizeMaterialCategories(recipe.materials.map((material) => material.id)),
    materialSourceHints: deriveMaterialSourceHints(recipe),
    expectedAffixBehavior:
      override?.sourceHint && !slotMetadata
        ? 'РџРѕРІРµРґС–РЅРєР° Р°С„С–РєСЃС–РІ Р·Р°Р»РµР¶РёС‚СЊ РІС–Рґ С‚РёРїСѓ РїСЂРµРґРјРµС‚Р°.'
        : slotMetadata?.affixBehavior ?? 'РџС–СЃР»СЏ РєСЂР°С„С‚Сѓ РјРѕР¶Рµ РѕС‚СЂРёРјР°С‚Рё Р°С„С–РєСЃРё, СЏРєС‰Рѕ РїСЂРµРґРјРµС‚ С” РµРєС–РїС–СЂРѕРІРєРѕСЋ.',
    rarity: recipe.rarity ?? 'common',
    craftingTier: recipe.tier ?? 1
  };
}

export function getCraftingRecipeMetadataById(recipeId: string): CraftingRecipeMetadata | null {
  const recipe = recipes.find((entry) => entry.id === recipeId);
  return recipe ? getCraftingRecipeMetadata(recipe) : null;
}

export function isValidCraftingLevelStep(level: number): boolean {
  return (EQUIPMENT_LEVELS as readonly number[]).includes(level);
}
