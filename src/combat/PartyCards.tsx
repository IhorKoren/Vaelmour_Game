import { CLASSES } from '../data/config/balance'
import type { Character } from '../types/game'
import type { PublicPartyMember } from '../../shared/protocol'

export function PartyCards({ party, multiplayerMembers, currentPlayerId }: { party: Character[]; multiplayerMembers?: PublicPartyMember[]; currentPlayerId?: string }) {
  return (
    <section className="party-section">
      <div className="micro-heading"><span>Експедиційна група</span><small>{party.filter((member) => member.alive).length}/{multiplayerMembers ? party.length : 5} живі</small></div>
      <div className="party-list">
        {party.map((member, index) => {
          const classInfo = CLASSES[member.classId]
          const multiplayer = multiplayerMembers?.find((item) => item.id === member.id)
          const hpPercent = Math.max(0, member.currentHP / member.maxHP * 100)
          return (
            <article key={member.id} className={`party-card ${!member.alive ? 'dead' : ''} ${(currentPlayerId ? member.id === currentPlayerId : index === 0) ? 'player' : ''}`}>
              <span className="party-glyph">{classInfo.glyph}</span>
              <div className="party-info">
                <div><strong>{member.name}</strong><small>{(currentPlayerId ? member.id === currentPlayerId : index === 0) ? 'ВИ' : classInfo.name}</small></div>
                <div className="mini-hp"><span style={{ width: `${hpPercent}%` }} /></div>
                <p>{member.currentHP} / {member.maxHP}</p>
              </div>
              <span className={`status-chip ${member.ready ? 'ready' : ''} ${!member.alive ? 'fallen' : ''}`}>
                {!member.alive ? 'Мертвий' : !multiplayer?.connected && multiplayer ? 'Offline' : member.ready ? '✓ Готовий' : multiplayer?.autoBattle ? 'Auto ⏳' : '⏳ Очікує'}
              </span>
            </article>
          )
        })}
      </div>
    </section>
  )
}
