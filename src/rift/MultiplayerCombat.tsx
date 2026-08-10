import { useEffect, useMemo, useRef, useState } from 'react'
import type { CombatSnapshot } from '../../shared/protocol'
import { CombatControls } from '../combat/CombatControls'
import { PartyCards } from '../combat/PartyCards'
import { ROUND_DURATION_SECONDS } from '../data/config/balance'
import { ConnectionIndicator } from '../network/ConnectionIndicator'
import type { MultiplayerClient } from '../network/useMultiplayer'
import type { Character, Zone } from '../types/game'
import { GroupChat } from './GroupChat'
import { ITEM_CATALOG } from '../../shared/game-data/catalog'
import { RECIPES } from '../../shared/game-data/recipes'

interface Props {
  character: Character
  client: MultiplayerClient
  snapshot: CombatSnapshot
  onCharacterChange: (character: Character) => void
  onExit: () => void
}

export function MultiplayerCombat({ character, client, snapshot, onCharacterChange, onExit }: Props) {
  const [attackZone, setAttackZone] = useState<Zone | null>(null)
  const [defendZone, setDefendZone] = useState<Zone | null>(null)
  const [potionSelected, setPotionSelected] = useState(false)
  const [displayNow, setDisplayNow] = useState(Date.now())
  const receivedAtRef = useRef(Date.now())
  const previousRoundRef = useRef(snapshot.round)
  const self = snapshot.party.find((member) => member.id === client.playerId)

  useEffect(() => {
    receivedAtRef.current = Date.now()
    if (previousRoundRef.current !== snapshot.round) {
      previousRoundRef.current = snapshot.round
      setAttackZone(null)
      setDefendZone(null)
      setPotionSelected(false)
    }
  }, [snapshot])

  useEffect(() => {
    const timer = window.setInterval(() => setDisplayNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [])

  const timeLeft = snapshot.roundEndsAt === null ? 0 : Math.max(0, Math.ceil((snapshot.roundEndsAt - snapshot.serverNow - (displayNow - receivedAtRef.current)) / 1000))
  const characters = useMemo<Character[]>(() => snapshot.party.map((member) => ({
    id: member.id, name: member.name, classId: member.classId, level: member.level, currentXP: 0,
    attack: member.attack, maxHP: member.maxHP, currentHP: member.currentHP, alive: member.alive, ready: member.confirmed,
  })), [snapshot.party])

  const submit = () => {
    if (!defendZone || (!attackZone && !potionSelected)) return
    client.send({
      type: 'SUBMIT_ACTION',
      payload: { round: snapshot.round, defendZone, attackZone: potionSelected ? undefined : attackZone ?? undefined, usePotion: potionSelected },
    })
  }

  const leaveFinishedExpedition = () => {
    if (self) onCharacterChange({
      ...character, level: self.level, attack: self.attack, maxHP: self.maxHP,
      currentHP: self.maxHP, alive: true, ready: false,
    })
    client.send({ type: 'LEAVE_PARTY' })
    onExit()
  }

  if (snapshot.phase === 'POST_ENCOUNTER' && snapshot.personalReward) {
    const continueVotes = Object.values(snapshot.votes).filter((vote) => vote === 'CONTINUE').length
    const exitVotes = Object.values(snapshot.votes).filter((vote) => vote === 'EXIT').length
    const myVote = client.playerId ? snapshot.votes[client.playerId] : undefined
    return (
      <main className="result-shell multiplayer-result">
        <ConnectionIndicator state={client.connection} />
        <section className="result-card">
          <div className="result-sigil">✓</div>
          <p className="eyebrow">Зустріч {snapshot.encounterIndex + 1} з {snapshot.encounterTotal} завершена</p>
          <h1>Перемога</h1>
          <p className="lead">Сервер зафіксував нагороди. Група вирішує, чи йти далі.</p>
          <div className="reward-grid">
            <div><span>✦</span><small>ДОСВІД</small><strong>+{snapshot.personalReward.xp} XP</strong></div>
            <div><span>◉</span><small>МОНЕТИ</small><strong>+{snapshot.personalReward.coins}</strong></div>
            <div><span>◆</span><small>ПЕРСОНАЛЬНИЙ ЛУТ</small><strong>{[...Object.entries(snapshot.personalReward.resources).map(([id, quantity]) => `${ITEM_CATALOG[id]?.name ?? id} ×${quantity}`), ...snapshot.personalReward.recipeIds.map((id) => `Рецепт: ${RECIPES[id]?.name ?? id}`)].join(' · ') || 'Не випав'}</strong></div>
          </div>
          <div className="accumulated-loot"><span>EXPEDITION_LOOT · ще не вилучено</span><strong>{Object.entries(snapshot.expeditionLoot.resources).reduce((sum, [, quantity]) => sum + quantity, 0)} resources · {snapshot.expeditionLoot.recipeIds.length} recipes</strong><p>{[...Object.entries(snapshot.expeditionLoot.resources).map(([id, quantity]) => `${ITEM_CATALOG[id]?.name ?? id} ×${quantity}`), ...snapshot.expeditionLoot.recipeIds.map((id) => `Рецепт: ${RECIPES[id]?.name ?? id}`)].join(' · ') || 'Порожньо'}</p></div>
          {(self?.alive || self?.isLeader) && self?.connected ? <div className="vote-grid"><button className={myVote === 'CONTINUE' ? 'selected' : ''} onClick={() => client.send({ type: 'POST_ENCOUNTER_VOTE', payload: { vote: 'CONTINUE' } })}>CONTINUE <span>{continueVotes}</span></button><button className={myVote === 'EXIT' ? 'selected exit' : ''} onClick={() => client.send({ type: 'POST_ENCOUNTER_VOTE', payload: { vote: 'EXIT' } })}>EXIT <span>{exitVotes}</span></button></div> : <p className="spectator-note">Ви спостерігаєте за голосуванням живих учасників.</p>}
          <p className="vote-note">Більшість вирішує. При нічиїй голос лідера є вирішальним.</p>
        </section>
        <GroupChat messages={client.party?.chat ?? []} onSend={(message) => client.send({ type: 'PARTY_CHAT_MESSAGE', payload: { message } })} />
      </main>
    )
  }

  if (snapshot.phase === 'FINISHED' || snapshot.phase === 'FAILED') {
    return (
      <main className={`result-shell ${snapshot.phase === 'FAILED' ? 'failed' : ''}`}>
        <section className="result-card"><div className="result-sigil">{snapshot.phase === 'FAILED' ? '×' : '✦'}</div><p className="eyebrow">Експедицію завершено</p><h1>{snapshot.phase === 'FAILED' ? 'Розлом поглинув загін' : 'Шлях експедиції завершено'}</h1><p className="lead">Отримано {snapshot.accumulated.xp} XP. {snapshot.phase === 'FAILED' ? 'Сервер застосував втрату 50% невилученого луту.' : 'Персональний expedition loot перенесено до Inventory.'}</p><button className="primary-button" onClick={leaveFinishedExpedition}>Повернутися до міста</button></section>
      </main>
    )
  }

  const enemy = snapshot.enemy
  if (!enemy) return null
  const hpPercent = Math.max(0, enemy.currentHP / enemy.maxHP * 100)
  const isBossWarning = enemy.kind === 'boss' && (enemy.attackCount + 1) % 3 === 0
  const connectedCount = snapshot.party.filter((member) => member.connected).length

  return (
    <main className="combat-shell">
      <header className="combat-header">
        <div className="brand-mark compact">Ⅰ</div>
        <div><p>Перший Розлом</p><span>ПОВЕРХ 1 · SERVER AUTHORITATIVE</span></div>
        <ConnectionIndicator state={client.connection} />
      </header>

      {client.error && <button className="network-error" onClick={client.clearError}>{client.error}<span>×</span></button>}
      <section className="round-bar">
        <div><small>РАУНД</small><strong>{snapshot.round}</strong></div>
        <div className="timer"><span className={timeLeft <= 8 ? 'urgent' : ''}>◷ {String(timeLeft).padStart(2, '0')}</span><div><i style={{ width: `${timeLeft / ROUND_DURATION_SECONDS * 100}%` }} /></div></div>
        <small>ONLINE {connectedCount}/{snapshot.party.length}</small>
      </section>

      <section className={`enemy-panel ${enemy.kind === 'boss' ? 'boss' : ''}`}>
        <div className="enemy-art"><div className="enemy-rune">{enemy.kind === 'boss' ? '♛' : '◇'}</div><span>ПОРОДЖЕННЯ РОЗЛОМУ</span></div>
        <div className="enemy-info"><div><p>{enemy.kind === 'boss' ? 'ВОЛОДАР РОЗЛОМУ' : 'ВОРОГ'}</p><h1>{enemy.name}</h1><span>⚔ {enemy.attack} атака</span></div><div className="enemy-hp-label"><span>ЗДОРОВʼЯ</span><strong>{enemy.currentHP} / {enemy.maxHP}</strong></div><div className="enemy-hp"><span style={{ width: `${hpPercent}%` }} /></div></div>
        {enemy.kind === 'boss' && <div className={`boss-indicator ${isBossWarning ? 'warning' : ''}`}><span>Групова атака через: <strong>{3 - enemy.attackCount % 3}</strong></span>{isBossWarning && <em>Наступна атака боса — групова</em>}</div>}
      </section>

      <div className="combat-grid">
        <PartyCards party={characters} multiplayerMembers={snapshot.party} currentPlayerId={client.playerId ?? ''} />
        <CombatControls
          attackZone={attackZone} defendZone={defendZone} potionSelected={potionSelected}
          potionCooldown={self?.potionCooldown ?? 0} potionQuantity={self?.potionQuantity ?? 0} disabled={Boolean(self?.confirmed && !self.autoBattle)}
          playerAlive={self?.alive ?? false} autoBattle={self?.autoBattle ?? false}
          onAttack={(zone) => { setAttackZone(zone); setPotionSelected(false) }} onDefend={setDefendZone}
          onPotion={() => { setPotionSelected((value) => !value); setAttackZone(null) }} onConfirm={submit}
          onAutoChange={(enabled) => client.send({ type: 'SET_AUTO_BATTLE', payload: { enabled } })}
        />
      </div>

      <div className="combat-bottom-grid">
        <section className="combat-log"><div className="micro-heading"><span>Хроніка бою</span><small>SERVER LOG</small></div><div>{snapshot.log.slice(0, 6).map((entry, index) => <p key={`${entry}-${index}`}><span>{index === 0 ? '›' : '·'}</span>{entry}</p>)}</div></section>
        <GroupChat messages={client.party?.chat ?? []} onSend={(message) => client.send({ type: 'PARTY_CHAT_MESSAGE', payload: { message } })} />
      </div>
    </main>
  )
}
