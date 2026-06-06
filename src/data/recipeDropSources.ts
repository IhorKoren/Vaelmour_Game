import generatedRecipes from './generated/recipes.json';
import generatedRingRecipes from './generated/ringRecipes.json';
import generatedShieldRecipes from './generated/shieldRecipes.json';
import generatedAmuletRecipes from './generated/amuletRecipes.json';
import generatedMinorArmorRecipes from './generated/minorArmorRecipes.json';

export const LIVE_RECIPE_LEVEL_STEPS = [1, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30] as const;
export const LIVE_RECIPE_UNLOCK_SLOTS = [
  'weapon',
  'shield',
  'head',
  'chest',
  'hands',
  'legs',
  'feet',
  'ring',
  'amulet'
] as const;

export const STARTER_RECIPE_IDS = [
  'recipe_weapon_blade_lvl_01',
  'recipe_shield_guard_lvl_01',
  'recipe_head_helmet_lvl_01',
  'recipe_chest_armor_lvl_01',
  'recipe_hands_gloves_lvl_01',
  'recipe_legs_pants_lvl_01',
  'recipe_feet_boots_lvl_01'
] as const;

export const LIVE_RECIPE_UNLOCK_TEMPLATES = [
  {
    slot: 'weapon',
    unlocks: [
      { level: 1, unlockType: 'starter', locationId: 'LOC_001', enemyNames: [], chancePercent: 0, notes: 'Starter blacksmith pattern.' },
      { level: 3, unlockType: 'drop', locationId: 'LOC_002', enemyNames: ['Young Wolf', 'Fang Stalker'], chancePercent: 5.5, notes: 'Early forest weapon pattern.' },
      { level: 6, unlockType: 'drop', locationId: 'LOC_003', enemyNames: ['Wild Raider', 'Savage Marauder'], chancePercent: 4.5, notes: 'Aggressive frontier weapon unlock.' },
      { level: 9, unlockType: 'drop', locationId: 'LOC_004', enemyNames: ['Iron Guard', 'Tower Shield Veteran'], chancePercent: 4, notes: 'Watchtower-forged blade pattern.' },
      { level: 12, unlockType: 'elite', locationId: 'LOC_005', enemyNames: ['Iron Gate Warden', 'Elite Spawn'], chancePercent: 3.5, notes: 'Fortress progression manual.' },
      { level: 15, unlockType: 'drop', locationId: 'LOC_007', enemyNames: ['Veteran Sellblade', 'Crossroad Duelist'], chancePercent: 4, notes: 'Midgame duelist smithing pattern.' },
      { level: 18, unlockType: 'elite', locationId: 'LOC_008', enemyNames: ['Pit Crusher', 'Headsman Veteran'], chancePercent: 3, notes: 'Execution field weapon pattern.' },
      { level: 21, unlockType: 'elite', locationId: 'LOC_010', enemyNames: ['Iron Tyrant Guard', 'Elite Spawn'], chancePercent: 2.6, notes: 'Inner bastion weapon unlock.' },
      { level: 24, unlockType: 'elite', locationId: 'LOC_012', enemyNames: ['Arena Duelist', 'Arena Champion Spawn'], chancePercent: 2.6, notes: 'Arena-forged high-tier blade pattern.' },
      { level: 27, unlockType: 'elite', locationId: 'LOC_013', enemyNames: ['Ironbound Breaker', 'Quarry Breaker Spawn'], chancePercent: 2.3, notes: 'Quarry capstone forge pattern.' },
      { level: 30, unlockType: 'boss', locationId: 'LOC_014', enemyNames: ['Ash Lord Vaelor', 'Elite Spawn'], chancePercent: 12, notes: 'Final capstone weapon pattern.' }
    ]
  },
  {
    slot: 'shield',
    unlocks: [
      { level: 1, unlockType: 'starter', locationId: 'LOC_001', enemyNames: [], chancePercent: 0, notes: 'Starter guard shield pattern.' },
      { level: 3, unlockType: 'drop', locationId: 'LOC_002', enemyNames: ['Young Wolf', 'Fang Stalker'], chancePercent: 4.5, notes: 'Early hide shield pattern.' },
      { level: 6, unlockType: 'drop', locationId: 'LOC_003', enemyNames: ['Wild Raider', 'Blood Raider'], chancePercent: 4.5, notes: 'First proper defensive shield pattern.' },
      { level: 9, unlockType: 'drop', locationId: 'LOC_005', enemyNames: ['Iron Guard', 'Iron Gate Warden'], chancePercent: 4.5, notes: 'Bastion approach shield pattern.' },
      { level: 12, unlockType: 'drop', locationId: 'LOC_006', enemyNames: ['Ash Disciple', 'Ash Blood Priest'], chancePercent: 2.6, notes: 'Ash-marsh warding shield pattern.' },
      { level: 15, unlockType: 'drop', locationId: 'LOC_007', enemyNames: ['Veteran Sellblade', 'Crossroad Duelist'], chancePercent: 4.5, notes: 'Parry shield pattern.' },
      { level: 18, unlockType: 'elite', locationId: 'LOC_008', enemyNames: ['Executioner', 'Headsman Veteran'], chancePercent: 2.6, notes: 'Execution-field defensive pattern.' },
      { level: 21, unlockType: 'elite', locationId: 'LOC_009', enemyNames: ['Raven Fang Stalker', 'Elite Spawn'], chancePercent: 2.6, notes: 'Late skirmish ward pattern.' },
      { level: 24, unlockType: 'elite', locationId: 'LOC_012', enemyNames: ['Arena Duelist', 'Ravager Sellblade'], chancePercent: 2.6, notes: 'Heavy quarry tower-shield pattern.' },
      { level: 27, unlockType: 'boss', locationId: 'LOC_012', enemyNames: ['Arena Duelist', 'Arena Champion Spawn'], chancePercent: 12, notes: 'Arena champion defensive pattern.' },
      { level: 30, unlockType: 'boss', locationId: 'LOC_014', enemyNames: ['Ash Lord Vaelor', 'Elite Spawn'], chancePercent: 12, notes: 'Final citadel shield pattern.' }
    ]
  },
  {
    slot: 'head',
    unlocks: [
      { level: 1, unlockType: 'starter', locationId: 'LOC_001', enemyNames: [], chancePercent: 0, notes: 'Starter helm pattern.' },
      { level: 3, unlockType: 'drop', locationId: 'LOC_002', enemyNames: ['Young Wolf', 'Fang Stalker'], chancePercent: 4.5, notes: 'Early frontier helm unlock.' },
      { level: 6, unlockType: 'drop', locationId: 'LOC_003', enemyNames: ['Wild Raider', 'Blood Raider'], chancePercent: 4.5, notes: 'Watchtower helm pattern.' },
      { level: 9, unlockType: 'drop', locationId: 'LOC_005', enemyNames: ['Iron Gate Warden'], chancePercent: 4.5, notes: 'Iron Bastion visor pattern.' },
      { level: 12, unlockType: 'drop', locationId: 'LOC_006', enemyNames: ['Ash Disciple', 'Ash Blood Priest'], chancePercent: 2.6, notes: 'Ashen hood pattern.' },
      { level: 15, unlockType: 'drop', locationId: 'LOC_007', enemyNames: ['Veteran Sellblade', 'Crossroad Duelist'], chancePercent: 4.5, notes: 'Duelist helm pattern.' },
      { level: 18, unlockType: 'elite', locationId: 'LOC_008', enemyNames: ['Executioner', 'Headsman Veteran'], chancePercent: 2.6, notes: 'Execution cowl pattern.' },
      { level: 21, unlockType: 'elite', locationId: 'LOC_009', enemyNames: ['Raven Fang Stalker', 'Elite Spawn'], chancePercent: 2.6, notes: 'Raven-hollow headgear pattern.' },
      { level: 24, unlockType: 'elite', locationId: 'LOC_012', enemyNames: ['Arena Duelist', 'Ravager Sellblade'], chancePercent: 2.6, notes: 'Late quarry helm pattern.' },
      { level: 27, unlockType: 'boss', locationId: 'LOC_012', enemyNames: ['Arena Duelist', 'Arena Champion Spawn'], chancePercent: 12, notes: 'Warbound crown-helm pattern.' },
      { level: 30, unlockType: 'boss', locationId: 'LOC_014', enemyNames: ['Ash Lord Vaelor', 'Elite Spawn'], chancePercent: 12, notes: 'Vaelor crown pattern.' }
    ]
  },
  {
    slot: 'chest',
    unlocks: [
      { level: 1, unlockType: 'starter', locationId: 'LOC_001', enemyNames: [], chancePercent: 0, notes: 'Starter chest pattern.' },
      { level: 3, unlockType: 'drop', locationId: 'LOC_002', enemyNames: ['Fang Stalker'], chancePercent: 5, notes: 'Early Blackfang chest pattern.' },
      { level: 6, unlockType: 'drop', locationId: 'LOC_003', enemyNames: ['Blood Raider'], chancePercent: 4.5, notes: 'Raider chest pattern.' },
      { level: 9, unlockType: 'drop', locationId: 'LOC_004', enemyNames: ['Tower Shield Veteran'], chancePercent: 3.5, notes: 'Watchtower mail pattern.' },
      { level: 12, unlockType: 'drop', locationId: 'LOC_005', enemyNames: ['Iron Gate Warden'], chancePercent: 3.2, notes: 'Fortress chest pattern.' },
      { level: 15, unlockType: 'drop', locationId: 'LOC_007', enemyNames: ['Crossroad Duelist'], chancePercent: 3, notes: 'Mercenary chest pattern.' },
      { level: 18, unlockType: 'drop', locationId: 'LOC_008', enemyNames: ['Pit Crusher'], chancePercent: 3, notes: 'Execution chest pattern.' },
      { level: 21, unlockType: 'elite', locationId: 'LOC_010', enemyNames: ['Iron Tyrant Guard'], chancePercent: 3, notes: 'Late legion chest pattern.' },
      { level: 24, unlockType: 'elite', locationId: 'LOC_011', enemyNames: ['Ash-Cursed Champion'], chancePercent: 3, notes: 'Sanctuary chest pattern.' },
      { level: 27, unlockType: 'elite', locationId: 'LOC_013', enemyNames: ['Ironbound Breaker'], chancePercent: 3, notes: 'Quarry plate pattern.' },
      { level: 30, unlockType: 'boss', locationId: 'LOC_014', enemyNames: ['Ash Lord Vaelor'], chancePercent: 18, notes: 'Guaranteed-feeling endgame chest pattern.' }
    ]
  },
  {
    slot: 'hands',
    unlocks: [
      { level: 1, unlockType: 'starter', locationId: 'LOC_001', enemyNames: [], chancePercent: 0, notes: 'Starter handguard pattern.' },
      { level: 3, unlockType: 'drop', locationId: 'LOC_002', enemyNames: ['Young Wolf', 'Fang Stalker'], chancePercent: 4.5, notes: 'Early clawed glove pattern.' },
      { level: 6, unlockType: 'drop', locationId: 'LOC_003', enemyNames: ['Wild Raider', 'Blood Raider'], chancePercent: 4.5, notes: 'Watchtower bracer pattern.' },
      { level: 9, unlockType: 'drop', locationId: 'LOC_005', enemyNames: ['Iron Gate Warden'], chancePercent: 4.5, notes: 'Ironbound gauntlet pattern.' },
      { level: 12, unlockType: 'drop', locationId: 'LOC_006', enemyNames: ['Ash Disciple', 'Ash Blood Priest'], chancePercent: 2.6, notes: 'Ash handwrap pattern.' },
      { level: 15, unlockType: 'drop', locationId: 'LOC_007', enemyNames: ['Veteran Sellblade', 'Crossroad Duelist'], chancePercent: 4.5, notes: 'Sellblade glove pattern.' },
      { level: 18, unlockType: 'elite', locationId: 'LOC_008', enemyNames: ['Executioner', 'Headsman Veteran'], chancePercent: 2.6, notes: 'Execution gauntlet pattern.' },
      { level: 21, unlockType: 'elite', locationId: 'LOC_009', enemyNames: ['Raven Fang Stalker', 'Elite Spawn'], chancePercent: 2.6, notes: 'Raven grip pattern.' },
      { level: 24, unlockType: 'elite', locationId: 'LOC_012', enemyNames: ['Arena Duelist', 'Ravager Sellblade'], chancePercent: 2.6, notes: 'Crimson gauntlet pattern.' },
      { level: 27, unlockType: 'boss', locationId: 'LOC_012', enemyNames: ['Arena Duelist', 'Arena Champion Spawn'], chancePercent: 12, notes: 'Warbound handguard pattern.' },
      { level: 30, unlockType: 'boss', locationId: 'LOC_014', enemyNames: ['Ash Lord Vaelor', 'Elite Spawn'], chancePercent: 12, notes: 'Ash Lord handguard pattern.' }
    ]
  },
  {
    slot: 'legs',
    unlocks: [
      { level: 1, unlockType: 'starter', locationId: 'LOC_001', enemyNames: [], chancePercent: 0, notes: 'Starter legguard pattern.' },
      { level: 3, unlockType: 'drop', locationId: 'LOC_002', enemyNames: ['Young Wolf', 'Fang Stalker'], chancePercent: 4.5, notes: 'Early forest greave pattern.' },
      { level: 6, unlockType: 'drop', locationId: 'LOC_003', enemyNames: ['Wild Raider', 'Blood Raider'], chancePercent: 4.5, notes: 'Gatewarden greave pattern.' },
      { level: 9, unlockType: 'drop', locationId: 'LOC_005', enemyNames: ['Iron Gate Warden'], chancePercent: 4.5, notes: 'Ironmarch legguard pattern.' },
      { level: 12, unlockType: 'drop', locationId: 'LOC_006', enemyNames: ['Ash Disciple', 'Ash Blood Priest'], chancePercent: 2.6, notes: 'Ashbound legwrap pattern.' },
      { level: 15, unlockType: 'drop', locationId: 'LOC_007', enemyNames: ['Veteran Sellblade', 'Crossroad Duelist'], chancePercent: 4.5, notes: 'Crossroads greave pattern.' },
      { level: 18, unlockType: 'elite', locationId: 'LOC_008', enemyNames: ['Executioner', 'Headsman Veteran'], chancePercent: 2.6, notes: 'Pit-crusher legplate pattern.' },
      { level: 21, unlockType: 'elite', locationId: 'LOC_009', enemyNames: ['Raven Fang Stalker', 'Elite Spawn'], chancePercent: 2.6, notes: 'Ravenstep legguard pattern.' },
      { level: 24, unlockType: 'elite', locationId: 'LOC_012', enemyNames: ['Arena Duelist', 'Ravager Sellblade'], chancePercent: 2.6, notes: 'Crimson legguard pattern.' },
      { level: 27, unlockType: 'boss', locationId: 'LOC_012', enemyNames: ['Arena Duelist', 'Arena Champion Spawn'], chancePercent: 12, notes: 'Warbound legplate pattern.' },
      { level: 30, unlockType: 'boss', locationId: 'LOC_014', enemyNames: ['Ash Lord Vaelor', 'Elite Spawn'], chancePercent: 12, notes: 'Citadel greave pattern.' }
    ]
  },
  {
    slot: 'feet',
    unlocks: [
      { level: 1, unlockType: 'starter', locationId: 'LOC_001', enemyNames: [], chancePercent: 0, notes: 'Starter boot pattern.' },
      { level: 3, unlockType: 'drop', locationId: 'LOC_002', enemyNames: ['Young Wolf', 'Fang Stalker'], chancePercent: 4.5, notes: 'Trail boot pattern.' },
      { level: 6, unlockType: 'drop', locationId: 'LOC_003', enemyNames: ['Wild Raider', 'Blood Raider'], chancePercent: 4.5, notes: 'Watchtower boot pattern.' },
      { level: 9, unlockType: 'drop', locationId: 'LOC_005', enemyNames: ['Iron Gate Warden'], chancePercent: 4.5, notes: 'Ironmarch boot pattern.' },
      { level: 12, unlockType: 'drop', locationId: 'LOC_006', enemyNames: ['Ash Disciple', 'Ash Blood Priest'], chancePercent: 2.6, notes: 'Ashwalk boot pattern.' },
      { level: 15, unlockType: 'drop', locationId: 'LOC_007', enemyNames: ['Veteran Sellblade', 'Crossroad Duelist'], chancePercent: 4.5, notes: 'Sellblade boot pattern.' },
      { level: 18, unlockType: 'elite', locationId: 'LOC_008', enemyNames: ['Executioner', 'Headsman Veteran'], chancePercent: 2.6, notes: 'Ravenstep boot pattern.' },
      { level: 21, unlockType: 'elite', locationId: 'LOC_009', enemyNames: ['Raven Fang Stalker', 'Elite Spawn'], chancePercent: 2.6, notes: 'Blood-tread boot pattern.' },
      { level: 24, unlockType: 'elite', locationId: 'LOC_012', enemyNames: ['Arena Duelist', 'Ravager Sellblade'], chancePercent: 2.6, notes: 'Quarry boot pattern.' },
      { level: 27, unlockType: 'boss', locationId: 'LOC_012', enemyNames: ['Arena Duelist', 'Arena Champion Spawn'], chancePercent: 12, notes: 'Threshold strider pattern.' },
      { level: 30, unlockType: 'boss', locationId: 'LOC_014', enemyNames: ['Ash Lord Vaelor', 'Elite Spawn'], chancePercent: 12, notes: 'Vaelor ash-tread pattern.' }
    ]
  },
  {
    slot: 'ring',
    unlocks: [
      { level: 1, unlockType: 'drop', locationId: 'LOC_001', enemyNames: ['Starved Stalker', 'Broken Shield Guard'], chancePercent: 4.5, notes: 'Very early accessory unlock.' },
      { level: 3, unlockType: 'drop', locationId: 'LOC_002', enemyNames: ['Young Wolf', 'Fang Stalker'], chancePercent: 4.5, notes: 'First ring recipe unlock.' },
      { level: 6, unlockType: 'drop', locationId: 'LOC_003', enemyNames: ['Wild Raider', 'Blood Raider'], chancePercent: 4.5, notes: 'Counter-oriented ring pattern.' },
      { level: 9, unlockType: 'drop', locationId: 'LOC_005', enemyNames: ['Iron Gate Warden'], chancePercent: 4.5, notes: 'Fortress ring pattern.' },
      { level: 12, unlockType: 'drop', locationId: 'LOC_006', enemyNames: ['Ash Disciple', 'Ash Blood Priest'], chancePercent: 2.6, notes: 'Ash signet pattern.' },
      { level: 15, unlockType: 'drop', locationId: 'LOC_007', enemyNames: ['Veteran Sellblade', 'Crossroad Duelist'], chancePercent: 4.5, notes: 'Mercenary ring pattern.' },
      { level: 18, unlockType: 'elite', locationId: 'LOC_008', enemyNames: ['Executioner', 'Headsman Veteran'], chancePercent: 2.6, notes: 'Execution-ground ring unlock.' },
      { level: 21, unlockType: 'elite', locationId: 'LOC_009', enemyNames: ['Raven Fang Stalker', 'Elite Spawn'], chancePercent: 2.6, notes: 'Late crit ring pattern.' },
      { level: 24, unlockType: 'elite', locationId: 'LOC_012', enemyNames: ['Arena Duelist', 'Arena Champion Spawn'], chancePercent: 2.6, notes: 'Crimson ring pattern.' },
      { level: 27, unlockType: 'boss', locationId: 'LOC_012', enemyNames: ['Arena Duelist', 'Arena Champion Spawn'], chancePercent: 12, notes: 'Arena champion ring unlock.' },
      { level: 30, unlockType: 'boss', locationId: 'LOC_014', enemyNames: ['Ash Lord Vaelor', 'Elite Spawn'], chancePercent: 12, notes: 'Final ash signet unlock.' }
    ]
  },
  {
    slot: 'amulet',
    unlocks: [
      { level: 1, unlockType: 'drop', locationId: 'LOC_001', enemyNames: ['Road Thug', 'Starved Stalker'], chancePercent: 4.5, notes: 'Very early talisman unlock.' },
      { level: 3, unlockType: 'drop', locationId: 'LOC_002', enemyNames: ['Young Wolf', 'Fang Stalker'], chancePercent: 4.5, notes: 'First support-amulet pattern.' },
      { level: 6, unlockType: 'drop', locationId: 'LOC_003', enemyNames: ['Wild Raider', 'Blood Raider'], chancePercent: 4.5, notes: 'Ash charm pattern.' },
      { level: 9, unlockType: 'drop', locationId: 'LOC_005', enemyNames: ['Iron Guard', 'Iron Gate Warden'], chancePercent: 4.5, notes: 'Blood charm pattern.' },
      { level: 12, unlockType: 'drop', locationId: 'LOC_006', enemyNames: ['Ash Disciple', 'Ash Blood Priest'], chancePercent: 2.6, notes: 'Mercenary talisman pattern.' },
      { level: 15, unlockType: 'drop', locationId: 'LOC_007', enemyNames: ['Veteran Sellblade', 'Crossroad Duelist'], chancePercent: 4.5, notes: 'Execution-mark style support pattern.' },
      { level: 18, unlockType: 'elite', locationId: 'LOC_008', enemyNames: ['Executioner', 'Headsman Veteran'], chancePercent: 2.6, notes: 'Ravenfeather talisman unlock.' },
      { level: 21, unlockType: 'elite', locationId: 'LOC_009', enemyNames: ['Raven Fang Stalker', 'Elite Spawn'], chancePercent: 2.6, notes: 'Zealot ash charm pattern.' },
      { level: 24, unlockType: 'elite', locationId: 'LOC_012', enemyNames: ['Arena Duelist', 'Arena Champion Spawn'], chancePercent: 2.6, notes: 'Breaker sigil pattern.' },
      { level: 27, unlockType: 'boss', locationId: 'LOC_012', enemyNames: ['Arena Duelist', 'Arena Champion Spawn'], chancePercent: 12, notes: 'Warbound pendant unlock.' },
      { level: 30, unlockType: 'boss', locationId: 'LOC_014', enemyNames: ['Ash Lord Vaelor', 'Elite Spawn'], chancePercent: 12, notes: 'Final core amulet unlock.' }
    ]
  }
] as const;

