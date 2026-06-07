import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

// Load generated data using helper
function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function readTsConstArray(relativePath, exportName) {
  const source = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
  // Since equipmentCatalog is built dynamically using flatMap/map (not a literal array [ ... ]), we can evaluate it if we import it or evaluate the file context.
  // Better yet, let's look for SLOT_CONFIGS and EQUIPMENT_LEVELS in the source and evaluate the SLOT_CONFIGS, or evaluate the module in a simple VM context/eval.
  // Or we can dynamically import the TS file using a bundler/ts-node equivalent, but we don't have tsx/ts-node. Let's just execute a regex to evaluate SLOT_CONFIGS and construct it, or use Vite generated files/json files!
  // Wait, src/data/generated/weapons.json, armors.json, shields.json, rings.json, amulets.json, minorArmor.json already contain the final compiled equipment catalog items!
  // Let's use the pre-generated JSON files instead. This is extremely robust and avoids parsing TS completely.
  return [];
}

const generatedWeapons = readJson('src/data/generated/weapons.json');
const generatedArmors = readJson('src/data/generated/armors.json');
const generatedShields = readJson('src/data/generated/shields.json');
const generatedRings = readJson('src/data/generated/rings.json');
const generatedAmulets = readJson('src/data/generated/amulets.json');
const generatedMinorArmor = readJson('src/data/generated/minorArmor.json');

// Reconstruct a unified equipment list
const equipmentCatalogItems = [
  ...generatedWeapons.map(w => ({ ...w, slot: 'weapon' })),
  ...generatedShields.map(s => ({ ...s, slot: 'shield' })),
  ...generatedArmors.map(a => ({ ...a, slot: 'chest' })), // armors.json corresponds to chest slot
  ...generatedMinorArmor.map(m => ({ ...m, slot: m.category })), // head, hands, legs, feet category
  ...generatedRings.map(r => ({ ...r, slot: 'ring' })),
  ...generatedAmulets.map(am => ({ ...am, slot: 'amulet' }))
].map(item => {
  // Map fields to match template structure expected by simulator:
  return {
    id: item.id,
    level: item.level,
    rarity: item.rarity || 'common',
    slot: item.slot,
    stats: {
      minDamage: item.minDamage,
      maxDamage: item.maxDamage,
      armor: item.armor ?? item.defense,
      accuracy: item.accuracy,
      dodgeChance: item.dodgeChance ?? item.dodgeBonus,
      blockChance: item.blockChance,
      blockPower: item.blockValue ?? item.blockPower,
      maxHp: item.maxHp ?? item.maxHealth,
      healthRegen: item.healthRegen
    }
  };
});

// Data loaders
const enemies = readJson('src/data/generated/enemies.json');
const locations = readJson('src/data/generated/locations.json');
const spawnPools = readJson('src/data/generated/spawnPools.json');
const equipmentCatalog = readTsConstArray('src/data/equipmentCatalog.ts', 'equipmentCatalog');

// Replicate formulas or import them if simple
// Since formulas import armors/weapons/shields/items statically, importing them in a Node environment might fail if they require Vite resolve aliases.
// We will write a pure JS implementation of Vaelmour derived stats and combat math to ensure perfect isolation and zero TS import path issues.

const BASE_CRIT_CHANCE = 0.05;
const BASE_DODGE_CHANCE = 0.05;
const BASE_ACCURACY = 0.85;

const CRIT_SOFT_CAP = 0.25;
const CRIT_HARD_CAP = 0.4;
const DODGE_CAP = 0.35;
const BLOCK_CAP = 0.45;
const ARMOR_PEN_CAP = 0.6;
const DAMAGE_REDUCTION_CAP = 0.65;
const MIN_HIT_CHANCE = 0.65;
const MAX_HIT_CHANCE = 0.98;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function applySoftCap(value, softCap, hardCap) {
  if (value <= softCap) return value;
  return Math.min(hardCap, softCap + (value - softCap) * 0.5);
}

function getArmorDamageReduction(armor, attackerLevel) {
  const reduction = armor / (armor + Math.max(1, attackerLevel) * 50);
  return clamp(reduction, 0, DAMAGE_REDUCTION_CAP);
}

