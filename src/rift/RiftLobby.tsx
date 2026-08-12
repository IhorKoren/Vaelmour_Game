import { useState } from 'react'
import { CLASSES } from '../data/config/balance'
import { ConnectionIndicator } from '../network/ConnectionIndicator'
import type { MultiplayerClient } from '../network/useMultiplayer'
import type { Character } from '../types/game'
import { GroupChat } from './GroupChat'
import { ENEMY_CATALOG, RIFT_CATALOG } from '../../shared/game-data/rifts'
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
  const selectedRift = RIFT_CATALOG[(party?.riftId ?? 'first_rift') as keyof typeof RIFT_CATALOG] ?? RIFT_CATALOG.first_rift

  const apply = (partyId: string) => {
    client.send({ type: 'APPLY_TO_PARTY', payload: { partyId, slotOfferCoins: Math.max(0, Math.floor(slotOffer)), operationId: crypto.randomUUID() } })
    setApplicationId(partyId)
  }

  return (
    <main className="lobby-shell">
      <header className="combat-header lobby-header">
        <button className="back-button" onClick={onBack} aria-label="Повернутися до міста">‹</button>
        <div><p>{selectedRift.name}</p><span>RIFT LOBBY · FLOOR {party?.floorNumber ?? 1}</span></div>
        <ConnectionIndicator state={client.connection} />
      </header>

      {client.error && <button className="network-error" onClick={client.clearError}>{client.error}<span>×</span></button>}

      <section className="floor-selector">
        {Object.values(RIFT_CATALOG).flatMap((rift) => {
          const progress = client.characterState?.riftProgress[rift.id] ?? { riftId: rift.id, highestUnlockedFloor: rift.unlockRequires ? 0 : 1, highestCompletedFloor: 0, completionCount: {} }
          return rift.floors.map((floor) => {
            const unlocked = floor.floorNumber <= progress.highestUnlockedFloor
            const selected = party?.riftId === rift.id && party.floorNumber === floor.floorNumber
            const prerequisite = rift.unlockRequires ? `Requires ${RIFT_CATALOG[rift.unlockRequires.riftId as keyof typeof RIFT_CATALOG]?.name ?? rift.unlockRequires.riftId} Floor ${rift.unlockRequires.floorNumber} completion` : floor.unlockRequiresFloor ? `Requires Floor ${floor.unlockRequiresFloor} completion` : 'Available by default'
            return <article key={`${rift.id}:${floor.floorNumber}`} className={`${unlocked ? 'unlocked' : 'locked'} ${selected ? 'selected' : ''}`}>
              <div><small>{rift.name} · FLOOR {floor.floorNumber}</small><strong>{unlocked ? 'Unlocked' : 'Locked'}</strong></div>
              <p>Recommended Level: {floor.recommendedLevel.min}–{floor.recommendedLevel.max} · Party {rift.recommendedPartySize.min}–{rift.recommendedPartySize.max}</p>
              <span>{floor.encounterEnemyIds.length + 1} encounters · Boss: {unlocked ? ENEMY_CATALOG[floor.bossId].name : '???'} · Tier {floor.resourceTier} · {prerequisite}</span>
              {party && isLeader && <button disabled={!unlocked || selected} onClick={() => client.send({ type: 'SELECT_RIFT_FLOOR', payload: { riftId: rift.id, floorNumber: floor.floorNumber } })}>Select</button>}
            </article>
          })
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
            <div className="section-heading"><div><span>First Rift · Second Rift</span><h2>Відкриті групи</h2></div><button className="refresh-button" onClick={() => client.send({ type: 'LIST_PARTIES' })}>Оновити</button></div>
            <div className="party-browser">
              {client.parties.length === 0 && <div className="empty-parties"><span>◇</span><strong>Відкритих груп немає</strong><p>Створіть першу експедицію.</p></div>}
              {client.parties.map((item) => (
                <article key={item.id} className="party-listing">
                  <div className="leader-avatar">♛</div>
                  <div><small>ЛІДЕР</small><strong>{item.leaderName}</strong><span>{RIFT_CATALOG[item.riftId as keyof typeof RIFT_CATALOG]?.name ?? item.riftId} · Floor {item.floorNumber}</span></div>
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
