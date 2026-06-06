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
    slotLabel: 'Зброя',
    purposeTemplate: 'Покращує темп ближнього бою та відкриває простір для наступальних афіксів.',
    sourceHint: 'Кузнярські шаблони відкриваються через прогрес і нові тирові креслення.',
    affixBehavior: 'Після крафту може отримати наступальні афікси: шкода, крит, швидкість, пробиття.'
  },
  {
    slot: 'shield',
    slotLabel: 'Щит',
    purposeTemplate: 'Посилює блок, витримку та фронтову живучість.',
    sourceHint: 'Найкраще працює як захисна гілка для стійких білдів кузні.',
    affixBehavior: 'Після крафту може отримати захисні афікси: блок, броня, HP, зниження шкоди.'
  },
  {
    slot: 'head',
    slotLabel: 'Голова',
    purposeTemplate: 'Дає ранній або проміжний запас захисту та допоміжних статів.',
    sourceHint: 'Схеми цієї категорії підтримують базову ремісничу прогресію броні.',
    affixBehavior: 'Після крафту може отримати утилітарні або захисні афікси.'
  },
  {
    slot: 'chest',
    slotLabel: 'Нагрудник',
    purposeTemplate: 'Є головною опорою виживання та базового захисту в новому тирі.',
    sourceHint: 'Потребує надійних тирових матеріалів і формує основу броньового апгрейду.',
    affixBehavior: 'Після крафту може отримати захисні афікси з акцентом на броню й витривалість.'
  },
  {
    slot: 'hands',
    slotLabel: 'Рукавиці',
    purposeTemplate: 'Підсилює точність, контроль темпу та допоміжні бойові бонуси.',
    sourceHint: 'Слугує легшим ремісничим апгрейдом між основними броньовими стрибками.',
    affixBehavior: 'Після крафту може отримати точність, швидкість і допоміжні бойові афікси.'
  },
  {
    slot: 'legs',
    slotLabel: 'Поножі',
    purposeTemplate: 'Додає запас живучості та стабільності для довших боїв.',
    sourceHint: 'Найкраще заходить як надійний ремісничий апгрейд середньої та пізньої гри.',
    affixBehavior: 'Після крафту може отримати HP, броню та витривалі допоміжні афікси.'
  },
  {
    slot: 'feet',
    slotLabel: 'Чоботи',
    purposeTemplate: 'Підкреслює мобільність, ухилення та темп пересування в бою.',
    sourceHint: 'Переважно спирається на легші матеріали та рухливі бойові мотиви.',
    affixBehavior: 'Після крафту може отримати афікси на ухилення, швидкість і легку утиліту.'
  },
  {
    slot: 'ring',
    slotLabel: 'Перстень',
    purposeTemplate: 'Формує білдівний акцент і підсилює допоміжні ролі героя.',
    sourceHint: 'Ювелірні схеми краще відчуваються як нагорода за сталий ремісничий прогрес.',
    affixBehavior: 'Після крафту може отримати білдівні або утилітарні афікси залежно від ролі.'
  },
  {
    slot: 'amulet',
    slotLabel: 'Амулет',
    purposeTemplate: 'Дає сильний допоміжний акцент і закріплює стиль збірки.',
    sourceHint: 'Амулетні схеми добре поєднуються з тематичними матеріалами та тировими вузлами.',
    affixBehavior: 'Після крафту може отримати цінні афікси на виживання, утиліту та рольові бонуси.'
  }
] as const;

export const CRAFTING_RECIPE_METADATA_OVERRIDES: ReadonlyArray<{
  recipeId: string;
  purposeText?: string;
  sourceHint?: string;
}> = [
  {
    recipeId: 'recipe_weapon_blade_lvl_01',
    purposeText: 'Початковий крафт зброї для першого переходу від стартового спорядження до стабільнішого ближнього бою.'
  },
  {
    recipeId: 'recipe_amulet_charm_lvl_30',
    sourceHint: 'Фінальний амулетний шаблон для пізньої кузні, розрахований на високотирові матеріали та сильні афікси.'
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
    return `Служить ремісничим покращенням для предмета рівня ${recipe.requiredLevel}.`;
  }

  return `${slotLabel} рівня ${recipe.requiredLevel} для нового тирового стрибка. ${slotMetadata.purposeTemplate}`;
}

function defaultSourceHint(recipe: Recipe, slotMetadata: CraftingSlotMetadataEntry | null): string {
  if (isStarterRecipeId(recipe.id)) {
    return 'Стартова кузнярська схема, доступна без додаткового пошуку рецепта.';
  }

  return slotMetadata?.sourceHint ?? 'Схема відкривається разом із кузнярським прогресом цього тиру.';
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
  const slotLabel = slotMetadata?.slotLabel ?? 'Предмет';

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
        ? 'Поведінка афіксів залежить від типу предмета.'
        : slotMetadata?.affixBehavior ?? 'Після крафту може отримати афікси, якщо предмет є екіпіровкою.',
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
