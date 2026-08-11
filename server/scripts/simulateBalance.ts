import { mkdir, writeFile } from 'node:fs/promises'
import type { CharacterClass } from '../../src/types/game'
import { PARTY_SIZE_SCALING, PHASE7_BASELINE_RECIPE_DROP_CHANCE, RECIPE_DROP_CHANCE, SIMULATION_BALANCE_CONFIG } from '../../shared/game-data/balance'
import { ATTACK_BUDGET, HP_BUDGET } from '../../shared/game-data/phase7Catalog'
import { simulateScenario, type BehaviorProfile, type GearProfile, type SimulationMetrics } from '../simulation/balanceSimulator'
import { simulateRecipeAcquisition } from '../simulation/recipeAcquisition'

const runs = Math.max(1, Number(process.env.SIMULATION_RUNS ?? 10_000))
const compositions: Record<string, CharacterClass[]> = {
  A_5_COMBAT: ['warrior', 'warrior', 'warrior', 'ranger', 'ranger'],
  B_BALANCED: ['warrior', 'ranger', 'blacksmith', 'alchemist', 'jeweler'],
  C_3_COMBAT_2_PROF: ['warrior', 'ranger', 'ranger', 'alchemist', 'jeweler'],
  D_DUPLICATE_PROF: ['warrior', 'ranger', 'alchemist', 'alchemist', 'blacksmith'],
  E_3_PLAYERS: ['warrior', 'ranger', 'alchemist'],
  F_4_PLAYERS: ['warrior', 'ranger', 'alchemist', 'jeweler'],
  G_5_PLAYERS: ['warrior', 'ranger', 'blacksmith', 'alchemist', 'jeweler'],
}
const labels: Record<string, string> = {
  A_5_COMBAT: '5 combat', B_BALANCED: '5 balanced', C_3_COMBAT_2_PROF: '3 combat + 2 professions',
  D_DUPLICATE_PROF: 'Duplicate profession', E_3_PLAYERS: '3 players', F_4_PLAYERS: '4 players', G_5_PLAYERS: '5 balanced (size comparison)',
}
const gears: GearProfile[] = ['UNDERGEARED', 'RECOMMENDED', 'STRONG']
const behaviors: BehaviorProfile[] = ['BASIC_SMART', 'RANDOM']
const metrics: SimulationMetrics[] = []
for (const [composition, classes] of Object.entries(compositions)) for (const floorNumber of [1, 2, 3]) for (const gear of gears) for (const behavior of behaviors) {
  metrics.push(simulateScenario({ id: composition, floorNumber, classes, gear, behavior, runs, seed: 710_000 + metrics.length * 97 }))
}

const pct = (value: number) => `${(value * 100).toFixed(1)}%`
const num = (value: number) => Number.isFinite(value) ? value.toFixed(2) : '∞'
const find = (id: string, floor: number, gear: GearProfile, behavior: BehaviorProfile) => metrics.find((metric) => metric.scenario.id === id && metric.scenario.floorNumber === floor && metric.scenario.gear === gear && metric.scenario.behavior === behavior)!
const ids = ['E_3_PLAYERS', 'F_4_PLAYERS', 'G_5_PLAYERS', 'A_5_COMBAT', 'D_DUPLICATE_PROF']
const beforeRecommended: Record<string, number[]> = { E_3_PLAYERS: [1, 0, 0], F_4_PLAYERS: [22.4, 6, 1], G_5_PLAYERS: [85, 74, 77.8], A_5_COMBAT: [90.4, 90.9, 91.6], D_DUPLICATE_PROF: [86.9, 76.7, 81] }
const beforeStrong: Record<string, number[]> = { E_3_PLAYERS: [12.7, 14.7, 1.1], F_4_PLAYERS: [71.6, 92, 95], G_5_PLAYERS: [99, 100, 100], A_5_COMBAT: [99.6, 100, 100], D_DUPLICATE_PROF: [99.2, 100, 100] }

function clearTable(gear: 'RECOMMENDED' | 'STRONG') {
  const before = gear === 'RECOMMENDED' ? beforeRecommended : beforeStrong
  return `| Party | Before F1 | After F1 | Before F2 | After F2 | Before F3 | After F3 |\n|---|---:|---:|---:|---:|---:|---:|\n${ids.map((id) => `| ${labels[id]} | ${before[id][0].toFixed(1)}% | ${pct(find(id, 1, gear, 'BASIC_SMART').clearRate)} | ${before[id][1].toFixed(1)}% | ${pct(find(id, 2, gear, 'BASIC_SMART').clearRate)} | ${before[id][2].toFixed(1)}% | ${pct(find(id, 3, gear, 'BASIC_SMART').clearRate)} |`).join('\n')}`
}

