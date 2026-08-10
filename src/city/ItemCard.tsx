import { CLASSES } from '../data/config/balance'
import { ITEM_CATALOG } from '../../shared/game-data/catalog'
import type { InventoryEntry } from '../../shared/game-data/types'

interface Props {
  entry: InventoryEntry
  actions?: Array<{ label: string; onClick: () => void; primary?: boolean }>
}

export function ItemCard({ entry, actions = [] }: Props) {
  const item = ITEM_CATALOG[entry.itemId]
  if (!item) return null
  return (
    <article className="item-card">
      <span className="item-icon">{item.icon}</span>
      <div className="item-copy">
        <small>{item.category.toUpperCase()}</small><strong>{item.name}</strong>
        <p>{item.attack ? `⚔ +${item.attack}` : ''}{item.attack && item.hp ? ' · ' : ''}{item.hp ? `♥ +${item.hp}` : ''}{item.allowedClass ? ` · ${CLASSES[item.allowedClass].name}` : ''}</p>
      </div>
      {entry.quantity > 1 && <em className="quantity">×{entry.quantity}</em>}
      {actions.length > 0 && <div className="item-actions">{actions.map((action) => <button key={action.label} className={action.primary ? 'primary' : ''} onClick={action.onClick}>{action.label}</button>)}</div>}
    </article>
  )
}
