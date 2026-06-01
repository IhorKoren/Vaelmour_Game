import rawData from './generated/shields.json';
import type { Shield } from '../game/types';

export type ShieldDefinition = {
  id: string;
  name: string;
  category: 'shield';
  rarity: Shield['rarity'];
  tier: number;
  description: string;
  defense: number;
  blockChance: number;
  blockValue: number;
  armor: number;
  maxHealth: number;
  staggerResist: number;
  sourceSheet?: string;
};

export const shields: ShieldDefinition[] = rawData as ShieldDefinition[];
