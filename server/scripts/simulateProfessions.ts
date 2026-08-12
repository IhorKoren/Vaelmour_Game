import { mkdir, writeFile } from 'node:fs/promises'
import { PROFESSION_ACTIVITIES, PROFESSION_MAX_LEVEL, TIER_MASTERY, professionXPRequired } from '../../shared/professions'
import { plannedProfessionReward } from '../professions/ProfessionService'

const durations = [10, 60, 240, 480]
const sample = PROFESSION_ACTIVITIES.filter((activity) => activity.profession === 'blacksmith')
const rows = sample.map((activity) => {
  const rates = durations.map((duration) => plannedProfessionReward(activity, duration, activity.requiredMastery, () => 0.5).quantity / (duration / 60))
  return `| ${activity.tier} | ${activity.role} | ${rates.map((value) => value.toFixed(2)).join(' | ')} |`
}).join('\n')

let masteryHours = 0
for (let level = 1; level < PROFESSION_MAX_LEVEL; level += 1) {
  const tier = ([6, 5, 4, 3, 2, 1] as const).find((value) => level >= TIER_MASTERY[value])!
  masteryHours += professionXPRequired(level) / (30 + tier * 5)
}

const gatheringDaily = ((0.8 * 2) + (1.8 * 2) + 3 + 1.2 + 4) / 7 * 10.5
const riftDaily = ((0.7 * 2) + (2.2 * 2) + 5.5 + 1.1 + 1.6) / 7 * 2.45
const gatheringShare = gatheringDaily / (gatheringDaily + riftDaily)

const report = `# Phase 10 Profession Economy Report

Deterministic profession model using the production yield and mastery formulas. The resource catalog remains the existing 54 resources; no new currency or item family is introduced.

## Yield by tier and role

Resources per hour at the tier's entry mastery and neutral RNG. Columns are 10m, 1h, 4h, and 8h. Integer rounding is visible on short jobs; the configured duration bonus itself is 0%, 1%, 3%, and 5%.

| Tier | Role | 10m | 1h | 4h | 8h |
|---:|---|---:|---:|---:|---:|
${rows}

## Mastery pacing

- Level range: 1–60; XP is awarded only when a completed job is collected.
- XP-to-next-level: \`50 + level × 10\`.
- A continuous optimal-tier path from mastery 1 to 60 is approximately **${masteryHours.toFixed(1)} hours** (${(masteryHours / 24).toFixed(1)} days). This intentionally avoids both same-day completion and multi-year pacing.
- Unlock thresholds: Tier I/II/III/IV/V/VI at mastery 1/10/20/30/40/50, with the separate Rift-floor gates enforced by the server.

## Gathering versus Rift supply

The extended mixed-player economy model estimates **${(gatheringShare * 100).toFixed(1)}% gathering / ${((1 - gatheringShare) * 100).toFixed(1)}% Rift** profession-resource supply. Assumptions: 10.5 blended gathering resources/hour and 2.45 profession resources/Rift run across the existing casual, active, hardcore, trader, and profession-focused profile mix.

Verdict: the result is inside the 70–90% gathering / 10–30% PvE guideline. Gathering is the primary source while existing Rift drops remain relevant. Recalibrate only after comparing these synthetic assumptions with telemetry.
`

await mkdir('reports', { recursive: true })
await writeFile('reports/phase10-profession-economy-report.md', report, 'utf8')
console.log(`Generated reports/phase10-profession-economy-report.md (${PROFESSION_ACTIVITIES.length} activities, ${(gatheringShare * 100).toFixed(1)}% gathering share)`)
