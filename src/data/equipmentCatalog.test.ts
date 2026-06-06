import { describe, expect, it } from 'vitest';

import { equipmentRecipes, EQUIPMENT_LEVELS } from './equipmentCatalog';
import { getMaterialTaxonomy, isLegacyMaterial } from './materialTaxonomy';

describe('live crafting recipe economy', () => {
  it('covers every live slot across all 11 crafting steps', () => {
    const slots = new Set(
      equipmentRecipes.map((recipe) => recipe.id.replace(/^recipe_/, '').replace(/_lvl_\d+$/, ''))
    );
    const levels = new Set(equipmentRecipes.map((recipe) => recipe.requiredLevel));

    expect(equipmentRecipes).toHaveLength(99);
    expect(slots.size).toBe(9);
    expect(levels).toEqual(new Set(EQUIPMENT_LEVELS));
  });

  it('uses taxonomy-backed materials for every live recipe cost', () => {
    for (const recipe of equipmentRecipes) {
      for (const material of recipe.materials) {
        expect(getMaterialTaxonomy(material.id)).not.toBeNull();
        expect(material.qty).toBeGreaterThan(0);
      }
    }
  });

  it('keeps legacy-only materials out of the live progression ladder', () => {
    const legacyMaterialIds = equipmentRecipes.flatMap((recipe) =>
      recipe.materials.filter((material) => isLegacyMaterial(material.id)).map((material) => material.id)
    );

    expect(legacyMaterialIds).toEqual([]);
  });
});
