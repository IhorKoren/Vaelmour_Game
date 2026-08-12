import type { Prisma, PrismaClient } from '../generated/prisma/client'
import { randomUUID } from 'node:crypto'
import { log } from '../logging/logger'

export const PLAYTEST_EVENT_TYPES = [
  'CHARACTER_CREATED', 'PARTY_CREATED', 'PARTY_STARTED', 'RIFT_STARTED', 'ENCOUNTER_STARTED', 'ENCOUNTER_COMPLETED',
  'PLAYER_DIED', 'POTION_USED', 'PLAYER_ACTION_SUBMITTED', 'ROUND_RESOLVED', 'RIFT_EXIT', 'RIFT_FAILED',
  'RIFT_COMPLETED', 'FLOOR_UNLOCKED', 'AUTO_ENABLED', 'AUTO_DISABLED', 'SERVER_INTERRUPTED_RIFT', 'PLAYER_RECONNECTED',
  'RECIPE_DROPPED',
] as const
export type PlaytestEventType = typeof PLAYTEST_EVENT_TYPES[number]

export interface TelemetryEvent {
  type: PlaytestEventType
  eventKey?: string
  playSessionId?: string
  expeditionId?: string
  playerId?: string
  riftId?: string
  floor?: number
  encounter?: number
  round?: number
  payload?: Record<string, unknown>
}

export interface ExpeditionMarker {
  expeditionId: string
  playSessionId: string
  roomId: string
  riftId: string
  floor: number
  playerIds: string[]
}

export interface TelemetrySink {
  record(event: TelemetryEvent): Promise<void>
  beginExpedition(marker: ExpeditionMarker): Promise<void>
  finishExpedition(expeditionId: string, status: 'COMPLETED' | 'FAILED' | 'EXITED'): Promise<void>
  consumeInterruption(playerId: string): Promise<boolean>
}

const FORBIDDEN_KEY = /(init.?data|token|secret|password|private.?chat|chat.?text|phone|ip.?address)/i

export function sanitizeTelemetryPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).filter(([key]) => !FORBIDDEN_KEY.test(key)).map(([key, value]) => [key, sanitizeValue(value)]))
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeValue)
  if (value && typeof value === 'object') return sanitizeTelemetryPayload(value as Record<string, unknown>)
  return value
}

export class NoopTelemetry implements TelemetrySink {
  async record(): Promise<void> {}
  async beginExpedition(): Promise<void> {}
  async finishExpedition(): Promise<void> {}
  async consumeInterruption(): Promise<boolean> { return false }
}

/**
 * Keeps observational writes outside gameplay correctness. Failed event writes
 * are retried with the same idempotency key; durable expedition creation still
 * fails closed because it is part of the START boundary.
 */
export class SafeTelemetrySink implements TelemetrySink {
  private readonly retries = new Map<string, { event: TelemetryEvent; attempts: number }>()

  constructor(private readonly inner: TelemetrySink, private readonly retryDelayMs = 1_000, private readonly maxAttempts = 5) {}

  async record(input: TelemetryEvent): Promise<void> {
    const event = input.eventKey ? input : { ...input, eventKey: `telemetry:${input.type}:${randomUUID()}` }
    try {
      await this.inner.record(event)
      this.retries.delete(event.eventKey!)
    } catch (error) {
      const attempts = (this.retries.get(event.eventKey!)?.attempts ?? 0) + 1
      this.retries.set(event.eventKey!, { event, attempts })
      log('error', 'telemetry_record_failed', { eventType: event.type, eventKey: event.eventKey, attempts }, error)
      if (attempts < this.maxAttempts) {
        const timer = setTimeout(() => { void this.record(event) }, this.retryDelayMs * attempts)
        timer.unref?.()
      }
    }
  }

  beginExpedition(marker: ExpeditionMarker): Promise<void> { return this.inner.beginExpedition(marker) }