const LIVE_RECIPE_SLOT_CODE_PREFIX: Record<(typeof LIVE_RECIPE_UNLOCK_SLOTS)[number], string> = {
  weapon: 'weapon_blade',
  shield: 'shield_guard',
  head: 'head_helmet',
  chest: 'chest_armor',
  hands: 'hands_gloves',
  legs: 'legs_pants',
  feet: 'feet_boots',
  ring: 'ring_band',
  amulet: 'amulet_charm'
};

type UnlockTemplate = (typeof LIVE_RECIPE_UNLOCK_TEMPLATES)[number]['unlocks'][number];

export type LiveRecipeUnlockType = UnlockTemplate['unlockType'];

export type LiveRecipeUnlockRule = {
  recipeId: string;
  slot: (typeof LIVE_RECIPE_UNLOCK_SLOTS)[number];
  level: (typeof LIVE_RECIPE_LEVEL_STEPS)[number];
  unlockType: LiveRecipeUnlockType;
  locationId: string;
  enemyNames: string[];
  chancePercent: number;
  notes: string;
};

function buildLiveRecipeId(slot: (typeof LIVE_RECIPE_UNLOCK_SLOTS)[number], level: number): string {
  return `recipe_${LIVE_RECIPE_SLOT_CODE_PREFIX[slot]}_lvl_${String(level).padStart(2, '0')}`;
}