// Calculate base attributes from hero level
function getHeroAttributesAtLevel(level) {
  // By level 1, hero has base 10/10/10 stats.
  // Each level up gives 3 attribute points. Let's distribute them:
  // We'll distribute them evenly: 1 Strength, 1 Agility, 1 Vitality per level.
  const extraPoints = (level - 1) * 3;
  const agilityShare = Math.floor(extraPoints / 3);
  const vitalityShare = Math.floor((extraPoints - agilityShare) / 2);
  const strengthShare = extraPoints - agilityShare - vitalityShare;

  return {
    strength: 10 + strengthShare,
    agility: 10 + agilityShare,
    vitality: 10 + vitalityShare
  };
}

// Build hero profile
function buildHeroProfile(level) {
  const stats = getHeroAttributesAtLevel(level);
  const baseHp = 100 + level * 10 + stats.vitality * 5;

  // Let's equip hero with matching tier gear from equipmentCatalog
  // Gear tier equals level for tiers: 1, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30.
  // Level 1 gear for Level 1, Level 3 gear for Level 3, etc.
  const matchingTierLevel = level;

  // Filter common equipment of matching level
  const itemsOfTier = equipmentCatalogItems.filter(
    (item) => item.level === matchingTierLevel && item.rarity === 'common'
  );

  const equipment = {
    weapon: itemsOfTier.find((item) => item.slot === 'weapon') || null,
    shield: itemsOfTier.find((item) => item.slot === 'shield') || null,
    head: itemsOfTier.find((item) => item.slot === 'head') || null,
    chest: itemsOfTier.find((item) => item.slot === 'chest') || null,
    hands: itemsOfTier.find((item) => item.slot === 'hands') || null,
    legs: itemsOfTier.find((item) => item.slot === 'legs') || null,
    feet: itemsOfTier.find((item) => item.slot === 'feet') || null,
    ring1: itemsOfTier.find((item) => item.slot === 'ring') || null,
    ring2: itemsOfTier.find((item) => item.slot === 'ring') || null,
    amulet: itemsOfTier.find((item) => item.slot === 'amulet') || null
  };

  // Compute derived stats
  let totalAccuracy = 0;
  let totalCritChance = 0;
  let totalDodgeBonus = 0;
  let totalHpBonus = 0;
  let totalRegen = 0;
  let totalFlatMaxHealth = 0;
  let totalArmor = 0;
  let totalBlockChance = 0;
  let totalBlockValue = 0;

  const equippedSlots = ['weapon', 'shield', 'head', 'chest', 'hands', 'legs', 'feet', 'ring1', 'ring2', 'amulet'];
  for (const slot of equippedSlots) {
    const item = equipment[slot];
    if (!item) continue;
    
    const statsCar = item.stats || {};
    totalAccuracy += statsCar.accuracy ?? 0;
    totalCritChance += statsCar.critChance ?? 0;
    totalDodgeBonus += (statsCar.dodgeChance ?? 0) + (statsCar.dodgeBonus ?? 0);
    totalHpBonus += statsCar.hpBonus ?? 0;
    totalRegen += statsCar.healthRegen ?? 0;
    totalFlatMaxHealth += statsCar.maxHp ?? statsCar.maxHealth ?? 0;
    totalArmor += statsCar.armor ?? 0;
    totalBlockChance += statsCar.blockChance ?? 0;
    totalBlockValue += statsCar.blockPower ?? statsCar.blockValue ?? 0;
  }

  const hpFromVitality = stats.vitality * 5;
  const flatHp = baseHp + hpFromVitality + totalFlatMaxHealth;
  const maxHp = Math.round(flatHp * (1 + totalHpBonus));
  const healthRegenFromVitality = Math.floor(stats.vitality / 5);
  const healthRegen = Math.max(0, healthRegenFromVitality + Math.round(totalRegen));

  const derived = {
    maxHp,
    attackPower: stats.strength * 2,
    critChance: clamp(BASE_CRIT_CHANCE + stats.agility * 0.003 + totalCritChance, 0, 0.35),
    dodgeChance: clamp(BASE_DODGE_CHANCE + stats.agility * 0.002 + totalDodgeBonus, 0, 0.25),
    accuracy: clamp(BASE_ACCURACY + stats.agility * 0.0015 + totalAccuracy, 0.6, 0.98),
    healthRegen,
    defense: totalArmor,
    blockChance: clamp(totalBlockChance, 0, 0.45),
    blockValue: totalBlockValue
  };

  // Default skills
  // Level 1-3 uses base strike. We'll simulate regular auto-attacks using standard sword skill or 1.1x multiplier.
  // Standard weapon stats
  const weapon = equipment.weapon ? {
    minDamage: equipment.weapon.stats.minDamage ?? 1,
    maxDamage: equipment.weapon.stats.maxDamage ?? 2
  } : { minDamage: 1, maxDamage: 2 };

  return {
    level,
    stats,
    derived,
    weapon,
    maxHp
  };
}

