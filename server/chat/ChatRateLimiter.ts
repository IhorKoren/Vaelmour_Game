import type { ChatChannel } from '../../shared/social-types'
import { CHAT_RATE_LIMIT_MS } from '../../shared/game-data/social'
import { EconomyError } from '../players/PlayerStateService'

export class ChatRateLimiter {
  private readonly lastSent = new Map<string, number>()
  constructor(private readonly now: () => number = Date.now) {}
  consume(playerId: string, channel: ChatChannel): void {
    const key = `${playerId}:${channel}`; const current = this.now(); const previous = this.lastSent.get(key) ?? -Infinity
    if (current - previous < CHAT_RATE_LIMIT_MS[channel]) throw new EconomyError('CHAT_RATE_LIMITED', 'Please wait before sending another message.')
    this.lastSent.set(key, current)
  }
}
