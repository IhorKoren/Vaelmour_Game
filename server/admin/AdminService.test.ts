import { describe, expect, it } from 'vitest'
import type { PrismaClient } from '../generated/prisma/client'
import type { RuntimeConfig } from '../config'
import { PlayerStateService } from '../players/PlayerStateService'
import { InMemoryPlayerRepository } from '../repositories/InMemoryPlayerRepository'
import { AdminService } from './AdminService'

function config(adminMode: boolean, ids: string[]): RuntimeConfig {
  return { nodeEnv: 'test', isProduction: false, allowDevAuth: false, adminMode, telegramBotToken: null, sessionSecret: 'test-session-secret-at-least-32-characters', sessionTtlSeconds: 60, telegramMaxAgeSeconds: 300, appOrigin: null, allowedOrigins: new Set(), adminTelegramUserIds: new Set(ids) }
}

describe('staging admin security', () => {
  it('requires server-side Telegram allowlist and audit logs every mutation as ADMIN', async () => {
    const players = new PlayerStateService(new InMemoryPlayerRepository())
    const account = await players.authenticateAccount('account-admin-test', { name: 'Target', classId: 'warrior', level: 1 })
    const audits: unknown[] = []
    const prisma = { adminAuditLog: { create: async ({ data }: { data: unknown }) => { audits.push(data); return data } } } as unknown as PrismaClient
    const admin = new AdminService(prisma, players, config(true, ['42']))
    const session = { sessionId: 's', accountId: 'a', playerId: 'admin-player', telegramUserId: '42', expiresAt: new Date() }
    const state = await admin.mutate(session, { action: 'GRANT_COINS', targetPlayerId: account.character.id, amount: 500 }) as { availableCoins: number }
    expect(state.availableCoins).toBe(500)
    expect(audits).toHaveLength(1)
    expect(audits[0]).toMatchObject({ adminTelegramUserId: '42', action: 'GRANT_COINS', targetPlayerId: account.character.id, reason: 'ADMIN' })
    await expect(admin.mutate({ ...session, telegramUserId: '99' }, { action: 'GRANT_COINS', targetPlayerId: account.character.id, amount: 1 })).rejects.toMatchObject({ code: 'ADMIN_FORBIDDEN' })
  })
})
