import { randomUUID } from 'node:crypto'
import { PROFESSION_ACTIVITIES, PROFESSION_BY_CLASS, PROFESSION_DURATIONS, PROFESSION_MAX_LEVEL, professionRiftRequirement, professionXPRequired, type ProfessionActivity, type ProfessionProgressRecord, type ProfessionState } from '../../shared/professions'
import type { InventoryEntry } from '../../shared/game-data/types'
import type { PlayerRepository, StoredPlayerProfile } from '../repositories/types'
import { EconomyError } from '../players/PlayerStateService'
import type { TelemetrySink } from '../telemetry/PlaytestTelemetry'
import { NoopTelemetry } from '../telemetry/PlaytestTelemetry'

const ROLE_RATE = { COMMON: 18, SECONDARY: 12, CORE: 10 } as const
const DURATION_BONUS: Record<number, number> = { 10: 1, 60: 1.01, 240: 1.03, 480: 1.05 }

export function activityUnlocked(profile: StoredPlayerProfile, activity: ProfessionActivity, level: number): string | null {
  if (level < activity.requiredMastery) return `Requires mastery ${activity.requiredMastery}`
  const requirement = professionRiftRequirement(activity.tier)
  if (!requirement) return null
  const progress = profile.riftProgress ?? {}
  if (requirement.riftId === 'second_rift' && (progress.first_rift?.highestCompletedFloor ?? 0) < 3) return 'Complete First Rift floor 3'
  if ((progress[requirement.riftId]?.highestUnlockedFloor ?? 0) < requirement.floor) return `Unlock ${requirement.label}`
  return null
}

export function plannedProfessionReward(activity: ProfessionActivity, durationMinutes: number, mastery: number, random: () => number): { quantity: number; xp: number } {
  const hours = durationMinutes / 60
  const tierScarcity = 1 + (activity.tier - 1) * 0.1
  const masteryBonus = 1 + Math.min(0.2, Math.max(0, mastery - activity.requiredMastery) * 0.004)
  const rng = 0.92 + random() * 0.16
  const rawQuantity = (ROLE_RATE[activity.role] / tierScarcity) * hours * masteryBonus * DURATION_BONUS[durationMinutes] * rng
  const quantity = Math.max(1, Math.floor(rawQuantity) + (random() < rawQuantity % 1 ? 1 : 0))
  const xp = Math.max(1, Math.round((30 + activity.tier * 5) * hours * DURATION_BONUS[durationMinutes]))
  return { quantity, xp }
}

export class ProfessionService {
  constructor(private readonly repository: PlayerRepository, private readonly now: () => number = Date.now, private readonly random: () => number = Math.random, private readonly telemetry: TelemetrySink = new NoopTelemetry()) {}

  async state(playerId: string): Promise<ProfessionState> {
    const profile = await this.repository.read(playerId)
    if (!profile) throw new EconomyError('PLAYER_NOT_FOUND', 'Player not found.')
    const state = this.snapshot(profile)
    if (state.activeJob?.viewStatus === 'COMPLETED') await this.telemetry.record({ type: 'PROFESSION_JOB_COMPLETED', eventKey: `profession:completed:${state.activeJob.id}`, playerId, payload: { jobId: state.activeJob.id, activityId: state.activeJob.activityId } })
    return state
  }

  /** Read-only admin/debug visibility without exposing mutation controls. */
  async debugState(playerId: string): Promise<{ state: ProfessionState; recentJobs: StoredPlayerProfile['professionJobs'] }> {
    const profile = await this.repository.read(playerId)
    if (!profile) throw new EconomyError('PLAYER_NOT_FOUND', 'Player not found.')
    return { state: this.snapshot(profile), recentJobs: [...(profile.professionJobs ?? [])].slice(-20).reverse() }
  }

  async start(playerId: string, activityId: string, durationMinutes: number, operationId: string): Promise<ProfessionState> {
    const activity = PROFESSION_ACTIVITIES.find((value) => value.id === activityId)
    if (!activity) throw new EconomyError('PROFESSION_ACTIVITY_NOT_FOUND', 'Unknown profession activity.')
    if (!(PROFESSION_DURATIONS as readonly number[]).includes(durationMinutes)) throw new EconomyError('INVALID_PROFESSION_DURATION', 'Unsupported job duration.')
    const jobId = randomUUID()
    const at = this.now()
    const result = await this.repository.transact(playerId, { key: operationId, type: 'PROFESSION_START', referenceId: jobId }, (profile) => {
      const profession = PROFESSION_BY_CLASS[profile.classId]
      if (!profession) throw new EconomyError('CLASS_HAS_NO_PROFESSION', 'This class has no gathering profession.')
      if (activity.profession !== profession) throw new EconomyError('WRONG_PROFESSION', 'Activity belongs to another profession.')
      const progress = profile.professionProgress ?? { profession, level: 1, xp: 0 }
      const reason = activityUnlocked(profile, activity, progress.level)
      if (reason) throw new EconomyError('PROFESSION_ACTIVITY_LOCKED', reason)
      if ((profile.professionJobs ?? []).some((job) => job.status === 'ACTIVE')) throw new EconomyError('PROFESSION_JOB_ACTIVE', 'Only one profession job may be active.')
      const reward = plannedProfessionReward(activity, durationMinutes, progress.level, this.random)
      profile.professionProgress = progress
      profile.professionJobs = [...(profile.professionJobs ?? []), { id: jobId, profession, activityId, resourceId: activity.resourceId, tier: activity.tier, durationMinutes, startedAt: at, completesAt: at + durationMinutes * 60_000, status: 'ACTIVE', plannedQuantity: reward.quantity, plannedXP: reward.xp }]
    })
    if (result.applied) await this.telemetry.record({ type: 'PROFESSION_JOB_STARTED', eventKey: `profession:started:${jobId}`, playerId, payload: { jobId, activityId, durationMinutes } })
    return this.snapshot(result.profile)
  }

