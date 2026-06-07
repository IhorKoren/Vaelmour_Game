import rawLocations from '../../data/generated/locations.json';
import rawMaterials from '../../data/generated/materials.json';
import rawMaterialSources from '../../data/generated/materialSources.json';
import rawSpawnPools from '../../data/generated/spawnPools.json';
import type { Enemy, Location, Material } from '../types';
import type { ItemDefinition } from '../../data/items';
import { getMaterialTaxonomy } from '../../data/materialTaxonomy';

type MaterialSourceRecord = {
  material_id: string;
  source_location?: string;
  source_enemy_method?: string;
  source_type?: string;
  drop_obtain_chance?: string | number;
  notes?: string;
};

type SpawnPoolRecord = {
  location_id: string;
  enemy_name?: string;
  enemy_family?: string;
  archetype?: string;
  rarity?: string;
};

type RuntimeMaterialDropPoolArgs = {
  enemy: Enemy;
  location?: Partial<Location>;
  targetLevel: number;
  availableItems: ItemDefinition[];
};

export type RuntimeMaterialDropPoolResult = {
  pool: ItemDefinition[];
  poolType: 'explicit_source' | 'location_materials' | 'taxonomy_tier' | 'safe_fallback';
  materialIds: string[];
};

const locations = rawLocations as Location[];
const materials = rawMaterials as Material[];
const materialSources = rawMaterialSources as MaterialSourceRecord[];
const spawnPools = rawSpawnPools as SpawnPoolRecord[];

const locationById = new Map(locations.map((location) => [normalizeId(location.id), location]));
const locationByName = new Map(locations.map((location) => [normalizeText(location.name), location]));
const materialById = new Map(materials.map((material) => [normalizeId(material.id), material]));

function normalizeText(value: string | undefined | null): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeId(value: string | undefined | null): string {
  return String(value ?? '').trim().toUpperCase();
}

function uniqueItems(items: ItemDefinition[]): ItemDefinition[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const normalizedId = normalizeId(item.id);
    if (seen.has(normalizedId)) {
      return false;
    }
    seen.add(normalizedId);
    return true;
  });
}

