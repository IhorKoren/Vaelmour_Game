import { RIFT_LOW_PARTY_FLOOR_MODIFIERS, RIFT_PARTY_SIZE_SCALING } from '../../shared/game-data/balance'
import { floorEncounters } from '../../shared/game-data/rifts'
import type { EnemyDefinition } from '../../shared/game-data/enemies/types'
import type { Enemy } from '../../src/types/game'

export function partyScaling(partySize: number, riftId = 'first_rift') {
  const scaling = RIFT_PARTY_SIZE_SCALING[riftId] ?? RIFT_PARTY_SIZE_SCALING.first_rift
  return scaling[Math.max(1, Math.min(5, Math.floor(partySize)))] ?? scaling[5]
}

export function scaleEnemyDefinition(definition: EnemyDefinition, partySize: number, floorNumber: number = 1, riftId = 'first_rift'): EnemyDefinition {
  const scaling = partyScaling(partySize, riftId)
  const floor = Math.max(1, Math.min(3, Math.floor(floorNumber))) as 1 | 2 | 3
  const lowParty = RIFT_LOW_PARTY_FLOOR_MODIFIERS[riftId] ?? RIFT_LOW_PARTY_FLOOR_MODIFIERS.first_rift
  const modifier = partySize <= 2 ? lowParty[partySize as 1 | 2][floor] : { hp: 1, attack: 1 }
  return { ...definition, maxHP: Math.round(definition.maxHP * scaling.hp * modifier.hp), attack: Math.round(definition.attack * scaling.attack * modifier.attack) }
}

export function createRiftEnemy(riftId: string, floorNumber: number, encounterIndex: number, partySize: number): Enemy {
  const definition = scaleEnemyDefinition(floorEncounters(riftId, floorNumber)[encounterIndex], partySize, floorNumber, riftId)
  return {
    id: `enemy-${floorNumber}-${encounterIndex}`, definitionId: definition.id, name: definition.name,
    kind: definition.type === 'NORMAL' ? 'mob' : definition.type === 'ELITE' ? 'elite' : 'boss', level: definition.level,
    attack: definition.attack, maxHP: definition.maxHP, currentHP: definition.maxHP, attackCount: 0,
    attackZoneWeights: definition.attackZoneWeights, defenseZoneWeights: definition.defenseZoneWeights,
    targeting: definition.targeting, bossPattern: definition.bossPattern,
  }
}

export function createFirstRiftEnemy(floorNumber: number, encounterIndex: number, partySize: number): Enemy {
  return createRiftEnemy('first_rift', floorNumber, encounterIndex, partySize)
}
