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
  const pattern = new RegExp(`export const ${exportName} = (\\[[\\s\\S]*?\\]) as const;`);
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Unable to read ${exportName} from ${relativePath}`);
  }
  return JSON.parse(match[1]);
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

function parseNumberish(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
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
const bossLoot = readJson('src/data/generated/lootTables.json').bossLoot ?? [];

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
  ...(readJson('src/data/generated/lootTables.json').uniqueItemDrops ?? []),
  ...shieldUniqueItemDrops,
  ...ringUniqueItemDrops,
  ...amuletUniqueItemDrops,
  ...minorArmorUniqueItemDrops
];

const allLocationLoot = [
  ...(readJson('src/data/generated/lootTables.json').locationLoot ?? []),
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
for (const rule of allRecipeDrops) {
  if (
    String(rule.recipe_id).trim() === '---' &&
    String(rule.source_location).trim() === '---' &&
    String(rule.drops_from).trim() === '---'
  ) {
    addWarning(warnings, 'recipeDrops: ignored placeholder separator row in minor armor recipe drops');
    continue;
  }

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
    !normalizeLooseText(rule.source_location).includes('elite') &&
    !normalizeLooseText(rule.source_location).includes('zone') &&
    !normalizeLooseText(rule.source_location).includes('milestone') &&
    !normalizeLooseText(rule.source_location).includes('any level')
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
        normalizeLooseText(part).includes('elite spawn') ||
        normalizeLooseText(part).includes('zone milestone'),
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
        normalizeLooseText(entry).includes('common enemies') ||
        normalizeLooseText(entry).includes('elite spawn') ||
        normalizeLooseText(entry).includes('zone progress'),
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
