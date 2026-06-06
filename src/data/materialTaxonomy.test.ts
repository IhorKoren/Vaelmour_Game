import { describe, expect, it } from 'vitest';

import {
  getMaterialTaxonomy,
  isLegacyMaterial,
  summarizeMaterialCategories
} from './materialTaxonomy';
import { normalizeLegacyMaterialId } from './legacyMaterialMap';

describe('material taxonomy foundation', () => {
  it('returns taxonomy for live material ids', () => {
    const taxonomy = getMaterialTaxonomy('MAT_003');

    expect(taxonomy).not.toBeNull();
    expect(taxonomy?.category).toBe('base');
    expect(taxonomy?.tierStep).toBe(1);
  });

  it('keeps legacy materials recognizable without remapping inventories', () => {
    expect(isLegacyMaterial('MAT_021')).toBe(true);
    expect(normalizeLegacyMaterialId('MAT_021')).toBe('MAT_021');
  });

  it('summarizes material categories for recipe display', () => {
    const summary = summarizeMaterialCategories(['MAT_001', 'MAT_011', 'MAT_020']);

    expect(summary).toContain('Базова');
    expect(summary).toContain('каталізатор');
  });
});
