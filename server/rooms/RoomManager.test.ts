import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DevIdentity, ServerMessage } from '../../shared/protocol'
import type { ClientPeer } from '../types/room'
import { RoomManager } from './RoomManager'

let clock = 10_000
let manager: RoomManager
let messages: Record<string, ServerMessage[]>

function identity(id: string, name = id): DevIdentity {
  return { playerId: id, character: { name, classId: 'warrior', level: 1 } }
}

async function connect(id: string, connectionId = `connection-${id}`): Promise<ClientPeer> {
  messages[id] ??= []
  const peer: ClientPeer = { connectionId, send: (message) => messages[id].push(message) }
  await manager.connect(identity(id), peer)
  return peer
}

async function createTwoPlayerRoom() {
  await connect('leader')
  await connect('member')
  const room = manager.createParty('leader')!
  await manager.applyToParty('member', room.id)
  await manager.reviewApplication('leader', 'member', true)
  manager.setReady('leader', true)
  manager.setReady('member', true)
  return room
}

function normalAction(round = 1) {
  return { round, attackZone: 'head' as const, defendZone: 'head' as const, usePotion: false }
}

beforeEach(() => {
  clock = 10_000
  messages = {}
  manager = new RoomManager({ now: () => clock, random: () => 0.5, roundDurationMs: 30_000, autoTimers: false })
})

afterEach(async () => { await manager.dispose() })

describe('multiplayer room authority', () => {
  it('only leader can start', async () => {
    const room = await createTwoPlayerRoom()
    expect(await manager.startExpedition('member')).toBe(false)
    expect(room.phase).toBe('LOBBY')
    expect(await manager.startExpedition('leader')).toBe(true)
  })

  it('party composition locks after start', async () => {
    const room = await createTwoPlayerRoom()
    await manager.startExpedition('leader')
    await manager.leaveParty('member')
    expect(room.members.size).toBe(2)
  })

  it('cannot join a started expedition', async () => {
    const room = await createTwoPlayerRoom()
    await manager.startExpedition('leader')
    await connect('late')
    expect(await manager.applyToParty('late', room.id)).toBe(false)
    expect(room.members.has('late')).toBe(false)
  })

  it('enforces maximum 5 players', async () => {
    await connect('leader')
    const room = manager.createParty('leader')!
    for (const id of ['p2', 'p3', 'p4', 'p5']) {
      await connect(id); await manager.applyToParty(id, room.id); await manager.reviewApplication('leader', id, true)
    }
    await connect('p6')
    expect(await manager.applyToParty('p6', room.id)).toBe(false)
    expect(room.members.size).toBe(5)
  })

  it('resolves early when every living manual player confirms', async () => {
    const room = await createTwoPlayerRoom()
    await manager.startExpedition('leader')
    await manager.submitAction('leader', normalAction())
    expect(room.round).toBe(1)
    await manager.submitAction('member', normalAction())
    expect(room.round).toBe(2)
  })

  it('does not resolve early while an Auto Battle player is alive', async () => {
    const room = await createTwoPlayerRoom()
    await manager.startExpedition('leader')
    await manager.setAutoBattle('member', true)
    await manager.submitAction('leader', normalAction())
    await manager.submitAction('member', normalAction())
    expect(room.round).toBe(1)
    clock += 30_000
    await manager.resolveDueRounds(clock)
    expect(room.round).toBe(2)
  })

  it('timeout produces no player attack and a random defense', async () => {
    const room = await createTwoPlayerRoom()
    await manager.startExpedition('leader')
    const enemyHP = room.enemy!.currentHP
    clock += 30_000
    await manager.resolveDueRounds(clock)
    expect(room.enemy!.currentHP).toBe(enemyHP)
    expect(room.log.some((entry) => entry.includes('блокує'))).toBe(true)
  })

  it('keeps disconnected player in the locked party', async () => {
    const room = await createTwoPlayerRoom()
    await manager.startExpedition('leader')
    manager.disconnect('member', 'connection-member')
    expect(room.members.has('member')).toBe(true)
    expect(room.members.get('member')?.connected).toBe(false)
  })

  it('reconnect restores the same player without a clone', async () => {
    const room = await createTwoPlayerRoom()
    await manager.startExpedition('leader')
    manager.disconnect('member', 'connection-member')
    await connect('member', 'replacement-connection')
    manager.disconnect('member', 'connection-member')
    expect(room.members.size).toBe(2)
    expect(room.members.get('member')?.connected).toBe(true)
    expect(messages.member.some((message) => message.type === 'COMBAT_SNAPSHOT')).toBe(true)
  })

  it('validates potion cooldown on the server', async () => {
    const room = await createTwoPlayerRoom()
    await manager.startExpedition('leader')
    expect(await manager.submitAction('leader', { round: 1, defendZone: 'head', usePotion: true })).toBe(true)
    await manager.submitAction('member', normalAction())
    expect(room.members.get('leader')?.potionCooldown).toBe(2)
    expect(await manager.submitAction('leader', { round: 2, defendZone: 'head', usePotion: true })).toBe(false)
  })

  it('keeps every third boss attack as a multiplayer group attack', async () => {
    const room = await createTwoPlayerRoom()
    await manager.startExpedition('leader')
    room.encounterIndex = 3
    room.enemy = { id: 'boss', name: 'Boss', kind: 'boss', attack: 92, maxHP: 900, currentHP: 900, attackCount: 2 }
    const before = [...room.members.values()].map((member) => member.character.currentHP)
    await manager.submitAction('leader', normalAction())
    await manager.submitAction('member', normalAction())
    const after = [...room.members.values()].map((member) => member.character.currentHP)
    expect(room.enemy.attackCount).toBe(3)
    expect(after[0]).toBeLessThan(before[0])
    expect(after[1]).toBeLessThan(before[1])
  })

  it('rejects actions from dead players', async () => {
    const room = await createTwoPlayerRoom()
    await manager.startExpedition('leader')
    room.members.get('member')!.character.alive = false
    room.members.get('member')!.character.currentHP = 0
    expect(await manager.submitAction('member', normalAction())).toBe(false)
    expect(room.actions.has('member')).toBe(false)
  })

  it('duplicate stale action cannot resolve a round twice', async () => {
    const room = await createTwoPlayerRoom()
    await manager.startExpedition('leader')
    await manager.submitAction('leader', normalAction())
    await manager.submitAction('member', normalAction())
    expect(room.round).toBe(2)
    expect(await manager.submitAction('member', normalAction(1))).toBe(false)
    expect(room.round).toBe(2)
  })
})