  async finishExpedition(expeditionId: string, status: 'COMPLETED' | 'FAILED' | 'EXITED'): Promise<void> {
    await this.finishWithRetry(expeditionId, status, 1)
  }

  async consumeInterruption(playerId: string): Promise<boolean> {
    try { return await this.inner.consumeInterruption(playerId) }
    catch (error) {
      log('error', 'telemetry_consume_interruption_failed', { playerId }, error)
      return false
    }
  }

  private async finishWithRetry(expeditionId: string, status: 'COMPLETED' | 'FAILED' | 'EXITED', attempt: number): Promise<void> {
    try { await this.inner.finishExpedition(expeditionId, status) }
    catch (error) {
      log('error', 'telemetry_finish_expedition_failed', { expeditionId, status, attempt }, error)
      if (attempt < this.maxAttempts) {
        const timer = setTimeout(() => { void this.finishWithRetry(expeditionId, status, attempt + 1) }, this.retryDelayMs * attempt)
        timer.unref?.()
      }
    }
  }
}

export class PlaytestTelemetry implements TelemetrySink {
  constructor(private readonly prisma: PrismaClient) {}

  async record(event: TelemetryEvent): Promise<void> {
    const data = {
      eventKey: event.eventKey, type: event.type, playSessionId: event.playSessionId, expeditionId: event.expeditionId,
      playerId: event.playerId, riftId: event.riftId, floor: event.floor, encounter: event.encounter, round: event.round,
      payload: sanitizeTelemetryPayload(event.payload ?? {}) as Prisma.InputJsonValue,
    }
    if (event.eventKey) {
      await this.prisma.playtestEvent.upsert({ where: { eventKey: event.eventKey }, create: data, update: {} })
    } else await this.prisma.playtestEvent.create({ data })
  }

  async beginExpedition(marker: ExpeditionMarker): Promise<void> {
    await this.prisma.activeExpedition.create({ data: { ...marker, playerIds: marker.playerIds as Prisma.InputJsonValue } })
  }

  async finishExpedition(expeditionId: string, status: 'COMPLETED' | 'FAILED' | 'EXITED'): Promise<void> {
    await this.prisma.activeExpedition.updateMany({ where: { expeditionId, status: 'ACTIVE' }, data: { status, endedAt: new Date() } })
  }

  async recoverInterruptedExpeditions(): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const active = await tx.activeExpedition.findMany({ where: { status: 'ACTIVE' } })
      for (const expedition of active) {
        const playerIds = Array.isArray(expedition.playerIds) ? expedition.playerIds.filter((id): id is string => typeof id === 'string') : []
        for (const playerId of playerIds) {
          await tx.interruptedExpeditionNotice.upsert({
            where: { playerId_expeditionId: { playerId, expeditionId: expedition.expeditionId } },
            create: { playerId, expeditionId: expedition.expeditionId }, update: {},
          })
        }
        await tx.playtestEvent.upsert({
          where: { eventKey: `interrupted:${expedition.expeditionId}` },
          create: { eventKey: `interrupted:${expedition.expeditionId}`, type: 'SERVER_INTERRUPTED_RIFT', playSessionId: expedition.playSessionId, expeditionId: expedition.expeditionId, riftId: expedition.riftId, floor: expedition.floor, payload: { partySize: playerIds.length } },
          update: {},
        })
        await tx.activeExpedition.update({ where: { expeditionId: expedition.expeditionId }, data: { status: 'SERVER_INTERRUPTED', endedAt: new Date() } })
      }
      return active.length
    })
  }

  async consumeInterruption(playerId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const notice = await tx.interruptedExpeditionNotice.findFirst({ where: { playerId, acknowledgedAt: null }, orderBy: { createdAt: 'asc' } })
      if (!notice) return false
      await tx.interruptedExpeditionNotice.update({ where: { id: notice.id }, data: { acknowledgedAt: new Date() } })
      return true
    })
  }
}
