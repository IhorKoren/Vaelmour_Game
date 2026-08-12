import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import WebSocket, { WebSocketServer } from 'ws'
import type { ClientMessage, ServerMessage } from '../../shared/protocol'
import { RoomManager } from '../rooms/RoomManager'
import { attachWebSocket } from './attachWebSocket'
import { validateClientMessage } from './validateClientMessage'

interface Inbox {
  messages: ServerMessage[]
  waitFor: <T extends ServerMessage>(predicate: (message: ServerMessage) => message is T) => Promise<T>
}

function inbox(socket: WebSocket): Inbox {
  const messages: ServerMessage[] = []
  socket.on('message', (raw) => messages.push(JSON.parse(raw.toString()) as ServerMessage))
  return {
    messages,
    waitFor: <T extends ServerMessage>(predicate: (message: ServerMessage) => message is T) => new Promise<T>((resolve, reject) => {
      const started = Date.now()
      const check = () => {
        const match = messages.find(predicate)
        if (match) resolve(match)
        else if (Date.now() - started > 1500) reject(new Error('Timed out waiting for WebSocket message'))
        else setTimeout(check, 5)
      }
      check()
    }),
  }
}

function open(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url)
    socket.once('open', () => resolve(socket))
    socket.once('error', reject)
  })
}

function send(socket: WebSocket, message: ClientMessage): void {
  socket.send(JSON.stringify(message))
}