export const LIVE_RECIPE_UNLOCK_RULES: LiveRecipeUnlockRule[] = LIVE_RECIPE_UNLOCK_TEMPLATES.flatMap((template) =>
  template.unlocks.map((unlock) => ({
    recipeId: buildLiveRecipeId(template.slot, unlock.level),
    slot: template.slot,
    level: unlock.level,
    unlockType: unlock.unlockType,
    locationId: unlock.locationId,
    enemyNames: [...unlock.enemyNames],
    chancePercent: unlock.chancePercent,
    notes: unlock.notes
  }))
);

const starterRecipeIdSet = new Set<string>(STARTER_RECIPE_IDS);
const liveRecipeIdSet = new Set<string>(LIVE_RECIPE_UNLOCK_RULES.map((rule) => rule.recipeId));

const generatedOnlyRecipeIdSet = new Set<string>([
  ...(generatedRecipes as Array<{ id: string }>).map((recipe) => recipe.id),
  ...(generatedRingRecipes as Array<{ id: string }>).map((recipe) => recipe.id),
  ...(generatedShieldRecipes as Array<{ id: string }>).map((recipe) => recipe.id),
  ...(generatedAmuletRecipes as Array<{ id: string }>).map((recipe) => recipe.id),
  ...(generatedMinorArmorRecipes as Array<{ id: string }>).map((recipe) => recipe.id)
]);

