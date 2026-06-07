import { armors } from '../data/armors';
import { weapons } from '../data/weapons';
import { shields } from '../data/shields';
import { STARTER_RECIPE_IDS } from '../data/recipeDropSources';
import { GAME_WIPE_ID } from './constants';
import { calculateDerivedStats } from './formulas/stats';
import { initializeQuests } from './formulas/quests';
import type { EquipmentSlot, HeroState } from './types';

const STARTER_EQUIPMENT: Record<
  Exclude<EquipmentSlot, 'ring1' | 'ring2' | 'amulet'>,
  string
> = {
  weapon: 'weapon_blade_lvl_01',
  shield: 'shield_guard_lvl_01',
  head: 'head_helmet_lvl_01',
  chest: 'chest_armor_lvl_01',
  hands: 'hands_gloves_lvl_01',
  legs: 'legs_pants_lvl_01',
  feet: 'feet_boots_lvl_01'
};

const STARTER_EQUIPMENT_SLOTS = Object.keys(STARTER_EQUIPMENT) as Array<
  keyof typeof STARTER_EQUIPMENT
>;

function getStarterEquipmentDurability(): Record<string, number> {
  return STARTER_EQUIPMENT_SLOTS.reduce<Record<string, number>>((acc, slot) => {
    acc[slot] = 100;
    return acc;
  }, {});
}

function getStarterEquipmentAffixes() {
  return STARTER_EQUIPMENT_SLOTS.reduce<Record<string, []>>((acc, slot) => {
    acc[slot] = [];
    return acc;
  }, {});
}

export function createInitialHero(): HeroState {
  const startingWeapon =
    weapons.find((weapon) => weapon.id === STARTER_EQUIPMENT.weapon) ?? weapons[0];

  const startingArmor =
    armors.find((armor) => armor.id === STARTER_EQUIPMENT.chest) ?? armors[0];

  const startingShield =
    shields.find((shield) => shield.id === STARTER_EQUIPMENT.shield) ?? shields[0];

  const baseHero = {
    id: 'player',
    name: 'Wanderer',
    nameSource: 'default' as const,
    wipeId: GAME_WIPE_ID,
    level: 1,
    xp: 0,
    gold: 0,
    knownRecipeIds: [...STARTER_RECIPE_IDS],
    baseHp: 100,
    stats: {
      strength: 5,
      vitality: 5,
      agility: 5
    },
    unspentStatPoints: 0,

    equippedWeaponId: startingWeapon.id,
    equippedArmorId: startingArmor.id,

    equipment: {
      weapon: startingWeapon.id,
      shield: startingShield?.id ?? STARTER_EQUIPMENT.shield,
      head: STARTER_EQUIPMENT.head,
      chest: startingArmor.id,
      legs: STARTER_EQUIPMENT.legs,
      hands: STARTER_EQUIPMENT.hands,
      feet: STARTER_EQUIPMENT.feet,

      ring1: null,
      ring2: null,
      amulet: null
    },

    inventory: [
      { itemId: 'MAT_001', qty: 4 },
      { itemId: 'MAT_002', qty: 4 },
      { itemId: 'MAT_003', qty: 2 },
      { itemId: 'MAT_004', qty: 2 }
    ],

    equipmentDurability: getStarterEquipmentDurability(),
    equipmentAffixes: getStarterEquipmentAffixes(),
    equippedGeneratedItems: {},

    quests: initializeQuests(1),
    defeatedBossIds: [],

    migrationFlags: {
      starterEquipmentV2: true
    }
  };

  const heroForStats = {
    ...baseHero,
    currentHp: baseHero.baseHp,
    maxHp: baseHero.baseHp
  } as HeroState;

  const derived = calculateDerivedStats(
    heroForStats.stats,
    heroForStats.baseHp,
    undefined,
    heroForStats
  );

  return {
    ...heroForStats,
    currentHp: derived.maxHp,
    maxHp: derived.maxHp
  };
}
