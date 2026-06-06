export const LEGACY_MATERIAL_COMPATIBILITY = [
  {
    legacyId: 'MAT_021',
    canonicalMaterialId: 'MAT_021',
    category: 'legacy',
    futureReplacementId: null,
    notes: 'Legacy refined armor component kept valid for existing inventories and older recipes.'
  },
  {
    legacyId: 'MAT_022',
    canonicalMaterialId: 'MAT_022',
    category: 'legacy',
    futureReplacementId: null,
    notes: 'Legacy weapon component kept valid until the later full recipe rebalance lands.'
  }
] as const;

export type LegacyMaterialCompatibilityEntry = (typeof LEGACY_MATERIAL_COMPATIBILITY)[number];

const legacyMaterialById = new Map<string, LegacyMaterialCompatibilityEntry>(
  LEGACY_MATERIAL_COMPATIBILITY.map((entry) => [entry.legacyId.toLowerCase(), entry])
);

export function getLegacyMaterialCompatibility(materialId: string): LegacyMaterialCompatibilityEntry | null {
  return legacyMaterialById.get(materialId.toLowerCase()) ?? null;
}

export function normalizeLegacyMaterialId(materialId: string): string {
  return getLegacyMaterialCompatibility(materialId)?.canonicalMaterialId ?? materialId;
}

export function isKnownLegacyMaterialId(materialId: string): boolean {
  return legacyMaterialById.has(materialId.toLowerCase());
}
