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

describe('Phase 9 Second Rift progression', () => {
  async function clearFirstRift() {
    await manager.playerStates.completeRiftFloor('leader', 'first_rift', 1, 'first-1')
    await manager.playerStates.completeRiftFloor('leader', 'first_rift', 2, 'first-2')
    await manager.playerStates.completeRiftFloor('leader', 'first_rift', 3, 'first-3')
  }

  it('is locked by default', async () => {
    await connect('leader')
    expect((await manager.playerStates.riftProgress('leader', 'second_rift')).highestUnlockedFloor).toBe(0)
  })

  it('First Rift Floor 3 unlocks Second Rift Floor 1', async () => {
    await connect('leader'); await clearFirstRift()
    expect((await manager.playerStates.riftProgress('leader', 'second_rift')).highestUnlockedFloor).toBe(1)
    expect((await manager.playerStates.snapshot('leader')).riftProgress.second_rift.highestUnlockedFloor).toBe(1)
  })

  it('Second Rift clears unlock Floors 2 and 3 sequentially', async () => {
    await connect('leader'); await clearFirstRift()
    expect((await manager.playerStates.completeRiftFloor('leader', 'second_rift', 1, 'second-1')).highestUnlockedFloor).toBe(2)
    expect((await manager.playerStates.completeRiftFloor('leader', 'second_rift', 2, 'second-2')).highestUnlockedFloor).toBe(3)
  })

  it('cannot skip a locked Second Rift floor or spoof selection', async () => {
    await connect('leader'); await clearFirstRift(); manager.createParty('leader')
    await expect(manager.playerStates.completeRiftFloor('leader', 'second_rift', 2, 'spoof')).rejects.toMatchObject({ code: 'RIFT_FLOOR_LOCKED' })
    expect(await manager.selectRiftFloor('leader', 'second_rift', 2)).toBe(false)
    expect(manager.rooms.values().next().value?.riftId).toBe('first_rift')
  })

  it.each([1, 2, 3, 4, 5])('supports a ready Second Rift party of %i player(s)', async (size) => {
    manager = new RoomManager({ autoTimers: false, random: () => 0.2, minPartySize: 1 })
    await connect('leader'); await clearFirstRift()
    const room = manager.createParty('leader')!
    expect(await manager.selectRiftFloor('leader', 'second_rift', 1)).toBe(true)
    for (let index = 2; index <= size; index += 1) {
      const id = `second-member-${index}`; await connect(id); await manager.playerStates.completeRiftFloor(id, 'first_rift', 1, `${id}-1`); await manager.playerStates.completeRiftFloor(id, 'first_rift', 2, `${id}-2`); await manager.playerStates.completeRiftFloor(id, 'first_rift', 3, `${id}-3`)
      await manager.applyToParty(id, room.id); await manager.reviewApplication('leader', id, true); manager.setReady(id, true)
    }
    manager.setReady('leader', true)
    expect(await manager.startExpedition('leader')).toBe(true)
    expect(room.riftId).toBe('second_rift')
    expect(room.members.size).toBe(size)
    expect(room.enemy?.definitionId).toBe('srf1_cinder_thrall')
  })
})
