import type { CharacterClass } from '../../src/types/game'
import type { ContentTier, ItemDefinition, ItemEquipType, Profession, RecipeDefinition, ResourceDefinition } from './types'

export const CONTENT_TIERS: ContentTier[] = [1, 2, 3]
export const GEAR_CLASSES: CharacterClass[] = ['warrior', 'ranger', 'blacksmith', 'alchemist', 'jeweler']
export const GEAR_SLOTS: ItemEquipType[] = ['weapon', 'head', 'chest', 'hands', 'legs', 'feet']

const RESOURCE_NAMES: Record<Profession, Array<[string, string, string]>> = {
  blacksmith: [['Rift Iron', 'Dark Plate Fragment', 'Core Metal'], ['Echo Silver', 'Vein Alloy', 'Veskara Core'], ['Void Titanium', 'Sovereign Plate', 'Nhal Core']],
  alchemist: [['Rift Essence', 'Mutated Blood', 'Spore Extract'], ['Moonroot', 'Echo Bile', 'Fractured Essence'], ['Void Bloom', 'Oracle Blood', 'Ruin Essence']],
  jeweler: [['Rift Crystal', 'Gem Fragment', 'Core Shard'], ['Echo Opal', 'Vein Sapphire', 'Eye Prism'], ['Void Diamond', 'Obsidian Star', 'Ruin Prism']],
}
const ROLES: ResourceDefinition['role'][] = ['COMMON', 'SECONDARY', 'CORE']

export const PHASE7_RESOURCES: Record<string, ResourceDefinition> = Object.fromEntries(
  (Object.entries(RESOURCE_NAMES) as Array<[Profession, Array<[string, string, string]>]>).flatMap(([profession, tiers]) =>
    tiers.flatMap((names, tierIndex) => names.map((name, roleIndex) => {
      const definition: ResourceDefinition = { id: name.toLowerCase().replaceAll(' ', '_'), name, profession,
        tier: (tierIndex + 1) as ContentTier, role: ROLES[roleIndex], icon: profession === 'blacksmith' ? '◆' : profession === 'alchemist' ? '✣' : '◇' }
      return [definition.id, definition] as const
    }))),
)

export function tierResources(profession: Profession, tier: ContentTier): ResourceDefinition[] {
  return Object.values(PHASE7_RESOURCES).filter((resource) => resource.profession === profession && resource.tier === tier)
}

const SLOT_NAMES: Record<ItemEquipType, string> = { weapon: 'Weapon', head: 'Crown', chest: 'Vestment', hands: 'Grips', legs: 'Legguards', feet: 'Treads', ring: 'Ring', amulet: 'Amulet' }
const CLASS_NAMES: Record<CharacterClass, string> = { warrior: 'Vanguard', ranger: 'Hawkeye', blacksmith: 'Forgekeeper', alchemist: 'Essenceweaver', jeweler: 'Gemwright' }
const TIER_NAMES: Record<ContentTier, string> = { 1: 'Ember', 2: 'Echo', 3: 'Void' }
export const ATTACK_BUDGET: Record<ContentTier, number> = { 1: 6, 2: 14, 3: 22 }
export const HP_BUDGET: Record<ContentTier, number> = { 1: 40, 2: 95, 3: 150 }
const CLASS_ATTACK_FACTOR: Record<CharacterClass, number> = { ranger: 1.1, warrior: 1, jeweler: 0.9, alchemist: 0.82, blacksmith: 0.75 }
const CLASS_HP_FACTOR: Record<CharacterClass, number> = { blacksmith: 1.15, warrior: 1.08, alchemist: 1, jeweler: 0.9, ranger: 0.86 }
const SLOT_ATTACK_SHARE: Record<ItemEquipType, number> = { weapon: 0.58, head: 0.08, chest: 0.05, hands: 0.13, legs: 0.07, feet: 0.09, ring: 0, amulet: 0 }
const SLOT_HP_SHARE: Record<ItemEquipType, number> = { weapon: 0, head: 0.13, chest: 0.38, hands: 0.1, legs: 0.25, feet: 0.14, ring: 0, amulet: 0 }

function gearProfession(classId: CharacterClass): Profession { return classId === 'alchemist' ? 'alchemist' : classId === 'jeweler' ? 'jeweler' : 'blacksmith' }

