import { describe, expect, it } from 'vitest'
import { PROFESSION_ACTIVITIES, PROFESSION_DURATIONS } from '../../shared/professions'
import { createMemoryDatabase, InMemoryPlayerRepository } from '../repositories/InMemoryPlayerRepository'
import { PlayerStateService } from '../players/PlayerStateService'
import { ProfessionService, plannedProfessionReward } from './ProfessionService'

async function setup(classId: 'warrior' | 'blacksmith' | 'alchemist' | 'jeweler' = 'blacksmith') {
  const db = createMemoryDatabase(); const repository = new InMemoryPlayerRepository(db); const players = new PlayerStateService(repository)
  await players.getOrCreate({ playerId: 'player', character: { name: 'Gatherer', classId, level: 1 } })
  let now = 1_000_000
  const service = new ProfessionService(repository, () => now, () => 0.5)
  return { db, players, service, advance: (ms: number) => { now += ms } }
}

describe('Phase 10 professions and offline gathering', () => {
  it('defines 54 data-driven activities and four supported durations', () => {
    expect(PROFESSION_ACTIVITIES).toHaveLength(54)
    expect(new Set(PROFESSION_ACTIVITIES.map((activity) => activity.resourceId)).size).toBe(54)
    expect(PROFESSION_DURATIONS).toEqual([10, 60, 240, 480])
  })

  it('provides lazy level-one mastery only to profession classes', async () => {
    expect((await (await setup()).service.state('player')).progress).toEqual({ profession: 'blacksmith', level: 1, xp: 0 })
    expect((await (await setup('warrior')).service.state('player')).profession).toBeNull()
  })

  it('enforces class, mastery and Rift gates authoritatively', async () => {
    const { service } = await setup()
    const herb = PROFESSION_ACTIVITIES.find((activity) => activity.profession === 'alchemist')!
    await expect(service.start('player', herb.id, 60, 'wrong-profession')).rejects.toMatchObject({ code: 'WRONG_PROFESSION' })
    const tier2 = PROFESSION_ACTIVITIES.find((activity) => activity.profession === 'blacksmith' && activity.tier === 2)!
    await expect(service.start('player', tier2.id, 60, 'locked')).rejects.toMatchObject({ code: 'PROFESSION_ACTIVITY_LOCKED' })
  })

  it('persists timestamps/reward at start and allows only one active job', async () => {
    const { service } = await setup(); const activity = PROFESSION_ACTIVITIES.find((value) => value.profession === 'blacksmith' && value.tier === 1)!
    const started = await service.start('player', activity.id, 60, 'start')
    expect(started.activeJob).toMatchObject({ activityId: activity.id, startedAt: 1_000_000, completesAt: 4_600_000, plannedQuantity: expect.any(Number), plannedXP: expect.any(Number) })
    await expect(service.start('player', activity.id, 60, 'second')).rejects.toMatchObject({ code: 'PROFESSION_JOB_ACTIVE' })
  })

  it('cancels atomically before completion without reward or XP', async () => {
    const { service, players } = await setup(); const activity = PROFESSION_ACTIVITIES.find((value) => value.profession === 'blacksmith' && value.tier === 1)!
    const before = (await players.snapshot('player')).inventory.find((entry) => entry.itemId === activity.resourceId)?.quantity ?? 0
    await service.start('player', activity.id, 10, 'start'); await service.cancel('player', 'cancel')
    expect((await players.snapshot('player')).inventory.find((entry) => entry.itemId === activity.resourceId)?.quantity ?? 0).toBe(before)
    expect((await service.state('player')).progress?.xp).toBe(0)
  })

  it('completes offline, collects exactly once and survives a service restart', async () => {
    const { service, players, db, advance } = await setup(); const activity = PROFESSION_ACTIVITIES.find((value) => value.profession === 'blacksmith' && value.tier === 1)!
    const before = (await players.snapshot('player')).inventory.find((entry) => entry.itemId === activity.resourceId)?.quantity ?? 0
    const started = await service.start('player', activity.id, 10, 'start'); advance(10 * 60_000)
    const restarted = new ProfessionService(new InMemoryPlayerRepository(db), () => 1_600_000, () => 0)
    expect((await restarted.state('player')).activeJob?.viewStatus).toBe('COMPLETED')
    await Promise.all([restarted.collect('player', 'same-collect'), restarted.collect('player', 'same-collect')])
    const quantity = (await players.snapshot('player')).inventory.find((entry) => entry.itemId === activity.resourceId)?.quantity
    expect(quantity).toBe(before + (started.activeJob?.plannedQuantity ?? 0))
    expect((await restarted.state('player')).activeJob).toBeNull()
  })

  it('keeps duration convenience within five percent at hourly scale', () => {
    const activity = PROFESSION_ACTIVITIES[0]
    const rates = PROFESSION_DURATIONS.map((duration) => plannedProfessionReward(activity, duration, 1, () => 0.5).quantity / (duration / 60))
    expect(Math.max(...rates) / Math.min(...rates)).toBeLessThanOrEqual(1.05)
  })

  it('allows exactly one winner for competing collect operations', async () => {
    const { service, players, advance } = await setup(); const activity = PROFESSION_ACTIVITIES[0]
    const before = (await players.snapshot('player')).inventory.find((entry) => entry.itemId === activity.resourceId)?.quantity ?? 0
    const started = await service.start('player', activity.id, 10, 'start-race'); advance(600_000)
    const results = await Promise.allSettled([service.collect('player', 'collect-a'), service.collect('player', 'collect-b')])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect((await players.snapshot('player')).inventory.find((entry) => entry.itemId === activity.resourceId)?.quantity).toBe(before + started.activeJob!.plannedQuantity)
  })

  it('never lets cancel steal a reward after the persisted completion time', async () => {
    const { service, advance } = await setup(); const activity = PROFESSION_ACTIVITIES[0]
    await service.start('player', activity.id, 10, 'start-boundary'); advance(600_000)
    await expect(service.cancel('player', 'late-cancel')).rejects.toMatchObject({ code: 'PROFESSION_JOB_COMPLETED' })
    await expect(service.collect('player', 'boundary-collect')).resolves.toMatchObject({ activeJob: null })
  })

  it('unlocks all tiers only when both mastery and matching Rift floor are available', async () => {
    const { db, service } = await setup(); const profile = db.players.get('player')!
    profile.professionProgress = { profession: 'blacksmith', level: 50, xp: 0 }
    profile.riftProgress = {
      first_rift: { riftId: 'first_rift', highestUnlockedFloor: 3, highestCompletedFloor: 3, completionCount: {} },
      second_rift: { riftId: 'second_rift', highestUnlockedFloor: 3, highestCompletedFloor: 2, completionCount: {} },
    }
    const state = await service.state('player')
    expect(new Set(state.activities.filter((activity) => activity.unlocked).map((activity) => activity.tier))).toEqual(new Set([1, 2, 3, 4, 5, 6]))
  })
})
