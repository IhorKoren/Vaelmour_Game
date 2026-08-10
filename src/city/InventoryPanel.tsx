import { useState } from 'react'
import type { CharacterState, ClientMessage } from '../../shared/protocol'
import { ITEM_CATALOG } from '../../shared/game-data/catalog'
import type { ItemCategory } from '../../shared/game-data/types'
import { ItemCard } from './ItemCard'

const FILTERS: Array<[ItemCategory, string]> = [['equipment', 'Equipment'], ['jewelry', 'Jewelry'], ['consumable', 'Consumables'], ['resource', 'Resources'], ['recipe', 'Recipes']]

export function InventoryPanel({ state, send }: { state: CharacterState; send: (message: Exclude<ClientMessage, { type: 'HELLO' }>) => void }) {
  const [filter, setFilter] = useState<ItemCategory>('equipment')
  const entries = state.inventory.filter((entry) => ITEM_CATALOG[entry.itemId]?.category === filter)
  return (
    <section className="city-content-panel">
      <div className="section-heading"><div><span>Особисті речі</span><h2>Інвентар</h2></div><small>{state.inventory.reduce((sum, item) => sum + item.quantity, 0)} ITEMS</small></div>
      <div className="inventory-filters">{FILTERS.map(([id, label]) => <button key={id} className={filter === id ? 'selected' : ''} onClick={() => setFilter(id)}>{label}</button>)}</div>
      <div className="item-list">{entries.length === 0 && <p className="empty-state">У цій категорії поки порожньо.</p>}{entries.map((entry) => {
        const item = ITEM_CATALOG[entry.itemId]
        const actions = [] as Array<{ label: string; onClick: () => void; primary?: boolean }>
        if (item.equipType) actions.push({ label: 'Equip', primary: true, onClick: () => send({ type: 'EQUIP_ITEM', payload: { entryId: entry.entryId, operationId: crypto.randomUUID() } }) })
        if (item.recipeId) actions.push({ label: 'Learn', primary: true, onClick: () => send({ type: 'LEARN_RECIPE', payload: { entryId: entry.entryId, operationId: crypto.randomUUID() } }) })
        actions.push({ label: 'Storage', onClick: () => send({ type: 'MOVE_TO_STORAGE', payload: { entryId: entry.entryId, operationId: crypto.randomUUID() } }) })
        return <ItemCard key={entry.entryId} entry={entry} actions={actions} />
      })}</div>
    </section>
  )
}