const tierGear: ItemDefinition[] = CONTENT_TIERS.flatMap((tier) => GEAR_CLASSES.flatMap((classId) => GEAR_SLOTS.map((slot) => ({
  id: `rift_t${tier}_${classId}_${slot}`, name: `${TIER_NAMES[tier]} ${CLASS_NAMES[classId]} ${SLOT_NAMES[slot]}`,
  category: 'equipment' as const, icon: slot === 'weapon' ? '⚔' : '▣', stackable: false, equipType: slot, allowedClass: classId, tier,
  attack: Math.round(ATTACK_BUDGET[tier] * CLASS_ATTACK_FACTOR[classId] * SLOT_ATTACK_SHARE[slot]) || undefined,
  hp: Math.round(HP_BUDGET[tier] * CLASS_HP_FACTOR[classId] * SLOT_HP_SHARE[slot]) || undefined,
}))))

const JEWELRY_STYLES = ['attack_ring', 'hp_ring', 'balanced_ring', 'attack_amulet', 'hp_amulet', 'balanced_amulet'] as const
const tierJewelry: ItemDefinition[] = CONTENT_TIERS.flatMap((tier) => JEWELRY_STYLES.map((style) => {
  const equipType = style.endsWith('ring') ? 'ring' : 'amulet'
  return { id: `rift_t${tier}_${style}`, name: `${TIER_NAMES[tier]} ${style.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')}`,
    category: 'jewelry', icon: equipType === 'ring' ? '○' : '◇', stackable: false, equipType,
    attack: style.startsWith('attack') ? 4 * tier : style.startsWith('balanced') ? 2 * tier : undefined,
    hp: style.startsWith('hp') ? 30 * tier : style.startsWith('balanced') ? 16 * tier : undefined, tier } satisfies ItemDefinition
}))

export const POTION_IDS = { 1: 'lesser_healing_potion', 2: 'healing_potion', 3: 'greater_healing_potion' } as const
export const POTION_HEAL_PERCENT: Record<ContentTier, number> = { 1: 0.25, 2: 0.35, 3: 0.45 }
const potionNames: Record<ContentTier, string> = { 1: 'Lesser Healing Potion', 2: 'Healing Potion', 3: 'Greater Healing Potion' }
const tierPotions: ItemDefinition[] = CONTENT_TIERS.map((tier) => ({ id: POTION_IDS[tier], name: potionNames[tier], category: 'consumable', icon: '✣', stackable: true, tier, potionHealPercent: POTION_HEAL_PERCENT[tier] }))

export const PHASE7_ITEMS: Record<string, ItemDefinition> = Object.fromEntries([...tierGear, ...tierJewelry, ...tierPotions].map((item) => [item.id, item]))

function costs(profession: Profession, tier: ContentTier, slot: ItemEquipType): Record<string, number> {
  const [common, secondary, core] = tierResources(profession, tier)
  const cost = slot === 'weapon' ? [8, 4, 2] : slot === 'chest' ? [7, 5, 2] : [5, 3, 1]
  return { [common.id]: cost[0], [secondary.id]: cost[1], [core.id]: cost[2] }
}

const gearRecipes: RecipeDefinition[] = tierGear.map((item) => {
  const profession = gearProfession(item.allowedClass!)
  return { id: `recipe_${item.id}`, name: item.name, profession, category: 'equipment', outputItemId: item.id, outputQuantity: 1,
    targetClass: item.allowedClass, tier: item.tier, requirements: costs(profession, item.tier!, item.equipType!) }
})
const jewelryRecipes: RecipeDefinition[] = tierJewelry.map((item) => ({ id: `recipe_${item.id}`, name: item.name, profession: 'jeweler', category: 'jewelry', outputItemId: item.id,
  outputQuantity: 1, tier: item.tier, requirements: costs('jeweler', item.tier!, item.equipType!) }))
const potionRecipes: RecipeDefinition[] = tierPotions.map((item) => {
  const [common, secondary] = tierResources('alchemist', item.tier!)
  return { id: `recipe_rift_t${item.tier}_potion`, name: `${item.name} ×2`, profession: 'alchemist', category: 'consumables', outputItemId: item.id,
    outputQuantity: 2, tier: item.tier, requirements: { [common.id]: 3, [secondary.id]: 1 } }
})

export const PHASE7_RECIPES: Record<string, RecipeDefinition> = Object.fromEntries([...gearRecipes, ...jewelryRecipes, ...potionRecipes].map((recipe) => [recipe.id, recipe]))
