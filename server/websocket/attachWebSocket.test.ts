import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import WebSocket, { WebSocketServer } from 'ws'
import type { ClientMessage, ServerMessage } from '../../shared/protocol'
import { RoomManager } from '../rooms/RoomManager'
import { attachWebSocket } from './attachWebSocket'

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
})
