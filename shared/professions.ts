import { PHASE7_RESOURCES } from './game-data/phase7Catalog'
import type { ContentTier, Profession, ResourceDefinition } from './game-data/types'

export type GatheringDiscipline = 'MINING' | 'HERBALISM' | 'PROSPECTING'
export type ProfessionJobStatus = 'ACTIVE' | 'CANCELLED' | 'COLLECTED'
export type ProfessionJobViewStatus = ProfessionJobStatus | 'COMPLETED'

export interface ProfessionActivity {
  id: string
  profession: Profession
  discipline: GatheringDiscipline
  resourceId: string
  resourceName: string
  tier: ContentTier
  role: NonNullable<ResourceDefinition['role']>
  requiredMastery: number
}

export interface ProfessionProgressRecord { profession: Profession; level: number; xp: number }
export interface ProfessionJobRecord {
  id: string; profession: Profession; activityId: string; resourceId: string; tier: ContentTier
  durationMinutes: number; startedAt: number; completesAt: number; status: ProfessionJobStatus
  plannedQuantity: number; plannedXP: number; cancelledAt?: number; collectedAt?: number
}

export interface ProfessionActivityView extends ProfessionActivity { unlocked: boolean; lockedReason?: string }
export interface ProfessionState {
  profession: Profession | null
  discipline: GatheringDiscipline | null
  progress: ProfessionProgressRecord | null
  xpRequired: number
  durations: readonly number[]
  activities: ProfessionActivityView[]
  activeJob: (ProfessionJobRecord & { viewStatus: ProfessionJobViewStatus }) | null
}

export const PROFESSION_DURATIONS = [10, 60, 240, 480] as const
export const PROFESSION_MAX_LEVEL = 60
export const PROFESSION_BY_CLASS: Record<string, Profession | undefined> = { blacksmith: 'blacksmith', alchemist: 'alchemist', jeweler: 'jeweler' }
export const DISCIPLINE_BY_PROFESSION: Record<Profession, GatheringDiscipline> = { blacksmith: 'MINING', alchemist: 'HERBALISM', jeweler: 'PROSPECTING' }
export const TIER_MASTERY: Record<ContentTier, number> = { 1: 1, 2: 10, 3: 20, 4: 30, 5: 40, 6: 50 }

export const PROFESSION_ACTIVITIES: ProfessionActivity[] = Object.values(PHASE7_RESOURCES).map((resource) => ({
  id: `gather_${resource.id}`,
  profession: resource.profession,
  discipline: DISCIPLINE_BY_PROFESSION[resource.profession],
  resourceId: resource.id,
  resourceName: resource.name,
  tier: resource.tier!,
  role: resource.role!,
  requiredMastery: TIER_MASTERY[resource.tier!],
}))

export function professionXPRequired(level: number): number { return level >= PROFESSION_MAX_LEVEL ? 0 : 50 + level * 10 }

export function professionRiftRequirement(tier: ContentTier): { riftId: string; floor: number; label: string } | null {
  if (tier === 1) return null
  const second = tier >= 4
  const floor = second ? tier - 3 : tier
  return { riftId: second ? 'second_rift' : 'first_rift', floor, label: `${second ? 'Second' : 'First'} Rift floor ${floor}` }
}
