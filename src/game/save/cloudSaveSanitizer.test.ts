import { describe, expect, it } from 'vitest';

import { sanitizeCloudSavePayload } from './cloudSaveSanitizer';
import { GAME_WIPE_ID } from '../constants';

describe('sanitizeCloudSavePayload', () => {
  it('clamps impossible numeric values and invalid selected locations', () => {
    const result = sanitizeCloudSavePayload(
      {
        level: -5,
        xp: -10,
        gold: -200,
        baseHp: -50,
        maxHp: -1,
        currentHp: 9999999999,
        selectedLocationId: 'INVALID_LOCATION',
        inventory: [],
      },
      'INVALID_LOCATION',
      {
        selectedLocationId: 'LOC_002',
      },
    );

    expect(result.hero.level).toBe(1);
    expect(result.hero.xp).toBe(0);
    expect(result.hero.gold).toBe(0);
    expect(result.hero.baseHp).toBe(1);
    expect(result.hero.maxHp).toBe(1);
    expect(result.hero.currentHp).toBe(1);
    expect(result.selectedLocationId).toBe('LOC_002');
    expect(result.changes).toContain('numeric_fields_clamped');
    expect(result.changes).toContain('selected_location_clamped');
  });

  it('drops malformed inventory entries but preserves valid generated equipment', () => {
    const result = sanitizeCloudSavePayload(
      {
        inventory: [
          {
            itemId: 'mat_001',
            qty: 3,
          },
          {
            itemId: 'totally_fake_item',
            qty: 1,
          },
          {
            itemId: 'generated_bad',
            qty: 1,
            generatedItem: {
              id: 'generated_weapon_001',
              templateId: 'generated_weapon',
              name: 'Generated Blade',
              category: 'weapon',
              slot: 'weapon',
              level: 5,
              tier: 2,
              tierIndex: 1,
              rarity: 'rare',
              stats: {
                minDamage: 4,
                maxDamage: 8,
              },
              affixes: [],
              durability: 100,
              maxDurability: 100,
            },
          },
        ],
      },
      'LOC_001',
      {},
    );

    expect(Array.isArray(result.hero.inventory)).toBe(true);
    expect(result.hero.inventory).toHaveLength(2);
    expect(result.hero.inventory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ itemId: 'mat_001', qty: 3 }),
        expect.objectContaining({
          itemId: 'generated_weapon_001',
          generatedItem: expect.objectContaining({
            id: 'generated_weapon_001',
            slot: 'weapon',
          }),
        }),
      ]),
    );
    expect(result.changes).toContain('inventory_sanitized');
  });

  it('preserves legacy rage and skill save fields without rejecting the save', () => {
    const result = sanitizeCloudSavePayload(
      {
        level: 7,
        currentRage: 88,
        maxRage: 100,
        skillCooldowns: { skill_01: 12345 },
        knownSkillIds: ['skill_01'],
        inventory: [],
      },
      'LOC_001',
      {
        level: 6,
        inventory: [],
      },
    );

    expect(result.hero.level).toBe(7);
    expect(result.hero.currentRage).toBe(88);
    expect(result.hero.maxRage).toBe(100);
    expect(result.hero.skillCooldowns).toEqual({ skill_01: 12345 });
    expect(result.hero.knownSkillIds).toEqual(['skill_01']);
    expect(result.changes).not.toContain('inventory_sanitized');
  });

  it('preserves wipeId when present on cloud payloads', () => {
    const result = sanitizeCloudSavePayload(
      {
        level: 3,
        wipeId: GAME_WIPE_ID,
        inventory: [],
      },
      'LOC_001',
      {},
    );

    expect(result.hero.wipeId).toBe(GAME_WIPE_ID);
  });

  it('preserves tonWalletAddress when present on cloud payloads', () => {
    const result = sanitizeCloudSavePayload(
      {
        level: 3,
        tonWalletAddress: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
        inventory: [],
      },
      'LOC_001',
      {},
    );

    expect(result.hero.tonWalletAddress).toBe('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c');
  });
});