// Replicate scaleEnemyForLocation
function scaleEnemy(enemy, location, presetLevel) {
  const minLevel = location.levelRange[0] ?? 1;
  const maxLevel = location.levelRange[1] ?? minLevel;
  
  let targetLevel = presetLevel;
  if (targetLevel === undefined) {
    targetLevel = Math.max(minLevel, Math.min(maxLevel, presetLevel ?? minLevel));
  }
  
  targetLevel = Math.max(minLevel, Math.min(maxLevel, targetLevel));
  const baseLevel = enemy.level ?? 1;
  const levelDiff = targetLevel - baseLevel;

  if (levelDiff === 0) {
    return { ...enemy, level: targetLevel };
  }

  const hpFactor = levelDiff > 0 ? (1 + levelDiff * 0.08) : Math.pow(1.12, levelDiff);
  const statFactor = levelDiff > 0 ? (1 + levelDiff * 0.04) : Math.pow(1.08, levelDiff);

  return {
    ...enemy,
    level: targetLevel,
    hp: Math.max(10, Math.round(enemy.hp * hpFactor)),
    attack: Math.max(1, Math.round(enemy.attack * statFactor)),
    defense: Math.max(1, Math.round(enemy.defense * statFactor)),
    armor: enemy.armor !== undefined ? Math.max(0, Math.round(enemy.armor * statFactor)) : enemy.armor,
    damageMin: enemy.damageMin !== undefined ? Math.max(1, Math.round(enemy.damageMin * statFactor)) : enemy.damageMin,
    damageMax: enemy.damageMax !== undefined ? Math.max(2, Math.round(enemy.damageMax * statFactor)) : enemy.damageMax
  };
}

// Combat simulation round-by-round
function simulateCombat(hero, enemy, random = Math.random) {
  let heroHp = hero.maxHp;
  let enemyHp = enemy.hp;

  let rounds = 0;
  let heroDamageDealtTotal = 0;
  let enemyDamageDealtTotal = 0;

  // Simulate fight
  while (heroHp > 0 && enemyHp > 0 && rounds < 100) {
    rounds++;

    // Hero turn
    const hitChance = clamp(hero.derived.accuracy - (enemy.dodgeChance ?? 0), MIN_HIT_CHANCE, MAX_HIT_CHANCE);
    if (random() <= hitChance) {
      const weaponRoll = Math.floor(random() * (hero.weapon.maxDamage - hero.weapon.minDamage + 1)) + hero.weapon.minDamage;
      const rawDamage = weaponRoll + hero.derived.attackPower * 0.25;
      const baseSkillDamage = rawDamage * 1.1; // Quick slash/default attack multiplier 1.1
      const enemyArmor = Number(enemy.armor ?? enemy.defense ?? 0);
      const armorReduction = getArmorDamageReduction(enemyArmor, enemy.level ?? 1);
      const mitigatedDamage = Math.max(1, Math.round(baseSkillDamage * (1 - armorReduction)));
      
      const critChance = applySoftCap(hero.derived.critChance, CRIT_SOFT_CAP, CRIT_HARD_CAP);
      const crit = random() < critChance;
      const critMultiplier = crit ? 1.5 : 1;
      const finalDamage = Math.max(1, Math.round(mitigatedDamage * critMultiplier));

      enemyHp -= finalDamage;
      heroDamageDealtTotal += finalDamage;
    }

    if (enemyHp <= 0) break;

    // Enemy turn
    const dodgeChance = clamp(hero.derived.dodgeChance, 0, DODGE_CAP);
    const enemyHitChance = clamp(1 - dodgeChance, MIN_HIT_CHANCE, MAX_HIT_CHANCE);
    if (random() <= enemyHitChance) {
      const armorReduction = getArmorDamageReduction(hero.derived.defense, enemy.level ?? 1);
      const enemyDamageBase = enemy.damageMin !== undefined && enemy.damageMax !== undefined
        ? Math.floor(random() * (enemy.damageMax - enemy.damageMin + 1)) + enemy.damageMin
        : enemy.attack;
      const mitigatedDamage = Math.max(1, Math.round(enemyDamageBase * (1 - armorReduction)));

      const crit = random() < (enemy.critChance ?? 0);
      const critMultiplier = crit ? 1.5 : 1;
      let finalDamage = Math.max(1, Math.round(mitigatedDamage * critMultiplier));

      // Block check
      const blockChance = clamp(hero.derived.blockChance, 0, BLOCK_CAP);
      if (blockChance > 0 && random() < blockChance) {
        finalDamage = Math.max(1, finalDamage - Math.round(hero.derived.blockValue));
      }

      heroHp -= finalDamage;
      enemyDamageDealtTotal += finalDamage;
    }
  }

  return {
    heroWon: heroHp > 0,
    heroHpRemaining: Math.max(0, heroHp),
    enemyDamageDealtTotal,
    rounds
  };
}

