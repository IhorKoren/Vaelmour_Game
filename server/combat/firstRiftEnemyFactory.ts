import { LOW_PARTY_FLOOR_MODIFIERS, PARTY_SIZE_SCALING } from '../../shared/game-data/balance'
import { floorEncounters } from '../../shared/game-data/rifts'
import type { EnemyDefinition } from '../../shared/game-data/enemies/types'
import type { Enemy } from '../../src/types/game'

export function partyScaling(partySize: number) {
  return PARTY_SIZE_SCALING[Math.max(1, Math.min(5, Math.floor(partySize)))] ?? PARTY_SIZE_SCALING[5]
}

export function scaleEnemyDefinition(definition: EnemyDefinition, partySize: number, floorNumber: number = 1): EnemyDefinition {
  const scaling = partyScaling(partySize)
  const floor = Math.max(1, Math.min(3, Math.floor(floorNumber))) as 1 | 2 | 3
  const modifier = partySize <= 2 ? LOW_PARTY_FLOOR_MODIFIERS[partySize as 1 | 2][floor] : { hp: 1, attack: 1 }
  return { ...definition, maxHP: Math.round(definition.maxHP * scaling.hp * modifier.hp), attack: Math.round(definition.attack * scaling.attack * modifier.attack) }
}

export function createFirstRiftEnemy(floorNumber: number, encounterIndex: number, partySize: number): Enemy {
  const definition = scaleEnemyDefinition(floorEncounters(floorNumber)[encounterIndex], partySize, floorNumber)
  return {
    id: `enemy-${floorNumber}-${encounterIndex}`, definitionId: definition.id, name: definition.name,
    kind: definition.type === 'NORMAL' ? 'mob' : definition.type === 'ELITE' ? 'elite' : 'boss', level: definition.level,
    attack: definition.attack, maxHP: definition.maxHP, currentHP: definition.maxHP, attackCount: 0,
    attackZoneWeights: definition.attackZoneWeights, defenseZoneWeights: definition.defenseZoneWeights,
    targeting: definition.targeting, bossPattern: definition.bossPattern,
  }
}
