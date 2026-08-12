import { describe, expect, it } from 'vitest'
import type { PrismaClient } from '../generated/prisma/client'
import type { RuntimeConfig } from '../config'
import { PlayerStateService } from '../players/PlayerStateService'
import { createMemoryDatabase, InMemoryPlayerRepository, type MemoryDatabase } from '../repositories/InMemoryPlayerRepository'
import { cloneProfile, type AdminAuditWrite, type RepositoryOperation, type RepositoryTransactionResult, type StoredPlayerProfile } from '../repositories/types'
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

  it('rolls back the player mutation when the atomic audit write fails', async () => {
    class AtomicRepository extends InMemoryPlayerRepository {
      audits: AdminAuditWrite[] = []
      constructor(private readonly db: MemoryDatabase, private readonly failAudit: boolean) { super(db) }
      async adminTransact(playerId: string, _operation: RepositoryOperation, audit: AdminAuditWrite, mutate: (profile: StoredPlayerProfile) => void): Promise<RepositoryTransactionResult> {
        const current = this.db.players.get(playerId)!; const working = cloneProfile(current); mutate(working)
        if (this.failAudit) throw new Error('forced audit failure')
        this.audits.push(audit); this.db.players.set(playerId, cloneProfile(working))
        return { profile: working, applied: true }
      }
    }
    const db = createMemoryDatabase(); const repository = new AtomicRepository(db, true); const players = new PlayerStateService(repository)
    const target = await players.authenticateAccount('atomic-admin-target', { name: 'Atomic Target', classId: 'warrior', level: 1 })
    const admin = new AdminService({} as PrismaClient, players, config(true, ['42']))
    const session = { sessionId: 's', accountId: 'a', playerId: 'admin', telegramUserId: '42', expiresAt: new Date() }
    await expect(admin.mutate(session, { action: 'GRANT_COINS', targetPlayerId: target.character.id, amount: 500 })).rejects.toThrow('forced audit failure')
    expect((await players.snapshot(target.character.id)).availableCoins).toBe(0)
    expect(repository.audits).toHaveLength(0)
  })
})
