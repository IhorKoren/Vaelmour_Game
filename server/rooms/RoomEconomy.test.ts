import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { CharacterClass } from '../../src/types/game'
import type { DevIdentity, ServerMessage } from '../../shared/protocol'
import { RoomManager } from './RoomManager'

let manager: RoomManager

async function connect(id: string, classId: CharacterClass): Promise<void> {
  const identity: DevIdentity = { playerId: id, character: { name: id, classId, level: 1 } }
  await manager.connect(identity, { connectionId: `connection-${id}`, send: (_message: ServerMessage) => undefined })
}

async function startPair(first: CharacterClass, second: CharacterClass) {
  await connect('leader', first); await connect('member', second)
  const room = manager.createParty('leader')!
  await manager.applyToParty('member', room.id); await manager.reviewApplication('leader', 'member', true)
  manager.setReady('leader', true); manager.setReady('member', true); await manager.startExpedition('leader')
  return room
}

function action(playerId: string, round = 1, attackZone: 'head' | 'body' = 'head') {
  return manager.submitAction(playerId, { round, attackZone, defendZone: 'head', usePotion: false })
}

beforeEach(() => { manager = new RoomManager({ random: () => 0.5, autoTimers: false }) })
afterEach(async () => { await manager.dispose() })

describe('economy integration with authoritative expedition', () => {
  it('combat classes receive 100% base coins', async () => {
    const room = await startPair('warrior', 'ranger'); room.enemy!.currentHP = 1
    await action('leader'); await action('member')
    expect(room.personalRewards.get('leader')?.coins).toBe(14)
    expect(room.personalRewards.get('member')?.coins).toBe(14)
  })

  it('profession classes receive 60% base coins', async () => {
    const room = await startPair('blacksmith', 'alchemist'); room.enemy!.currentHP = 1
    await action('leader'); await action('member')
    expect(room.personalRewards.get('leader')?.coins).toBe(8)
    expect(room.personalRewards.get('member')?.coins).toBe(8)
  })

  it('real potion quantity decreases only after resolved use', async () => {
    const room = await startPair('warrior', 'ranger')
    expect(room.members.get('leader')?.expeditionPotions).toBe(5)
    await manager.submitAction('leader', { round: 1, defendZone: 'head', usePotion: true })
    await action('member')
    expect(room.members.get('leader')?.expeditionPotions).toBe(4)
    expect(await manager.playerStates.countItem('leader', 'healing_potion')).toBe(4)
  })

  it('client cannot fake potion quantity', async () => {
    const room = await startPair('warrior', 'ranger')
    room.members.get('leader')!.expeditionPotions = 0
    expect(await manager.submitAction('leader', { round: 1, defendZone: 'head', usePotion: true })).toBe(false)
    expect(room.actions.has('leader')).toBe(false)
  })

  it('expedition loot remains temporary before extraction', async () => {
    await manager.dispose(); manager = new RoomManager({ random: () => 0, autoTimers: false })
    const room = await startPair('blacksmith', 'alchemist'); room.enemy!.currentHP = 1
    const before = await manager.playerStates.countItem('leader', 'rift_iron')
    await action('leader', 1, 'body'); await action('member', 1, 'body')
    expect(room.phase).toBe('POST_ENCOUNTER')
    expect(room.expeditionLoot.get('leader')?.resources.rift_iron).toBe(1)
    expect(await manager.playerStates.countItem('leader', 'rift_iron')).toBe(before)
  })

  it('successful exit commits expedition loot', async () => {
    const room = await startPair('warrior', 'ranger')
    room.phase = 'POST_ENCOUNTER'
    room.expeditionLoot.set('leader', { resources: { rift_iron: 2 }, recipeIds: [] })
    const before = await manager.playerStates.countItem('leader', 'rift_iron')
    await manager.vote('leader', 'EXIT'); await manager.vote('member', 'EXIT')
    expect(room.phase).toBe('FINISHED')
    expect(await manager.playerStates.countItem('leader', 'rift_iron')).toBe(before + 2)
  })

  it('failed expedition loses configured 50% non-coin loot', async () => {
    const room = await startPair('warrior', 'ranger')
    room.expeditionLoot.set('leader', { resources: { rift_iron: 4 }, recipeIds: [] })
    const before = await manager.playerStates.countItem('leader', 'rift_iron')
    for (const member of room.members.values()) member.character.currentHP = 1
    room.enemy = { id: 'boss', name: 'Executioner', kind: 'boss', attack: 99_999, maxHP: 99_999, currentHP: 99_999, attackCount: 2 }
    await action('leader'); await action('member')
    expect(room.phase).toBe('FAILED')
    expect(await manager.playerStates.countItem('leader', 'rift_iron')).toBe(before + 2)
  })
})
