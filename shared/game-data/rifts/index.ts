import { FIRST_RIFT_BOSSES } from '../bosses/firstRiftBosses'
import { FIRST_RIFT_ENEMIES } from '../enemies/firstRiftEnemies'
import { FIRST_RIFT } from './firstRift'

export const ENEMY_CATALOG = { ...FIRST_RIFT_ENEMIES, ...FIRST_RIFT_BOSSES }
export const RIFT_CATALOG = { [FIRST_RIFT.id]: FIRST_RIFT }

export function floorEncounters(floorNumber: number) {
  const floor = FIRST_RIFT.floors.find((value) => value.floorNumber === floorNumber)
  if (!floor) throw new Error(`Unknown First Rift floor ${floorNumber}`)
  return [...floor.encounterEnemyIds, floor.bossId].map((id) => ENEMY_CATALOG[id])
}
