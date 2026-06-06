import { describe, expect, it } from 'vitest';

import {
  getCraftingRecipeMetadataById,
  isValidCraftingLevelStep
} from './craftingRecipeMetadata';

describe('crafting recipe metadata foundation', () => {
  it('derives metadata for live runtime recipes', () => {
    const metadata = getCraftingRecipeMetadataById('recipe_weapon_blade_lvl_01');

    expect(metadata).not.toBeNull();
    expect(metadata?.slot).toBe('weapon');
    expect(metadata?.levelStep).toBe(1);
    expect(metadata?.purposeText.length).toBeGreaterThan(20);
  });

  it('validates the supported crafting level ladder', () => {
    expect(isValidCraftingLevelStep(1)).toBe(true);
    expect(isValidCraftingLevelStep(15)).toBe(true);
    expect(isValidCraftingLevelStep(2)).toBe(false);
  });
});
