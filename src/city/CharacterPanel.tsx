import type { CharacterState, ClientMessage } from '../../shared/protocol'
import { ITEM_CATALOG } from '../../shared/game-data/catalog'
import type { EquipmentSlot } from '../../shared/game-data/types'
import { CLASSES } from '../data/config/balance'

const SLOTS: Array<[EquipmentSlot, string]> = [
  ['weapon', 'Weapon'], ['head', 'Head'], ['chest', 'Chest'], ['hands', 'Hands'], ['legs', 'Legs'],
  ['feet', 'Feet'], ['ring1', 'Ring 1'], ['ring2', 'Ring 2'], ['amulet', 'Amulet'],
]

export function CharacterPanel({ state, send }: { state: CharacterState; send: (message: Exclude<ClientMessage, { type: 'HELLO' }>) => void }) {
  return (
    <section className="city-content-panel">
      <div className="section-heading"><div><span>Персонаж</span><h2>{state.name}</h2></div><small>{CLASSES[state.classId].name} · Рів. {state.level}</small></div>
      <div className="final-stat-grid"><div><span>⚔</span><small>FINAL ATTACK</small><strong>{state.attack}</strong></div><div><span>♥</span><small>MAX HP</small><strong>{state.maxHP}</strong></div><div><span>✦</span><small>EXPERIENCE</small><strong>{state.currentXP}/{state.xpRequired}</strong></div><div><span>◉</span><small>COINS · {state.reservedCoins} reserved</small><strong>{state.availableCoins} available</strong></div></div>
      <div className="equipment-grid">
        {SLOTS.map(([slot, label]) => {
          const entry = state.equipment[slot]
          const item = entry ? ITEM_CATALOG[entry.itemId] : null
          return <article key={slot} className={`equipment-slot ${entry ? 'filled' : ''}`}><small>{label}</small><span>{item?.icon ?? '·'}</span><strong>{item?.name ?? 'Порожньо'}</strong>{item && <p>{item.attack ? `⚔ +${item.attack}` : ''}{item.hp ? ` ♥ +${item.hp}` : ''}</p>}{entry && <button onClick={() => send({ type: 'UNEQUIP_ITEM', payload: { slot, operationId: crypto.randomUUID() } })}>Unequip</button>}</article>
        })}
      </div>
    </section>
  )
}
