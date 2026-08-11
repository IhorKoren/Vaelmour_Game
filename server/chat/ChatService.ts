import { createHash, randomUUID } from 'node:crypto'
import { CHAT_HISTORY_PAGE_SIZE, GLOBAL_CHAT_RETENTION, MAX_CHAT_MESSAGE_LENGTH } from '../../shared/game-data/social'
import type { ChatChannel, ChatHistorySnapshot, PersistentChatMessage, PrivateConversationView, UnreadSnapshot } from '../../shared/social-types'
import { EconomyError } from '../players/PlayerStateService'
import type { SocialRepository, SocialState } from '../repositories/types'
import type { PresenceService } from '../social/PresenceService'
import { canonicalPair, isBlocked, memberGuildId, publicPlayer } from '../social/social-utils'
import { ChatRateLimiter } from './ChatRateLimiter'

export class ChatService {
  readonly rateLimiter: ChatRateLimiter
  constructor(private readonly repository: SocialRepository, private readonly presence: PresenceService, private readonly now: () => number = Date.now) { this.rateLimiter = new ChatRateLimiter(now) }

  async send(playerId: string, input: { channel: Exclude<ChatChannel, 'GROUP'>; text: string; targetName?: string; conversationId?: string }, operationId: string): Promise<PersistentChatMessage> {
    const messageId = this.operationUuid(`${playerId}:${operationId}`)
    const existingMessage = await this.repository.socialRead((state) => state.chatMessages.find((value) => value.id === messageId))
    if (existingMessage) return existingMessage
    const text = this.validate(input.text); this.rateLimiter.consume(playerId, input.channel)
    const result = await this.repository.socialTransact(playerId, `chat-send:${playerId}:${operationId}`, 'SEND_CHAT_MESSAGE', (state) => {
      const sender = this.player(state, playerId); const timestamp = this.now(); const message: PersistentChatMessage = { id: messageId, channel: input.channel, senderId: playerId, senderName: sender.name, text, createdAt: timestamp }
      if (input.channel === 'GUILD') {
        const guildId = memberGuildId(state, playerId); if (!guildId) throw new EconomyError('NOT_IN_GUILD', 'Guild chat requires guild membership.')
        message.guildId = guildId
      } else if (input.channel === 'PRIVATE') {
        const conversation = input.conversationId ? state.conversations.get(input.conversationId) : undefined
        let otherId: string
        if (conversation) {
          if (conversation.playerLowId !== playerId && conversation.playerHighId !== playerId) throw new EconomyError('PRIVATE_CHAT_FORBIDDEN', 'Conversation does not belong to player.')
          otherId = conversation.playerLowId === playerId ? conversation.playerHighId : conversation.playerLowId
        } else {
          const target = this.exactPlayer(state, input.targetName ?? ''); otherId = target.playerId
          if (otherId === playerId) throw new EconomyError('CANNOT_MESSAGE_SELF', 'You cannot privately message yourself.')
        }
        if (isBlocked(state, playerId, otherId)) throw new EconomyError('PLAYER_BLOCKED', 'Private message is blocked.')
        const [low, high] = canonicalPair(playerId, otherId)
        const existing = conversation ?? [...state.conversations.values()].find((value) => value.playerLowId === low && value.playerHighId === high)
        const targetConversation = existing ?? { id: randomUUID(), playerLowId: low, playerHighId: high, createdAt: timestamp, updatedAt: timestamp }
        targetConversation.updatedAt = timestamp; state.conversations.set(targetConversation.id, targetConversation); message.conversationId = targetConversation.id
      }
      state.chatMessages.push(message)
      if (input.channel === 'GLOBAL') {
        const global = state.chatMessages.filter((value) => value.channel === 'GLOBAL')
        if (global.length > GLOBAL_CHAT_RETENTION) { const remove = new Set(global.sort((a, b) => a.createdAt - b.createdAt).slice(0, global.length - GLOBAL_CHAT_RETENTION).map((value) => value.id)); state.chatMessages = state.chatMessages.filter((value) => !remove.has(value.id)) }
      }
      return message
    })
    if (result.applied) return result.value
    const duplicate = await this.repository.socialRead((state) => state.chatMessages.find((value) => value.id === messageId))
    if (duplicate) return duplicate
    throw new EconomyError('DUPLICATE_OPERATION', 'Message operation was already processed.')
  }

  groupMessage(playerId: string, roomId: string, senderName: string, input: string): PersistentChatMessage {
    const text = this.validate(input); this.rateLimiter.consume(playerId, 'GROUP')
    return { id: randomUUID(), channel: 'GROUP', senderId: playerId, senderName, text, roomId, createdAt: this.now() }
  }

  async history(playerId: string, input: { channel: Exclude<ChatChannel, 'GROUP'>; conversationId?: string; beforeMessageId?: string; limit?: number }): Promise<ChatHistorySnapshot> {
    const snapshot = await this.repository.socialRead((state) => this.historySnapshot(state, playerId, input))
    await this.repository.socialTransact(playerId, `chat-read:${playerId}:${snapshot.key}:${randomUUID()}`, 'READ_CHAT', (state) => { state.chatReads.set(`${playerId}:${snapshot.key}`, { playerId, channelKey: snapshot.key, lastReadAt: this.now() }) })
    return snapshot
  }

