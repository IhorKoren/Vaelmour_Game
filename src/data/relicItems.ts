import type { ChestPreviewSlot } from './chestConfigs';

export type RelicItemConfig = {
  id: 'relic_ring_wanderer_xp' | 'relic_amulet_forgotten_path_xp';
  nameUk: string;
  slot: ChestPreviewSlot;
  requiredLevel: 1;
  xpBonus: 0.2;
  uniqueEquipped: true;
  allowsGeneratedAffixes: false;
  hasDurability: false;
  allowsReroll: false;
  descriptionUk: string;
};

export const XP_RELIC_BONUS_CAP = 0.4;

export const relicItems: RelicItemConfig[] = [
  {
    id: 'relic_ring_wanderer_xp',
    nameUk: 'Реліквія Мандрівного Кола',
    slot: 'ring',
    requiredLevel: 1,
    xpBonus: 0.2,
    uniqueEquipped: true,
    allowsGeneratedAffixes: false,
    hasDurability: false,
    allowsReroll: false,
    descriptionUk: 'Фіксована реліквія кільця: +20% отримуваного досвіду.',
  },
  {
    id: 'relic_amulet_forgotten_path_xp',
    nameUk: 'Реліквія Забутого Шляху',
    slot: 'amulet',
    requiredLevel: 1,
    xpBonus: 0.2,
    uniqueEquipped: true,
    allowsGeneratedAffixes: false,
    hasDurability: false,
    allowsReroll: false,
    descriptionUk: 'Фіксована реліквія амулета: +20% отримуваного досвіду.',
  },
];
