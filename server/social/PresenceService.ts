import type { PresenceStatus } from '../../shared/social-types'

export class PresenceService {
  private readonly statuses = new Map<string, PresenceStatus>()

  set(playerId: string, status: PresenceStatus): boolean {
    const changed = this.get(playerId) !== status
    if (status === 'OFFLINE') this.statuses.delete(playerId)
    else this.statuses.set(playerId, status)
    return changed
  }

  get(playerId: string): PresenceStatus { return this.statuses.get(playerId) ?? 'OFFLINE' }
  isOnline(playerId: string): boolean { return this.get(playerId) !== 'OFFLINE' }
  snapshot(): Record<string, PresenceStatus> { return Object.fromEntries(this.statuses) }
}
