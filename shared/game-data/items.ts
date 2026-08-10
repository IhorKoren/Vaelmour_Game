import type { ItemDefinition } from './types'
import { RESOURCES } from './resources'

const equipment: ItemDefinition[] = [
  { id: 'starter_warrior_weapon', name: 'Надщерблений меч', category: 'equipment', icon: '⚔', stackable: false, equipType: 'weapon', allowedClass: 'warrior', attack: 2 },
  { id: 'starter_warrior_chest', name: 'Потертий нагрудник', category: 'equipment', icon: '▣', stackable: false, equipType: 'chest', allowedClass: 'warrior', hp: 15 },
  { id: 'starter_ranger_weapon', name: 'Дорожній лук', category: 'equipment', icon: '➶', stackable: false, equipType: 'weapon', allowedClass: 'ranger', attack: 2 },
  { id: 'starter_ranger_chest', name: 'Шкіряна куртка', category: 'equipment', icon: '▣', stackable: false, equipType: 'chest', allowedClass: 'ranger', hp: 12 },
  { id: 'starter_blacksmith_weapon', name: 'Робочий молот', category: 'equipment', icon: '⚒', stackable: false, equipType: 'weapon', allowedClass: 'blacksmith', attack: 1 },
  { id: 'starter_blacksmith_chest', name: 'Шкіряний фартух', category: 'equipment', icon: '▣', stackable: false, equipType: 'chest', allowedClass: 'blacksmith', hp: 18 },
  { id: 'starter_alchemist_weapon', name: 'Скляний жезл', category: 'equipment', icon: '⚗', stackable: false, equipType: 'weapon', allowedClass: 'alchemist', attack: 1 },
  { id: 'starter_alchemist_chest', name: 'Просочений плащ', category: 'equipment', icon: '▣', stackable: false, equipType: 'chest', allowedClass: 'alchemist', hp: 15 },
  { id: 'starter_jeweler_weapon', name: 'Точне зубило', category: 'equipment', icon: '✦', stackable: false, equipType: 'weapon', allowedClass: 'jeweler', attack: 1 },
  { id: 'starter_jeweler_chest', name: 'Майстерний камзол', category: 'equipment', icon: '▣', stackable: false, equipType: 'chest', allowedClass: 'jeweler', hp: 12 },
  { id: 'forged_warrior_weapon', name: 'Меч із Заліза Розлому', category: 'equipment', icon: '⚔', stackable: false, equipType: 'weapon', allowedClass: 'warrior', attack: 8 },
  { id: 'forged_warrior_chest', name: 'Темний нагрудник', category: 'equipment', icon: '▣', stackable: false, equipType: 'chest', allowedClass: 'warrior', hp: 45 },
  { id: 'forged_ranger_weapon', name: 'Лук Відлуння', category: 'equipment', icon: '➶', stackable: false, equipType: 'weapon', allowedClass: 'ranger', attack: 9 },
  { id: 'forged_ranger_chest', name: 'Панцир слідопита', category: 'equipment', icon: '▣', stackable: false, equipType: 'chest', allowedClass: 'ranger', hp: 35 },
  { id: 'forged_blacksmith_weapon', name: 'Молот ядра', category: 'equipment', icon: '⚒', stackable: false, equipType: 'weapon', allowedClass: 'blacksmith', attack: 6, hp: 10 },
  { id: 'forged_blacksmith_chest', name: 'Фартух коваля Розлому', category: 'equipment', icon: '▣', stackable: false, equipType: 'chest', allowedClass: 'blacksmith', hp: 55 },
  { id: 'crafted_alchemist_weapon', name: 'Жезл мутації', category: 'equipment', icon: '⚗', stackable: false, equipType: 'weapon', allowedClass: 'alchemist', attack: 7 },
  { id: 'crafted_alchemist_chest', name: 'Мантія есенції', category: 'equipment', icon: '▣', stackable: false, equipType: 'chest', allowedClass: 'alchemist', hp: 40 },
  { id: 'crafted_jeweler_weapon', name: 'Кристалічне зубило', category: 'equipment', icon: '✦', stackable: false, equipType: 'weapon', allowedClass: 'jeweler', attack: 7 },
  { id: 'crafted_jeweler_chest', name: 'Камзол гранувальника', category: 'equipment', icon: '▣', stackable: false, equipType: 'chest', allowedClass: 'jeweler', hp: 35 },
  { id: 'attack_ring', name: 'Перстень гострого відлуння', category: 'jewelry', icon: '○', stackable: false, equipType: 'ring', attack: 4 },
  { id: 'hp_ring', name: 'Перстень живого каменю', category: 'jewelry', icon: '○', stackable: false, equipType: 'ring', hp: 30 },
  { id: 'balanced_amulet', name: 'Амулет рівноваги', category: 'jewelry', icon: '◇', stackable: false, equipType: 'amulet', attack: 2, hp: 18 },
]

export const HEALING_POTION_ID = 'healing_potion'

const consumables: ItemDefinition[] = [
  { id: HEALING_POTION_ID, name: 'Healing Potion', category: 'consumable', icon: '✣', stackable: true },
]

const resources: ItemDefinition[] = Object.values(RESOURCES).map((resource) => ({
  id: resource.id, name: resource.name, category: 'resource', icon: resource.icon, stackable: true,
}))

export const ITEMS: Record<string, ItemDefinition> = Object.fromEntries([...equipment, ...consumables, ...resources].map((item) => [item.id, item]))
