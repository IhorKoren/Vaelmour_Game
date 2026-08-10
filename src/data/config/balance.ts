import type { CharacterClass, ClassDefinition, EncounterDefinition, Zone } from '../../types/game'

export const ROUND_DURATION_SECONDS = 30
export const POTION_HEAL_PERCENT = 0.35
export const POTION_COOLDOWN_ROUNDS = 2
export const DAMAGE_SPREAD = 0.1
export const LEVEL_ATTACK_GAIN = 1
export const LEVEL_HP_GAIN = 5

export const ZONES: Zone[] = ['head', 'body', 'legs']

export const ZONE_LABELS: Record<Zone, string> = {
  head: 'Голова',
  body: 'Корпус',
  legs: 'Ноги',
}

export const CLASSES: Record<CharacterClass, ClassDefinition> = {
  warrior: {
    id: 'warrior', name: 'Воїн', title: 'Warrior', glyph: '⚔', attack: 85, maxHP: 1050,
    description: 'Витривалий боєць передньої лінії.',
  },
  ranger: {
    id: 'ranger', name: 'Слідопит', title: 'Ranger', glyph: '➶', attack: 100, maxHP: 800,
    description: 'Найвища базова сила атаки.',
  },
  blacksmith: {
    id: 'blacksmith', name: 'Коваль', title: 'Blacksmith', glyph: '⚒', attack: 60, maxHP: 1150,
    description: 'Надійний і надзвичайно живучий.',
  },
  alchemist: {
    id: 'alchemist', name: 'Алхімік', title: 'Alchemist', glyph: '⚗', attack: 65, maxHP: 1000,
    description: 'Збалансований дослідник розломів.',
  },
  jeweler: {
    id: 'jeweler', name: 'Ювелір', title: 'Jeweler', glyph: '✦', attack: 70, maxHP: 900,
    description: 'Точний майстер із добрим балансом.',
  },
}

export const ENCOUNTERS: EncounterDefinition[] = [
  { name: 'Сквернолап', kind: 'mob', attack: 58, maxHP: 340, xp: 38, coins: 14, loot: 'Ікло скверни' },
  { name: 'Порожній вартовий', kind: 'mob', attack: 66, maxHP: 430, xp: 46, coins: 19, loot: 'Тьмяний уламок' },
  { name: 'Жнець відлуння', kind: 'mob', attack: 75, maxHP: 540, xp: 58, coins: 27, loot: 'Пил відлуння' },
  { name: 'Морґар, Серце Розлому', kind: 'boss', attack: 92, maxHP: 900, xp: 125, coins: 70, loot: 'Серцевина Морґара' },
]

export const TEAMMATE_NAMES = ['Астрід', 'Келлан', 'Міра', 'Торн']
export const TEAMMATE_CLASSES: CharacterClass[] = ['warrior', 'ranger', 'alchemist', 'blacksmith']