const potionRows = [1, 2, 3].map((floor) => {
  const metric = find('B_BALANCED', floor, 'RECOMMENDED', 'BASIC_SMART')
  const before = [7.37, 11.51, 18.60][floor - 1]
  return `| ${floor} | ${before.toFixed(2)} | ${num(metric.averagePotions)} | ${num(metric.averagePotionsPerClear)} | ${num(metric.deathsWithPotionsRemaining)} | ${pct(metric.potionExhaustionFailureRate)} | ${pct(metric.lowValuePotionRate)} |`
}).join('\n')

const economyRows = Object.keys(compositions).flatMap((id) => [1, 2, 3].map((floor) => {
  const metric = find(id, floor, 'RECOMMENDED', 'BASIC_SMART')
  return `| ${labels[id]} | ${floor} | ${num(metric.averageCoins)} | ${num(metric.coinsPerHour)} | ${num(metric.retainedResourcesPerRun)} | ${num(metric.resourcesPerHour)} | ${num(metric.recipesPer100Runs)} | ${num(metric.recipesPerHour)} | ${num(metric.extractionAfterFailure)} |`
})).join('\n')

const autoRows = [1, 2, 3].flatMap((floor) => (['RECOMMENDED', 'STRONG'] as GearProfile[]).map((gear) => {
  const smart = find('B_BALANCED', floor, gear, 'BASIC_SMART')
  const auto = find('B_BALANCED', floor, gear, 'RANDOM')
  return `| ${floor} | ${gear} | ${pct(smart.clearRate)} | ${pct(auto.clearRate)} | ${(100 * (smart.clearRate - auto.clearRate)).toFixed(1)} pp | ${num(smart.manualMinutesPerRun)} | ${num(auto.autoMinutesPerRun)} |`
})).join('\n')

const partySizeRows = ['E_3_PLAYERS', 'F_4_PLAYERS', 'G_5_PLAYERS'].flatMap((id) => [1, 2, 3].map((floor) => {
  const metric = find(id, floor, 'RECOMMENDED', 'BASIC_SMART')
  return `| ${labels[id]} | ${floor} | ${pct(metric.clearRate)} | ${num(metric.averageTotalRounds)} | ${num(metric.manualMinutesPerRun)} | ${num(metric.resourcesPerHour)} | ${num(metric.recipesPerHour)} | ${num(metric.coinsPerHour)} |`
})).join('\n')

const detailedRecipe = [1, 2, 3].flatMap((floor) => simulateRecipeAcquisition(floor, 1_000, 10, 810_000 + floor))
const recipeRows = detailedRecipe.map((metric) => `| ${metric.floorNumber} | ${metric.profession} | ${num(metric.dropsPer100Runs)} | ${num(metric.averageRunsToAny)} | ${num(metric.medianRunsToAny)} | ${num(metric.p90RunsToAny)} | ${num(metric.expectedAfter10Runs)} | ${num(metric.expectedAfter50Runs)} | ${metric.newRecipes} | ${metric.duplicateRecipes} | ${pct(metric.duplicateShare)} |`).join('\n')
const populationRows = [100, 1_000].flatMap((horizon) => [1, 10, 100].flatMap((population) => [1, 2, 3].map((floor) => {
  const result = simulateRecipeAcquisition(floor, horizon, population, 820_000 + horizon + population * 7 + floor)
  return `| ${horizon} | ${population} | ${floor} | ${result.reduce((sum, value) => sum + value.newRecipes, 0)} | ${result.reduce((sum, value) => sum + value.duplicateRecipes, 0)} | ${num(result.reduce((sum, value) => sum + value.dropsPer100Runs, 0))} |`
}))).join('\n')

