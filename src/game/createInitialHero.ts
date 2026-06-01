import { armors } from '../data/armors';
import { weapons } from '../data/weapons';
import { calculateDerivedStats } from './formulas/stats';
import { initializeQuests } from './formulas/quests';
import type { HeroState } from './types';

export function createInitialHero(): HeroState {
  const startingWeapon = weapons.find((weapon) => weapon.id === 'weapon_01_axe_hatchet_tier_1_001') ?? weapons[0];
  const startingArmor = armors.find((armor) => armor.id === 'armor_01_skirmisher_skirmisher_vest_tier_1_001') ?? armors[0];

  const baseHero = {
    id: 'player',
    name: 'Wanderer',
    nameSource: 'default' as const,
    level: 1,
    xp: 0,
    gold: 40,
    knownRecipeIds: ['REC_001', 'REC_002'],
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
      shield: null,
      head: null,
      chest: startingArmor.id,
      legs: null,
      hands: null,
      feet: null,
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
    equipmentDurability: {
      weapon: 100,
      chest: 100,
      shield: 100
    },
    quests: initializeQuests(1),
    defeatedBossIds: []
  };

  const derived = calculateDerivedStats(baseHero.stats, baseHero.baseHp, startingArmor);

  return {
    ...baseHero,
    currentHp: derived.maxHp,
    maxHp: derived.maxHp
  };
}
