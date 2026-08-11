import { randomUUID } from 'node:crypto'
import type { WebSocketServer, WebSocket } from 'ws'
import type { ClientMessage, ServerMessage } from '../../shared/protocol'
import { EconomyError } from '../players/PlayerStateService'
import { RoomManager } from '../rooms/RoomManager'
import { AuthenticationError, type AuthenticatedSession } from '../auth/AuthService'

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message))
}

interface WebSocketAuthOptions {
  validateSession?: (token: string) => Promise<AuthenticatedSession>
}

export function attachWebSocket(wss: WebSocketServer, rooms: RoomManager, options: WebSocketAuthOptions = {}): void {
  wss.on('connection', (socket) => {
    const connectionId = randomUUID()
    let playerId: string | null = null

    socket.on('message', (raw) => { void (async () => {
      let message: ClientMessage
      try {
        message = JSON.parse(raw.toString()) as ClientMessage
      } catch {
        send(socket, { type: 'ERROR', payload: { code: 'INVALID_JSON', message: 'Некоректне повідомлення.' } })
        return
      }

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
        send(socket, { type: 'ERROR', payload: { code: 'INVALID_MESSAGE', message: 'Повідомлення не відповідає protocol schema.' } })
      }
    })() })

    socket.on('close', () => {
      if (playerId) rooms.disconnect(playerId, connectionId)
    })
  })
}