export function isStarterRecipeId(recipeId: string): boolean {
  return starterRecipeIdSet.has(recipeId);
}

export function isLiveRecipeId(recipeId: string): boolean {
  return liveRecipeIdSet.has(recipeId);
}

export function isGeneratedOnlyRecipeId(recipeId: string): boolean {
  return generatedOnlyRecipeIdSet.has(recipeId) && !liveRecipeIdSet.has(recipeId);
}

export function isCompatibleKnownRecipeId(recipeId: string): boolean {
  return (isLiveRecipeId(recipeId) || isGeneratedOnlyRecipeId(recipeId)) && !isStarterRecipeId(recipeId);
}

export function getCompatibleKnownRecipeIds(): string[] {
  return Array.from(new Set([...liveRecipeIdSet, ...generatedOnlyRecipeIdSet])).filter(id => !isStarterRecipeId(id));
}

export function getLiveRecipeUnlockRule(recipeId: string): LiveRecipeUnlockRule | null {
  return LIVE_RECIPE_UNLOCK_RULES.find((rule) => rule.recipeId === recipeId) ?? null;
}

export function getRecipeUnlockMethodDescriptor(recipeId: string): string {
  const rule = getLiveRecipeUnlockRule(recipeId);
  if (!rule) {
    return 'Unknown unlock source';
  }

  switch (rule.unlockType) {
    case 'starter':
      return 'Starter known';
    case 'drop':
      return 'Enemy recipe drop';
    case 'elite':
      return 'Elite recipe drop';
    case 'boss':
      return 'Boss recipe drop';
  }
}

