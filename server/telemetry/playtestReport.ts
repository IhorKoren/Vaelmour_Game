export interface ReportEvent {
  type: string
  floor: number | null
  expeditionId: string | null
  playerId: string | null
  payload: unknown
}

const EXPECTED_CLEAR: Record<number, number> = { 1: 81.1, 2: 74.2, 3: 68.3 }
const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const number = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) ? value : 0
const average = (values: number[]): number => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
const percent = (value: number, total: number): string => total ? `${(value / total * 100).toFixed(1)}%` : '—'

export function generatePlaytestReport(events: ReportEvent[], generatedAt = new Date()): string {
  const lines = ['# Playtest Telemetry Report', '', `Generated: ${generatedAt.toISOString()}`, '', 'Gameplay-only telemetry. No Telegram init data, auth/session tokens, private chat text, phone numbers, or IP addresses are included.', '']
  for (const floor of [1, 2, 3]) {
    const floorEvents = events.filter((event) => event.floor === floor)
    const outcomes = floorEvents.filter((event) => ['RIFT_COMPLETED', 'RIFT_FAILED', 'RIFT_EXIT', 'SERVER_INTERRUPTED_RIFT'].includes(event.type))
    const completed = outcomes.filter((event) => event.type === 'RIFT_COMPLETED')
    const failed = outcomes.filter((event) => event.type === 'RIFT_FAILED')
    const exited = outcomes.filter((event) => event.type === 'RIFT_EXIT')
    const interrupted = outcomes.filter((event) => event.type === 'SERVER_INTERRUPTED_RIFT')
    const outcomePayloads = outcomes.map((event) => asRecord(event.payload))
    const starts = floorEvents.filter((event) => event.type === 'RIFT_STARTED').map((event) => asRecord(event.payload))
    const rounds = floorEvents.filter((event) => event.type === 'ROUND_RESOLVED').map((event) => asRecord(event.payload))
    const encountersCompleted = floorEvents.filter((event) => event.type === 'ENCOUNTER_COMPLETED').length
    const potions = floorEvents.filter((event) => event.type === 'POTION_USED').map((event) => asRecord(event.payload))
    const deaths = floorEvents.filter((event) => event.type === 'PLAYER_DIED').length
    const partyPlayers = starts.reduce((sum, payload) => sum + number(payload.partySize), 0)
    const terminalSample = completed.length + failed.length
    const compositions = new Map<string, number>()
    for (const payload of starts) {
      const label = Object.entries(asRecord(payload.composition)).sort().map(([name, count]) => `${name}:${count}`).join(', ') || 'unknown'
      compositions.set(label, (compositions.get(label) ?? 0) + 1)
    }
    lines.push(`## Floor ${floor}`, '', '| Metric | Simulator expected | Real playtest |', '|---|---:|---:|')
    lines.push(`| Runs | — | ${outcomes.length} |`)
    lines.push(`| Clear rate | ${EXPECTED_CLEAR[floor].toFixed(1)}% | ${percent(completed.length, terminalSample)} |`)
    lines.push(`| Exit rate | — | ${percent(exited.length, outcomes.length)} |`)
    lines.push(`| Fail rate | — | ${percent(failed.length, terminalSample)} |`)
    lines.push(`| Server interruptions | — | ${interrupted.length} |`)
    lines.push(`| Average party size | 5.00 balanced reference | ${average(starts.map((payload) => number(payload.partySize))).toFixed(2)} |`)
    lines.push(`| Average level | — | ${average(starts.flatMap((payload) => Array.isArray(payload.playerLevels) ? payload.playerLevels.map(number) : [])).toFixed(2)} |`)
    lines.push(`| Average rounds / encounter | — | ${(encountersCompleted ? rounds.length / encountersCompleted : 0).toFixed(2)} |`)
    lines.push(`| Average run duration | — | ${average(outcomePayloads.map((payload) => number(payload.durationSeconds))).toFixed(1)} sec |`)
    lines.push(`| Potions / run | — | ${(outcomes.length ? potions.length / outcomes.length : 0).toFixed(2)} |`)
    lines.push(`| Deaths / player | — | ${(partyPlayers ? deaths / partyPlayers : 0).toFixed(3)} |`)
    lines.push(`| Auto players / run | — | ${average(outcomePayloads.map((payload) => number(payload.autoPlayers))).toFixed(2)} |`)
    lines.push(`| XP / run | — | ${average(outcomePayloads.map((payload) => number(payload.xp))).toFixed(2)} |`)
    lines.push(`| Coins / run | — | ${average(outcomePayloads.map((payload) => number(payload.coins))).toFixed(2)} |`)
    lines.push(`| Profession resources / run | — | ${average(outcomePayloads.map((payload) => number(payload.professionResources))).toFixed(2)} |`)
    lines.push(`| Recipe drops / run | — | ${average(outcomePayloads.map((payload) => number(payload.recipeDrops))).toFixed(3)} |`, '')
    lines.push('### Round timing / AFK', '')
    lines.push(`- Average resolved round: ${average(rounds.map((payload) => number(payload.durationSeconds))).toFixed(2)} sec.`)
    lines.push(`- Early rounds: ${rounds.filter((payload) => payload.resolvedEarly === true).length}; full 30 sec: ${rounds.filter((payload) => payload.waitedFullTimer === true).length}.`)
    lines.push(`- Manual timeouts: ${rounds.reduce((sum, payload) => sum + number(payload.manualTimeoutCount), 0)}; disconnected timeouts: ${rounds.reduce((sum, payload) => sum + number(payload.disconnectedTimeoutCount), 0)}.`)
    lines.push(`- Potion healing: ${potions.reduce((sum, payload) => sum + number(payload.hpHealed), 0)} HP; overheal: ${potions.reduce((sum, payload) => sum + number(payload.overheal), 0)} HP.`, '')
    lines.push('### Party compositions', '')
    if (compositions.size) for (const [composition, count] of [...compositions].sort((a, b) => b[1] - a[1])) lines.push(`- ${composition}: ${count} run(s).`)
    else lines.push('- No real samples yet.')
    lines.push('', terminalSample < 20 ? '> **Insufficient sample size** — fewer than 20 completed/failed runs; do not treat this comparison as statistically reliable.' : '> Sample threshold reached for directional comparison.', '')
  }
  lines.push('## Privacy and interpretation', '', '- Real data is descriptive only; this command never changes gameplay balance.', '- Recipe duplicate details and resolved attack/defense zones are retained in event payloads for later drill-down.', '- Server interruptions are excluded from clear/fail denominator.', '')
  return `${lines.join('\n')}\n`
}
