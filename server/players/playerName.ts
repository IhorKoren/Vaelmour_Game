import type { StoredPlayerProfile } from '../repositories/types'

export function normalizePlayerName(value: string): string {
  return value.trim().normalize('NFKC').toLocaleLowerCase('uk-UA')
}

export function findPlayerByName(players: Iterable<StoredPlayerProfile>, input: string): StoredPlayerProfile | undefined {
  const key = normalizePlayerName(input)
  return [...players].find((candidate) => candidate.nameKey === key)
}
