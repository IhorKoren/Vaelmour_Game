import { describe, it, expect } from 'vitest';
import { scaleEnemyForLocation } from './enemyScaling';
import type { Enemy, Location } from '../types';

describe('Enemy Scaling Formulas (enemyScaling.ts)', () => {
  const mockBaseEnemy: Enemy = {
    id: 'enemy_young_wolf',
    name: 'Young Wolf',
    level: 1,
    levelRange: [1, 1],
    hp: 100,
    attack: 10,
    defense: 5,
    critChance: 0.05,
    dodgeChance: 0.05,
    xp: 10,
    gold: 5,
    location: 'LOC_001',
    lootTable: 'default',
    behavior: 'default',
    notes: 'Base beast'
  };

  const mockLocation = {
    id: 'LOC_TEST',
    name: 'Test Late Game Quarry',
    levelRange: [25, 30],
    bossName: 'Test Boss',
    unlockedAt: 0,
    loreDescription: 'High level test location',
    backgroundImages: [],
    unlockRequirements: { level: 25 },
    explorationRates: { questProgress: 1 },
    tier: 10
  } as unknown as Location;

  it('scales enemy stats conservatively (linearly) when level difference is positive', () => {
    // Scaling level 1 base enemy to level 26 (levelDiff = 25)
    const scaledEnemy = scaleEnemyForLocation(mockBaseEnemy, mockLocation, 26);
    
    // Level difference = 25
    // With linear HP scaling: 1 + 25 * 0.08 = 3.0
    // With linear Stat scaling: 1 + 25 * 0.04 = 2.0
    expect(scaledEnemy.hp).toBe(300); // 100 * 3.0
    expect(scaledEnemy.attack).toBe(20); // 10 * 2.0
    expect(scaledEnemy.defense).toBe(10); // 5 * 2.0
  });

  it('proves that linear scaling does not create an extreme late-game wall compared to exponential scaling', () => {
    // If we scaled level 1 to level 30 (levelDiff = 29)
    // Linear HP scaling: 1 + 29 * 0.08 = 3.32 -> HP = 332
    // Linear Stat scaling: 1 + 29 * 0.04 = 2.16 -> Attack = 22
    
    // Exponential HP scaling (old): Math.pow(1.12, 29) = 26.8 -> HP = 2680
    // Exponential Stat scaling (old): Math.pow(1.08, 29) = 9.3 -> Attack = 93
    
    const scaledEnemyLate = scaleEnemyForLocation(mockBaseEnemy, mockLocation, 30);
    
    // Assert linear HP is strictly under 400
    expect(scaledEnemyLate.hp).toBeLessThan(400);
    expect(scaledEnemyLate.hp).toBe(332);
    
    // Assert linear attack is strictly under 30
    expect(scaledEnemyLate.attack).toBeLessThan(30);
    expect(scaledEnemyLate.attack).toBe(22);
    
    // Old exponential values would be way higher
    const oldExpHp = Math.round(mockBaseEnemy.hp * Math.pow(1.12, 29));
    const oldExpAttack = Math.round(mockBaseEnemy.attack * Math.pow(1.08, 29));
    
    expect(oldExpHp).toBe(2675);
    expect(oldExpAttack).toBe(93);
    
    // Linear values are a fraction of the old exponential wall
    expect(scaledEnemyLate.hp).toBeLessThan(oldExpHp / 5);
    expect(scaledEnemyLate.attack).toBeLessThan(oldExpAttack / 4);
  });
});
