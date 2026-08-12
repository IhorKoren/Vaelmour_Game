import { createHmac, randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import type { PrismaClient } from '../generated/prisma/client'
import type { RuntimeConfig } from '../config'
import { AuthenticationError, AuthService } from './AuthService'

const BOT_TOKEN = '123456:test-bot-token'
function initData(id: number, username: string, authDate = 1_000): string {
  const params = new URLSearchParams({ auth_date: String(authDate), user: JSON.stringify({ id, username, first_name: 'Test' }) })
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n')
  const secret = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest()
  params.set('hash', createHmac('sha256', secret).update(check).digest('hex'))
  return params.toString()
}

function config(allowDevAuth = false, maxSessionsPerAccount = 8): RuntimeConfig {
  return { nodeEnv: 'test', isProduction: false, allowDevAuth, adminMode: false, telegramBotToken: BOT_TOKEN, sessionSecret: 'test-session-secret-at-least-32-characters', sessionTtlSeconds: 60, maxSessionsPerAccount, telegramMaxAgeSeconds: 300, appOrigin: null, allowedOrigins: new Set(), adminTelegramUserIds: new Set() }
}

class FakePrisma {
  accounts = new Map<string, { id: string; devTokenHash: string | null; player: { id: string } | null }>()
  identities = new Map<string, { telegramUserId: string; accountId: string; username?: string; firstName?: string; lastName?: string }>()
  sessions = new Map<string, { id: string; sessionHash: string; accountId: string; expiresAt: Date; revokedAt: Date | null; lastUsedAt: Date }>()
  $executeRaw = async () => 1
  $transaction = async <T>(callback: (tx: FakePrisma) => Promise<T>) => callback(this)
  telegramIdentity = {} as any
  account = {} as any
  authSession = {} as any

  constructor() {
    this.telegramIdentity.findUnique = async ({ where }: any) => {
      const identity = this.identities.get(where.telegramUserId)
      if (!identity) return null
      return { ...identity, account: { ...this.accounts.get(identity.accountId)!, telegramIdentity: identity } }
    }
    this.telegramIdentity.update = async ({ where, data }: any) => {
      const current = this.identities.get(where.telegramUserId)!
      Object.assign(current, data); return current
    }
    this.account.create = async ({ data }: any) => {
      const account = { id: randomUUID(), devTokenHash: null, player: null }
      this.accounts.set(account.id, account)
      const identity = { telegramUserId: data.telegramIdentity.create.telegramUserId, accountId: account.id, ...data.telegramIdentity.create }
      this.identities.set(identity.telegramUserId, identity)
      return account
    }
    this.account.upsert = async ({ where, create }: any) => {
      const existing = [...this.accounts.values()].find((value) => value.devTokenHash === where.devTokenHash)
      if (existing) return existing
      const account = { id: randomUUID(), devTokenHash: create.devTokenHash, player: null }
      this.accounts.set(account.id, account); return account
    }
    this.authSession.create = async ({ data }: any) => {
      const session = { id: randomUUID(), ...data, revokedAt: null, lastUsedAt: new Date() }
      this.sessions.set(session.sessionHash, session); return session
    }
    this.authSession.deleteMany = async ({ where }: any) => {
      let count = 0
      const cutoff = where.OR?.[0]?.expiresAt?.lte ?? new Date(1_000_000)
      for (const [hash, session] of this.sessions) if ((!where.accountId || session.accountId === where.accountId) && (session.expiresAt <= cutoff || session.revokedAt)) { this.sessions.delete(hash); count += 1 }
      return { count }
    }
    this.authSession.findMany = async ({ where }: any) => [...this.sessions.values()].filter((session) => session.accountId === where.accountId && !session.revokedAt && session.expiresAt > where.expiresAt.gt).map(({ id }) => ({ id }))
    this.authSession.findUnique = async ({ where }: any) => {
      const session = this.sessions.get(where.sessionHash)
      if (!session) return null
      const account = this.accounts.get(session.accountId)!
      const telegramIdentity = [...this.identities.values()].find((value) => value.accountId === account.id) ?? null
      return { ...session, account: { ...account, telegramIdentity } }
    }
    this.authSession.update = async ({ where, data }: any) => {
      const session = [...this.sessions.values()].find((value) => value.id === where.id)!
      Object.assign(session, data); return session
    }
    this.authSession.updateMany = async ({ where, data }: any) => {
      if (where.id?.in) { let count = 0; for (const session of this.sessions.values()) if (where.id.in.includes(session.id)) { Object.assign(session, data); count += 1 } return { count } }
      const session = this.sessions.get(where.sessionHash)
      if (session && !session.revokedAt) Object.assign(session, data)
      return { count: session ? 1 : 0 }
    }
  }
}

describe('account linking and opaque sessions', () => {
  it('maps repeat login and username changes to one Account', async () => {
    const fake = new FakePrisma()
    const auth = new AuthService(fake as unknown as PrismaClient, config(), () => 1_000_000)
    const first = await auth.authenticateTelegram(initData(42, 'before'))
    const second = await auth.authenticateTelegram(initData(42, 'after'))
    expect(second.accountId).toBe(first.accountId)
    expect(fake.accounts).toHaveLength(1)
    expect(fake.identities.get('42')?.username).toBe('after')
  })

  it('validates, binds, expires, tampers, and revokes sessions', async () => {
    let now = 1_000_000
    const fake = new FakePrisma()
    const auth = new AuthService(fake as unknown as PrismaClient, config(), () => now)
    const login = await auth.authenticateTelegram(initData(43, 'tester'))
    fake.accounts.get(login.accountId)!.player = { id: 'player-43' }
    expect((await auth.validateSession(login.sessionToken)).playerId).toBe('player-43')
    await expect(auth.validateSession(`${login.sessionToken}x`)).rejects.toBeInstanceOf(AuthenticationError)
    await auth.revokeSession(login.sessionToken)
    await expect(auth.validateSession(login.sessionToken)).rejects.toThrow(/expired/i)
    const replacement = await auth.authenticateTelegram(initData(43, 'tester'))
    now += 61_000
    await expect(auth.validateSession(replacement.sessionToken)).rejects.toThrow(/expired/i)
  })

  it('rejects dev auth unless explicitly enabled', async () => {
    const fake = new FakePrisma()
    await expect(new AuthService(fake as unknown as PrismaClient, config()).authenticateDev('developer-token')).rejects.toMatchObject({ code: 'DEV_AUTH_DISABLED' })
    const enabled = await new AuthService(fake as unknown as PrismaClient, config(true)).authenticateDev('developer-token')
    expect(enabled.accountId).toBeTruthy()
  })

  it('revokes the oldest session when the per-account limit is exceeded', async () => {
    const fake = new FakePrisma(); const auth = new AuthService(fake as unknown as PrismaClient, config(false, 2), () => 1_000_000)
    const first = await auth.authenticateTelegram(initData(99, 'limited'))
    await auth.authenticateTelegram(initData(99, 'limited'))
    await auth.authenticateTelegram(initData(99, 'limited'))
    await expect(auth.validateSession(first.sessionToken)).rejects.toMatchObject({ code: 'AUTH_SESSION_EXPIRED' })
    expect([...fake.sessions.values()].filter((session) => !session.revokedAt)).toHaveLength(2)
  })
})