// Seeded random number generator (LCG)
function createSeededRandom(seed) {
  let state = seed;
  return function() {
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);
    state = (a * state + c) % m;
    return state / m;
  };
}

// Explicit location to tier level mapping (Only primary target progression levels)
const LOCATION_TIERS = [
  { locationId: 'LOC_001', heroLevel: 3, label: 'LOC_001 (1-3) vs Lvl 3' },
  { locationId: 'LOC_002', heroLevel: 3, label: 'LOC_002 (3-6) vs Lvl 3' },
  { locationId: 'LOC_003', heroLevel: 6, label: 'LOC_003 (5-8) vs Lvl 6' },
  { locationId: 'LOC_004', heroLevel: 9, label: 'LOC_004 (7-10) vs Lvl 9' },
  { locationId: 'LOC_005', heroLevel: 9, label: 'LOC_005 (9-12) vs Lvl 9' },
  { locationId: 'LOC_005', heroLevel: 12, label: 'LOC_005 (9-12) vs Lvl 12' },
  { locationId: 'LOC_006', heroLevel: 12, label: 'LOC_006 (11-14) vs Lvl 12' },
  { locationId: 'LOC_007', heroLevel: 15, label: 'LOC_007 (13-16) vs Lvl 15' },
  { locationId: 'LOC_008', heroLevel: 18, label: 'LOC_008 (15-18) vs Lvl 18' },
  { locationId: 'LOC_009', heroLevel: 18, label: 'LOC_009 (17-20) vs Lvl 18' },
  { locationId: 'LOC_010', heroLevel: 21, label: 'LOC_010 (19-22) vs Lvl 21' },
  { locationId: 'LOC_011', heroLevel: 21, label: 'LOC_011 (21-24) vs Lvl 21' },
  { locationId: 'LOC_011', heroLevel: 24, label: 'LOC_011 (21-24) vs Lvl 24' },
  { locationId: 'LOC_012', heroLevel: 24, label: 'LOC_012 (23-26) vs Lvl 24' },
  { locationId: 'LOC_013', heroLevel: 27, label: 'LOC_013 (25-28) vs Lvl 27' },
  { locationId: 'LOC_014', heroLevel: 30, label: 'LOC_014 (27-30) vs Lvl 30' }
];


