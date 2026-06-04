import { getDisplayEnemyName } from '../../../utils/displayHelpers';

const HERO_LABEL = 'Р’Рё';

export function translateCombatLogEntry(
  entry: string,
  heroName: string,
  enemyName: string,
  enemyId: string,
): string {
  return entry
    .replace(new RegExp(heroName, 'g'), HERO_LABEL)
    .replace(new RegExp(enemyName, 'g'), getDisplayEnemyName(enemyId))
    .replace(/attacks/i, 'Р°С‚Р°РєСѓС”С‚Рµ')
    .replace(/deals/i, 'Р·Р°РІРґР°СЋС‡Рё')
    .replace(/damage/i, 'С€РєРѕРґРё')
    .replace(/critical hit/i, 'РљР РРўРР§РќРР™ РЈР”РђР ')
    .replace(/dodges/i, 'СѓС…РёР»СЏС”С‚СЊСЃСЏ')
    .replace(/misses/i, 'РїСЂРѕРјР°С…СѓС”С‚СЊСЃСЏ');
}

export function prependCombatLogEntries(
  previous: string[],
  entries: string[],
  maxEntries: number,
): string[] {
  return [...entries, ...previous].slice(0, maxEntries);
}
