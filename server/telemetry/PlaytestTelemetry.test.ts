import { afterEach, describe, expect, it } from 'vitest'
import type { DevIdentity, ServerMessage } from '../../shared/protocol'
import { RoomManager } from '../rooms/RoomManager'
import type { ClientPeer } from '../types/room'
import { PlaytestTelemetry, sanitizeTelemetryPayload, type ExpeditionMarker, type TelemetryEvent, type TelemetrySink } from './PlaytestTelemetry'
import { generatePlaytestReport } from './playtestReport'
import type { PrismaClient } from '../generated/prisma/client'

class RecordingTelemetry implements TelemetrySink {
  events: TelemetryEvent[] = []
  markers: ExpeditionMarker[] = []
  finished: string[] = []
  async record(event: TelemetryEvent) { this.events.push(event) }
  async beginExpedition(marker: ExpeditionMarker) { this.markers.push(marker) }
  async finishExpedition(expeditionId: string) { this.finished.push(expeditionId) }
  async consumeInterruption() { return false }
}

const managers: RoomManager[] = []
async function connect(manager: RoomManager, id: string): Promise<ClientPeer> {
  const identity: DevIdentity = { playerId: id, character: { name: id, classId: id === 'leader' ? 'alchemist' : 'warrior', level: 1 } }
  const peer = { connectionId: id, send: (_message: ServerMessage) => undefined }
  await manager.connect(identity, peer)
  return peer
}

afterEach(async () => { for (const manager of managers.splice(0)) await manager.dispose() })

