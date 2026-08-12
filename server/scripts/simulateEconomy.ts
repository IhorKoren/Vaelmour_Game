import { mkdir, writeFile } from 'node:fs/promises'

type Profile = 'casual' | 'active' | 'hardcore' | 'trader' | 'profession-focused'
const profiles: Record<Profile, { runs: number; mint: number; trades: number }> = {
  casual: { runs: 0.7, mint: 42, trades: 0.08 }, active: { runs: 2.2, mint: 49, trades: 0.35 },
  hardcore: { runs: 5.5, mint: 55, trades: 0.7 }, trader: { runs: 1.1, mint: 44, trades: 3.5 },
  'profession-focused': { runs: 1.6, mint: 38, trades: 1.1 },
}
const mix: Profile[] = ['casual', 'casual', 'active', 'active', 'hardcore', 'trader', 'profession-focused']

function random(seed: number) { let state = seed >>> 0; return () => ((state = Math.imul(state ^ state >>> 15, 1 | state)) >>> 0) / 2 ** 32 }
function percentile(values: number[], p: number) { return values[Math.min(values.length - 1, Math.floor(values.length * p))] ?? 0 }
function gini(values: number[]) { const sorted = [...values].sort((a, b) => a - b); const total = sorted.reduce((a, b) => a + b, 0); if (!total) return 0; return sorted.reduce((sum, value, index) => sum + (2 * (index + 1) - sorted.length - 1) * value, 0) / (sorted.length * total) }

function simulate(population: number, days: number) {
  const rng = random(8_200_000 + population * 97 + days)
  const players = Array.from({ length: population }, (_, index) => ({ profile: mix[index % mix.length], wallet: 0 }))
  let minted = 0, burned = 0, trades = 0, guildBurn = 0
  for (let day = 0; day < days; day += 1) for (const player of players) {
    const model = profiles[player.profile]
    const dailyMint = Math.max(0, Math.round(model.runs * model.mint * (0.75 + rng() * 0.5)))
    player.wallet += dailyMint; minted += dailyMint
    const dailyTrades = Math.floor(model.trades + rng())
    for (let n = 0; n < dailyTrades; n += 1) {
      const value = Math.min(player.wallet, 10 + Math.floor(rng() * 90)); if (!value) continue
      const recipient = players[Math.floor(rng() * players.length)]
      if (recipient === player) continue
      const fee = Math.max(1, Math.floor(value * 0.02)); player.wallet -= value; recipient.wallet += value - fee; burned += fee; trades += 1
    }
    if (day === 6 && rng() < 0.025 && player.wallet >= 500) { player.wallet -= 500; burned += 500; guildBurn += 500 }
  }
  const wallets = players.map((player) => player.wallet).sort((a, b) => a - b)
  return { population, days, minted, burned, net: minted - burned, inflation: minted ? (minted - burned) / minted : 0, median: percentile(wallets, 0.5), p90: percentile(wallets, 0.9), gini: gini(wallets), velocity: trades / Math.max(1, population * days), feeBurn: burned - guildBurn, guildBurn, coinsPerPlayerDay: (minted - burned) / population / days }
}

const results = [10, 100, 1_000].flatMap((population) => [1, 7, 30, 90].map((days) => simulate(population, days)))
const rows = results.map((r) => `| ${r.population.toLocaleString()} | ${r.days} | ${r.minted.toLocaleString()} | ${r.burned.toLocaleString()} | ${r.net.toLocaleString()} | ${(r.inflation * 100).toFixed(1)}% | ${r.median} | ${r.p90} | ${r.gini.toFixed(3)} | ${r.velocity.toFixed(2)} | ${r.feeBurn} | ${r.guildBurn} | ${r.coinsPerPlayerDay.toFixed(1)} |`).join('\n')
const report = `# Phase 8.2 Economy Supply Model\n\nDeterministic macro model; it does not change production values. Paid slots and direct trades are modeled as transfers, not sinks. Inputs cover casual, active, hardcore, trader, and profession-focused profiles.\n\n| Population | Day | Minted | Burned | Net | Net inflation / minted | Median wallet | P90 wallet | Gini | Market tx/player/day | Fee burn | Guild burn | Net coins/player/day |\n|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n${rows}\n\n## Recommendation\n\nThe current repeatable Rift source dominates recurring fees in this model. Do not auto-tune rewards from this synthetic result. Validate real staging telemetry first, then consider durable recurring sinks (repair/maintenance, listing renewal, cosmetic services) with explicit player-value analysis. Paid party slots and player trades must never be counted as burns.\n`
await mkdir('reports', { recursive: true })
await writeFile('reports/economy-supply-report.md', report, 'utf8')
console.log('Generated reports/economy-supply-report.md')
