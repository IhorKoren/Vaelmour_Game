import rawData from './generated/enemies.json';
import type { Enemy } from '../game/types';

export const enemies: Enemy[] = rawData as Enemy[];