describe('gameplay-only playtest telemetry', () => {
  it('records Rift start, actions, potion, round, timeout, Auto, and death events', async () => {
    let clock = 10_000
    const telemetry = new RecordingTelemetry()
    const manager = new RoomManager({ telemetry, now: () => clock, random: () => 0.5, autoTimers: false })
    managers.push(manager)
    await connect(manager, 'leader'); await connect(manager, 'member')
    const room = manager.createParty('leader')!
    await manager.applyToParty('member', room.id); await manager.reviewApplication('leader', 'member', true)
    manager.setReady('leader', true); manager.setReady('member', true)
    await manager.startExpedition('leader')
    expect(telemetry.markers).toHaveLength(1)
    expect(telemetry.events.map((event) => event.type)).toEqual(expect.arrayContaining(['PARTY_CREATED', 'RIFT_STARTED', 'ENCOUNTER_STARTED']))

    await manager.submitAction('leader', { round: 1, defendZone: 'head', usePotion: true })
    await manager.submitAction('member', { round: 1, attackZone: 'head', defendZone: 'body', usePotion: false })
    expect(telemetry.events.map((event) => event.type)).toEqual(expect.arrayContaining(['PLAYER_ACTION_SUBMITTED', 'POTION_USED', 'ROUND_RESOLVED']))

    await manager.setAutoBattle('member', true)
    clock += 30_000
    await manager.resolveDueRounds(clock)
    expect(telemetry.events.map((event) => event.type)).toContain('AUTO_ENABLED')
    const timeoutRound = telemetry.events.filter((event) => event.type === 'ROUND_RESOLVED').at(-1)
    expect(timeoutRound?.payload).toMatchObject({ waitedFullTimer: true, manualTimeoutCount: 1, autoRoundCount: 1 })

    room.members.forEach((member) => { member.character.currentHP = 1 })
    room.enemy = { id: 'fatal', name: 'Fatal', kind: 'boss', attack: 999_999, maxHP: 999_999, currentHP: 999_999, attackCount: 2 }
    await manager.setAutoBattle('member', false)
    await manager.submitAction('leader', { round: room.round, attackZone: 'head', defendZone: 'head', usePotion: false })
    await manager.submitAction('member', { round: room.round, attackZone: 'head', defendZone: 'head', usePotion: false })
    expect(telemetry.events.map((event) => event.type)).toEqual(expect.arrayContaining(['PLAYER_DIED', 'RIFT_FAILED']))
    expect(telemetry.finished).toContain(room.expeditionId)
  })

  it('strips credentials and private content recursively', () => {
    expect(sanitizeTelemetryPayload({ telegramInitData: 'secret', sessionToken: 'secret', privateChat: 'text', safe: { phone: 'x', floor: 2 } })).toEqual({ safe: { floor: 2 } })
  })

  it('uses event keys to make critical telemetry idempotent', async () => {
    const rows = new Map<string, any>()
    const fake = {
      playtestEvent: {
        upsert: async ({ where, create }: any) => { if (!rows.has(where.eventKey)) rows.set(where.eventKey, create) },
        create: async ({ data }: any) => { rows.set(`row-${rows.size}`, data) },
      },
    }
    const telemetry = new PlaytestTelemetry(fake as unknown as PrismaClient)
    const event = { type: 'RIFT_STARTED' as const, eventKey: 'rift:e1', expeditionId: '00000000-0000-4000-8000-000000000001', payload: { floor: 1, sessionToken: 'must-not-persist' } }
    await telemetry.record(event); await telemetry.record(event)
    expect(rows).toHaveLength(1)
    expect(rows.get('rift:e1').payload).toEqual({ floor: 1 })
  })

  it('recovers active expeditions once as server interruptions and emits one notice per player', async () => {
    const notices: Array<{ id: string; playerId: string; expeditionId: string; acknowledgedAt: Date | null }> = []
    const events: unknown[] = []
    const active = { expeditionId: '00000000-0000-4000-8000-000000000010', playSessionId: '00000000-0000-4000-8000-000000000011', roomId: 'room', riftId: 'first_rift', floor: 2, playerIds: ['p1', 'p2'], status: 'ACTIVE', startedAt: new Date(), endedAt: null }
    const fake = {
      $transaction: async (callback: (tx: any) => Promise<unknown>) => callback(fake),
      activeExpedition: {
        findMany: async () => active.status === 'ACTIVE' ? [active] : [],
        update: async ({ data }: any) => { Object.assign(active, data); return active },
      },
      interruptedExpeditionNotice: {
        upsert: async ({ create }: any) => { if (!notices.some((item) => item.playerId === create.playerId)) notices.push({ id: `n${notices.length}`, ...create, acknowledgedAt: null }) },
        findFirst: async ({ where }: any) => notices.find((item) => item.playerId === where.playerId && item.acknowledgedAt === null) ?? null,
        update: async ({ where, data }: any) => Object.assign(notices.find((item) => item.id === where.id)!, data),
      },
      playtestEvent: { upsert: async ({ create }: any) => { events.push(create) } },
    }
    const telemetry = new PlaytestTelemetry(fake as unknown as PrismaClient)
    expect(await telemetry.recoverInterruptedExpeditions()).toBe(1)
    expect(active.status).toBe('SERVER_INTERRUPTED')
    expect(notices.map((item) => item.playerId)).toEqual(['p1', 'p2'])
    expect(events).toHaveLength(1)
    expect(await telemetry.consumeInterruption('p1')).toBe(true)
    expect(await telemetry.consumeInterruption('p1')).toBe(false)
    expect(await telemetry.recoverInterruptedExpeditions()).toBe(0)
  })

  it('generates simulator-vs-real report with minimum sample and timing metrics', () => {
    const report = generatePlaytestReport([
      { type: 'RIFT_STARTED', floor: 2, expeditionId: 'e1', playerId: 'p1', payload: { partySize: 5, playerLevels: [5, 5, 5, 5, 5], composition: { warrior: 3, alchemist: 1, jeweler: 1 } } },
      { type: 'ROUND_RESOLVED', floor: 2, expeditionId: 'e1', playerId: null, payload: { durationSeconds: 12, resolvedEarly: true, manualTimeoutCount: 0 } },
      { type: 'POTION_USED', floor: 2, expeditionId: 'e1', playerId: 'p1', payload: { hpHealed: 30, overheal: 5 } },
      { type: 'RIFT_COMPLETED', floor: 2, expeditionId: 'e1', playerId: null, payload: { partySize: 5, durationSeconds: 500, encountersCompleted: 8, xp: 100, coins: 200, professionResources: 7, recipeDrops: 1 } },
    ], new Date('2026-08-11T00:00:00Z'))
    expect(report).toContain('Simulator expected')
    expect(report).toContain('74.2%')
    expect(report).toContain('100.0%')
    expect(report).toContain('Insufficient sample size')
    expect(report).not.toContain('secret')
  })
})
