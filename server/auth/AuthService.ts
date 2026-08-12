import { createHmac, randomBytes } from 'node:crypto'
import type { PrismaClient } from '../generated/prisma/client'
import type { RuntimeConfig } from '../config'
import { TelegramAuthError, validateTelegramInitData } from './telegramAuth'

export class AuthenticationError extends Error {
  constructor(readonly code: string, message: string) { super(message) }
}

export interface AuthenticatedSession {
  sessionId: string
  accountId: string
  playerId: string | null
  telegramUserId: string | null
  expiresAt: Date
}

export interface LoginResult extends AuthenticatedSession {
  sessionToken: string
}

export class AuthService {
  constructor(private readonly prisma: PrismaClient, private readonly config: RuntimeConfig, private readonly now: () => number = Date.now) {}

  async authenticateTelegram(rawInitData: string): Promise<LoginResult> {
    if (!this.config.telegramBotToken) throw new AuthenticationError('TELEGRAM_AUTH_UNAVAILABLE', 'Telegram authentication is not configured.')
    let telegram
    try {
      telegram = validateTelegramInitData(rawInitData, this.config.telegramBotToken, { now: this.now(), maxAgeSeconds: this.config.telegramMaxAgeSeconds })
    } catch (error) {
      if (error instanceof TelegramAuthError) throw new AuthenticationError(error.code, error.message)
      throw error
    }
    const account = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`telegram:${telegram.id}`}))`
      const existing = await tx.telegramIdentity.findUnique({ where: { telegramUserId: telegram.id }, include: { account: { include: { player: true } } } })
      if (existing) {
        await tx.telegramIdentity.update({ where: { telegramUserId: telegram.id }, data: { username: telegram.username, firstName: telegram.firstName, lastName: telegram.lastName } })
        return existing.account
      }
      return tx.account.create({
        data: { telegramIdentity: { create: { telegramUserId: telegram.id, username: telegram.username, firstName: telegram.firstName, lastName: telegram.lastName } } },
        include: { player: true },
      })
    })
    return this.issueSession(account.id, account.player?.id ?? null, telegram.id)
  }

  async authenticateDev(devToken: string): Promise<LoginResult> {
    if (!this.config.allowDevAuth) throw new AuthenticationError('DEV_AUTH_DISABLED', 'Development authentication is disabled.')
    if (!devToken || devToken.length < 8 || devToken.length > 500) throw new AuthenticationError('INVALID_DEV_TOKEN', 'Development token is invalid.')
    const devTokenHash = createHmac('sha256', process.env.DEV_AUTH_SECRET ?? this.config.sessionSecret).update(devToken).digest('hex')
    const account = await this.prisma.account.upsert({ where: { devTokenHash }, create: { devTokenHash }, update: {}, include: { player: true } })
    return this.issueSession(account.id, account.player?.id ?? null, null)
  }

  async validateSession(token: string): Promise<AuthenticatedSession> {
    if (!token || token.length > 500) throw new AuthenticationError('INVALID_SESSION', 'Session is invalid.')
    const session = await this.prisma.authSession.findUnique({
      where: { sessionHash: this.hashSession(token) },
      include: { account: { include: { player: true, telegramIdentity: true } } },
    })
    const now = new Date(this.now())
    if (!session || session.revokedAt || session.expiresAt <= now) throw new AuthenticationError('AUTH_SESSION_EXPIRED', 'Session expired.')
    await this.prisma.authSession.update({ where: { id: session.id }, data: { lastUsedAt: now } })
    return {
      sessionId: session.id, accountId: session.accountId, playerId: session.account.player?.id ?? null,
      telegramUserId: session.account.telegramIdentity?.telegramUserId ?? null, expiresAt: session.expiresAt,
    }
  }

  async revokeSession(token: string): Promise<void> {
    await this.prisma.authSession.updateMany({ where: { sessionHash: this.hashSession(token), revokedAt: null }, data: { revokedAt: new Date(this.now()) } })
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.authSession.deleteMany({ where: { OR: [{ expiresAt: { lte: new Date(this.now()) } }, { revokedAt: { not: null } }] } })
    return result.count
  }

  private async issueSession(accountId: string, playerId: string | null, telegramUserId: string | null): Promise<LoginResult> {
    const token = randomBytes(32).toString('base64url')
    const now = new Date(this.now())
    const expiresAt = new Date(this.now() + this.config.sessionTtlSeconds * 1000)
    const session = await this.prisma.$transaction(async (tx) => {
      await tx.authSession.deleteMany({ where: { accountId, OR: [{ expiresAt: { lte: now } }, { revokedAt: { not: null } }] } })
      const active = await tx.authSession.findMany({ where: { accountId, revokedAt: null, expiresAt: { gt: now } }, orderBy: { createdAt: 'asc' }, select: { id: true } })
      const overflow = active.length - (this.config.maxSessionsPerAccount ?? 8) + 1
      if (overflow > 0) await tx.authSession.updateMany({ where: { id: { in: active.slice(0, overflow).map((item) => item.id) } }, data: { revokedAt: now } })
      return tx.authSession.create({ data: { accountId, sessionHash: this.hashSession(token), expiresAt } })
    })
    return { sessionToken: token, sessionId: session.id, accountId, playerId, telegramUserId, expiresAt }
  }

  private hashSession(token: string): string {
    return createHmac('sha256', this.config.sessionSecret).update(token).digest('hex')
  }
}
