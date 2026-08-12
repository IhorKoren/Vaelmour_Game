import { useEffect, useMemo, useRef, useState } from 'react'
import type { MultiplayerClient } from '../network/useMultiplayer'

export function ProfessionPanel({ client }: { client: MultiplayerClient }) {
  const state = client.professionState
  const [duration, setDuration] = useState(60)
  const [now, setNow] = useState(Date.now())
  const refreshedJob = useRef<string | null>(null)
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  useEffect(() => {
    const job = state?.activeJob
    if (job?.viewStatus === 'ACTIVE' && now >= job.completesAt && refreshedJob.current !== job.id) {
      refreshedJob.current = job.id
      client.send({ type: 'GET_PROFESSION_STATE' })
    }
  }, [client, now, state?.activeJob])
  const groups = useMemo(() => state ? [...new Set(state.activities.map((activity) => activity.tier))] : [], [state])
  if (!state) return <section className="city-content-panel loading-panel"><p>Loading profession state…</p></section>
  if (!state.profession || !state.progress) return <section className="city-content-panel"><h2>Professions</h2><p>Warriors and Rangers do not have a gathering profession.</p></section>
  const job = state.activeJob
  const remaining = job ? Math.max(0, job.completesAt - now) : 0
  return <section className="city-content-panel profession-panel">
    <div className="panel-heading"><div><p className="eyebrow">{state.discipline}</p><h2>{state.profession} mastery {state.progress.level}</h2></div><strong>{state.progress.xp} / {state.xpRequired || 'MAX'} XP</strong></div>
    {job ? <div className="profession-job"><h3>{state.activities.find((activity) => activity.id === job.activityId)?.resourceName ?? job.resourceId}</h3><p>{job.viewStatus === 'COMPLETED' ? 'Ready to collect' : `${Math.ceil(remaining / 60000)} min remaining`} · Reward locked at start: {job.plannedQuantity} resource, {job.plannedXP} XP</p>{job.viewStatus === 'COMPLETED' ? <button className="primary-button" onClick={() => client.send({ type: 'COLLECT_PROFESSION_JOB', payload: { operationId: crypto.randomUUID() } })}>Collect reward</button> : <button className="secondary-button" onClick={() => client.send({ type: 'CANCEL_PROFESSION_JOB', payload: { operationId: crypto.randomUUID() } })}>Cancel (no reward)</button>}</div> : <>
      <label className="profession-duration">Duration <select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>{state.durations.map((minutes) => <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes} min` : `${minutes / 60} h`}</option>)}</select></label>
      {groups.map((tier) => <div key={tier} className="profession-tier"><h3>Tier {tier}</h3><div className="profession-grid">{state.activities.filter((activity) => activity.tier === tier).map((activity) => <button key={activity.id} disabled={!activity.unlocked} title={activity.lockedReason} onClick={() => client.send({ type: 'START_PROFESSION_JOB', payload: { activityId: activity.id, durationMinutes: duration, operationId: crypto.randomUUID() } })}><strong>{activity.resourceName}</strong><small>{activity.role}</small><span>{activity.unlocked ? 'Start gathering' : activity.lockedReason}</span></button>)}</div></div>)}
    </>}
  </section>
}
