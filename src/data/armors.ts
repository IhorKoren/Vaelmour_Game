import rawData from './generated/armors.json';
import type { Armor } from '../game/types';

export const armors: Armor[] = rawData as Armor[];
