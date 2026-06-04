import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const dataDir = path.join(repoRoot, 'src', 'data', 'generated');

function readJson(relativePath) {
  return JSON.parse(
    fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'),
  );
}

function normalizeValue(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function pushIssue(issues, message) {
  issues.push(message);
}

function validateUniqueIds(records, label, issues) {
  const seen = new Set();

  for (const record of records) {
    const id = normalizeValue(record?.id);

    if (!id) {
      pushIssue(issues, `${label}: missing id`);
      continue;
    }

    if (seen.has(id)) {
      pushIssue(issues, `${label}: duplicate id "${record.id}"`);
      continue;
    }

    seen.add(id);
  }
}

const locations = readJson('src/data/generated/locations.json');
const enemies = readJson('src/data/generated/enemies.json');
const items = readJson('src/data/generated/items.json');
const recipes = readJson('src/data/generated/recipes.json');
const spawnPools = readJson('src/data/generated/spawnPools.json');

const issues = [];

validateUniqueIds(locations, 'locations', issues);
validateUniqueIds(enemies, 'enemies', issues);
validateUniqueIds(items, 'items', issues);
validateUniqueIds(recipes, 'recipes', issues);

const validRarities = new Set(['common', 'uncommon', 'rare', 'epic', 'legendary']);
const locationIds = new Set(locations.map((location) => location.id));
const virtualEnemyLocationIds = new Set(['dynamic_spawn_pool']);
const enemyIds = new Set(enemies.map((enemy) => enemy.id));
const itemIds = new Set(items.map((item) => normalizeValue(item.id)));
const itemNames = new Set(items.map((item) => normalizeValue(item.name)));

for (const location of locations) {
  if (!location.name) {
    pushIssue(issues, `location ${location.id}: missing display name`);
  }

  for (const enemyId of ensureArray(location.enemies)) {
    if (!enemyIds.has(enemyId)) {
      pushIssue(issues, `location ${location.id}: unknown enemy id "${enemyId}"`);
    }
  }

  for (const materialId of ensureArray(location.materials)) {
    if (!itemIds.has(normalizeValue(materialId))) {
      pushIssue(issues, `location ${location.id}: unknown material id "${materialId}"`);
    }
  }
}

for (const enemy of enemies) {
  if (!enemy.name) {
    pushIssue(issues, `enemy ${enemy.id}: missing display name`);
  }

  if (!locationIds.has(enemy.location) && !virtualEnemyLocationIds.has(enemy.location)) {
    pushIssue(issues, `enemy ${enemy.id}: invalid location "${enemy.location}"`);
  }

  if (!enemy.lootTable || typeof enemy.lootTable !== 'string') {
    pushIssue(issues, `enemy ${enemy.id}: missing loot table`);
  }
}

for (const recipe of recipes) {
  if (!recipe.name) {
    pushIssue(issues, `recipe ${recipe.id}: missing display name`);
  }

  const recipeResult = normalizeValue(recipe.result);

  if (!itemIds.has(recipeResult) && !itemNames.has(recipeResult)) {
    pushIssue(issues, `recipe ${recipe.id}: unknown output "${recipe.result}"`);
  }

  for (const material of ensureArray(recipe.materials)) {
    if (!itemIds.has(normalizeValue(material?.id))) {
      pushIssue(
        issues,
        `recipe ${recipe.id}: unknown material id "${material?.id ?? ''}"`,
      );
    }
  }

  if (recipe.rarity && !validRarities.has(normalizeValue(recipe.rarity))) {
    pushIssue(issues, `recipe ${recipe.id}: invalid rarity "${recipe.rarity}"`);
  }
}

for (const item of items) {
  if (!item.name) {
    pushIssue(issues, `item ${item.id}: missing display name`);
  }

  if (item.rarity && !validRarities.has(normalizeValue(item.rarity))) {
    pushIssue(issues, `item ${item.id}: invalid rarity "${item.rarity}"`);
  }
}

for (const spawnEntry of spawnPools) {
  if (!locationIds.has(spawnEntry.location_id)) {
    pushIssue(
      issues,
      `spawnPools: invalid location id "${spawnEntry.location_id}"`,
    );
  }
}

if (issues.length > 0) {
  console.error('Data validation failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

const validatedFiles = fs
  .readdirSync(dataDir)
  .filter((fileName) => fileName.endsWith('.json'))
  .length;

console.log(
  `Data validation passed. Checked ${validatedFiles} generated JSON files and core cross-reference rules.`,
);
