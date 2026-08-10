import { ZONES, ZONE_LABELS } from '../data/config/balance'
import type { Zone } from '../types/game'

interface Props {
  attackZone: Zone | null
  defendZone: Zone | null
  potionSelected: boolean
  potionCooldown: number
  potionQuantity?: number
  disabled: boolean
  playerAlive: boolean
  autoBattle: boolean
  onAttack: (zone: Zone) => void
  onDefend: (zone: Zone) => void
  onPotion: () => void
  onConfirm: () => void
  onAutoChange: (value: boolean) => void
}

export function CombatControls(props: Props) {
  const valid = Boolean(props.defendZone && (props.attackZone || props.potionSelected))
  return (
    <section className="controls-panel">
      <div className="micro-heading"><span>Оберіть дію</span><small>{props.disabled ? 'ДІЮ ЗАФІКСОВАНО' : '1 АТАКА · 1 ЗАХИСТ'}</small></div>

      <div className={`choice-row ${props.potionSelected ? 'muted' : ''}`}>
        <div className="choice-label"><span>⚔</span><div><strong>Атака</strong><small>Зона удару</small></div></div>
        <div className="zone-buttons">
          {ZONES.map((zone) => <button key={zone} disabled={props.disabled || props.potionSelected || !props.playerAlive} className={props.attackZone === zone ? 'selected attack' : ''} onClick={() => props.onAttack(zone)}>{ZONE_LABELS[zone]}</button>)}
        </div>
      </div>

      <div className="choice-row">
        <div className="choice-label"><span>⬖</span><div><strong>Захист</strong><small>Зона блоку</small></div></div>
        <div className="zone-buttons">
          {ZONES.map((zone) => <button key={zone} disabled={props.disabled || !props.playerAlive} className={props.defendZone === zone ? 'selected defense' : ''} onClick={() => props.onDefend(zone)}>{ZONE_LABELS[zone]}</button>)}
        </div>
      </div>

      <button className={`potion-button ${props.potionSelected ? 'selected' : ''}`} disabled={props.disabled || props.potionCooldown > 0 || props.potionQuantity === 0 || !props.playerAlive} onClick={props.onPotion}>
        <span className="potion-icon">✣</span><span><strong>Цілюще зілля</strong><small>Відновлює 35% HP · Замість атаки</small></span>
        <em>{props.potionCooldown > 0 ? `${props.potionCooldown} раунд.` : props.potionQuantity !== undefined ? `×${props.potionQuantity}` : 'Готове'}</em>
      </button>

      <button className="confirm-button" disabled={props.disabled || !valid || !props.playerAlive} onClick={props.onConfirm}>
        {props.disabled ? 'Дію підтверджено' : 'Підтвердити дію'} <span>{props.disabled ? '✓' : '›'}</span>
      </button>

      <label className="auto-toggle">
        <div><strong>Auto Battle</strong><small>Випадкові дії · без зілля · повний таймер</small></div>
        <input type="checkbox" checked={props.autoBattle} onChange={(event) => props.onAutoChange(event.target.checked)} />
        <span className="switch" />
      </label>
    </section>
  )
}