describe('real WebSocket transport', () => {
  it('requires an authoritative Rift id with floor selection', () => {
    expect(validateClientMessage({ type: 'SELECT_RIFT_FLOOR', payload: { riftId: 'second_rift', floorNumber: 1 } })).toBeTruthy()
    expect(validateClientMessage({ type: 'SELECT_RIFT_FLOOR', payload: { floorNumber: 1 } })).toBeNull()
    expect(validateClientMessage({ type: 'SELECT_RIFT_FLOOR', payload: { riftId: 'second_rift', floorNumber: 4 } })).toBeNull()
    expect(validateClientMessage({ type: 'START_PROFESSION_JOB', payload: { activityId: 'gather_rift_iron', durationMinutes: 60, operationId: 'op' } })).toBeTruthy()
    expect(validateClientMessage({ type: 'START_PROFESSION_JOB', payload: { activityId: 'gather_rift_iron', durationMinutes: 30, operationId: 'op' } })).toBeNull()
  })
  const cleanup: Array<() => void> = []
  afterEach(() => cleanup.splice(0).forEach((close) => close()))

  it('synchronizes a two-client lobby through the typed protocol', async () => {
    const http = createServer()
    const wss = new WebSocketServer({ server: http })
    const rooms = new RoomManager({ autoTimers: false })
    attachWebSocket(wss, rooms)
    await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve))
    const port = (http.address() as AddressInfo).port
    const leader = await open(`ws://127.0.0.1:${port}`)
    const member = await open(`ws://127.0.0.1:${port}`)
    const leaderInbox = inbox(leader)
    const memberInbox = inbox(member)
    cleanup.push(() => { leader.close(); member.close(); rooms.dispose(); wss.close(); http.close() })

    send(leader, { type: 'HELLO', payload: { playerId: 'leader', character: { name: 'Leader', classId: 'warrior', level: 1 } } })
    send(member, { type: 'HELLO', payload: { playerId: 'member', character: { name: 'Member', classId: 'ranger', level: 1 } } })
    await Promise.all([
      leaderInbox.waitFor((message): message is Extract<ServerMessage, { type: 'WELCOME' }> => message.type === 'WELCOME'),
      memberInbox.waitFor((message): message is Extract<ServerMessage, { type: 'WELCOME' }> => message.type === 'WELCOME'),
    ])

    send(leader, { type: 'CREATE_PARTY' })
    const created = await leaderInbox.waitFor((message): message is Extract<ServerMessage, { type: 'PARTY_STATE' }> => message.type === 'PARTY_STATE' && message.payload !== null)
    send(member, { type: 'APPLY_TO_PARTY', payload: { partyId: created.payload!.id, operationId: 'ws-apply' } })
    const application = await leaderInbox.waitFor((message): message is Extract<ServerMessage, { type: 'PARTY_STATE' }> => message.type === 'PARTY_STATE' && Boolean(message.payload?.applications.length))
    expect(application.payload?.applications[0].playerId).toBe('member')

    send(leader, { type: 'ACCEPT_APPLICATION', payload: { applicantId: 'member' } })
    const accepted = await memberInbox.waitFor((message): message is Extract<ServerMessage, { type: 'PARTY_STATE' }> => message.type === 'PARTY_STATE' && message.payload?.members.length === 2)
    expect(accepted.payload?.members.map((item) => item.id)).toEqual(['leader', 'member'])

    send(leader, { type: 'SET_READY', payload: { ready: true } })
    send(member, { type: 'SET_READY', payload: { ready: true } })
    await leaderInbox.waitFor((message): message is Extract<ServerMessage, { type: 'PARTY_STATE' }> => message.type === 'PARTY_STATE' && Boolean(message.payload?.members.every((item) => item.ready)))
    send(leader, { type: 'START_EXPEDITION' })
    const [leaderStart, memberStart] = await Promise.all([
      leaderInbox.waitFor((message): message is Extract<ServerMessage, { type: 'EXPEDITION_STARTED' }> => message.type === 'EXPEDITION_STARTED'),
      memberInbox.waitFor((message): message is Extract<ServerMessage, { type: 'EXPEDITION_STARTED' }> => message.type === 'EXPEDITION_STARTED'),
    ])
    expect(leaderStart.payload.roomId).toBe(memberStart.payload.roomId)
    expect(leaderStart.payload.party).toHaveLength(2)
  })

  it('authenticates by server session and ignores a client-supplied player id', async () => {
    const http = createServer()
    const wss = new WebSocketServer({ server: http })
    const rooms = new RoomManager({ autoTimers: false })
    const account = await rooms.playerStates.authenticateAccount('00000000-0000-4000-8000-000000000001', { name: 'Session Player', classId: 'ranger', level: 1 })
    attachWebSocket(wss, rooms, { validateSession: async (token) => {
      if (token !== 'valid-session') throw new Error('invalid session')
      return { sessionId: '00000000-0000-4000-8000-000000000002', accountId: account.accountId, playerId: account.character.id, telegramUserId: '42', expiresAt: new Date(Date.now() + 60_000) }
    } })
    await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve))
    const port = (http.address() as AddressInfo).port
    const socket = await open(`ws://127.0.0.1:${port}`)
    const messages = inbox(socket)
    cleanup.push(() => { socket.close(); rooms.dispose(); wss.close(); http.close() })
    send(socket, { type: 'HELLO', payload: { sessionToken: 'valid-session', playerId: 'spoofed-player-id' } })
    const welcome = await messages.waitFor((message): message is Extract<ServerMessage, { type: 'WELCOME' }> => message.type === 'WELCOME')
    expect(welcome.payload.playerId).toBe(account.character.id)
    expect(welcome.payload.playerId).not.toBe('spoofed-player-id')
  })

  it('rejects malformed and unknown messages without crashing the connection', async () => {
    const http = createServer(); const wss = new WebSocketServer({ server: http }); const rooms = new RoomManager({ autoTimers: false })
    attachWebSocket(wss, rooms)
    await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve))
    const socket = await open(`ws://127.0.0.1:${(http.address() as AddressInfo).port}`); const messages = inbox(socket)
    cleanup.push(() => { socket.close(); rooms.dispose(); wss.close(); http.close() })
    socket.send('{bad json')
    await messages.waitFor((message): message is Extract<ServerMessage, { type: 'ERROR' }> => message.type === 'ERROR' && message.payload.code === 'INVALID_JSON')
    socket.send(JSON.stringify({ type: 'NOT_A_REAL_MESSAGE', payload: {} }))
    await messages.waitFor((message): message is Extract<ServerMessage, { type: 'ERROR' }> => message.type === 'ERROR' && message.payload.code === 'INVALID_MESSAGE')
    socket.send(JSON.stringify({ type: 'SET_READY', payload: { ready: 'yes' } }))
    await messages.waitFor((message): message is Extract<ServerMessage, { type: 'ERROR' }> => message.type === 'ERROR' && message.payload.code === 'INVALID_MESSAGE')
    socket.send(JSON.stringify({ type: 'CREATE_PARTY', payload: { unexpected: true } }))
    await messages.waitFor((message): message is Extract<ServerMessage, { type: 'ERROR' }> => message.type === 'ERROR' && message.payload.code === 'INVALID_MESSAGE')
    expect(socket.readyState).toBe(WebSocket.OPEN)
  })

  it('closes a socket that exceeds the message rate limit', async () => {
    const http = createServer(); const wss = new WebSocketServer({ server: http }); const rooms = new RoomManager({ autoTimers: false })
    attachWebSocket(wss, rooms, { maxMessagesPer10Seconds: 1 })
    await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve))
    const socket = await open(`ws://127.0.0.1:${(http.address() as AddressInfo).port}`)
    cleanup.push(() => { socket.close(); rooms.dispose(); wss.close(); http.close() })
    socket.send('{bad json'); socket.send('{bad json')
    const code = await new Promise<number>((resolve) => socket.once('close', resolve))
    expect(code).toBe(1008)
  })

  it('closes unauthenticated sockets after the HELLO deadline', async () => {
    const http = createServer(); const wss = new WebSocketServer({ server: http }); const rooms = new RoomManager({ autoTimers: false })
    attachWebSocket(wss, rooms, { helloTimeoutMs: 20 })
    await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve))
    const socket = await open(`ws://127.0.0.1:${(http.address() as AddressInfo).port}`)
    cleanup.push(() => { socket.close(); rooms.dispose(); wss.close(); http.close() })
    const code = await new Promise<number>((resolve) => socket.once('close', resolve))
    expect(code).toBe(4008)
  })

  it('closes an oversized payload with code 1009', async () => {
    const http = createServer(); const wss = new WebSocketServer({ server: http }); const rooms = new RoomManager({ autoTimers: false })
    attachWebSocket(wss, rooms, { maxPayloadBytes: 64 })
    await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve))
    const socket = await open(`ws://127.0.0.1:${(http.address() as AddressInfo).port}`)
    cleanup.push(() => { socket.close(); rooms.dispose(); wss.close(); http.close() })
    socket.send(JSON.stringify({ type: 'HELLO', payload: { playerId: 'x'.repeat(200) } }))
    const code = await new Promise<number>((resolve) => socket.once('close', resolve))
    expect(code).toBe(1009)
  })
})