const report = `# Phase 7.1 Balance Pass — Before / After\n\nGenerated from the production combat engine and production party-size enemy factory. **${runs.toLocaleString()} runs/scenario**, ${metrics.length} combat scenarios. Phase 7 baseline remains in \`reports/balance-report.md\`. RANDOM Auto uses random attack/defense, no potion, no pattern reading, and no hidden bonus.\n\n## Changed centralized values\n\n| Config | Before | After |\n|---|---:|---:|\n| 5-player HP / Attack | 100% / 100% | 100% / 100% |\n| 4-player HP / Attack | 100% / 100% | ${PARTY_SIZE_SCALING[4].hp * 100}% / ${PARTY_SIZE_SCALING[4].attack * 100}% |\n| 3-player HP / Attack | 100% / 100% | ${PARTY_SIZE_SCALING[3].hp * 100}% / ${PARTY_SIZE_SCALING[3].attack * 100}% |\n| BASIC_SMART potion threshold | 42% | tier I ${(SIMULATION_BALANCE_CONFIG.basicSmartPotionThresholdByTier[1] * 100).toFixed(0)}%, tier II/III ${(SIMULATION_BALANCE_CONFIG.basicSmartPotionThresholdByTier[2] * 100).toFixed(0)}% |\n| Coordinated potion users/round | unlimited | ${SIMULATION_BALANCE_CONFIG.basicSmartMaxPotionUsersPerRound} |\n| Gear Attack budget T1/T2/T3 | 10 / 22 / 38 | ${ATTACK_BUDGET[1]} / ${ATTACK_BUDGET[2]} / ${ATTACK_BUDGET[3]} |\n| Gear HP budget T1/T2/T3 | 65 / 145 / 250 | ${HP_BUDGET[1]} / ${HP_BUDGET[2]} / ${HP_BUDGET[3]} |\n| Recipe normal / elite / boss | ${PHASE7_BASELINE_RECIPE_DROP_CHANCE.mob * 100}% / ${PHASE7_BASELINE_RECIPE_DROP_CHANCE.elite * 100}% / ${PHASE7_BASELINE_RECIPE_DROP_CHANCE.boss * 100}% | ${RECIPE_DROP_CHANCE.mob * 100}% / ${RECIPE_DROP_CHANCE.elite * 100}% / ${RECIPE_DROP_CHANCE.boss * 100}% |\n\nEnemy content attack tuning was isolated after the policy/gear passes: Floor scales 4.00/1.95/1.50 → 3.60/1.68/1.08; Floor 2 boss 277→265, Floor 3 boss 297→280. Boss mechanics, group intervals, weights, XP, coins, and loot tables are unchanged.\n\n## Iteration record\n\n1. Party scaling alone moved 3-player to roughly 64/42/17% and 4-player to 79/54/51%, while 5-player stayed unchanged.\n2. A global 10% damage reduction was rejected because it pushed 5-player clears to 94–96% without solving potion exhaustion.\n3. Tier II heal 35→40% was rejected because it pushed Floor 3 clear above 96% while saving only about one potion/run. Final heals remain 25/35/45%.\n4. Potion instrumentation found 0% low-value/overheal uses; coordinated BASIC_SMART policy was used instead of nerfing all enemies.\n5. Gear and consumable tiers were separated in simulation, then equipment budgets were tuned centrally.\n6. Recipe rates were halved only after raw supply confirmed 28–40 recipes/100 baseline runs.\n\n## Clear rates — recommended gear\n\n${clearTable('RECOMMENDED')}\n\n## Clear rates — strong/current-tier gear\n\n${clearTable('STRONG')}\n\n## Potion report — 5-player balanced, recommended\n\n| Floor | Before potions/run | After potions/run | Potions/successful clear | Dead players with potion remaining/run | Exhaustion failures | Low-value uses |\n|---:|---:|---:|---:|---:|---:|---:|\n${potionRows}\n\n## Party-size efficiency\n\n| Party | Floor | Clear | Rounds/run | Manual min/run | Retained resources/hour | Recipes/hour | Coins/hour |\n|---|---:|---:|---:|---:|---:|---:|---:|\n${partySizeRows}\n\n## Manual vs RANDOM Auto\n\n| Floor | Gear | BASIC_SMART clear | Auto clear | Difference | Manual min/run | Auto min/run |\n|---:|---|---:|---:|---:|---:|---:|\n${autoRows}\n\n## Economy after failure retention\n\nFailure runs retain 50%; time from failed runs is included.\n\n| Composition | Floor | Coins/run | Coins/hour | Retained resources/run | Resources/hour | Recipes/100 runs | Recipes/hour | Retained loot value/run |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|\n${economyRows}\n\n## Recipe acquisition — 1,000 completed runs, population 10\n\n| Floor | Profession | Recipes/100 | Avg runs to any | Median | p90 | Expected after 10 | Expected after 50 | New | Duplicate | Duplicate share |\n|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n${recipeRows}\n\n## Recipe population/horizon supply\n\n| Completed runs | Population | Floor | New recipes | Duplicates | Total recipes/100 |\n|---:|---:|---:|---:|---:|---:|\n${populationRows}\n\n## Known remaining issues\n\n- Floor 3 5-player balanced potion use remains above the 10–14 soft target in some seeds; it is reported rather than hidden.\n- Full current-tier 5-combat gear can still exceed the 95–97% soft ceiling on easier Floors 1–2. Floor 3 is the primary strong-gear guardrail.\n- Some 3/4-player floor results may sit just outside soft target bands; reliability and hourly output remain below a full party.\n- Recommended RANDOM Auto on Floor 3 can remain 0%; this is intentional and does not trigger a global difficulty nerf.\n- Recipe duplicate share grows sharply for small mature populations, confirming that market supply should be watched after launch. No pity or NPC price was added.\n`

await mkdir('reports', { recursive: true })
await writeFile('reports/phase7-1-balance-report.md', report, 'utf8')
console.log(`Generated reports/phase7-1-balance-report.md from ${metrics.length * runs} expeditions plus recipe population simulations.`)
