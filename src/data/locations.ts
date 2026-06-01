import rawData from './generated/locations.json';
import type { Location } from '../game/types';

export const locations: Location[] = rawData as Location[];