  async conversations(playerId: string): Promise<PrivateConversationView[]> {
    return this.repository.socialRead((state) => {
      this.player(state, playerId)
      return [...state.conversations.values()].filter((value) => value.playerLowId === playerId || value.playerHighId === playerId).map((conversation) => {
        const otherId = conversation.playerLowId === playerId ? conversation.playerHighId : conversation.playerLowId
        const messages = state.chatMessages.filter((value) => value.conversationId === conversation.id).sort((a, b) => b.createdAt - a.createdAt)
        const readAt = state.chatReads.get(`${playerId}:private:${conversation.id}`)?.lastReadAt ?? 0
        return { id: conversation.id, other: publicPlayer(state, otherId, this.presence), lastMessage: messages[0] ?? null, unread: messages.filter((value) => value.senderId !== playerId && value.createdAt > readAt).length }
      }).sort((a, b) => (b.lastMessage?.createdAt ?? 0) - (a.lastMessage?.createdAt ?? 0))
    })
  }

  async unread(playerId: string): Promise<UnreadSnapshot> {
    return this.repository.socialRead((state) => {
      const guildId = memberGuildId(state, playerId); const guildRead = guildId ? state.chatReads.get(`${playerId}:guild:${guildId}`)?.lastReadAt ?? 0 : Infinity
      const guild = guildId ? state.chatMessages.filter((value) => value.guildId === guildId && value.senderId !== playerId && value.createdAt > guildRead).length : 0
      let privateCount = 0
      for (const conversation of state.conversations.values()) if (conversation.playerLowId === playerId || conversation.playerHighId === playerId) { const readAt = state.chatReads.get(`${playerId}:private:${conversation.id}`)?.lastReadAt ?? 0; privateCount += state.chatMessages.filter((value) => value.conversationId === conversation.id && value.senderId !== playerId && value.createdAt > readAt).length }
      return { guild, private: privateCount }
    })
  }

  async recipients(message: PersistentChatMessage): Promise<string[]> {
    return this.repository.socialRead((state) => {
      if (message.channel === 'GLOBAL') return [...state.players.keys()].filter((id) => !state.blocks.has(`${id}:${message.senderId}`))
      if (message.channel === 'GUILD') return [...state.guildMembers.values()].filter((value) => value.guildId === message.guildId).map((value) => value.playerId)
      if (message.channel === 'PRIVATE') { const conversation = message.conversationId ? state.conversations.get(message.conversationId) : undefined; return conversation ? [conversation.playerLowId, conversation.playerHighId] : [] }
      return []
    })
  }

  private historySnapshot(state: SocialState, playerId: string, input: { channel: Exclude<ChatChannel, 'GROUP'>; conversationId?: string; beforeMessageId?: string; limit?: number }): ChatHistorySnapshot {
    this.player(state, playerId); let key: string; let messages: PersistentChatMessage[]
    if (input.channel === 'GLOBAL') { key = 'global'; messages = state.chatMessages.filter((value) => value.channel === 'GLOBAL') }
    else if (input.channel === 'GUILD') { const guildId = memberGuildId(state, playerId); if (!guildId) throw new EconomyError('NOT_IN_GUILD', 'Guild chat requires membership.'); key = `guild:${guildId}`; messages = state.chatMessages.filter((value) => value.guildId === guildId) }
    else { const conversation = input.conversationId ? state.conversations.get(input.conversationId) : undefined; if (!conversation || (conversation.playerLowId !== playerId && conversation.playerHighId !== playerId)) throw new EconomyError('PRIVATE_CHAT_FORBIDDEN', 'Conversation not found.'); key = `private:${conversation.id}`; messages = state.chatMessages.filter((value) => value.conversationId === conversation.id) }
    messages.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
    if (input.beforeMessageId) { const cursor = messages.findIndex((value) => value.id === input.beforeMessageId); if (cursor >= 0) messages = messages.slice(0, cursor) }
    const limit = Math.min(CHAT_HISTORY_PAGE_SIZE, Math.max(1, Math.floor(input.limit ?? CHAT_HISTORY_PAGE_SIZE))); const page = messages.slice(-limit)
    return { channel: input.channel, key, messages: page, nextCursor: messages.length > page.length ? page[0]?.id ?? null : null }
  }

  private validate(input: string): string { const text = input.trim(); if (!text) throw new EconomyError('EMPTY_CHAT_MESSAGE', 'Message cannot be empty.'); if (text.length > MAX_CHAT_MESSAGE_LENGTH) throw new EconomyError('CHAT_MESSAGE_TOO_LONG', `Message cannot exceed ${MAX_CHAT_MESSAGE_LENGTH} characters.`); return text }
  private operationUuid(value: string): string { const hash = createHash('sha256').update(value).digest('hex').slice(0, 32).split(''); hash[12] = '4'; hash[16] = '8'; const raw = hash.join(''); return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}` }
  private player(state: SocialState, id: string) { const player = state.players.get(id); if (!player) throw new EconomyError('PLAYER_NOT_FOUND', 'Player not found.'); return player }
  private exactPlayer(state: SocialState, name: string) { const key = name.trim().toLocaleLowerCase(); const values = [...state.players.values()].filter((value) => value.name.toLocaleLowerCase() === key); if (values.length !== 1) throw new EconomyError(values.length ? 'AMBIGUOUS_PLAYER_NAME' : 'PLAYER_NOT_FOUND', 'Exact player name was not found.'); return values[0] }
}
