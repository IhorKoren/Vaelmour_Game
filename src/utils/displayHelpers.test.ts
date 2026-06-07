import { describe, it, expect } from 'vitest';
import {
  formatStatName,
  formatStatValueOnly,
  formatStatDisplay,
  formatEquipmentSummary,
  getDisplayItemDescription,
  getDisplayItemName,
  getDisplayQuestDescription
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

  it('should deduplicate equipment stats by Ukrainian name in formatEquipmentSummary', () => {
    // Mock item containing duplicate-meaning keys, e.g., maxHp and maxHealth on the root
    const mockItemWithRootDuplicates = {
      maxHp: 10,
      maxHealth: 10,
      flatMaxHealth: 10,
      armor: 5,
      defense: 5
    };
    const summary1 = formatEquipmentSummary(mockItemWithRootDuplicates);
    // Count occurrences of "Максимальне HP"
    const hpCount1 = (summary1.match(/Максимальне HP/g) || []).length;
    expect(hpCount1).toBe(1);
    // Count occurrences of "Броня"
    const armorCount1 = (summary1.match(/Броня/g) || []).length;
    expect(armorCount1).toBe(1);

    // Mock generated item shape where stats contain maxHp and maxHealth and affixes contain maxHealth
    const mockGeneratedItem = {
      stats: {
        maxHp: 15,
        maxHealth: 15,
        armor: 12,
        defense: 12
      },
      affixes: [
        { id: 'affix_1', type: 'maxHealth' as const, value: 5, label: 'здоров\'я', valueType: 'flat' as const }
      ]
    };
    const summary2 = formatEquipmentSummary(mockGeneratedItem);
    // Should check final generated stats object (statsSource) and output "Максимальне HP" only once
    const hpCount2 = (summary2.match(/Максимальне HP/g) || []).length;
    expect(hpCount2).toBe(1);
    const armorCount2 = (summary2.match(/Броня/g) || []).length;
    expect(armorCount2).toBe(1);
  });

  it('should hide technical/non-bonus equipment fields from formatEquipmentSummary', () => {
    // Mock generated amulet with technical field speed and allowed fields
    const mockAmulet = {
      category: 'amulet',
      slot: 'amulet',
      stats: {
        speed: 1,
        maxHp: 10,
        lifeSteal: 0.012
      }
    };

    const summary = formatEquipmentSummary(mockAmulet);

    // Expected: maxHp and lifeSteal are included
    expect(summary).toContain('Максимальне HP');
    expect(summary).toContain('Вампіризм');

    // Expected: speed/Швидкість are NOT included
    expect(summary).not.toContain('Speed');
    expect(summary).not.toContain('speed');
    expect(summary).not.toContain('Швидкість');
  });
  it('should not expose removed rage or skill wording in display helpers', () => {
    expect(formatStatName('rageFromAttacks')).toBe('Rage From Attacks');
    expect(formatStatValueOnly('rageFromAttacks', 0.15)).toBe('');
    expect(formatStatDisplay('rageFromAttacks', 0.15)).toBe('');

    expect(getDisplayItemDescription('generated_hands_3_uncommon_12345', 'Rage-themed early gloves.')).not.toMatch(/rage|лють/i);
    expect(getDisplayItemDescription('generated_ring_3_uncommon_12345', 'Rage/offense ring from raiders.')).not.toMatch(/rage|лють/i);
    expect(getDisplayItemDescription('generated_ring_3_uncommon_12345', 'Bleeds trigger bonus Rage')).not.toMatch(/rage|лють/i);
    expect(getDisplayQuestDescription('Spend 300 total Rage')).not.toMatch(/rage|лють/i);
  });
});
