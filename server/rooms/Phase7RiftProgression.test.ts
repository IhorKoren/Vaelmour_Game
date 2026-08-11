import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DevIdentity, ServerMessage } from '../../shared/protocol'
import type { CharacterClass } from '../../src/types/game'
import { RoomManager } from './RoomManager'

let manager: RoomManager
async function connect(id: string, classId: CharacterClass = 'warrior') {
  const messages: ServerMessage[] = []
  const identity: DevIdentity = { playerId: id, character: { name: id, classId, level: 1 } }
  await manager.connect(identity, { connectionId: id, send: (message) => messages.push(message) })
  return messages
}

beforeEach(() => { manager = new RoomManager({ autoTimers: false, random: () => 0.2 }) })
afterEach(async () => { await manager.dispose() })

describe('persistent First Rift floor progression', () => {
  it('starts with Floor 1 unlocked and Floor 2 locked', async () => {
    await connect('leader')
    const progress = await manager.playerStates.riftProgress('leader')
    expect(progress.highestUnlockedFloor).toBe(1)
    expect(progress.highestCompletedFloor).toBe(0)
  })
  it('Floor 1 completion unlocks Floor 2', async () => {
    await connect('leader')
    const progress = await manager.playerStates.completeRiftFloor('leader', 'first_rift', 1, 'clear-1')
    expect(progress.highestUnlockedFloor).toBe(2)
  })
  it('Floor 2 completion unlocks Floor 3 without skipping', async () => {
    await connect('leader')
    await manager.playerStates.completeRiftFloor('leader', 'first_rift', 1, 'clear-1')
    const progress = await manager.playerStates.completeRiftFloor('leader', 'first_rift', 2, 'clear-2')
    expect(progress.highestUnlockedFloor).toBe(3)
    expect(progress.highestCompletedFloor).toBe(2)
  })
  it('completed floors can be replayed and count completions', async () => {
    await connect('leader')
    await manager.playerStates.completeRiftFloor('leader', 'first_rift', 1, 'clear-a')
    const progress = await manager.playerStates.completeRiftFloor('leader', 'first_rift', 1, 'clear-b')
    expect(progress.completionCount[1]).toBe(2)
  })
  it('cannot select a locked floor', async () => {
    await connect('leader'); manager.createParty('leader')
    expect(await manager.selectRiftFloor('leader', 2)).toBe(false)
  })
  it('every participant must have selected floor unlocked', async () => {
    await connect('leader'); await connect('member', 'alchemist')
    await manager.playerStates.completeRiftFloor('leader', 'first_rift', 1, 'leader-clear')
    const room = manager.createParty('leader')!
    await manager.applyToParty('member', room.id); await manager.reviewApplication('leader', 'member', true)
    expect(await manager.selectRiftFloor('leader', 2)).toBe(true)
    manager.setReady('leader', true); manager.setReady('member', true)
    expect(await manager.startExpedition('leader')).toBe(false)
    expect(room.phase).toBe('LOBBY')
  })
  it('dead participant receives no encounter XP', async () => {
    await connect('leader'); await connect('member')
    const room = manager.createParty('leader')!
    await manager.applyToParty('member', room.id); await manager.reviewApplication('leader', 'member', true)
    manager.setReady('leader', true); manager.setReady('member', true); await manager.startExpedition('leader')
    room.members.get('member')!.character.alive = false; room.members.get('member')!.character.currentHP = 0; room.enemy!.currentHP = 1
    await manager.submitAction('leader', { round: 1, attackZone: 'body', defendZone: 'body', usePotion: false })
    expect(room.personalRewards.get('member')?.xp).toBe(0)
  })
})