  async cancel(playerId: string, operationId: string): Promise<ProfessionState> {
    const at = this.now()
    let jobId = ''
    const result = await this.repository.transact(playerId, { key: operationId, type: 'PROFESSION_CANCEL' }, (profile) => {
      const job = (profile.professionJobs ?? []).find((value) => value.status === 'ACTIVE')
      if (!job) throw new EconomyError('PROFESSION_JOB_NOT_FOUND', 'No active profession job.')
      if (at >= job.completesAt) throw new EconomyError('PROFESSION_JOB_COMPLETED', 'Completed jobs must be collected.')
      job.status = 'CANCELLED'; job.cancelledAt = at; jobId = job.id
    })
    if (result.applied) await this.telemetry.record({ type: 'PROFESSION_JOB_CANCELLED', eventKey: `profession:cancelled:${jobId}`, playerId, payload: { jobId } })
    return this.snapshot(result.profile)
  }

  async collect(playerId: string, operationId: string): Promise<ProfessionState> {
    const at = this.now()
    let jobId = ''; let levels = 0
    const result = await this.repository.transact(playerId, { key: operationId, type: 'PROFESSION_COLLECT' }, (profile) => {
      const job = (profile.professionJobs ?? []).find((value) => value.status === 'ACTIVE')
      if (!job) throw new EconomyError('PROFESSION_JOB_NOT_FOUND', 'No completed profession job.')
      if (at < job.completesAt) throw new EconomyError('PROFESSION_JOB_IN_PROGRESS', 'Profession job is still in progress.')
      this.addResource(profile.inventory, job.resourceId, job.plannedQuantity)
      const progress = profile.professionProgress ?? { profession: job.profession, level: 1, xp: 0 }
      progress.xp += job.plannedXP
      while (progress.level < PROFESSION_MAX_LEVEL && progress.xp >= professionXPRequired(progress.level)) {
        progress.xp -= professionXPRequired(progress.level); progress.level += 1; levels += 1
      }
      profile.professionProgress = progress
      job.status = 'COLLECTED'; job.collectedAt = at; jobId = job.id
    })
    if (result.applied) {
      await this.telemetry.record({ type: 'PROFESSION_JOB_COMPLETED', eventKey: `profession:completed:${jobId}`, playerId, payload: { jobId } })
      await this.telemetry.record({ type: 'PROFESSION_REWARD_COLLECTED', eventKey: `profession:collected:${jobId}`, playerId, payload: { jobId } })
      if (levels) await this.telemetry.record({ type: 'PROFESSION_LEVEL_UP', eventKey: `profession:level:${jobId}`, playerId, payload: { jobId, levels } })
    }
    return this.snapshot(result.profile)
  }

  private snapshot(profile: StoredPlayerProfile): ProfessionState {
    const profession = PROFESSION_BY_CLASS[profile.classId] ?? null
    if (!profession) return { profession: null, discipline: null, progress: null, xpRequired: 0, durations: PROFESSION_DURATIONS, activities: [], activeJob: null }
    const progress: ProfessionProgressRecord = profile.professionProgress ?? { profession, level: 1, xp: 0 }
    const active = (profile.professionJobs ?? []).find((job) => job.status === 'ACTIVE')
    return {
      profession, discipline: profession === 'blacksmith' ? 'MINING' : profession === 'alchemist' ? 'HERBALISM' : 'PROSPECTING', progress,
      xpRequired: professionXPRequired(progress.level), durations: PROFESSION_DURATIONS,
      activities: PROFESSION_ACTIVITIES.filter((activity) => activity.profession === profession).map((activity) => { const lockedReason = activityUnlocked(profile, activity, progress.level); return { ...activity, unlocked: !lockedReason, lockedReason: lockedReason ?? undefined } }),
      activeJob: active ? { ...active, viewStatus: this.now() >= active.completesAt ? 'COMPLETED' : 'ACTIVE' } : null,
    }
  }

  private addResource(inventory: InventoryEntry[], itemId: string, quantity: number): void {
    const stack = inventory.find((entry) => entry.itemId === itemId)
    if (stack) stack.quantity += quantity
    else inventory.push({ entryId: randomUUID(), itemId, quantity })
  }
}
