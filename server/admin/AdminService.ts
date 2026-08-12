import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '../generated/prisma/client'
import type { RuntimeConfig } from '../config'
import { AuthenticationError, type AuthenticatedSession } from '../auth/AuthService'
import { PlayerStateService } from '../players/PlayerStateService'
import { EconomyError } from '../players/PlayerStateService'
import { normalizePlayerName } from '../players/playerName'

export type AdminAction =
  | { action: 'RESET_RIFT_PROGRESS'; targetPlayerId: string }
  | { action: 'GRANT_COINS'; targetPlayerId: string; amount: number }
  | { action: 'GRANT_ITEM'; targetPlayerId: string; itemId: string; quantity: number }
  | { action: 'SET_LEVEL'; targetPlayerId: string; level: number }

export class AdminService {
  constructor(private readonly prisma: PrismaClient, private readonly players: PlayerStateService, private readonly config: RuntimeConfig) {}

  authorize(session: AuthenticatedSession): string {
    if (!this.config.adminMode || !session.telegramUserId || !this.config.adminTelegramUserIds.has(session.telegramUserId)) throw new AuthenticationError('ADMIN_FORBIDDEN', 'Admin tooling is unavailable.')
    return session.telegramUserId
  }

  async findExact(session: AuthenticatedSession, name: string): Promise<unknown> {
    this.authorize(session)
    const row = await this.prisma.player.findUnique({ where: { nameKey: normalizePlayerName(name) }, select: { id: true } })
    if (!row) return null
    const [state, ledger] = await Promise.all([this.players.snapshot(row.id), this.players.ledger(row.id)])
    return { state, recentLedger: ledger.slice(-25) }
  }

  async mutate(session: AuthenticatedSession, input: AdminAction): Promise<unknown> {
    const adminTelegramUserId = this.authorize(session)
    const operationId = randomUUID()
    const details = { operationId, ...input }
    if (this.players.repository.adminTransact) {
      const value = input.action === 'GRANT_COINS' ? { amount: input.amount } : input.action === 'GRANT_ITEM' ? { itemId: input.itemId, quantity: input.quantity } : input.action === 'SET_LEVEL' ? { level: input.level } : {}
      return this.players.adminMutateAtomic(input.targetPlayerId, input.action, value, operationId, { adminTelegramUserId, action: input.action, targetPlayerId: input.targetPlayerId, reason: 'ADMIN', details })
    }
    let state
    switch (input.action) {
      case 'RESET_RIFT_PROGRESS': state = await this.players.adminResetRift(input.targetPlayerId, operationId); break
      case 'GRANT_COINS': state = await this.players.adminGrantCoins(input.targetPlayerId, input.amount, operationId); break
      case 'GRANT_ITEM': state = await this.players.adminGrantItem(input.targetPlayerId, input.itemId, input.quantity, operationId); break
      case 'SET_LEVEL': state = await this.players.adminSetLevel(input.targetPlayerId, input.level, operationId); break
      default: throw new EconomyError('INVALID_ADMIN_ACTION', 'Admin action is not allowed.')
    }
    await this.prisma.adminAuditLog.create({ data: { adminTelegramUserId, action: input.action, targetPlayerId: input.targetPlayerId, reason: 'ADMIN', details: { operationId, ...input } } })
    return state
  }
}
