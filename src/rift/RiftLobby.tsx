import { useState } from 'react'
import { CLASSES } from '../data/config/balance'
import { ConnectionIndicator } from '../network/ConnectionIndicator'
import type { MultiplayerClient } from '../network/useMultiplayer'
import type { Character } from '../types/game'
import { GroupChat } from './GroupChat'
import { FIRST_RIFT } from '../../shared/game-data/rifts/firstRift'
import { ENEMY_CATALOG } from '../../shared/game-data/rifts'
import { RECOMMENDED_PARTY_SIZE } from '../../shared/game-data/balance'

interface Props {
  character: Character
  client: MultiplayerClient
  onBack: () => void
}

export function RiftLobby({ client, onBack }: Props) {
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [slotOffer, setSlotOffer] = useState(0)
  const party = client.party
  const self = party?.members.find((member) => member.id === client.playerId)
  const isLeader = party?.leaderId === client.playerId
  const canStart = Boolean(isLeader && party && party.members.length >= 1 && party.members.every((member) => member.ready && member.connected))
  const progress = client.characterState?.riftProgress.first_rift ?? { highestUnlockedFloor: 1, highestCompletedFloor: 0, completionCount: {} }

  const apply = (partyId: string) => {
    client.send({ type: 'APPLY_TO_PARTY', payload: { partyId, slotOfferCoins: Math.max(0, Math.floor(slotOffer)), operationId: crypto.randomUUID() } })
    setApplicationId(partyId)
  }

  return (
    <main className="lobby-shell">
      <header className="combat-header lobby-header">
        <button className="back-button" onClick={onBack} aria-label="Повернутися до міста">‹</button>
        <div><p>Перший Розлом</p><span>RIFT LOBBY · ПОВЕРХ {party?.floorNumber ?? 1}</span></div>
        <ConnectionIndicator state={client.connection} />
      </header>

      {client.error && <button className="network-error" onClick={client.clearError}>{client.error}<span>×</span></button>}

      <section className="floor-selector">
        {FIRST_RIFT.floors.map((floor) => {
          const unlocked = floor.floorNumber <= progress.highestUnlockedFloor
          return <article key={floor.floorNumber} className={`${unlocked ? 'unlocked' : 'locked'} ${party?.floorNumber === floor.floorNumber ? 'selected' : ''}`}>
            <div><small>FLOOR {floor.floorNumber}</small><strong>{unlocked ? 'Unlocked' : 'Locked'}</strong></div>
            <p>Recommended Level: {floor.recommendedLevel.min}–{floor.recommendedLevel.max}</p>
            <span>{floor.encounterEnemyIds.length + 1} encounters · Boss: {unlocked ? ENEMY_CATALOG[floor.bossId].name : '???'} · Tier {floor.resourceTier} resources</span>
            {party && isLeader && <button disabled={!unlocked || party.floorNumber === floor.floorNumber} onClick={() => client.send({ type: 'SELECT_RIFT_FLOOR', payload: { floorNumber: floor.floorNumber } })}>Select</button>}
          </article>
        })}
      </section>

      {!party ? (
        <>
          <section className="lobby-hero">
            <div className="rift-symbol"><span>◇</span></div>
            <div><p className="eyebrow">Експедиційна зала</p><h1>Зберіть групу</h1><p>Створіть власний загін або подайте заявку лідеру відкритої групи.</p></div>
            <button className="primary-button" onClick={() => client.send({ type: 'CREATE_PARTY' })}>Створити групу <span>＋</span></button>
            <label className="name-field"><span>Offer for slot · available {client.characterState?.availableCoins ?? 0}</span><input type="number" min="0" value={slotOffer} onChange={(event) => setSlotOffer(Math.max(0, Number(event.target.value)))} /></label>
          </section>

          <section className="open-parties">
            <div className="section-heading"><div><span>Перший Розлом</span><h2>Відкриті групи</h2></div><button className="refresh-button" onClick={() => client.send({ type: 'LIST_PARTIES' })}>Оновити</button></div>
            <div className="party-browser">
              {client.parties.length === 0 && <div className="empty-parties"><span>◇</span><strong>Відкритих груп немає</strong><p>Створіть першу експедицію.</p></div>}
              {client.parties.map((item) => (
                <article key={item.id} className="party-listing">
                  <div className="leader-avatar">♛</div>
                  <div><small>ЛІДЕР</small><strong>{item.leaderName}</strong><span>Перший Розлом · Поверх {item.floorNumber}</span></div>
                  <em>Players: {item.playerCount}/{item.maxPlayers}</em>
                  {applicationId === item.id
                    ? <button className="secondary-button" onClick={() => { client.send({ type: 'CANCEL_APPLICATION', payload: { partyId: item.id } }); setApplicationId(null) }}>Скасувати заявку</button>
                    : <button className="apply-button" disabled={item.playerCount >= item.maxPlayers} onClick={() => apply(item.id)}>Подати заявку</button>}
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <div className="lobby-columns">
          <section className="party-room">
            <div className="section-heading"><div><span>Група #{party.id}</span><h2>Загін експедиції</h2></div><small>Учасники: {party.members.length}/5 · Рекомендовано: {RECOMMENDED_PARTY_SIZE.min}–{RECOMMENDED_PARTY_SIZE.max}</small></div>
            {party.members.length < RECOMMENDED_PARTY_SIZE.min && <p className="incomplete-party-warning">{party.members.length === 1 ? 'Ви входите в Розлом самостійно. Соло-забіг значно складніший за рекомендовану групу.' : 'Група менша за рекомендовану. Розлом буде значно складнішим.'}</p>}
            <div className="lobby-members">
              {party.members.map((member) => (
                <article key={member.id} className={`lobby-member ${member.ready ? 'ready' : ''}`}>
                  <span className="member-glyph">{CLASSES[member.classId].glyph}</span>
                  <div><strong>{member.name}{member.isLeader && <em> ЛІДЕР</em>}</strong><small>{CLASSES[member.classId].name} · Рів. {member.level}</small></div>
                  <div className="member-stats"><span>⚔ {member.attack}</span><span>♥ {member.maxHP}</span></div>
                  <span className={`presence ${member.connected ? '' : 'offline'}`}>{member.connected ? member.ready ? '✓ READY' : '⏳ WAITING' : 'OFFLINE'}</span>
                </article>
              ))}
            </div>

            {isLeader && party.applications.length > 0 && <div className="applications"><div className="micro-heading"><span>Заявки</span><small>{party.applications.length} ОЧІКУЄ</small></div>{party.applications.map((applicant) => <article key={applicant.playerId}><div><strong>{applicant.name}</strong><small>{CLASSES[applicant.classId].name} · Рів. {applicant.level} · ⚔ {applicant.attack} · ♥ {applicant.maxHP} · Offer {applicant.slotOfferCoins} coins</small></div><button onClick={() => client.send({ type: 'ACCEPT_APPLICATION', payload: { applicantId: applicant.playerId } })}>Accept</button><button className="reject" onClick={() => client.send({ type: 'REJECT_APPLICATION', payload: { applicantId: applicant.playerId } })}>Reject</button></article>)}</div>}

            <div className="lobby-actions">
              <button className={`ready-button ${self?.ready ? 'selected' : ''}`} onClick={() => client.send({ type: 'SET_READY', payload: { ready: !self?.ready } })}>{self?.ready ? '✓ Ви готові' : 'Я готовий'}</button>
              {isLeader && <button className="primary-button" disabled={!canStart} onClick={() => client.send({ type: 'START_EXPEDITION' })}>Почати експедицію <span>›</span></button>}
              <button className="text-button" onClick={() => client.send({ type: 'LEAVE_PARTY' })}>Покинути групу</button>
            </div>
            {isLeader && !canStart && <p className="start-hint">Кожен учасник має бути online і натиснути READY.</p>}
          </section>
          <GroupChat messages={party.chat} onSend={(message) => client.send({ type: 'PARTY_CHAT_MESSAGE', payload: { message } })} />
        </div>
      )}
    </main>
  )
}
