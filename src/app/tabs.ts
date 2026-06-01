export type AppTab = 'combat' | 'character' | 'inventory' | 'quests' | 'map' | 'shop';

export const APP_TABS: Array<{ id: AppTab; label: string }> = [
  { id: 'combat', label: 'Полювання' },
  { id: 'character', label: 'Герой' },
  { id: 'inventory', label: 'Інвентар' },
  { id: 'quests', label: 'Завдання' },
  { id: 'map', label: 'Мапа' },
  { id: 'shop', label: 'Ринок' }
];