function runAudit() {
  const reports = [];

  for (const mapping of LOCATION_TIERS) {
    const loc = locations.find((l) => l.id === mapping.locationId);
    if (!loc) continue;

    const hero = buildHeroProfile(mapping.heroLevel);

    // Resolve enemies for this location.
    // normal location enemies from the spawn pools
    const locSpawnPool = spawnPools.filter((sp) => sp.location_id === mapping.locationId && sp.archetype !== 'Elite');
    const normalEnemyNames = new Set(locSpawnPool.map((sp) => sp.enemy_name));
    
    // Find matching enemies in database
    const normalEnemies = enemies.filter((e) => {
      // Direct location check or spawn pool name match
      return e.location === loc.id || normalEnemyNames.has(e.name);
    });

    if (normalEnemies.length === 0) continue;

    // Simulate runs
    const numRuns = 1000;
    const killsPerRunModeA = [];
    const killsPerRunModeB = [];
    
    let totalNormalEnemyDmg = 0;
    let totalNormalEnemyFightTime = 0;
    let normalFightCount = 0;

    // We'll also identify outlier enemies: compile stats per enemy type
    const statsByEnemy = {};

    // Mode A seeded RNG
    const randomA = createSeededRandom(12345);

    for (let run = 0; run < numRuns; run++) {
      // MODE A: No between-fight regen
      let heroHpA = hero.maxHp;
      let killsA = 0;
      while (heroHpA > 0 && killsA < 20) {
        // Spawn a random normal enemy from the pool
        const baseEnemy = normalEnemies[Math.floor(randomA() * normalEnemies.length)];
        // Scale enemy to a level in the location levelRange
        const presetLevel = Math.floor(randomA() * (loc.levelRange[1] - loc.levelRange[0] + 1)) + loc.levelRange[0];
        const scaled = scaleEnemy(baseEnemy, loc, presetLevel);

        // Run combat round simulation
        const sim = simulateCombat({ ...hero, maxHp: heroHpA }, scaled, randomA);
        if (sim.heroWon) {
          killsA++;
          heroHpA = sim.heroHpRemaining;
          
          totalNormalEnemyDmg += sim.enemyDamageDealtTotal;
          totalNormalEnemyFightTime += sim.rounds;
          normalFightCount++;

          if (!statsByEnemy[baseEnemy.id]) {
            statsByEnemy[baseEnemy.id] = { name: baseEnemy.name, hp: baseEnemy.hp, attack: baseEnemy.attack, defense: baseEnemy.defense, runs: 0, heroDamageTaken: 0, rounds: 0 };
          }
          statsByEnemy[baseEnemy.id].runs++;
          statsByEnemy[baseEnemy.id].heroDamageTaken += sim.enemyDamageDealtTotal;
          statsByEnemy[baseEnemy.id].rounds += sim.rounds;
        } else {
          break;
        }
      }
      killsPerRunModeA.push(killsA);
    }

    // Mode B seeded RNG (reset to same seed 12345)
    const randomB = createSeededRandom(12345);

    for (let run = 0; run < numRuns; run++) {
      // MODE B: Real / regen comparison
      let heroHpB = hero.maxHp;
      let killsB = 0;
      while (heroHpB > 0 && killsB < 20) {
        const baseEnemy = normalEnemies[Math.floor(randomB() * normalEnemies.length)];
        const presetLevel = Math.floor(randomB() * (loc.levelRange[1] - loc.levelRange[0] + 1)) + loc.levelRange[0];
        const scaled = scaleEnemy(baseEnemy, loc, presetLevel);

        const sim = simulateCombat({ ...hero, maxHp: heroHpB }, scaled, randomB);
        if (sim.heroWon) {
          killsB++;
          // Apply regeneration based on rounds spent in fight
          // Real-game regen rules: healthRegen ticks every few seconds. In turn simulation, let's assume 1 regen tick per 2 rounds.
          const regenerated = Math.floor(sim.rounds / 2) * hero.derived.healthRegen;
          heroHpB = Math.min(hero.maxHp, sim.heroHpRemaining + regenerated);
        } else {
          break;
        }
      }
      killsPerRunModeB.push(killsB);
    }

    // Sort to find percentiles
    killsPerRunModeA.sort((a, b) => a - b);
    const avgKillsA = (killsPerRunModeA.reduce((sum, v) => sum + v, 0) / numRuns).toFixed(2);
    const medianA = killsPerRunModeA[Math.floor(numRuns * 0.5)];
    const p10A = killsPerRunModeA[Math.floor(numRuns * 0.1)];
    const p90A = killsPerRunModeA[Math.floor(numRuns * 0.9)];

    killsPerRunModeB.sort((a, b) => a - b);
    const avgKillsB = (killsPerRunModeB.reduce((sum, v) => sum + v, 0) / numRuns).toFixed(2);

    const avgDmg = normalFightCount > 0 ? (totalNormalEnemyDmg / normalFightCount).toFixed(1) : 0;
    const avgTtk = normalFightCount > 0 ? (totalNormalEnemyFightTime / normalFightCount).toFixed(1) : 0;

    reports.push({
      locationId: loc.id,
      locationName: loc.name,
      heroLevel: hero.level,
      mappingLabel: mapping.label,
      avgKillsModeA: parseFloat(avgKillsA),
      medianA,
      p10A,
      p90A,
      avgKillsModeB: parseFloat(avgKillsB),
      avgEnemyDamage: parseFloat(avgDmg),
      avgTtk: parseFloat(avgTtk),
      statsByEnemy
    });
  }

  return reports;
}

