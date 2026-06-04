import { enemies } from '../../../data/enemies';
import type { Enemy, Location } from '../../../game/types';
import { scaleEnemyForLocation, rollEliteOrNormal } from '../../../game/formulas/enemyScaling';
import { selectWeightedEnemy } from '../../../game/formulas/spawn';

export function createEncounterEnemy(currentLocation: Location): Enemy {
  const enemyPool =
    currentLocation?.enemies && currentLocation.enemies.length > 0
      ? currentLocation.enemies
      : [];

  if (enemyPool.length === 0) {
    const defaultEnemy =
      enemies[0] ||
      ({
        id: 'safe_wolf',
        name: 'Safe Wolf',
        levelRange: [1, 1],
        hp: 50,
        attack: 5,
        defense: 0,
        critChance: 0,
        dodgeChance: 0,
        xp: 10,
        gold: 5,
        location: currentLocation.id,
        lootTable: '',
        behavior: 'normal',
        notes: '',
      } as Enemy);

    return rollEliteOrNormal(scaleEnemyForLocation(defaultEnemy, currentLocation));
  }

  const baseEnemy = selectWeightedEnemy(enemyPool, enemies) || enemies[0];

  return rollEliteOrNormal(scaleEnemyForLocation(baseEnemy, currentLocation));
}

export function buildEncounterStartLog(enemy: Enemy): string {
  const rankLabel =
    enemy.rank === 'elite' ? 'в­ђпёЏ Р•Р›Р†РўРќРР™ Р’РћР РћР“ в­ђпёЏ: ' : '';

  return `${rankLabel}РџРµСЂРµРґ РІР°РјРё РїРѕСЃС‚Р°С” ${enemy.name} (${enemy.level ?? 1} СЂС–РІРµРЅСЊ).`;
}