function splitSourceParts(value: string | undefined): string[] {
  return String(value ?? '')
    .split(/[/,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildContextTokens(enemy: Enemy, location?: Partial<Location>): Set<string> {
  const tokens = new Set<string>();
  const spawnContext = getSpawnPoolContext(enemy, location);
  const rawValues = [
    enemy.name,
    enemy.family,
    enemy.archetype,
    enemy.rank,
    enemy.location,
    location?.name,
    location?.biome,
    location?.combatIdentity,
    location?.uniqueLootTheme,
    spawnContext?.enemy_name,
    spawnContext?.enemy_family,
    spawnContext?.archetype,
    spawnContext?.rarity
  ];

  for (const rawValue of rawValues) {
    const normalized = normalizeText(rawValue);
    if (!normalized) continue;
    tokens.add(normalized);
    normalized.split(' ').forEach((part) => {
      if (part) tokens.add(part);
    });
  }

  return tokens;
}

function getSpawnPoolContext(enemy: Enemy, location?: Partial<Location>): SpawnPoolRecord | null {
  if (!location) return null;

  const normalizedEnemyName = normalizeText(enemy.name);
  const normalizedFamily = normalizeText(enemy.family);
  const normalizedArchetype = normalizeText(enemy.archetype);
  const locationId = normalizeId(location.id);

  return spawnPools.find((entry) => {
    if (normalizeId(entry.location_id) !== locationId) return false;

    const entryName = normalizeText(entry.enemy_name);
    const entryFamily = normalizeText(entry.enemy_family);
    const entryArchetype = normalizeText(entry.archetype);

    return Boolean(
      (entryName && entryName === normalizedEnemyName) ||
      (normalizedFamily && entryFamily && entryFamily === normalizedFamily) ||
      (normalizedArchetype && entryArchetype && entryArchetype === normalizedArchetype)
    );
  }) ?? null;
}

function isMaterialWithinProgression(material: Material | undefined, targetLevel: number): boolean {
  if (!material) return false;
  const minLevel = material.levelRange?.[0] ?? 1;
  const maxLevel = material.levelRange?.[1] ?? targetLevel;
  return minLevel <= Math.max(1, targetLevel) && maxLevel >= 1;
}

function materialThemeScore(materialId: string, contextTokens: Set<string>): number {
  const scoreMap: Array<{ keys: string[]; score: number }> = [
    { keys: ['wolf', 'fang', 'stalker', 'blackfang', 'beast', 'hunter', 'raven'], score: 3 },
    { keys: ['raider', 'frontier', 'berserker', 'marauder', 'bandit', 'thug'], score: 3 },
    { keys: ['iron', 'guard', 'legion', 'defender', 'shield', 'bastion'], score: 3 },
    { keys: ['mercenary', 'fighter', 'sellblade', 'duelist', 'arena'], score: 3 },
    { keys: ['ash', 'cult', 'priest', 'zealot', 'bleeder', 'marsh'], score: 3 },
    { keys: ['executioner', 'brute', 'crusher', 'quarry', 'stagger', 'headsman'], score: 3 },
    { keys: ['elite'], score: 1 }
  ];

  const material = materialById.get(normalizeId(materialId));
  const taxonomy = getMaterialTaxonomy(materialId);
  const materialText = normalizeText(
    [
      material?.name,
      material?.source,
      material?.notes,
      ...(material?.tags ?? []),
      taxonomy?.category,
      taxonomy?.playerLabel,
      taxonomy?.sourceHint
    ].join(' ')
  );

  let score = 0;
  for (const entry of scoreMap) {
    const contextHit = entry.keys.some((key) => contextTokens.has(key));
    if (!contextHit) continue;
    if (entry.keys.some((key) => materialText.includes(key))) {
      score += entry.score;
    }
  }

  return score;
}

function sourceTypeSupportsEnemy(sourceType: string, enemy: Enemy): boolean {
  const normalizedType = normalizeText(sourceType);
  if (!normalizedType) return true;
  if (normalizedType.includes('refined craft') || normalizedType.includes('craft')) return false;
  if (normalizedType.includes('boss elite')) return enemy.rank === 'elite' || enemy.rank === 'boss';
  if (normalizedType.includes('boss')) return enemy.rank === 'boss';
  if (normalizedType.includes('elite')) return enemy.rank === 'elite' || enemy.rank === 'boss';
  return true;
}

function sourceMatchesLocation(entry: MaterialSourceRecord, location?: Partial<Location>): boolean {
  if (!location) return false;
  const candidates = splitSourceParts(entry.source_location);
  if (candidates.length === 0) return false;
  const normalizedLocationId = normalizeId(location.id);
  const normalizedLocationName = normalizeText(location.name);

  return candidates.some((candidate) => {
    const byName = locationByName.get(normalizeText(candidate));
    if (byName) {
      return normalizeId(byName.id) === normalizedLocationId;
    }
    return normalizeText(candidate) === normalizedLocationName;
  });
}

function scoreExplicitSourceMatch(entry: MaterialSourceRecord, enemy: Enemy, location: Partial<Location> | undefined, contextTokens: Set<string>): number {
  if (!location || !sourceMatchesLocation(entry, location)) return 0;
  if (!sourceTypeSupportsEnemy(String(entry.source_type ?? ''), enemy)) return 0;

  let score = 4;
  const sourceText = normalizeText([entry.source_enemy_method, entry.notes, entry.source_type].join(' '));
  if (sourceText.includes(normalizeText(enemy.name))) score += 6;
  if (enemy.family && sourceText.includes(normalizeText(enemy.family))) score += 4;
  if (enemy.archetype && sourceText.includes(normalizeText(enemy.archetype))) score += 3;

  const thematicHit = Array.from(contextTokens).some((token) => token.length >= 4 && sourceText.includes(token));
  if (thematicHit) score += 2;

  return score;
}

function buildWeightedPool(materialIds: string[], contextTokens: Set<string>, availableMaterials: Map<string, ItemDefinition>): ItemDefinition[] {
  const weightedPool: ItemDefinition[] = [];

  for (const materialId of materialIds) {
    const item = availableMaterials.get(normalizeId(materialId));
    if (!item) continue;

    const material = materialById.get(normalizeId(materialId));
    const taxonomy = getMaterialTaxonomy(materialId);
    const themeScore = materialThemeScore(materialId, contextTokens);
    let weight = 1 + Math.max(0, themeScore);

    if (taxonomy?.category === 'base') weight += 1;
    if (taxonomy?.category === 'catalyst' || taxonomy?.category === 'boss') weight = Math.max(1, weight - 1);
    if (material?.rarity === 'rare' || material?.rarity === 'epic') weight = Math.max(1, weight - 1);

    for (let index = 0; index < weight; index += 1) {
      weightedPool.push(item);
    }
  }

  return weightedPool;
}

function filterLocationMaterialsForEnemy(location: Partial<Location>, enemy: Enemy, targetLevel: number): string[] {
  const locationMaterialIds = uniqueItems(
    (location.materials ?? [])
      .map((materialId) => {
        const material = materialById.get(normalizeId(materialId));
        if (!isMaterialWithinProgression(material, targetLevel)) return null;
        if (getMaterialTaxonomy(materialId)?.isLegacy) return null;
        return {
          id: normalizeId(materialId),
          name: material?.name ?? materialId,
          category: 'material',
          rarity: material?.rarity ?? 'common',
          tier: material?.tier ?? 1,
          description: material?.source ?? material?.name ?? materialId
        } satisfies ItemDefinition;
      })
      .filter((item): item is ItemDefinition => Boolean(item))
  ).map((item) => item.id);

  return locationMaterialIds.filter((materialId) => {
    const candidateSources = materialSources.filter(
      (entry) => normalizeId(entry.material_id) === normalizeId(materialId) && sourceMatchesLocation(entry, location)
    );

    if (candidateSources.length === 0) {
      const taxonomy = getMaterialTaxonomy(materialId);
      return taxonomy?.category !== 'boss' && taxonomy?.category !== 'legacy';
    }

    return candidateSources.some((entry) => sourceTypeSupportsEnemy(String(entry.source_type ?? ''), enemy));
  });
}

export function getRuntimeMaterialDropPool({
  enemy,
  location,
  targetLevel,
  availableItems
}: RuntimeMaterialDropPoolArgs): RuntimeMaterialDropPoolResult {
  const availableMaterials = new Map(
    availableItems
      .filter((item) => item.category === 'material')
      .map((item) => [normalizeId(item.id), item])
  );
  const contextTokens = buildContextTokens(enemy, location);

  const explicitCandidates = new Map<string, number>();
  for (const entry of materialSources) {
    const materialId = normalizeId(entry.material_id);
    const material = materialById.get(materialId);
    if (!availableMaterials.has(materialId) || !isMaterialWithinProgression(material, targetLevel)) continue;
    if (getMaterialTaxonomy(materialId)?.isLegacy) continue;

    const score = scoreExplicitSourceMatch(entry, enemy, location, contextTokens);
    if (score <= 0) continue;

    const currentScore = explicitCandidates.get(materialId) ?? 0;
    explicitCandidates.set(materialId, Math.max(currentScore, score));
  }

  const explicitIds = Array.from(explicitCandidates.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([materialId]) => materialId);
  if (explicitIds.length > 0) {
    return {
      pool: buildWeightedPool(explicitIds, contextTokens, availableMaterials),
      poolType: 'explicit_source',
      materialIds: explicitIds
    };
  }

  if (location) {
    const locationMaterialIds = filterLocationMaterialsForEnemy(location, enemy, targetLevel)
      .filter((materialId) => availableMaterials.has(normalizeId(materialId)));

    if (locationMaterialIds.length > 0) {
      return {
        pool: buildWeightedPool(locationMaterialIds, contextTokens, availableMaterials),
        poolType: 'location_materials',
        materialIds: locationMaterialIds
      };
    }
  }

  const taxonomyIds = Array.from(availableMaterials.keys()).filter((materialId) => {
    const material = materialById.get(materialId);
    const taxonomy = getMaterialTaxonomy(materialId);
    if (!material || !taxonomy || taxonomy.isLegacy) return false;
    if (!isMaterialWithinProgression(material, targetLevel)) return false;
    if (taxonomy.category === 'boss') return enemy.rank === 'boss';
    if (taxonomy.category === 'catalyst') return enemy.rank === 'elite' || materialThemeScore(materialId, contextTokens) >= 2;
    return true;
  });

  if (taxonomyIds.length > 0) {
    return {
      pool: buildWeightedPool(taxonomyIds, contextTokens, availableMaterials),
      poolType: 'taxonomy_tier',
      materialIds: taxonomyIds
    };
  }

  const safeFallbackIds = Array.from(availableMaterials.keys()).filter((materialId) => {
    const material = materialById.get(materialId);
    return Boolean(material && material.tier <= Math.max(1, targetLevel));
  });

  return {
    // Safe fallback: this path should only run when explicit source, location theme, and taxonomy pools are all empty.
    pool: buildWeightedPool(safeFallbackIds, contextTokens, availableMaterials),
    poolType: 'safe_fallback',
    materialIds: safeFallbackIds
  };
}

export function resolveDropLocation(location?: Partial<Location>): Partial<Location> | undefined {
  if (!location) return undefined;
  return locationById.get(normalizeId(location.id)) ?? locationByName.get(normalizeText(location.name)) ?? {
    id: location.id ?? '',
    name: location.name ?? '',
    levelRange: location.levelRange ?? [1, 1],
    biome: location.biome ?? '',
    description: '',
    enemies: location.enemies ?? [],
    materials: location.materials ?? [],
    combatIdentity: location.combatIdentity,
    uniqueLootTheme: location.uniqueLootTheme
  };
}
