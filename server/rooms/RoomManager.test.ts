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
  it('supports a solo leader start', async () => {
    manager = new RoomManager({ now: () => clock, random: () => 0.5, roundDurationMs: 30_000, autoTimers: false, minPartySize: 1 })
    await connect('leader')
    const room = manager.createParty('leader')!
    manager.setReady('leader', true)
    expect(await manager.startExpedition('leader')).toBe(true)
    expect(room.phase).toBe('COMBAT')
    expect(room.members.size).toBe(1)
  })

  it.each([2, 3, 4, 5])('supports a connected ready party of %i players', async (size) => {
    await connect('leader')
    const room = manager.createParty('leader')!
    for (let index = 2; index <= size; index += 1) {
      const id = `member-${index}`; await connect(id); await manager.applyToParty(id, room.id); await manager.reviewApplication('leader', id, true); manager.setReady(id, true)
    }
    manager.setReady('leader', true)
    expect(await manager.startExpedition('leader')).toBe(true)
    expect(room.phase).toBe('COMBAT')
    expect(room.members.size).toBe(size)
  })

  it('rejects START when a ready member disconnected', async () => {
    const room = await createTwoPlayerRoom()
    manager.disconnect('member', 'connection-member')
    expect(await manager.startExpedition('leader')).toBe(false)
    expect(room.phase).toBe('LOBBY')
    expect(messages.leader.some((message) => message.type === 'ERROR' && message.payload.code === 'PARTY_MEMBER_DISCONNECTED')).toBe(true)
  })
  it('rejects a disconnect that races with START validation', async () => {
    const room = await createTwoPlayerRoom()
    const original = manager.playerStates.riftProgress.bind(manager.playerStates)
    manager.playerStates.riftProgress = async (id, riftId) => {
      const progress = await original(id, riftId)
      if (id === 'member') manager.disconnect('member', 'connection-member')
      return progress
    }
    expect(await manager.startExpedition('leader')).toBe(false)
    expect(room.phase).toBe('LOBBY')
    expect((await manager.economy.wallet('leader')).coins).toBe(0)
  })

  it('does not settle a paid slot when START preflight fails', async () => {
    await connect('leader'); await connect('member')
    const room = manager.createParty('leader')!
    await manager.playerStates.awardProgression('member', 1, 0, 120, 'paid-slot-funds')
    await manager.applyToParty('member', room.id, 120, 'paid-slot-apply')
    await manager.reviewApplication('leader', 'member', true)
    manager.setReady('leader', true); manager.setReady('member', true)
    manager.playerStates.snapshot = async () => { throw new Error('forced START preflight failure') }
    await expect(manager.startExpedition('leader')).rejects.toThrow('forced START preflight failure')
    expect(room.phase).toBe('LOBBY')
    expect((await manager.economy.wallet('leader')).coins).toBe(0)
    expect((await manager.economy.wallet('member')).reservedCoins).toBe(120)
  })
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

  it('fans presence out to friends but not strangers', async () => {
    await connect('leader', 'leader-connection'); await connect('friend', 'friend-connection'); await connect('stranger', 'stranger-connection')
    await manager.friends.sendRequest('leader', 'friend', 'friend-request')
    const request = (await manager.friends.state('friend')).incoming[0]
    await manager.friends.respond('friend', request.id, true, 'friend-accept')
    messages.friend = []; messages.stranger = []
    manager.createParty('leader')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(messages.friend.some((message) => message.type === 'PRESENCE_UPDATE' && message.payload.playerId === 'leader')).toBe(true)
    expect(messages.stranger.some((message) => message.type === 'PRESENCE_UPDATE' && message.payload.playerId === 'leader')).toBe(false)
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

  it('separates Rift reconnect expiry and returns the player to City after terminal cleanup', async () => {
    const room = await createTwoPlayerRoom(); await manager.startExpedition('leader')
    manager.disconnect('member', 'connection-member'); clock += 60_001
    await connect('member', 'expired-connection')
    expect(messages.member.some((message) => message.type === 'ERROR' && message.payload.code === 'RIFT_RECONNECT_EXPIRED')).toBe(true)
    for (const participant of room.members.values()) { participant.character.currentHP = 0; participant.character.alive = false }
    await manager.resolveDueRounds(clock)
    expect(room.phase).toBe('FAILED')
    messages.member = []
    await connect('member', 'city-connection')
    expect(messages.member.some((message) => message.type === 'WELCOME')).toBe(true)
    expect(messages.member.some((message) => message.type === 'COMBAT_SNAPSHOT')).toBe(false)
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
