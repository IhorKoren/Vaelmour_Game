import { FIRST_RIFT_BOSSES } from '../bosses/firstRiftBosses'
import { SECOND_RIFT_BOSSES } from '../bosses/secondRiftBosses'
import { FIRST_RIFT_ENEMIES } from '../enemies/firstRiftEnemies'
import { SECOND_RIFT_ENEMIES } from '../enemies/secondRiftEnemies'
import { FIRST_RIFT } from './firstRift'
import { SECOND_RIFT } from './secondRift'
import type { PlayerRiftProgress } from '../types'

export const ENEMY_CATALOG = { ...FIRST_RIFT_ENEMIES, ...FIRST_RIFT_BOSSES, ...SECOND_RIFT_ENEMIES, ...SECOND_RIFT_BOSSES }
export const RIFT_CATALOG = { [FIRST_RIFT.id]: FIRST_RIFT, [SECOND_RIFT.id]: SECOND_RIFT }

export function riftDefinition(riftId: string) { return RIFT_CATALOG[riftId as keyof typeof RIFT_CATALOG] }

export function floorDefinition(riftId: string, floorNumber: number) {
  return riftDefinition(riftId)?.floors.find((value) => value.floorNumber === floorNumber)
}

export function floorEncounters(riftId: string, floorNumber: number): Array<(typeof ENEMY_CATALOG)[keyof typeof ENEMY_CATALOG]>
export function floorEncounters(floorNumber: number): Array<(typeof ENEMY_CATALOG)[keyof typeof ENEMY_CATALOG]>
export function floorEncounters(riftOrFloor: string | number, requestedFloor?: number) {
  const riftId = typeof riftOrFloor === 'string' ? riftOrFloor : 'first_rift'
  const floorNumber = typeof riftOrFloor === 'number' ? riftOrFloor : requestedFloor!
  const floor = floorDefinition(riftId, floorNumber)
  if (!floor) throw new Error(`Unknown Rift floor ${riftId}/${floorNumber}`)
  return [...floor.encounterEnemyIds, floor.bossId].map((id) => ENEMY_CATALOG[id])
}

export function defaultRiftProgress(riftId: string): PlayerRiftProgress {
  return { riftId, highestUnlockedFloor: riftDefinition(riftId)?.unlockRequires ? 0 : 1, highestCompletedFloor: 0, completionCount: {} }
}

export function prerequisiteMet(riftId: string, progress: Record<string, PlayerRiftProgress>): boolean {
  const prerequisite = riftDefinition(riftId)?.unlockRequires
  return !prerequisite || (progress[prerequisite.riftId]?.highestCompletedFloor ?? 0) >= prerequisite.floorNumber
}

export function nextUnlockAfterCompletion(riftId: string, floorNumber: number): { riftId: string; floorNumber: number } {
  const rift = riftDefinition(riftId)
  if (rift && floorNumber < rift.floors.length) return { riftId, floorNumber: floorNumber + 1 }
  const next = Object.values(RIFT_CATALOG).find((candidate) => candidate.unlockRequires?.riftId === riftId && candidate.unlockRequires.floorNumber === floorNumber)
  return next ? { riftId: next.id, floorNumber: 1 } : { riftId, floorNumber }
}
