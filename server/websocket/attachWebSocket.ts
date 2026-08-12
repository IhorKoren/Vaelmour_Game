import { randomUUID } from 'node:crypto'
import type { WebSocketServer, WebSocket } from 'ws'
import type { ServerMessage } from '../../shared/protocol'
import { EconomyError } from '../players/PlayerStateService'
import { RoomManager } from '../rooms/RoomManager'
import { AuthenticationError, type AuthenticatedSession } from '../auth/AuthService'
import { validateClientMessage } from './validateClientMessage'
import { log } from '../logging/logger'

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message))
}

interface WebSocketAuthOptions {
  validateSession?: (token: string) => Promise<AuthenticatedSession>
  helloTimeoutMs?: number
  heartbeatIntervalMs?: number
  maxPayloadBytes?: number
  maxMessagesPer10Seconds?: number
}

export function attachWebSocket(wss: WebSocketServer, rooms: RoomManager, options: WebSocketAuthOptions = {}): void {
  wss.on('connection', (socket) => {
    const connectionId = randomUUID()
    let playerId: string | null = null
    let alive = true
    let messageCount = 0
    let windowStartedAt = Date.now()
    let processing = Promise.resolve()
    const helloTimer = setTimeout(() => { if (!playerId) socket.close(4008, 'HELLO timeout') }, options.helloTimeoutMs ?? 8_000)
    const heartbeat = setInterval(() => {
      if (!alive) { socket.terminate(); return }
      alive = false
      socket.ping()
    }, options.heartbeatIntervalMs ?? 30_000)
    helloTimer.unref?.(); heartbeat.unref?.()
    socket.on('pong', () => { alive = true })

    socket.on('message', (raw) => { processing = processing.then(async () => {
      const rawText = raw.toString()
      if (Buffer.byteLength(rawText, 'utf8') > (options.maxPayloadBytes ?? 64 * 1024)) { send(socket, { type: 'ERROR', payload: { code: 'INVALID_MESSAGE', message: 'Повідомлення завелике.' } }); socket.close(1009, 'Payload too large'); return }
      const now = Date.now()
      if (now - windowStartedAt >= 10_000) { windowStartedAt = now; messageCount = 0 }
      messageCount += 1
      if (messageCount > (options.maxMessagesPer10Seconds ?? 120)) { send(socket, { type: 'ERROR', payload: { code: 'RATE_LIMITED', message: 'Забагато повідомлень.' } }); socket.close(1008, 'Rate limit exceeded'); return }
      let parsed: unknown
      try {
        parsed = JSON.parse(rawText)
      } catch {
        send(socket, { type: 'ERROR', payload: { code: 'INVALID_JSON', message: 'Некоректне повідомлення.' } })
        return
      }
      const message = validateClientMessage(parsed)
      if (!message) { send(socket, { type: 'ERROR', payload: { code: 'INVALID_MESSAGE', message: 'Повідомлення не відповідає protocol schema.' } }); return }

      try {
        if (!message || typeof message !== 'object' || typeof message.type !== 'string') throw new Error('Invalid message shape')
        if (message.type === 'HELLO') {
          if (playerId) return
          const peer = {
            connectionId,
            socket,
            send: (outgoing: ServerMessage) => send(socket, outgoing),
            close: () => socket.close(4001, 'Reconnected from another client'),
          }
          let authenticatedPlayerId: string | null
          if (options.validateSession) {
            const sessionToken = message.payload.sessionToken
            if (!sessionToken) throw new EconomyError('SESSION_REQUIRED', 'Authenticated session is required.')
            const session = await options.validateSession(sessionToken)
            if (!session.playerId) throw new EconomyError('ACCOUNT_SETUP_REQUIRED', 'Створіть персонажа перед підключенням.')
            authenticatedPlayerId = await rooms.connectAuthenticated(session.accountId, peer, session.sessionId)
          } else authenticatedPlayerId = await rooms.connect(message.payload, peer)
          playerId = authenticatedPlayerId
          if (playerId) clearTimeout(helloTimer)
          else socket.close(4009, 'Rift reconnect expired')
          return
        }

        if (!playerId) {
          send(socket, { type: 'ERROR', payload: { code: 'HELLO_REQUIRED', message: 'Спочатку потрібна authenticated session.' } })
          return
        }
        await rooms.handle(playerId, message)
      } catch (error) {
        if (error instanceof EconomyError || error instanceof AuthenticationError) {
          send(socket, { type: 'ERROR', payload: { code: error.code, message: error.message } })
          return
        }
        log('error', 'websocket_message_failed', { playerId, messageType: message.type }, error)
        send(socket, { type: 'ERROR', payload: { code: 'INTERNAL_ERROR', message: 'Не вдалося обробити повідомлення.' } })
      }
    }).catch((error) => { log('error', 'websocket_queue_failed', { playerId }, error); send(socket, { type: 'ERROR', payload: { code: 'INTERNAL_ERROR', message: 'Не вдалося обробити повідомлення.' } }) }) })

    socket.on('close', () => {
      clearTimeout(helloTimer); clearInterval(heartbeat)
      if (playerId) rooms.disconnect(playerId, connectionId)
    })
  })
}
