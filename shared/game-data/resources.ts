import type { Profession, ResourceDefinition } from './types'

export const RESOURCES: Record<string, ResourceDefinition> = {
  rift_iron: { id: 'rift_iron', name: 'Rift Iron', profession: 'blacksmith', icon: '▰' },
  dark_plate_fragment: { id: 'dark_plate_fragment', name: 'Dark Plate Fragment', profession: 'blacksmith', icon: '▧' },
  core_metal: { id: 'core_metal', name: 'Core Metal', profession: 'blacksmith', icon: '⬡' },
  rift_essence: { id: 'rift_essence', name: 'Rift Essence', profession: 'alchemist', icon: '✣' },
  mutated_blood: { id: 'mutated_blood', name: 'Mutated Blood', profession: 'alchemist', icon: '●' },
  spore_extract: { id: 'spore_extract', name: 'Spore Extract', profession: 'alchemist', icon: '♧' },
  rift_crystal: { id: 'rift_crystal', name: 'Rift Crystal', profession: 'jeweler', icon: '◆' },
  gem_fragment: { id: 'gem_fragment', name: 'Gem Fragment', profession: 'jeweler', icon: '◇' },
  core_shard: { id: 'core_shard', name: 'Core Shard', profession: 'jeweler', icon: '✦' },
}

export const PROFESSION_RESOURCE_IDS: Record<Profession, string[]> = {
  blacksmith: ['rift_iron', 'dark_plate_fragment', 'core_metal'],
  alchemist: ['rift_essence', 'mutated_blood', 'spore_extract'],
  jeweler: ['rift_crystal', 'gem_fragment', 'core_shard'],
}

export const FIRST_RIFT_LOOT_POOLS: Array<Record<Profession, string[]>> = [
  { blacksmith: ['rift_iron'], alchemist: ['rift_essence'], jeweler: ['rift_crystal'] },
  { blacksmith: ['rift_iron', 'dark_plate_fragment'], alchemist: ['rift_essence', 'mutated_blood'], jeweler: ['rift_crystal', 'gem_fragment'] },
  { blacksmith: ['dark_plate_fragment'], alchemist: ['mutated_blood', 'spore_extract'], jeweler: ['gem_fragment'] },
  { blacksmith: ['core_metal'], alchemist: ['spore_extract'], jeweler: ['core_shard'] },
]
