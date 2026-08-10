import { useCallback, useEffect, useRef, useState } from 'react'
import { CombatControls } from '../combat/CombatControls'
import { generateEnemyAction, resolveRound } from '../combat/engine'
import { PartyCards } from '../combat/PartyCards'
import { ENCOUNTERS, ROUND_DURATION_SECONDS, ZONES } from '../data/config/balance'
import { applyXPAndLevelUps } from '../progression/progression'
import type { Character, CombatAction, EncounterReward, Enemy, Zone } from '../types/game'
import { createMockParty } from './party'

interface Props {
  character: Character
  onCharacterChange: (character: Character) => void
  onExit: () => void
}

type Phase = 'combat' | 'result' | 'failed'

function createEnemy(index: number): Enemy {
  const config = ENCOUNTERS[index]
  return { id: `enemy-${index}`, name: config.name, kind: config.kind, attack: config.attack, maxHP: config.maxHP, currentHP: config.maxHP, attackCount: 0 }
}

function randomZone(): Zone {
  return ZONES[Math.floor(Math.random() * ZONES.length)]
}

export function RiftScreen({ character, onCharacterChange, onExit }: Props) {
  const [encounterIndex, setEncounterIndex] = useState(0)
  const [party, setParty] = useState<Character[]>(() => createMockParty(character))
  const [enemy, setEnemy] = useState<Enemy>(() => createEnemy(0))
  const [round, setRound] = useState(1)
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS)
  const [attackZone, setAttackZone] = useState<Zone | null>(null)
  const [defendZone, setDefendZone] = useState<Zone | null>(null)
  const [potionSelected, setPotionSelected] = useState(false)
  const [potionCooldown, setPotionCooldown] = useState(0)
  const [actions, setActions] = useState<Record<string, CombatAction>>({})
  const [autoBattle, setAutoBattle] = useState(false)
  const [phase, setPhase] = useState<Phase>('combat')
  const [reward, setReward] = useState<EncounterReward | null>(null)
  const [levelsGained, setLevelsGained] = useState(0)
  const [log, setLog] = useState<string[]>(['Експедиція входить до Першого Розлому.'])
  const resolvingRef = useRef(false)
  const livingTeammateIds = party.slice(1).filter((member) => member.alive).map((member) => member.id).join(',')

  const resetRoundChoices = useCallback(() => {
    setAttackZone(null)
    setDefendZone(null)
    setPotionSelected(false)
    setActions({})
    setTimeLeft(ROUND_DURATION_SECONDS)
  }, [])

  const finishEncounter = useCallback((nextParty: Character[]) => {
    const config = ENCOUNTERS[encounterIndex]
    const player = nextParty[0]
    const progressed = applyXPAndLevelUps(player, config.xp)
    const updatedParty = nextParty.map((member, index) => index === 0 ? progressed.character : member)
    setParty(updatedParty)
    onCharacterChange(progressed.character)
    setReward({ xp: config.xp, coins: config.coins, loot: config.loot })
    setLevelsGained(progressed.levelsGained)
    setPhase('result')
  }, [encounterIndex, onCharacterChange])

  const resolveCurrentRound = useCallback((forcedActions?: Record<string, CombatAction>) => {
    if (resolvingRef.current || phase !== 'combat') return
    resolvingRef.current = true
    const lockedActions = { ...actions, ...forcedActions }
    for (const member of party) {
      if (member.alive && !lockedActions[member.id]) {
        lockedActions[member.id] = { type: 'attack', attackZone: randomZone(), defendZone: randomZone() }
      }
    }
    const result = resolveRound({
      party,
      enemy,
      actions: lockedActions,
      enemyAction: generateEnemyAction(enemy, party),
      potionCooldown,
    })
    setParty(result.party)
    setEnemy(result.enemy)
    setPotionCooldown(result.potionCooldown)
    setLog((current) => [...result.log, ...current].slice(0, 18))

    if (result.enemy.currentHP <= 0) finishEncounter(result.party)
    else if (!result.party.some((member) => member.alive)) setPhase('failed')
    else {
      setRound((value) => value + 1)
      resetRoundChoices()
    }
    window.setTimeout(() => { resolvingRef.current = false }, 50)
  }, [actions, enemy, finishEncounter, party, phase, potionCooldown, resetRoundChoices])

  // Mock teammates commit after a short, varied delay each round.
  useEffect(() => {
    if (phase !== 'combat') return
    const timers = livingTeammateIds.split(',').filter(Boolean).map((memberId, index) => window.setTimeout(() => {
      setActions((current) => ({ ...current, [memberId]: { type: 'attack', attackZone: randomZone(), defendZone: randomZone() } }))
      setParty((current) => current.map((item) => item.id === memberId ? { ...item, ready: true } : item))
    }, 450 + index * 190 + Math.random() * 350))
    return () => timers.forEach(window.clearTimeout)
    // round intentionally starts a fresh teammate commitment cycle.
  }, [round, phase, livingTeammateIds])

  useEffect(() => {
    if (phase !== 'combat') return
    const timer = window.setInterval(() => setTimeLeft((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [round, phase])

  useEffect(() => {
    if (timeLeft === 0 && phase === 'combat') resolveCurrentRound()
  }, [timeLeft, phase, resolveCurrentRound])

  // Manual rounds resolve as soon as every living member is ready. Auto rounds always use all 30 seconds.
  useEffect(() => {
    if (autoBattle || phase !== 'combat') return
    const alive = party.filter((member) => member.alive)
    if (alive.length && alive.every((member) => member.ready)) resolveCurrentRound()
  }, [party, autoBattle, phase, resolveCurrentRound])

  useEffect(() => {
    if (!autoBattle || phase !== 'combat' || !party[0]?.alive || actions[party[0].id]) return
    const action: CombatAction = { type: 'attack', attackZone: randomZone(), defendZone: randomZone() }
    setActions((current) => ({ ...current, [party[0].id]: action }))
    setAttackZone(action.attackZone ?? null)
    setDefendZone(action.defendZone)
    setParty((current) => current.map((member, index) => index === 0 ? { ...member, ready: true } : member))
  }, [autoBattle, phase, round, party, actions])

  const confirm = () => {
    const player = party[0]
    if (!player.alive || !defendZone || (!attackZone && !potionSelected)) return
    const action: CombatAction = potionSelected
      ? { type: 'potion', defendZone }
      : { type: 'attack', attackZone: attackZone!, defendZone }
    setActions((current) => ({ ...current, [player.id]: action }))
    setParty((current) => current.map((member, index) => index === 0 ? { ...member, ready: true } : member))
  }

  const overrideAttack = (zone: Zone) => {
    setPotionSelected(false)
    setAttackZone(zone)
    const player = party[0]
    if (autoBattle && player.ready && defendZone) setActions((current) => ({ ...current, [player.id]: { type: 'attack', attackZone: zone, defendZone } }))
  }

  const overrideDefense = (zone: Zone) => {
    setDefendZone(zone)
    const player = party[0]
    if (autoBattle && player.ready) {
      setActions((current) => ({ ...current, [player.id]: { type: 'attack', attackZone: attackZone ?? randomZone(), defendZone: zone } }))
    }
  }

  const continueExpedition = () => {
    if (encounterIndex >= ENCOUNTERS.length - 1) returnToCity()
    else {
      const next = encounterIndex + 1
      setEncounterIndex(next)
      setEnemy(createEnemy(next))
      setRound(1)
      setPhase('combat')
      setReward(null)
      setLevelsGained(0)
      setParty((current) => current.map((member) => ({ ...member, ready: false })))
      resetRoundChoices()
    }
  }

  const returnToCity = () => {
    const player = party[0]
    onCharacterChange({ ...player, currentHP: player.maxHP, alive: true, ready: false })
    onExit()
  }

  const hpPercent = Math.max(0, enemy.currentHP / enemy.maxHP * 100)
  const isBossWarning = enemy.kind === 'boss' && (enemy.attackCount + 1) % 3 === 0

  if (phase === 'result' && reward) {
    const complete = encounterIndex === ENCOUNTERS.length - 1
    return (
      <main className="result-shell">
        <section className="result-card">
          <div className="result-sigil">{complete ? '✦' : '✓'}</div>
          <p className="eyebrow">Зустріч {encounterIndex + 1} з 4 завершена</p>
          <h1>{complete ? 'Розлом підкорено' : 'Перемога'}</h1>
          <p className="lead">{enemy.name} більше не загрожує експедиції.</p>
          {levelsGained > 0 && <div className="level-up-banner">Новий рівень! +{levelsGained} · Атака +{levelsGained} · HP +{levelsGained * 5}</div>}
          <div className="reward-grid">
            <div><span>✦</span><small>ДОСВІД</small><strong>+{reward.xp} XP</strong></div>
            <div><span>◉</span><small>МОНЕТИ</small><strong>+{reward.coins}</strong></div>
            <div><span>◆</span><small>ЗДОБИЧ</small><strong>{reward.loot}</strong></div>
          </div>
          <button className="primary-button" onClick={continueExpedition}>{complete ? 'Повернутися до міста' : 'Йти далі'} <span>›</span></button>
          {!complete && <button className="secondary-button" onClick={returnToCity}>Вийти з експедиції</button>}
        </section>
      </main>
    )
  }

  if (phase === 'failed') {
    return <main className="result-shell failed"><section className="result-card"><div className="result-sigil">×</div><p className="eyebrow">Експедиція завершена</p><h1>Розлом поглинув загін</h1><p className="lead">Усі члени групи загинули. Місто збереже памʼять про цю спробу.</p><button className="primary-button" onClick={returnToCity}>Повернутися до міста</button></section></main>
  }

  return (
    <main className="combat-shell">
      <header className="combat-header">
        <button className="back-button" onClick={returnToCity} aria-label="Покинути експедицію">‹</button>
        <div><p>Перший Розлом</p><span>ПОВЕРХ 1</span></div>
        <div className="encounter-chip">ЗУСТРІЧ <strong>{encounterIndex + 1}</strong> / 4</div>
      </header>

      <section className="round-bar">
        <div><small>РАУНД</small><strong>{round}</strong></div>
        <div className="timer"><span className={timeLeft <= 8 ? 'urgent' : ''}>◷ {String(timeLeft).padStart(2, '0')}</span><div><i style={{ width: `${timeLeft / ROUND_DURATION_SECONDS * 100}%` }} /></div></div>
        <small>{autoBattle ? 'AUTO · ПОВНИЙ ТАЙМЕР' : 'УСІ ГОТОВІ — ХІД'}</small>
      </section>

      <section className={`enemy-panel ${enemy.kind === 'boss' ? 'boss' : ''}`}>
        <div className="enemy-art"><div className="enemy-rune">{enemy.kind === 'boss' ? '♛' : '◇'}</div><span>ПОРОДЖЕННЯ РОЗЛОМУ</span></div>
        <div className="enemy-info">
          <div><p>{enemy.kind === 'boss' ? 'ВОЛОДАР РОЗЛОМУ' : 'ВОРОГ'}</p><h1>{enemy.name}</h1><span>⚔ {enemy.attack} атака</span></div>
          <div className="enemy-hp-label"><span>ЗДОРОВʼЯ</span><strong>{enemy.currentHP} / {enemy.maxHP}</strong></div>
          <div className="enemy-hp"><span style={{ width: `${hpPercent}%` }} /></div>
        </div>
        {enemy.kind === 'boss' && <div className={`boss-indicator ${isBossWarning ? 'warning' : ''}`}><span>Групова атака через: <strong>{3 - (enemy.attackCount % 3)}</strong></span>{isBossWarning && <em>Наступна атака боса — групова</em>}</div>}
      </section>

      <div className="combat-grid">
        <PartyCards party={party} />
        <CombatControls
          attackZone={attackZone} defendZone={defendZone} potionSelected={potionSelected}
          potionCooldown={potionCooldown} disabled={Boolean(party[0]?.ready && !autoBattle)}
          playerAlive={party[0]?.alive ?? false} autoBattle={autoBattle}
          onAttack={overrideAttack} onDefend={overrideDefense}
          onPotion={() => { setPotionSelected((value) => !value); setAttackZone(null) }}
          onConfirm={confirm} onAutoChange={setAutoBattle}
        />
      </div>

      <section className="combat-log">
        <div className="micro-heading"><span>Хроніка бою</span><small>ОСТАННІ ПОДІЇ</small></div>
        <div>{log.slice(0, 5).map((entry, index) => <p key={`${entry}-${index}`}><span>{index === 0 ? '›' : '·'}</span>{entry}</p>)}</div>
      </section>
    </main>
  )
}
