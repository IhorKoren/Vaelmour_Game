import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';

import { buildCraftingMaterialAudit } from '../../scripts/lib/craftingMaterialAudit.mjs';

describe('crafting material audit', () => {
  const audit = buildCraftingMaterialAudit(fileURLToPath(new URL('../..', import.meta.url)));

  it('keeps all live recipe materials obtainable on-time or within accepted exceptions', () => {
    expect(audit.errors).toEqual([]);
  });

  it('keeps ring and amulet level 1 wolf fang usage as accepted exceptions', () => {
    const acceptedRows = audit.rows.filter((row) => row.isAcceptedException);

    expect(acceptedRows.map((row) => `${row.recipeId}|${row.materialId}`)).toEqual([
      'recipe_ring_band_lvl_01|MAT_004',
      'recipe_amulet_charm_lvl_01|MAT_004'
    ]);
    for (const row of acceptedRows) {
      expect(row.alignmentStatus).toBe('OK');
      expect(row.earliestSourceLocationMinLevel).toBeGreaterThan(row.requiredLevel);
    }
  });

  it('provides a level 5 source for MAT_007 so level 6 recipes stay aligned', () => {
    const mat007Rows = audit.rows.filter((row) => row.materialId === 'MAT_007' && row.requiredLevel === 6);

    expect(mat007Rows).toHaveLength(9);
    for (const row of mat007Rows) {
      expect(row.earliestSourceLocationId).toBe('LOC_003');
      expect(row.earliestSourceLocationMinLevel).toBe(5);
      expect(row.alignmentStatus).toBe('OK');
    }
  });

  it('does not warn about base material overuse', () => {
    expect(audit.warnings.some((warning) => warning.includes('MAT_001') && warning.includes('overused'))).toBe(false);
    expect(audit.warnings.some((warning) => warning.includes('MAT_002') && warning.includes('overused'))).toBe(false);
    expect(audit.warnings.some((warning) => warning.includes('MAT_003') && warning.includes('overused'))).toBe(false);
  });

  it('warns when a non-base material is heavily concentrated in the same tier', () => {
    expect(audit.warnings).toContain('tier 6: MAT_007 is heavily overused across 9 live recipes');
  });

  it('keeps legacy materials present in data but absent from live recipes', () => {
    expect(audit.rows.some((row) => row.materialId === 'MAT_021')).toBe(false);
    expect(audit.rows.some((row) => row.materialId === 'MAT_022')).toBe(false);
  });
});