// Run audit and export report
const reports = runAudit();

let output = `# Vaelmour Enemy Progression Balance Audit Report

## Hero Baseline Stats per Level (Common Gear)
| Level | Max HP | Agility | Strength | Vitality | Attack Power | Defense | Agility Crit | Agility Dodge | Accuracy |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
`;

const levelsToPrint = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30];
for (const lvl of levelsToPrint) {
  const profile = buildHeroProfile(lvl);
  output += `| Level ${lvl} | ${profile.derived.maxHp} | ${profile.stats.agility} | ${profile.stats.strength} | ${profile.stats.vitality} | ${profile.derived.attackPower} | ${profile.derived.defense} | ${(profile.derived.critChance * 100).toFixed(1)}% | ${(profile.derived.dodgeChance * 100).toFixed(1)}% | ${(profile.derived.accuracy * 100).toFixed(1)}% |\n`;
}

output += `
## Location Difficulty & Simulation Results (Mode A vs Mode B)
- **Mode A**: No between-fight regeneration (primary balance benchmark, target: **2.5 - 4.5** kills per run, optimal **3.0 - 4.0**).
- **Mode B**: Real regen comparison (secondary diagnostic only).

| Location | Hero Level | Avg Kills (Mode A) | Avg Kills (Mode B) | Median Kills (A) | 10th% (A) | 90th% (A) | Avg Enemy Dmg | Avg TTK (Rounds) | Status |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
`;

const outliers = [];
for (const rep of reports) {
  let status = 'OK';
  const targetMin = 2.5;
  const targetMax = 4.5;

  if (rep.locationId === 'LOC_001') {
    status = 'LOC_001 (Skip heavy rebalance)';
  } else if (rep.avgKillsModeA < targetMin) {
    status = 'TOO HARD 🚨';
    outliers.push(rep);
  } else if (rep.avgKillsModeA > targetMax) {
    status = 'TOO EASY 🟢';
    outliers.push(rep);
  }

  output += `| ${rep.locationName} | Lvl ${rep.heroLevel} | **${rep.avgKillsModeA}** | ${rep.avgKillsModeB} | ${rep.medianA} | ${rep.p10A} | ${rep.p90A} | ${rep.avgEnemyDamage} | ${rep.avgTtk} | ${status} |\n`;
}

output += `
## Specific Enemy Details & Identified Outliers
Here is the detailed statistics on normal enemies from simulation runs:
`;

for (const rep of reports) {
  output += `\n### ${rep.locationName} (${rep.locationId}) Normal Enemies Details:\n`;
  output += `| Enemy ID | Enemy Name | Base HP | Base Attack | Base Defense | Avg Dmg Dealt | Avg Rounds | Runs Observed |\n`;
  output += `| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |\n`;
  for (const [enemyId, est] of Object.entries(rep.statsByEnemy)) {
    const avgDmg = est.runs > 0 ? (est.heroDamageTaken / est.runs).toFixed(1) : 0;
    const avgRounds = est.runs > 0 ? (est.rounds / est.runs).toFixed(1) : 0;
    output += `| ${enemyId} | ${est.name} | ${est.hp} | ${est.attack} | ${est.defense} | ${avgDmg} | ${avgRounds} | ${est.runs} |\n`;
  }
}

output += `
## Proposed Changes
Based on the initial audit findings, we will adjust the enemy base parameters in Phase B.
`;

console.log(output);

// Save report file
fs.writeFileSync(path.join(repoRoot, 'ENEMY_BALANCE_AUDIT_REPORT.md'), output, 'utf8');
console.log('Saved report: ENEMY_BALANCE_AUDIT_REPORT.md');
