import rawData from './generated/skills.json';
import type { Skill } from '../game/types';

export const skills: Skill[] = rawData as Skill[];
