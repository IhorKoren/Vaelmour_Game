export type LootboxRarity = 'common' | 'uncommon' | 'rare' | 'epic';

export type LootboxDefinition = {
  id: string;
  title: string;
  description: string;
  priceGold: number;
  rarity: LootboxRarity;
  rewardCount: number;
  icon: string;
};

export const lootboxDefinitions: LootboxDefinition[] = [
  {
    id: 'box_01_supply',
    title: 'Скриня постачання',
    description: 'Містить переважно базові матеріали для ремесла та невеликий шанс знайти звичайне спорядження.',
    priceGold: 100,
    rarity: 'common',
    rewardCount: 2,
    icon: '📦'
  },
  {
    id: 'box_02_hunter',
    title: 'Скриня мисливця',
    description: 'Багатший набір ресурсів та підвищений шанс знайти незвичайне спорядження з афіксами.',
    priceGold: 250,
    rarity: 'uncommon',
    rewardCount: 3,
    icon: '🐾'
  },
  {
    id: 'box_03_forged',
    title: 'Скриня кутого спорядження',
    description: 'Гарантоване випадкове спорядження (зброя або обладунки) рідкісної або вищої якості.',
    priceGold: 600,
    rarity: 'rare',
    rewardCount: 1,
    icon: '⚔️'
  },
  {
    id: 'box_04_relic',
    title: 'Скриня стародавніх реліквій',
    description: 'Містить гарантоване високоякісне епічне спорядження та цінні матеріали вищих рангів.',
    priceGold: 1500,
    rarity: 'epic',
    rewardCount: 3,
    icon: '💎'
  }
];
