import fs from 'node:fs';
import path from 'node:path';

export const LIVE_LEVEL_STEPS = [1, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30];
export const SLOT_CODE_PREFIX = {
  weapon: 'weapon_blade',
  shield: 'shield_guard',
  head: 'head_helmet',
  chest: 'chest_armor',
  hands: 'hands_gloves',
  legs: 'legs_pants',
  feet: 'feet_boots',
  ring: 'ring_band',
  amulet: 'amulet_charm'
};
export const ACCEPTED_PROGRESS_EXCEPTIONS = new Set([
  'recipe_ring_band_lvl_01|MAT_004',
  'recipe_amulet_charm_lvl_01|MAT_004'
]);

function readJson(repoRoot, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function readTsConstArray(repoRoot, relativePath, exportName) {
  const source = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
  const pattern = new RegExp(`export const ${exportName}(?::[^=]+)? = (\\[[\\s\\S]*?\\]) as const;`);
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Unable to read ${exportName} from ${relativePath}`);
  }
  return Function(`"use strict"; return (${match[1]});`)();
}

function normalizeId(value) {
  return String(value ?? '').trim().toUpperCase();
}

function resultItemIdFor(slot, level) {
  return `${SLOT_CODE_PREFIX[slot]}_lvl_${String(level).padStart(2, '0')}`;
}

function recipeIdFor(slot, level) {
  return `recipe_${resultItemIdFor(slot, level)}`;
}

function locationMinLevel(location) {
  if (typeof location?.minLevel === 'number') return location.minLevel;
  if (Array.isArray(location?.levelRange) && typeof location.levelRange[0] === 'number') {
    return location.levelRange[0];
  }
  return null;
}

function makeSourceIndex(materialSources, locations, materialById, taxonomyByMaterialId) {
  const locationByName = new Map(locations.map((location) => [String(location.name).trim().toLowerCase(), location]));
  const byMaterial = new Map();

  for (const entry of materialSources) {
    const materialId = normalizeId(entry.material_id);
    const rawSourceLocation = String(entry.source_location ?? '').trim();
    const locationCandidates = rawSourceLocation
      .split('/')
      .map((part) => locationByName.get(part.trim().toLowerCase()) ?? null)
      .filter(Boolean);
    const location = locationCandidates.sort((a, b) => (locationMinLevel(a) ?? 999) - (locationMinLevel(b) ?? 999))[0] ?? null;
    const material = materialById.get(materialId) ?? null;
    const taxonomy = taxonomyByMaterialId.get(materialId) ?? null;
    const inferredMinLevel =
      material?.levelRange?.[0] ??
      taxonomy?.levelRange?.[0] ??
      null;
    const minLevel = locationMinLevel(location) ?? inferredMinLevel;
    const sourceLocationName = location?.name ?? String(entry.source_location ?? '').trim() ?? '';
    const sourceType = String(entry.source_type ?? '').trim();
    const sourceEnemyMethod = String(entry.source_enemy_method ?? '').trim();
    const notes = String(entry.notes ?? '').trim();
    const candidate = {
      materialId,
      sourceLocationId: location?.id ?? null,
      sourceLocationName: sourceLocationName || null,
      sourceLocationMinLevel: minLevel,
      sourceType: sourceType || null,
      sourceEnemyMethod: sourceEnemyMethod || null,
      notes: notes || null,
      isRealSource: minLevel !== null
    };

    const existing = byMaterial.get(materialId);
    if (!existing || (candidate.isRealSource && (!existing.isRealSource || minLevel < existing.sourceLocationMinLevel))) {
      byMaterial.set(materialId, candidate);
    }
  }

  return byMaterial;
}

function countUsageByMaterial(rows) {
  const usage = new Map();
  for (const row of rows) {
    const current = usage.get(row.materialId) ?? { recipeCount: 0, totalQty: 0, levelSet: new Set(), slotSet: new Set() };
    current.recipeCount += 1;
    current.totalQty += row.materialQty;
    current.levelSet.add(row.requiredLevel);
    current.slotSet.add(row.slot);
    usage.set(row.materialId, current);
  }
  return usage;
}

export function buildCraftingMaterialAudit(repoRoot) {
  const liveRecipeSlotProfiles = readTsConstArray(repoRoot, 'src/data/equipmentCatalog.ts', 'LIVE_RECIPE_SLOT_PROFILES');
  const materialTaxonomy = readTsConstArray(repoRoot, 'src/data/materialTaxonomy.ts', 'MATERIAL_TAXONOMY');
  const starterRecipeIds = new Set(readTsConstArray(repoRoot, 'src/data/recipeDropSources.ts', 'STARTER_RECIPE_IDS').map(String));
  const locations = readJson(repoRoot, 'src/data/generated/locations.json');
  const materials = readJson(repoRoot, 'src/data/generated/materials.json');
  const materialSources = readJson(repoRoot, 'src/data/generated/materialSources.json');

  const taxonomyByMaterialId = new Map(materialTaxonomy.map((entry) => [normalizeId(entry.materialId), entry]));
  const materialById = new Map(materials.map((entry) => [normalizeId(entry.id), entry]));
  const earliestSourceByMaterialId = makeSourceIndex(materialSources, locations, materialById, taxonomyByMaterialId);

  const rows = [];
  for (const profile of liveRecipeSlotProfiles) {
    profile.materialSets.forEach((materialSet, index) => {
      const requiredLevel = LIVE_LEVEL_STEPS[index];
      const recipeId = recipeIdFor(profile.slot, requiredLevel);
      const resultItemId = resultItemIdFor(profile.slot, requiredLevel);

      materialSet.forEach((material) => {
        const materialId = normalizeId(material.id);
        const taxonomy = taxonomyByMaterialId.get(materialId) ?? null;
        const source = earliestSourceByMaterialId.get(materialId) ?? null;
        const isAcceptedException = ACCEPTED_PROGRESS_EXCEPTIONS.has(`${recipeId}|${materialId}`);
        const isLegacy = Boolean(taxonomy?.isLegacy);

        let alignmentStatus = 'OK';
        const issues = [];

        if (!isLegacy && (!source || !source.isRealSource)) {
          alignmentStatus = 'ERROR';
          issues.push('missing_real_source');
        } else if (
          !isLegacy &&
          source?.isRealSource &&
          typeof source.sourceLocationMinLevel === 'number' &&
          source.sourceLocationMinLevel > requiredLevel &&
          !isAcceptedException
        ) {
          alignmentStatus = 'ERROR';
          issues.push('source_after_recipe_level');
        }

        rows.push({
          recipeId,
          resultItemId,
          slot: profile.slot,
          requiredLevel,
          materialId,
          materialQty: material.qty,
          materialName: materialById.get(materialId)?.name ?? material.id,
          materialCategory: taxonomy?.category ?? null,
          materialTierStep: taxonomy?.tierStep ?? null,
          materialLevelRange: taxonomy?.levelRange ?? null,
          earliestSourceLocationId: source?.sourceLocationId ?? null,
          earliestSourceLocationName: source?.sourceLocationName ?? null,
          earliestSourceLocationMinLevel: source?.sourceLocationMinLevel ?? null,
          sourceType: source?.sourceType ?? null,
          sourceEnemyMethod: source?.sourceEnemyMethod ?? null,
          isLegacy,
          isAcceptedException,
          isStarterRecipe: starterRecipeIds.has(recipeId),
          alignmentStatus,
          issues
        });
      });
    });
  }

  const usageByMaterialId = countUsageByMaterial(rows);
  const warnings = [];
  const errors = [];

  for (const row of rows) {
    if (row.alignmentStatus === 'ERROR') {
      if (row.issues.includes('missing_real_source')) {
        errors.push(`${row.recipeId}: ${row.materialId} has no real source location`);
      }
      if (row.issues.includes('source_after_recipe_level')) {
        errors.push(
          `${row.recipeId}: ${row.materialId} first appears at level ${row.earliestSourceLocationMinLevel} (${row.earliestSourceLocationId}), after recipe level ${row.requiredLevel}`
        );
      }
    }
  }

  const rowsByRecipeId = new Map();
  for (const row of rows) {
    const group = rowsByRecipeId.get(row.recipeId) ?? [];
    group.push(row);
    rowsByRecipeId.set(row.recipeId, group);
  }

  for (const [recipeId, recipeRows] of rowsByRecipeId) {
    const requiredLevel = recipeRows[0].requiredLevel;
    const totalQty = recipeRows.reduce((sum, row) => sum + row.materialQty, 0);
    const factionOrRareQty = recipeRows
      .filter((row) => ['faction', 'catalyst', 'boss'].includes(String(row.materialCategory)))
      .reduce((sum, row) => sum + row.materialQty, 0);
    const catalystOrBossQty = recipeRows
      .filter((row) => ['catalyst', 'boss'].includes(String(row.materialCategory)))
      .reduce((sum, row) => sum + row.materialQty, 0);

    if (requiredLevel <= 3 && totalQty >= 8) {
      warnings.push(`${recipeId}: early recipe total material quantity ${totalQty} looks high`);
    }
    if (requiredLevel >= 6 && requiredLevel <= 12 && factionOrRareQty >= 5) {
      warnings.push(`${recipeId}: mid-tier recipe leans heavily on faction/rare materials (${factionOrRareQty})`);
    }
    if (catalystOrBossQty >= 3 || (requiredLevel < 18 && catalystOrBossQty >= 2)) {
      warnings.push(`${recipeId}: catalyst/boss quantity ${catalystOrBossQty} looks excessive`);
    }
    for (const row of recipeRows) {
      if ((row.materialCategory === 'catalyst' || row.materialCategory === 'boss') && requiredLevel < row.materialTierStep) {
        warnings.push(`${recipeId}: ${row.materialId} is used below its tier step ${row.materialTierStep}`);
      }
    }
  }

  const usageByTierAndMaterial = new Map();
  for (const row of rows) {
    if (row.materialCategory === 'base' || row.isLegacy) continue;
    const key = `${row.requiredLevel}|${row.materialId}`;
    usageByTierAndMaterial.set(key, (usageByTierAndMaterial.get(key) ?? 0) + 1);
  }
  for (const [key, count] of usageByTierAndMaterial) {
    const [level, materialId] = key.split('|');
    if (count >= 5) {
      warnings.push(`tier ${level}: ${materialId} is heavily overused across ${count} live recipes`);
    }
  }

  for (const [materialId, usage] of usageByMaterialId) {
    const taxonomy = taxonomyByMaterialId.get(materialId);
    if (!taxonomy || taxonomy.category === 'base' || taxonomy.isLegacy) continue;
    if (usage.recipeCount <= 1) {
      warnings.push(`${materialId}: ${taxonomy.category} material appears underused across live recipes (${usage.recipeCount} recipe)`);
    }
  }

  const legacyRows = rows.filter((row) => row.isLegacy);
  for (const row of legacyRows) {
    warnings.push(`${row.recipeId}: legacy material ${row.materialId} appears in an active live recipe`);
  }

  return {
    rows,
    errors,
    warnings,
    usageByMaterialId,
    summary: {
      recipeCount: rowsByRecipeId.size,
      rowCount: rows.length,
      errorCount: errors.length,
      warningCount: warnings.length,
      legacyUsageCount: legacyRows.length
    }
  };
}