export function getRecipeSourceDescriptor(recipeId: string): string {
  const rule = getLiveRecipeUnlockRule(recipeId);
  if (!rule) {
    return 'Unknown source';
  }

  if (rule.unlockType === 'starter') {
    return 'Starter blacksmith pattern';
  }

  if (rule.enemyNames.length === 0) {
    return rule.locationId;
  }

  return `${rule.locationId}: ${rule.enemyNames.join(' / ')}`;
}

export function getLiveRecipesForLocation(locationId: string): LiveRecipeUnlockRule[] {
  return LIVE_RECIPE_UNLOCK_RULES.filter((rule) => rule.locationId === locationId);
}

export function getLiveRecipesForEnemy(locationId: string, enemyName: string): LiveRecipeUnlockRule[] {
  const enemySignature = enemyName.toLowerCase();
  return LIVE_RECIPE_UNLOCK_RULES.filter(
    (rule) =>
      rule.locationId === locationId &&
      rule.enemyNames.some((candidate) => enemySignature.includes(candidate.toLowerCase()) || candidate.toLowerCase().includes(enemySignature))
  );
}

export function rollLiveRecipeUnlock(
  enemyName: string,
  locationId: string,
  knownRecipeIds: readonly string[],
  randomValue = Math.random()
): { id: string } | null {
  const known = new Set(knownRecipeIds);
  const candidates = getLiveRecipesForEnemy(locationId, enemyName).filter(
    (rule) => !known.has(rule.recipeId) && rule.unlockType !== 'starter'
  );

  for (const rule of candidates) {
    if (randomValue * 100 > rule.chancePercent) {
      continue;
    }

    return { id: rule.recipeId };
  }

  return null;
}
