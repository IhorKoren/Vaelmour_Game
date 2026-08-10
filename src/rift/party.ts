import { CLASSES, TEAMMATE_CLASSES, TEAMMATE_NAMES } from '../data/config/balance'
import type { Character } from '../types/game'

export function createMockParty(player: Character): Character[] {
  const teammates = TEAMMATE_NAMES.map((name, index) => {
    const classId = TEAMMATE_CLASSES[index]
    const config = CLASSES[classId]
    return {
      id: `mock-${index + 1}`,
      name,
      classId,
      level: 1,
      currentXP: 0,
      attack: config.attack,
      maxHP: config.maxHP,
      currentHP: config.maxHP,
      alive: true,
      ready: false,
    }
  })
  return [{ ...player, currentHP: player.maxHP, alive: true, ready: false }, ...teammates]
}
