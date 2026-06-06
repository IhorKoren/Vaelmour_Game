import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const generatedDir = path.join(repoRoot, 'src', 'data', 'generated');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function readTsConstArray(relativePath, exportName) {
  const source = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
  const pattern = new RegExp(`export const ${exportName}(?::[^=]+)? = (\\[[\\s\\S]*?\\]) as const;`);
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Unable to read ${exportName} from ${relativePath}`);
  }
  return Function(`"use strict"; return (${match[1]});`)();
}

function normalizeValue(value) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeLooseText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function splitCsv(value) {
  return String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function splitMaterialReferences(value) {
  return String(value ?? '')
    .split(/[\/,]/)
    .map((entry) =>
      entry
        .replace(/\s+x[\d\-–—]+$/i, '')
        .replace(/\s+chance$/i, '')
        .trim()
    )
    .filter(Boolean);
}

function parseNumberish(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function matchesGenericSourceText(value) {
  const normalized = normalizeLooseText(value);
  return genericSourceTextAllowList.some((entry) => normalized.includes(entry));
}

function addError(errors, message) {
  errors.push(message);
}

function addWarning(warnings, message) {
  warnings.push(message);
}

function validateUniqueIds(records, label, errors) {
  const seen = new Set();

  for (const record of records) {
    const id = normalizeValue(record?.id);
    if (!id) {
      addError(errors, `${label}: missing id`);
      continue;
    }
    if (seen.has(id)) {
      addError(errors, `${label}: duplicate id "${record.id}"`);
      continue;
    }
    seen.add(id);
  }
}

function makeIndexedLookups(records, idField = 'id', nameField = 'name') {
  const byId = new Map();
  const byName = new Map();

  for (const record of records) {
    const id = normalizeValue(record?.[idField]);
    const name = normalizeLooseText(record?.[nameField]);
    if (id && !byId.has(id)) byId.set(id, record);
    if (name && !byName.has(name)) byName.set(name, record);
  }

  return { byId, byName };
}

function hasRecord(lookups, value) {
  const id = normalizeValue(value);
  const name = normalizeLooseText(value);
  return lookups.byId.has(id) || lookups.byName.has(name);
}

function resolveRecord(lookups, value) {
  const id = normalizeValue(value);
  const name = normalizeLooseText(value);
  return lookups.byId.get(id) ?? lookups.byName.get(name) ?? null;
}

const validRarities = new Set(['common', 'uncommon', 'rare', 'epic', 'legendary']);
const validEquipmentSlots = new Set(['weapon', 'head', 'chest', 'hands', 'legs', 'feet', 'shield', 'ring', 'amulet']);
const genericSourceTextAllowList = ['common enemies', 'elite spawn', 'zone progress', 'zone milestone', 'elite enemy', 'any level'];
const statKeys = new Set([
  'minDamage',
  'maxDamage',
  'attackSpeed',
  'defense',
  'armor',
  'damageBonus',
  'dodgeBonus',
  'dodgeChance',
  'hpBonus',
  'maxHealth',
  'maxHp',
  'healthRegen',
  'accuracy',
  'critChance',
  'critDamage',
  'attackSpeedBonus',
  'armorPenetration',
  'stunChance',
  'bleedChance',
  'stunResist',
  'bleedResist',
  'blockChance',
  'blockValue',
  'blockPower',
  'staggerResist',
  'damageReduction',
  'lifeSteal',
  'goldFindBonus',
  'lootChanceBonus',
  'rarityFindBonus',
  'durabilityLossReduction'
]);

const locations = readJson('src/data/generated/locations.json');
const enemies = readJson('src/data/generated/enemies.json');
const items = readJson('src/data/generated/items.json');
const recipes = readJson('src/data/generated/recipes.json');
const materials = readJson('src/data/generated/materials.json');
const bosses = readJson('src/data/generated/bosses.json');
const spawnPools = readJson('src/data/generated/spawnPools.json');
const baseRecipeDrops = readJson('src/data/generated/recipeDrops.json');
const lootTables = readJson('src/data/generated/lootTables.json');
const bossLoot = lootTables.bossLoot ?? [];
const enemyLootData = lootTables.enemyLoot ?? [];
const locationLootData = lootTables.locationLoot ?? [];
const materialLootData = lootTables.materialLoot ?? [];

const ringRecipes = readJson('src/data/generated/ringRecipes.json');
const shieldRecipes = readJson('src/data/generated/shieldRecipes.json');
const amuletRecipes = readJson('src/data/generated/amuletRecipes.json');
const minorArmorRecipes = readJson('src/data/generated/minorArmorRecipes.json');

const ringRecipeDrops = readJson('src/data/generated/ringRecipeDrops.json');
const shieldRecipeDrops = readJson('src/data/generated/shieldRecipeDrops.json');
const amuletRecipeDrops = readJson('src/data/generated/amuletRecipeDrops.json');
const minorArmorRecipeDrops = readJson('src/data/generated/minorArmorRecipeDrops.json');

const generatedWeapons = readJson('src/data/generated/weapons.json');
const generatedArmors = readJson('src/data/generated/armors.json');
const generatedShields = readJson('src/data/generated/shields.json');
const generatedRings = readJson('src/data/generated/rings.json');
const generatedAmulets = readJson('src/data/generated/amulets.json');
const generatedMinorArmor = readJson('src/data/generated/minorArmor.json');

const shieldUniqueItemDrops = readTsConstArray('src/data/shieldLoot.ts', 'shieldUniqueItemDrops');
const shieldLocationLoot = readTsConstArray('src/data/shieldLoot.ts', 'shieldLocationLoot');
const ringUniqueItemDrops = readTsConstArray('src/data/ringLoot.ts', 'ringUniqueItemDrops');
const ringLocationLoot = readTsConstArray('src/data/ringLoot.ts', 'ringLocationLoot');
const amuletUniqueItemDrops = readTsConstArray('src/data/amuletLoot.ts', 'amuletUniqueItemDrops');
const amuletLocationLoot = readTsConstArray('src/data/amuletLoot.ts', 'amuletLocationLoot');
const minorArmorUniqueItemDrops = readTsConstArray('src/data/minorArmorLoot.ts', 'minorArmorUniqueItemDrops');
const minorArmorLocationLoot = readTsConstArray('src/data/minorArmorLoot.ts', 'minorArmorLocationLoot');
const materialTaxonomy = readTsConstArray('src/data/materialTaxonomy.ts', 'MATERIAL_TAXONOMY');
const craftingLevelSteps = readTsConstArray('src/data/materialTaxonomy.ts', 'CRAFTING_LEVEL_STEPS');
const materialTaxonomyCategories = readTsConstArray('src/data/materialTaxonomy.ts', 'MATERIAL_TAXONOMY_CATEGORIES');
const legacyMaterialCompatibility = readTsConstArray('src/data/legacyMaterialMap.ts', 'LEGACY_MATERIAL_COMPATIBILITY');
const craftingSlotMetadata = readTsConstArray('src/data/craftingRecipeMetadata.ts', 'CRAFTING_SLOT_METADATA');
const craftingRecipeMetadataOverrides = readTsConstArray('src/data/craftingRecipeMetadata.ts', 'CRAFTING_RECIPE_METADATA_OVERRIDES');
const liveRecipeSlotProfiles = readTsConstArray('src/data/equipmentCatalog.ts', 'LIVE_RECIPE_SLOT_PROFILES');
const starterRecipeIds = readTsConstArray('src/data/recipeDropSources.ts', 'STARTER_RECIPE_IDS');
const liveRecipeUnlockTemplates = readTsConstArray('src/data/recipeDropSources.ts', 'LIVE_RECIPE_UNLOCK_TEMPLATES');

const allRecipes = [
  ...recipes,
  ...ringRecipes,
  ...shieldRecipes,
  ...amuletRecipes,
  ...minorArmorRecipes
];

const allRecipeDrops = [
  ...baseRecipeDrops,
  ...ringRecipeDrops,
  ...shieldRecipeDrops,
  ...amuletRecipeDrops,
  ...minorArmorRecipeDrops
];

const allEquipmentCatalogs = [
  ...generatedWeapons,
  ...generatedArmors,
  ...generatedShields,
  ...generatedRings,
  ...generatedAmulets,
  ...generatedMinorArmor
];

const allUniqueItemDrops = [
  ...(lootTables.uniqueItemDrops ?? []),
  ...shieldUniqueItemDrops,
  ...ringUniqueItemDrops,
  ...amuletUniqueItemDrops,
  ...minorArmorUniqueItemDrops
];

const allLocationLoot = [
  ...locationLootData,
  ...shieldLocationLoot,
  ...ringLocationLoot,
  ...amuletLocationLoot,
  ...minorArmorLocationLoot
];

const errors = [];
const warnings = [];

const allItemRecords = [
  ...items,
  ...generatedShields,
  ...generatedRings,
  ...generatedAmulets,
  ...generatedMinorArmor
];

validateUniqueIds(locations, 'locations', errors);
validateUniqueIds(enemies, 'enemies', errors);
validateUniqueIds(items, 'items', errors);
validateUniqueIds(materials, 'materials', errors);
validateUniqueIds(allRecipes, 'recipes', errors);
validateUniqueIds(bosses, 'bosses', errors);
validateUniqueIds(allEquipmentCatalogs, 'equipment catalogs', errors);

const locationIds = new Set(locations.map((location) => location.id));
const enemyIds = new Set(enemies.map((enemy) => enemy.id));
const recipeIds = new Set(allRecipes.map((recipe) => normalizeValue(recipe.id)));
const itemIdSet = new Set(allItemRecords.map((item) => normalizeValue(item.id)));
const itemNameSet = new Set(allItemRecords.map((item) => normalizeLooseText(item.name)));
const materialIdSet = new Set(materials.map((material) => normalizeValue(material.id)));
const materialNameSet = new Set(materials.map((material) => normalizeLooseText(material.name)));
const validCraftingLevelSteps = new Set(craftingLevelSteps.map((value) => Number(value)));
const validMaterialTaxonomyCategories = new Set(materialTaxonomyCategories.map((value) => normalizeValue(value)));
const validCraftingSlotIds = new Set(['weapon', 'shield', 'head', 'chest', 'hands', 'legs', 'feet', 'ring', 'amulet']);
const validLiveRecipeUnlockTypes = new Set(['starter', 'drop', 'elite', 'boss']);

const locationLookups = makeIndexedLookups(locations);
const enemyLookups = makeIndexedLookups(enemies);
const itemLookups = makeIndexedLookups(allItemRecords);
const materialLookups = makeIndexedLookups(materials);
const recipeLookups = makeIndexedLookups(allRecipes);
const bossLookups = makeIndexedLookups(bosses);
const bossNameLookups = makeIndexedLookups([
  ...bosses,
  ...bossLoot.map((entry) => ({ id: entry.boss_name, name: entry.boss_name })),
  ...locations
    .filter((location) => location.bossOrKeyEnemy && normalizeLooseText(location.bossOrKeyEnemy) !== 'none')
    .map((location) => ({ id: location.bossOrKeyEnemy, name: location.bossOrKeyEnemy }))
]);
const sourceEnemyLookups = makeIndexedLookups([
  ...enemies,
  ...spawnPools.map((entry) => ({ id: entry.enemy_name, name: entry.enemy_name })),
  ...bossLoot.map((entry) => ({ id: entry.boss_name, name: entry.boss_name })),
  ...locations
    .filter((location) => location.bossOrKeyEnemy && normalizeLooseText(location.bossOrKeyEnemy) !== 'none')
    .map((location) => ({ id: location.bossOrKeyEnemy, name: location.bossOrKeyEnemy }))
]);

const usedItemIds = new Set();
const usedRecipeIds = new Set();
const usedMaterialIds = new Set();

const materialTaxonomyIds = new Set();
const materialTaxonomyById = new Map();
for (const entry of materialTaxonomy) {
  const materialId = normalizeValue(entry.materialId);
  if (!materialId) {
    addError(errors, 'materialTaxonomy: missing materialId');
    continue;
  }

  if (materialTaxonomyIds.has(materialId)) {
    addError(errors, `materialTaxonomy: duplicate material entry "${entry.materialId}"`);
    continue;
  }
  materialTaxonomyIds.add(materialId);
  materialTaxonomyById.set(materialId, entry);

  if (!materialIdSet.has(materialId)) {
    addError(errors, `materialTaxonomy: unknown material id "${entry.materialId}"`);
  }

  const category = normalizeValue(entry.category);
  if (!validMaterialTaxonomyCategories.has(category)) {
    addError(errors, `materialTaxonomy ${entry.materialId}: invalid category "${entry.category}"`);
  }

  const tierStep = parseNumberish(entry.tierStep);
  if (tierStep === null || !validCraftingLevelSteps.has(tierStep)) {
    addError(errors, `materialTaxonomy ${entry.materialId}: invalid tier step "${entry.tierStep}"`);
  }

  if (!entry.playerLabel || !String(entry.playerLabel).trim()) {
    addError(errors, `materialTaxonomy ${entry.materialId}: missing player-facing category label`);
  }

  if (!entry.primaryUse || !String(entry.primaryUse).trim()) {
    addWarning(warnings, `materialTaxonomy ${entry.materialId}: vague or missing primary use`);
  }

  if (!entry.isLegacy && (!entry.sourceHint || !String(entry.sourceHint).trim())) {
    addWarning(warnings, `materialTaxonomy ${entry.materialId}: missing source hint`);
  }
}

for (const material of materials) {
  const normalizedId = normalizeValue(material.id);
  if (!materialTaxonomyIds.has(normalizedId)) {
    addWarning(warnings, `material ${material.id}: no taxonomy entry found`);
  }
}

const legacyMaterialIds = new Set();
for (const entry of legacyMaterialCompatibility) {
  const legacyId = normalizeValue(entry.legacyId);
  const canonicalMaterialId = normalizeValue(entry.canonicalMaterialId);

  if (!legacyId) {
    addError(errors, 'legacyMaterialMap: missing legacyId');
    continue;
  }

  if (legacyMaterialIds.has(legacyId)) {
    addError(errors, `legacyMaterialMap: duplicate legacy id "${entry.legacyId}"`);
    continue;
  }
  legacyMaterialIds.add(legacyId);

  if (!canonicalMaterialId || !materialIdSet.has(canonicalMaterialId)) {
    addError(errors, `legacyMaterialMap ${entry.legacyId}: canonical material "${entry.canonicalMaterialId}" does not exist`);
  }

  if (!validMaterialTaxonomyCategories.has(normalizeValue(entry.category))) {
    addError(errors, `legacyMaterialMap ${entry.legacyId}: invalid category "${entry.category}"`);
  }

  if (!entry.futureReplacementId && !entry.category) {
    addWarning(warnings, `legacyMaterialMap ${entry.legacyId}: no replacement or category mapping provided`);
  }
}

const craftingSlotMetadataIds = new Set();
for (const entry of craftingSlotMetadata) {
  const slot = normalizeValue(entry.slot);
  if (!slot) {
    addError(errors, 'craftingRecipeMetadata: slot metadata entry missing slot');
    continue;
  }

  if (craftingSlotMetadataIds.has(slot)) {
    addError(errors, `craftingRecipeMetadata: duplicate slot metadata "${entry.slot}"`);
    continue;
  }
  craftingSlotMetadataIds.add(slot);

  if (!validCraftingSlotIds.has(slot)) {
    addError(errors, `craftingRecipeMetadata: invalid slot "${entry.slot}"`);
  }

  if (!entry.sourceHint || !String(entry.sourceHint).trim()) {
    addWarning(warnings, `craftingRecipeMetadata ${entry.slot}: missing source hint`);
  }

  if (!entry.purposeTemplate || String(entry.purposeTemplate).trim().length < 20) {
    addWarning(warnings, `craftingRecipeMetadata ${entry.slot}: vague purpose text`);
  }
}

const liveRecipeProfileSlots = new Set();
for (const profile of liveRecipeSlotProfiles) {
  const slot = normalizeValue(profile.slot);
  if (!slot) {
    addError(errors, 'equipmentCatalog live recipe profiles: missing slot');
    continue;
  }

  if (liveRecipeProfileSlots.has(slot)) {
    addError(errors, `equipmentCatalog live recipe profiles: duplicate slot "${profile.slot}"`);
    continue;
  }
  liveRecipeProfileSlots.add(slot);

  if (!validCraftingSlotIds.has(slot)) {
    addError(errors, `equipmentCatalog live recipe profiles: invalid slot "${profile.slot}"`);
  }

  if (!Array.isArray(profile.goldCosts) || profile.goldCosts.length !== craftingLevelSteps.length) {
    addError(errors, `equipmentCatalog ${profile.slot}: goldCosts must cover all ${craftingLevelSteps.length} crafting steps`);
  }

  if (!Array.isArray(profile.materialSets) || profile.materialSets.length !== craftingLevelSteps.length) {
    addError(errors, `equipmentCatalog ${profile.slot}: materialSets must cover all ${craftingLevelSteps.length} crafting steps`);
    continue;
  }

  for (const [index, materialSet] of profile.materialSets.entries()) {
    const levelStep = Number(craftingLevelSteps[index]);
    const goldCost = parseNumberish(profile.goldCosts?.[index]);

    if (goldCost === null || goldCost <= 0) {
      addError(errors, `equipmentCatalog ${profile.slot} step ${levelStep}: invalid gold cost "${profile.goldCosts?.[index]}"`);
    }

    if (!Array.isArray(materialSet) || materialSet.length === 0) {
      addError(errors, `equipmentCatalog ${profile.slot} step ${levelStep}: missing material costs`);
      continue;
    }

    const categoriesInRecipe = new Set();
    let catalystCount = 0;
    let bossCount = 0;

    for (const material of materialSet) {
      const materialId = normalizeValue(material.id);
      const qty = parseNumberish(material.qty);

      if (!materialIdSet.has(materialId)) {
        addError(errors, `equipmentCatalog ${profile.slot} step ${levelStep}: unknown material "${material.id}"`);
        continue;
      }

      if (qty === null || qty <= 0) {
        addError(errors, `equipmentCatalog ${profile.slot} step ${levelStep}: invalid quantity for "${material.id}"`);
      }

      const taxonomyEntry = materialTaxonomyById.get(materialId);
      if (!taxonomyEntry) {
        addError(errors, `equipmentCatalog ${profile.slot} step ${levelStep}: material "${material.id}" has no taxonomy coverage`);
        continue;
      }

      const category = normalizeValue(taxonomyEntry.category);
      categoriesInRecipe.add(category);
      if (category === 'catalyst') catalystCount += 1;
      if (category === 'boss') bossCount += 1;
    }

    if (levelStep >= 3 && categoriesInRecipe.size === 0) {
      addError(errors, `equipmentCatalog ${profile.slot} step ${levelStep}: no meaningful material categories found`);
    }

    if (levelStep >= 6 && categoriesInRecipe.size === 1 && categoriesInRecipe.has('base')) {
      addError(errors, `equipmentCatalog ${profile.slot} step ${levelStep}: high-progress recipe uses only base materials`);
    }

    if (levelStep <= 9 && (categoriesInRecipe.has('boss') || categoriesInRecipe.has('catalyst'))) {
      addError(errors, `equipmentCatalog ${profile.slot} step ${levelStep}: low-level recipe requires boss or catalyst materials`);
    }

    if (levelStep <= 12 && categoriesInRecipe.has('boss')) {
      addError(errors, `equipmentCatalog ${profile.slot} step ${levelStep}: boss material appears too early`);
    }

    if (catalystCount > 2) {
      addWarning(warnings, `equipmentCatalog ${profile.slot} step ${levelStep}: catalyst usage looks excessive`);
    }

    if (bossCount > 1) {
      addWarning(warnings, `equipmentCatalog ${profile.slot} step ${levelStep}: boss-material usage looks excessive`);
    }

    if (levelStep >= 24 && !categoriesInRecipe.has('tier') && !categoriesInRecipe.has('boss')) {
      addWarning(warnings, `equipmentCatalog ${profile.slot} step ${levelStep}: late recipe may be missing a strong progression material`);
    }
  }
}

const liveRecipePrefixes = [
  'weapon_blade',
  'head_helmet',
  'chest_armor',
  'hands_gloves',
  'legs_pants',
  'feet_boots',
  'shield_guard',
  'ring_band',
  'amulet_charm'
];

const expectedLiveRecipeIds = new Set(
  liveRecipePrefixes.flatMap((prefix) =>
    [...validCraftingLevelSteps].map((level) => `recipe_${prefix}_lvl_${String(level).padStart(2, '0')}`)
  )
);

const slotByRecipePrefix = new Map([
  ['weapon_blade', 'weapon'],
  ['head_helmet', 'head'],
  ['chest_armor', 'chest'],
  ['hands_gloves', 'hands'],
  ['legs_pants', 'legs'],
  ['feet_boots', 'feet'],
  ['shield_guard', 'shield'],
  ['ring_band', 'ring'],
  ['amulet_charm', 'amulet']
]);
const recipePrefixBySlot = new Map([...slotByRecipePrefix.entries()].map(([prefix, slot]) => [slot, prefix]));
const starterRecipeIdSet = new Set(starterRecipeIds.map((value) => String(value)));
const liveUnlockRecipeIds = new Set();
const liveUnlockCoverageBySlot = new Map();
const liveUnlockCoverageByRecipeId = new Map();

for (const template of liveRecipeUnlockTemplates) {
  const slot = normalizeValue(template.slot);

  if (!slot) {
    addError(errors, 'recipeDropSources: unlock template missing slot');
    continue;
  }

  if (!validCraftingSlotIds.has(slot)) {
    addError(errors, `recipeDropSources: invalid unlock slot "${template.slot}"`);
    continue;
  }

  if (!Array.isArray(template.unlocks) || template.unlocks.length !== craftingLevelSteps.length) {
    addError(errors, `recipeDropSources ${template.slot}: unlock list must cover all ${craftingLevelSteps.length} crafting steps`);
    continue;
  }

  const expectedPrefix = recipePrefixBySlot.get(slot);
  const slotCoverage = new Set();
  liveUnlockCoverageBySlot.set(slot, slotCoverage);

  for (const unlock of template.unlocks) {
    const level = parseNumberish(unlock.level);
    if (level === null || !validCraftingLevelSteps.has(level)) {
      addError(errors, `recipeDropSources ${template.slot}: invalid unlock level "${unlock.level}"`);
      continue;
    }

    if (slotCoverage.has(level)) {
      addError(errors, `recipeDropSources ${template.slot}: duplicate unlock entry for level ${level}`);
      continue;
    }
    slotCoverage.add(level);

    const recipeId = `recipe_${expectedPrefix}_lvl_${String(level).padStart(2, '0')}`;
    liveUnlockRecipeIds.add(recipeId);
    if (liveUnlockCoverageByRecipeId.has(recipeId)) {
      addError(errors, `recipeDropSources: duplicate live unlock mapping for "${recipeId}"`);
      continue;
    }
    liveUnlockCoverageByRecipeId.set(recipeId, unlock);

    const unlockType = normalizeValue(unlock.unlockType);
    if (!validLiveRecipeUnlockTypes.has(unlockType)) {
      addError(errors, `recipeDropSources ${recipeId}: invalid unlock type "${unlock.unlockType}"`);
    }

    if (!hasRecord(locationLookups, unlock.locationId)) {
      addError(errors, `recipeDropSources ${recipeId}: unknown location "${unlock.locationId}"`);
    }

    if (!unlock.notes || !String(unlock.notes).trim()) {
      addWarning(warnings, `recipeDropSources ${recipeId}: missing unlock notes`);
    }

    const chancePercent = parseNumberish(unlock.chancePercent);
    if (chancePercent === null || chancePercent < 0) {
      addError(errors, `recipeDropSources ${recipeId}: invalid chancePercent "${unlock.chancePercent}"`);
    } else if (chancePercent > 100) {
      addError(errors, `recipeDropSources ${recipeId}: chancePercent "${unlock.chancePercent}" exceeds 100`);
    } else if (unlockType === 'starter' && chancePercent !== 0) {
      addError(errors, `recipeDropSources ${recipeId}: starter unlock must use 0 chancePercent`);
    } else if (unlockType !== 'starter' && chancePercent === 0) {
      addError(errors, `recipeDropSources ${recipeId}: non-starter unlock must have a positive chancePercent`);
    } else if (unlockType !== 'starter' && (chancePercent < 2 || chancePercent > 15)) {
      addWarning(warnings, `recipeDropSources ${recipeId}: chancePercent ${chancePercent} looks outside the normal live unlock range`);
    }

    const enemyNames = ensureArray(unlock.enemyNames).map((value) => String(value).trim()).filter(Boolean);
    if (unlockType === 'starter' && enemyNames.length > 0) {
      addError(errors, `recipeDropSources ${recipeId}: starter unlock should not list enemyNames`);
    }
    if (unlockType !== 'starter' && enemyNames.length === 0) {
      addError(errors, `recipeDropSources ${recipeId}: non-starter unlock is missing enemyNames`);
    }

    for (const enemyName of enemyNames) {
      if (
        !hasRecord(enemyLookups, enemyName) &&
        !hasRecord(sourceEnemyLookups, enemyName) &&
        !hasRecord(bossNameLookups, enemyName) &&
        !matchesGenericSourceText(enemyName)
      ) {
        addError(errors, `recipeDropSources ${recipeId}: unknown enemy source "${enemyName}"`);
      }
    }

    if (starterRecipeIdSet.has(recipeId) && unlockType !== 'starter') {
      addError(errors, `recipeDropSources ${recipeId}: starter recipe is not marked as starter`);
    }

    if (!starterRecipeIdSet.has(recipeId) && unlockType === 'starter') {
      addError(errors, `recipeDropSources ${recipeId}: non-starter recipe is marked as starter`);
    }
  }
}

for (const recipeId of expectedLiveRecipeIds) {
  const prefix = recipeId.replace(/^recipe_/, '').replace(/_lvl_\d+$/, '');
  const slot = slotByRecipePrefix.get(prefix);
  if (!slot || !craftingSlotMetadataIds.has(slot)) {
    addWarning(warnings, `live crafting recipe ${recipeId}: no rich metadata slot mapping found`);
  }

  if (!liveUnlockRecipeIds.has(recipeId)) {
    addError(errors, `recipeDropSources: live recipe "${recipeId}" has no unlock path`);
  }
}

for (const starterRecipeId of starterRecipeIdSet) {
  if (!expectedLiveRecipeIds.has(starterRecipeId)) {
    addError(errors, `recipeDropSources: starter recipe "${starterRecipeId}" is not a live recipe id`);
  }
}

for (const [slot, levelCoverage] of liveUnlockCoverageBySlot.entries()) {
  for (const step of craftingLevelSteps) {
    if (!levelCoverage.has(Number(step))) {
      addError(errors, `recipeDropSources ${slot}: missing unlock entry for level ${step}`);
    }
  }
}

for (const entry of craftingRecipeMetadataOverrides) {
  if (!expectedLiveRecipeIds.has(String(entry.recipeId))) {
    addError(errors, `craftingRecipeMetadata override: unknown live recipe "${entry.recipeId}"`);
  }

  if (!entry.purposeText && !entry.sourceHint) {
    addWarning(warnings, `craftingRecipeMetadata override ${entry.recipeId}: no override content provided`);
  }
}

for (const location of locations) {
  if (!location.name) addError(errors, `location ${location.id}: missing display name`);
  if (!location.description) addError(errors, `location ${location.id}: missing description`);
  if (!Array.isArray(location.levelRange) || location.levelRange.length !== 2) {
    addError(errors, `location ${location.id}: invalid levelRange`);
  }

  for (const enemyId of ensureArray(location.enemies)) {
    if (!enemyIds.has(enemyId)) {
      addError(errors, `location ${location.id}: unknown enemy id "${enemyId}"`);
    }
  }

  for (const materialId of ensureArray(location.materials)) {
    if (!materialIdSet.has(normalizeValue(materialId))) {
      addError(errors, `location ${location.id}: unknown material id "${materialId}"`);
    } else {
      usedMaterialIds.add(normalizeValue(materialId));
    }
  }

  if (location.bossOrKeyEnemy && normalizeLooseText(location.bossOrKeyEnemy) !== 'none') {
    const bossMatch =
      resolveRecord(bossNameLookups, location.bossOrKeyEnemy) ??
      resolveRecord(enemyLookups, location.bossOrKeyEnemy);
    if (!bossMatch) {
      addError(
        errors,
        `location ${location.id}: boss/key enemy "${location.bossOrKeyEnemy}" not found in bosses or enemies`,
      );
    }
  }
}

const lootTableIds = new Set();
for (const enemy of enemies) {
  if (!enemy.name) addError(errors, `enemy ${enemy.id}: missing display name`);
  if (!enemy.lootTable || typeof enemy.lootTable !== 'string') {
    addError(errors, `enemy ${enemy.id}: missing loot table`);
  } else {
    lootTableIds.add(normalizeValue(enemy.lootTable));
  }

  if (!locationIds.has(enemy.location) && enemy.location !== 'dynamic_spawn_pool') {
    addError(errors, `enemy ${enemy.id}: invalid location "${enemy.location}"`);
  }

  for (const key of ['hp', 'attack', 'defense', 'xp', 'gold']) {
    if (parseNumberish(enemy[key]) === null || parseNumberish(enemy[key]) < 0) {
      addError(errors, `enemy ${enemy.id}: invalid numeric stat "${key}"`);
    }
  }

  for (const key of ['damageMin', 'damageMax', 'armor', 'poise', 'attackSpeed', 'critChance', 'bleedResist', 'dodgeChance', 'spawnWeight']) {
    if (enemy[key] != null) {
      const value = parseNumberish(enemy[key]);
      if (value === null || Number.isNaN(value)) {
        addError(errors, `enemy ${enemy.id}: invalid numeric field "${key}"`);
      }
    }
  }
}

for (const boss of bosses) {
  if (!boss.name) addError(errors, `boss ${boss.id}: missing display name`);
  const level = parseNumberish(boss.level);
  const hp = parseNumberish(boss.hp);
  const damageMin = parseNumberish(boss.damageMin);
  const damageMax = parseNumberish(boss.damageMax);

  if (level === null || level <= 0) addError(errors, `boss ${boss.id}: invalid level "${boss.level}"`);
  if (hp === null || hp <= 0) addError(errors, `boss ${boss.id}: invalid hp "${boss.hp}"`);
  if (damageMin === null || damageMin < 0) addError(errors, `boss ${boss.id}: invalid damageMin "${boss.damageMin}"`);
  if (damageMax === null || damageMax < 0) addError(errors, `boss ${boss.id}: invalid damageMax "${boss.damageMax}"`);
  if (damageMin !== null && damageMax !== null && damageMax < damageMin) {
    addError(errors, `boss ${boss.id}: damageMax ${boss.damageMax} is lower than damageMin ${boss.damageMin}`);
  }

  if (boss.uniqueLoot) {
    const bossLootItems = splitCsv(boss.uniqueLoot);
    for (const lootName of bossLootItems) {
      if (!hasRecord(itemLookups, lootName) && !hasRecord(recipeLookups, lootName)) {
        addError(errors, `boss ${boss.id}: unique loot "${lootName}" does not resolve to an item or recipe`);
      }
    }
    if (bossLootItems.length === 0) {
      addWarning(warnings, `boss ${boss.id}: uniqueLoot field is present but empty`);
    }
  } else {
    addWarning(warnings, `boss ${boss.id}: no special loot listed`);
  }
}

for (const entry of bossLoot) {
  if (!hasRecord(bossNameLookups, entry.boss_name) && !hasRecord(enemyLookups, entry.boss_name)) {
    addError(errors, `bossLoot: unknown boss "${entry.boss_name}"`);
  }
  if (!hasRecord(locationLookups, entry.location_id)) {
    addError(errors, `bossLoot ${entry.boss_name}: unknown location "${entry.location_id}"`);
  }

  const level = parseNumberish(entry.level);
  if (level === null || level <= 0) {
    addError(errors, `bossLoot ${entry.boss_name}: invalid level "${entry.level}"`);
  }

  for (const uniqueDrop of splitCsv(entry.unique_drops)) {
    if (!hasRecord(itemLookups, uniqueDrop) && !hasRecord(recipeLookups, uniqueDrop)) {
      addError(errors, `bossLoot ${entry.boss_name}: unknown unique drop "${uniqueDrop}"`);
    }
  }

  for (const materialChunk of splitCsv(entry.material_drops)) {
    const materialName = materialChunk
      .split(' chance')[0]
      .split(' x')[0]
      ?.trim();
    if (materialName && !hasRecord(materialLookups, materialName)) {
      addError(errors, `bossLoot ${entry.boss_name}: unknown material drop "${materialName}"`);
    }
  }
}

for (const recipe of allRecipes) {
  if (!recipe.name) addError(errors, `recipe ${recipe.id}: missing display name`);

  if (!hasRecord(itemLookups, recipe.result)) {
    addError(errors, `recipe ${recipe.id}: unknown output "${recipe.result}"`);
  } else {
    const output = resolveRecord(itemLookups, recipe.result);
    usedItemIds.add(normalizeValue(output.id));
  }

  for (const material of ensureArray(recipe.materials)) {
    if (!materialIdSet.has(normalizeValue(material?.id))) {
      addError(errors, `recipe ${recipe.id}: unknown material id "${material?.id ?? ''}"`);
      continue;
    }

    usedMaterialIds.add(normalizeValue(material.id));
    const qty = parseNumberish(material.qty);
    if (qty === null || qty <= 0) {
      addError(errors, `recipe ${recipe.id}: invalid material quantity for "${material.id}"`);
    }
  }

  if (recipe.rarity && !validRarities.has(normalizeValue(recipe.rarity))) {
    addError(errors, `recipe ${recipe.id}: invalid rarity "${recipe.rarity}"`);
  }
}

const recipeDropDuplicateKeys = new Set();
const legacyGeneratedRecipeIds = new Set(allRecipes.map((recipe) => normalizeValue(recipe.id)));
for (const rule of allRecipeDrops) {
  const recipeId = normalizeValue(rule.recipe_id);
  const duplicateKey = [
    normalizeValue(rule.recipe_id),
    normalizeLooseText(rule.source_location),
    normalizeLooseText(rule.drops_from),
    normalizeLooseText(rule.dropped_recipe)
  ].join('|');

  if (recipeDropDuplicateKeys.has(duplicateKey)) {
    addError(errors, `recipeDrops: duplicate mapping for recipe "${rule.recipe_id}" from "${rule.drops_from}"`);
  } else {
    recipeDropDuplicateKeys.add(duplicateKey);
  }

  if (!recipeId) {
    addError(errors, 'recipeDrops: missing recipe_id');
    continue;
  }

  if (!legacyGeneratedRecipeIds.has(recipeId)) {
    if (expectedLiveRecipeIds.has(recipeId)) {
      addWarning(warnings, `recipeDrops ${rule.recipe_id}: legacy drop dataset now points at a live runtime recipe id`);
    } else {
      addError(errors, `recipeDrops ${rule.recipe_id}: unknown recipe id "${rule.recipe_id}"`);
    }
  }

  if (!recipeIds.has(recipeId) && !hasRecord(recipeLookups, rule.dropped_recipe)) {
    addError(errors, `recipeDrops ${rule.recipe_id}: unknown recipe reference "${rule.dropped_recipe}"`);
  } else {
    usedRecipeIds.add(recipeId || normalizeValue(resolveRecord(recipeLookups, rule.dropped_recipe)?.id));
  }

  const sourceLocationParts = String(rule.source_location)
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

  if (
    !sourceLocationParts.some((part) => hasRecord(locationLookups, part)) &&
    !matchesGenericSourceText(rule.source_location) &&
    !normalizeLooseText(rule.source_location).includes('elite') &&
    !normalizeLooseText(rule.source_location).includes('zone')
  ) {
    addError(errors, `recipeDrops ${rule.recipe_id}: unknown source location "${rule.source_location}"`);
  }

  const sourceEnemyParts = String(rule.drops_from)
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

  if (
    !sourceEnemyParts.every(
      (part) =>
        hasRecord(enemyLookups, part) ||
        hasRecord(sourceEnemyLookups, part) ||
        hasRecord(bossNameLookups, part) ||
        matchesGenericSourceText(part),
    )
  ) {
    addError(errors, `recipeDrops ${rule.recipe_id}: unknown source enemy "${rule.drops_from}"`);
  }

  const chance = parseNumberish(rule.recipe_drop_chance);
  if (chance === null) {
    addError(errors, `recipeDrops ${rule.recipe_id}: invalid drop chance "${rule.recipe_drop_chance}"`);
  } else if (chance < 0) {
    addError(errors, `recipeDrops ${rule.recipe_id}: negative drop chance "${rule.recipe_drop_chance}"`);
  } else if (chance > 1 && chance <= 100) {
    if (chance < 1 || chance > 25) {
      addWarning(warnings, `recipeDrops ${rule.recipe_id}: suspicious percentage drop chance ${chance}`);
    }
    if (chance === 100) {
      addWarning(warnings, `recipeDrops ${rule.recipe_id}: guaranteed legacy unlock should stay documented during runtime migration`);
    }
  } else if (chance > 1) {
    addError(errors, `recipeDrops ${rule.recipe_id}: drop chance "${rule.recipe_drop_chance}" exceeds expected bounds`);
  } else {
    if (chance < 0.01 || chance > 0.75) {
      addWarning(warnings, `recipeDrops ${rule.recipe_id}: suspicious normalized drop chance ${chance}`);
    }
  }
}

const globalItemIdOwners = new Map();
for (const [label, records] of [
  ['generated weapons', generatedWeapons],
  ['generated armors', generatedArmors],
  ['generated shields', generatedShields],
  ['generated rings', generatedRings],
  ['generated amulets', generatedAmulets],
  ['generated minor armor', generatedMinorArmor]
]) {
  for (const record of records) {
    const normalizedId = normalizeValue(record.id);
    const previous = globalItemIdOwners.get(normalizedId);
    if (previous && previous !== label) {
      addError(errors, `item id collision "${record.id}" between ${previous} and ${label}`);
    } else {
      globalItemIdOwners.set(normalizedId, label);
    }
  }
}

for (const item of items) {
  if (!item.name) addError(errors, `item ${item.id}: missing display name`);
  if (item.rarity && !validRarities.has(normalizeValue(item.rarity))) {
    addError(errors, `item ${item.id}: invalid rarity "${item.rarity}"`);
  }
  if (!item.description) {
    addWarning(warnings, `item ${item.id}: empty description`);
  }
}

for (const equipment of allEquipmentCatalogs) {
  if (!equipment.name) addError(errors, `equipment ${equipment.id}: missing display name`);
  if (!equipment.rarity || !validRarities.has(normalizeValue(equipment.rarity))) {
    addError(errors, `equipment ${equipment.id}: invalid rarity "${equipment.rarity}"`);
  }
  if (equipment.level != null && (!Number.isFinite(Number(equipment.level)) || Number(equipment.level) <= 0)) {
    addError(errors, `equipment ${equipment.id}: invalid level "${equipment.level}"`);
  }
  if (equipment.tier != null && (!Number.isFinite(Number(equipment.tier)) || Number(equipment.tier) <= 0)) {
    addError(errors, `equipment ${equipment.id}: invalid tier "${equipment.tier}"`);
  }

  const slot = normalizeValue(equipment.slot ?? equipment.category ?? equipment.type);
  if (
    slot &&
    !validEquipmentSlots.has(slot) &&
    !['armor', 'axe', 'sword', 'hammer', 'light', 'medium', 'heavy'].includes(slot)
  ) {
    addError(errors, `equipment ${equipment.id}: invalid slot/category "${slot}"`);
  }

  const presentStatKeys = Object.keys(equipment).filter((key) => statKeys.has(key));
  if (presentStatKeys.length === 0) {
    addWarning(warnings, `equipment ${equipment.id}: no numeric stat fields found`);
  }
  for (const key of presentStatKeys) {
    const value = equipment[key];
    if (value == null || Number.isNaN(Number(value)) || !Number.isFinite(Number(value))) {
      addError(errors, `equipment ${equipment.id}: invalid stat "${key}"`);
    }
  }
}

for (const material of materials) {
  if (!material.name) addError(errors, `material ${material.id}: missing display name`);
  if (material.rarity && !validRarities.has(normalizeValue(material.rarity))) {
    addError(errors, `material ${material.id}: invalid rarity "${material.rarity}"`);
  }
  if (!material.primaryUsage || !String(material.primaryUsage).trim()) {
    addError(errors, `material ${material.id}: missing primaryUsage`);
  }
  const taxonomyEntry = materialTaxonomyById.get(normalizeValue(material.id));
  const declaredTaxonomyCategory = normalizeValue(material.taxonomyCategory);
  if (declaredTaxonomyCategory && !validMaterialTaxonomyCategories.has(declaredTaxonomyCategory)) {
    addError(errors, `material ${material.id}: invalid taxonomyCategory "${material.taxonomyCategory}"`);
  }
  if (taxonomyEntry) {
    if (!taxonomyEntry.isLegacy && (!material.source || !String(material.source).trim())) {
      addError(errors, `material ${material.id}: missing source hint`);
    }
    if (declaredTaxonomyCategory && declaredTaxonomyCategory !== normalizeValue(taxonomyEntry.category)) {
      addError(
        errors,
        `material ${material.id}: taxonomyCategory "${material.taxonomyCategory}" does not match taxonomy entry "${taxonomyEntry.category}"`,
      );
    }

    const tierStep = parseNumberish(material.tierStep);
    if (tierStep === null || !validCraftingLevelSteps.has(tierStep)) {
      addError(errors, `material ${material.id}: invalid tierStep "${material.tierStep}"`);
    } else if (tierStep !== parseNumberish(taxonomyEntry.tierStep)) {
      addError(
        errors,
        `material ${material.id}: tierStep ${material.tierStep} does not match taxonomy step ${taxonomyEntry.tierStep}`,
      );
    }

    if (normalizeValue(taxonomyEntry.category) === 'tier' && (!Array.isArray(material.levelRange) || material.levelRange.length !== 2)) {
      addError(errors, `material ${material.id}: tier material must define a levelRange`);
    }
  }
  if (!Array.isArray(material.tags)) {
    addError(errors, `material ${material.id}: missing tags array`);
  }
  if (Array.isArray(material.levelRange) && material.levelRange.length === 2) {
    const [minLevel, maxLevel] = material.levelRange.map((value) => parseNumberish(value));
    if (minLevel === null || maxLevel === null || minLevel < 0 || maxLevel < minLevel) {
      addError(errors, `material ${material.id}: invalid levelRange ${JSON.stringify(material.levelRange)}`);
    }
  }
}

for (const entry of enemyLootData) {
  for (const materialName of splitMaterialReferences(entry.primary_materials)) {
    if (!hasRecord(materialLookups, materialName)) {
      addError(errors, `enemyLoot ${entry.enemy_name}: unknown primary material "${materialName}"`);
    } else {
      usedMaterialIds.add(normalizeValue(resolveRecord(materialLookups, materialName).id));
    }
  }
}

for (const entry of locationLootData) {
  for (const materialName of splitMaterialReferences(entry.primary_materials)) {
    if (!hasRecord(materialLookups, materialName)) {
      addError(errors, `locationLoot ${entry.location_id}: unknown primary material "${materialName}"`);
    } else {
      usedMaterialIds.add(normalizeValue(resolveRecord(materialLookups, materialName).id));
    }
  }
}

for (const entry of materialLootData) {
  if (!hasRecord(materialLookups, entry.material_name)) {
    addError(errors, `materialLoot: unknown material "${entry.material_name}"`);
    continue;
  }

  const resolvedMaterial = resolveRecord(materialLookups, entry.material_name);
  usedMaterialIds.add(normalizeValue(resolvedMaterial.id));

  if (!entry.category || !String(entry.category).trim()) {
    addError(errors, `materialLoot ${entry.material_name}: missing category`);
  }

  const sourceLocations = String(entry.best_source_location)
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

  if (
    sourceLocations.length > 0 &&
    !sourceLocations.every((part) => hasRecord(locationLookups, part) || matchesGenericSourceText(part))
  ) {
    addError(errors, `materialLoot ${entry.material_name}: unknown source location "${entry.best_source_location}"`);
  }

  const dropSources = String(entry.drops_from)
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

  if (
    dropSources.length > 0 &&
    !dropSources.every(
      (part) =>
        hasRecord(enemyLookups, part) ||
        hasRecord(sourceEnemyLookups, part) ||
        hasRecord(bossNameLookups, part) ||
        matchesGenericSourceText(part)
    )
  ) {
    addError(errors, `materialLoot ${entry.material_name}: unknown drop source "${entry.drops_from}"`);
  }

  const chance = parseNumberish(entry.base_drop_chance);
  if (chance === null || chance < 0) {
    addError(errors, `materialLoot ${entry.material_name}: invalid base_drop_chance "${entry.base_drop_chance}"`);
  }
}

for (const spawnEntry of spawnPools) {
  if (!locationIds.has(spawnEntry.location_id)) {
    addError(errors, `spawnPools: invalid location id "${spawnEntry.location_id}"`);
  }

  if (
    !hasRecord(enemyLookups, spawnEntry.enemy_name) &&
    !hasRecord(bossNameLookups, spawnEntry.enemy_name) &&
    !normalizeLooseText(spawnEntry.enemy_name).includes('elite spawn')
  ) {
    addWarning(warnings, `spawnPools ${spawnEntry.location_id}: enemy "${spawnEntry.enemy_name}" has no direct enemy definition`);
  }

  const chance = parseNumberish(spawnEntry.spawn_chance);
  if (chance === null || chance < 0) {
    addError(errors, `spawnPools ${spawnEntry.location_id}: invalid spawn chance for "${spawnEntry.enemy_name}"`);
  }
}

for (const drop of allUniqueItemDrops) {
  if (!hasRecord(itemLookups, drop.item_name)) {
    addError(errors, `unique loot "${drop.item_name}": does not resolve to an item`);
    continue;
  }

  const resolvedItem = resolveRecord(itemLookups, drop.item_name);
  usedItemIds.add(normalizeValue(resolvedItem.id));

  if (!hasRecord(locationLookups, drop.location)) {
    addError(errors, `unique loot "${drop.item_name}": unknown location "${drop.location}"`);
  }

  const dropSourceParts = String(drop.drops_from)
    .split('/')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (
    !dropSourceParts.every(
      (entry) =>
        hasRecord(sourceEnemyLookups, entry) ||
        hasRecord(enemyLookups, entry) ||
        hasRecord(bossNameLookups, entry) ||
        matchesGenericSourceText(entry),
    )
  ) {
    addError(errors, `unique loot "${drop.item_name}": unknown source "${drop.drops_from}"`);
  }
}

for (const locationLoot of allLocationLoot) {
  if (!hasRecord(locationLookups, locationLoot.location_id)) {
    addError(errors, `locationLoot: unknown location "${locationLoot.location_id}"`);
  }

  for (const notableItem of splitCsv(locationLoot.notable_items)) {
    if (!hasRecord(itemLookups, notableItem)) {
      addError(errors, `locationLoot ${locationLoot.location_id}: unknown notable item "${notableItem}"`);
    } else {
      usedItemIds.add(normalizeValue(resolveRecord(itemLookups, notableItem).id));
    }
  }
}

for (const recipe of allRecipes) {
  if (!hasRecord(itemLookups, recipe.result)) {
    addError(errors, `resolvedItems: recipe output "${recipe.result}" does not resolve`);
  }
}

for (const drop of allUniqueItemDrops) {
  if (!hasRecord(itemLookups, drop.item_name)) {
    addError(errors, `resolvedItems: loot item "${drop.item_name}" does not resolve`);
  }
}

for (const location of locations) {
  const locationNotableLoot = allLocationLoot
    .filter((entry) => normalizeValue(entry.location_id) === normalizeValue(location.id))
    .flatMap((entry) => splitCsv(entry.notable_items));

  if (locationNotableLoot.length === 0) {
    addWarning(warnings, `location ${location.id}: no notable loot listed`);
  }
}

for (const enemy of enemies) {
  const isReachableFromLocation = spawnPools.some(
    (entry) =>
      hasRecord(enemyLookups, entry.enemy_name) &&
      normalizeLooseText(entry.enemy_name) === normalizeLooseText(enemy.name),
  );

  if (!isReachableFromLocation && enemy.location === 'dynamic_spawn_pool') {
    addWarning(warnings, `enemy ${enemy.id}: no reachable spawn location found in spawnPools`);
  }
}

for (const item of items) {
  const normalizedId = normalizeValue(item.id);
  const category = normalizeValue(item.category);
  if (
    ['crafted', 'ring', 'amulet', 'shield', 'head', 'hands', 'legs', 'feet'].includes(category) &&
    !usedItemIds.has(normalizedId) &&
    !usedMaterialIds.has(normalizedId)
  ) {
    addWarning(warnings, `item ${item.id}: appears unused by loot, recipes, or location notable loot`);
  }
}

for (const recipe of allRecipes) {
  const normalizedId = normalizeValue(recipe.id);
  if (!usedRecipeIds.has(normalizedId)) {
    addWarning(warnings, `recipe ${recipe.id}: appears unused by recipe-drop datasets`);
  }
}

for (const material of materials) {
  const normalizedId = normalizeValue(material.id);
  if (!usedMaterialIds.has(normalizedId)) {
    addWarning(warnings, `material ${material.id}: appears unused by locations or recipes`);
  }
}

if (errors.length > 0) {
  console.error('Data validation failed:\n');
  for (const issue of errors) {
    console.error(`ERROR: ${issue}`);
  }
  if (warnings.length > 0) {
    console.error('\nWarnings:');
    for (const warning of warnings) {
      console.error(`WARN: ${warning}`);
    }
  }
  process.exit(1);
}

const validatedFiles = fs.readdirSync(generatedDir).filter((fileName) => fileName.endsWith('.json')).length;

console.log(`Data validation passed. Checked ${validatedFiles} generated JSON files plus secondary data cross-references.`);
if (warnings.length > 0) {
  console.log('\nWarnings:');
  for (const warning of warnings) {
    console.log(`WARN: ${warning}`);
  }
}
