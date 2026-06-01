import rawData from './generated/weapons.json';
import type { Weapon } from '../game/types';

export const weapons: Weapon[] = rawData as Weapon[];
