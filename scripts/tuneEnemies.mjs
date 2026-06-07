import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const enemiesPath = path.join(repoRoot, 'src', 'data', 'generated', 'enemies.json');
const enemies = JSON.parse(fs.readFileSync(enemiesPath, 'utf8'));

let tunedCount = 0;

for (const enemy of enemies) {
  // Skip LOC_001 enemies or specific non-generic overrides
  if (enemy.location === 'LOC_001' || enemy.id === 'enemy_vael_thorn_rot_hound_001' || enemy.id === 'enemy_vael_blackfang_brigand_001') {
    continue;
  }

  const level = enemy.level ?? 1;
  let mult = 1.0;

  if (level >= 1 && level <= 3) {
    mult = 1.78; // 78% buff
  } else if (level >= 4 && level <= 6) {
    mult = 1.86; // 86% buff
  } else if (level >= 7 && level <= 9) {
    mult = 1.45; // 45% buff
  } else if (level >= 10 && level <= 12) {
    if (enemy.name.includes('Legion') || enemy.name.includes('Gate') || enemy.name.includes('Iron Guard')) {
      mult = 1.95; // Buff Legion to make LOC_005 Lvl 12 harder
    } else {
      mult = 1.35; // Moderate buff for Cultists so LOC_011 Lvl 21 doesn't blow up
    }
  } else if (level >= 13 && level <= 15) {
    mult = 1.35; // 35% buff
  } else if (level >= 16 && level <= 18) {
    mult = 1.25; // 25% buff
  } else if (level >= 19 && level <= 21) {
    if (enemy.name.includes('Legion') || enemy.name.includes('Gate') || enemy.name.includes('Shield')) {
      mult = 1.15; // Buff Legion to keep LOC_010 Lvl 21 OK
    } else {
      mult = 0.90; // Nerf Cultists to make LOC_011 Lvl 21 easier
    }
  } else if (level >= 22 && level <= 24) {
    mult = 0.32; // 68% nerf
  } else if (level >= 25 && level <= 27) {
    mult = 0.15; // Tuned from 0.08 to target 2.5 - 2.8 kills per run in Crimson Quarry
  } else if (level >= 28 && level <= 30) {
    mult = 0.70; // 30% nerf
  }

  // Targeted nerf for War Brutes and Pit Crushers to balance Crimson Quarry and Vaelor's Threshold
  if (enemy.name.includes('War Brute') || enemy.name.includes('Pit Crusher')) {
    mult *= 0.96;
  }

  if (mult !== 1.0) {
    enemy.hp = Math.round(enemy.hp * mult);
    enemy.damageMin = Math.round(enemy.damageMin * mult);
    enemy.damageMax = Math.round(enemy.damageMax * mult);
    enemy.attack = Math.round(enemy.attack * mult);
    if (enemy.defense !== undefined) enemy.defense = Math.round(enemy.defense * mult);
    if (enemy.armor !== undefined) enemy.armor = Math.round(enemy.armor * mult);
    tunedCount++;
  }
}

fs.writeFileSync(enemiesPath, JSON.stringify(enemies, null, 2), 'utf8');
console.log(`Tuned ${tunedCount} enemies in enemies.json`);
