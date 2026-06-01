import rawData from './generated/materials.json';
import type { Material } from '../game/types';

export const materials: Material[] = rawData as Material[];
