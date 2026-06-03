import { describe, it, expect } from 'vitest';
import {
  formatStatName,
  formatStatValueOnly,
  formatStatDisplay,
  formatEquipmentSummary,
  getDisplayItemName
} from './displayHelpers';

describe('displayHelpers formatting and localization', () => {
  it('should format stat names correctly in Ukrainian', () => {
    expect(formatStatName('lifeSteal')).toBe('Вампіризм');
    expect(formatStatName('lifesteal')).toBe('Вампіризм');
    expect(formatStatName('maxHp')).toBe('Максимальне HP');
    expect(formatStatName('defense')).toBe('Броня');
    expect(formatStatName('healthRegen')).toBe('Відновлення HP');
    expect(formatStatName('dodgeChance')).toBe('Шанс ухилення');
    expect(formatStatName('xpBonus')).toBe('Бонус досвіду');
    expect(formatStatName('thorns')).toBe('Шпики');
  });

  it('should format stat values only correctly', () => {
    // Percentages stored as fractions
    expect(formatStatValueOnly('lifeSteal', 0.012)).toBe('+1.2%');
    expect(formatStatValueOnly('critChance', 0.05)).toBe('+5%');
    expect(formatStatValueOnly('dodgeBonus', -0.02)).toBe('-2%');

    // Flat values
    expect(formatStatValueOnly('defense', 31)).toBe('+31');
    expect(formatStatValueOnly('maxHp', 125)).toBe('+125 HP');
    expect(formatStatValueOnly('maxHealth', 100)).toBe('+100 HP');

    // Special healthRegen formatting
    expect(formatStatValueOnly('healthRegen', 6)).toBe('6 HP / 5с');
  });

  it('should format full stat display lines correctly', () => {
    expect(formatStatDisplay('healthRegen', 6)).toBe('Відновлює 6 HP раз у 5 секунд');
    expect(formatStatDisplay('lifeSteal', 0.012)).toBe('+1.2% Вампіризм');
    expect(formatStatDisplay('defense', 31)).toBe('+31 Броня');
    expect(formatStatDisplay('blockPower', 20)).toBe('Сила блоку: +20');
  });

  it('should format equipment summaries correctly', () => {
    const mockItem = {
      defense: 31,
      maxHp: 125,
      lifeSteal: 0.012,
      critChance: 0,
      damageBonus: null,
      healthRegen: undefined
    };

    const summary = formatEquipmentSummary(mockItem);
    // Should skip zero/null/undefined stats, format defense as 'Броня: +31', maxHp as 'HP +125', lifeSteal as 'Вампіризм +1.2%'
    expect(summary).toContain('Броня: +31');
    expect(summary).toContain('HP +125');
    expect(summary).toContain('Вампіризм +1.2%');
    expect(summary).not.toContain('Регенерація');
    expect(summary).not.toContain('Крит');
  });

  it('should generate stable Ukrainian names for generated equipment', () => {
    // Common item (should not have suffix)
    const commonItemName = getDisplayItemName('generated_amulet_3_common_12345');
    expect(commonItemName).toBe('Укріплений амулет');

    // Uncommon item with lifesteal affix
    const uncommonItem = {
      affixes: [{ id: 'affix_1', type: 'lifeSteal' as const, value: 0.01, label: 'вампіризму', valueType: 'percent' as const }]
    };
    const uncommonItemName = getDisplayItemName('generated_amulet_3_uncommon_12345', uncommonItem);
    expect(uncommonItemName).toBe('Укріплений амулет вампіризму');

    // Plural slot grammatical adjustment (legs)
    const legsName = getDisplayItemName('generated_legs_3_common_12345');
    expect(legsName).toBe('Укріплені поножі');
  });
});
