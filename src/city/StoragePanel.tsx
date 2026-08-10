import type { CharacterState, ClientMessage } from '../../shared/protocol'
import { ItemCard } from './ItemCard'

export function StoragePanel({ state, send }: { state: CharacterState; send: (message: Exclude<ClientMessage, { type: 'HELLO' }>) => void }) {
  return <section className="city-content-panel"><div className="section-heading"><div><span>Персональне сховище</span><h2>Storage</h2></div><small>БЕЗ ЛІМІТУ</small></div><p className="panel-intro">Предмети тут не доступні для crafting або наступної експедиції.</p><div className="item-list">{state.storage.length === 0 && <p className="empty-state">Сховище порожнє.</p>}{state.storage.map((entry) => <ItemCard key={entry.entryId} entry={entry} actions={[{ label: 'To Inventory', primary: true, onClick: () => send({ type: 'MOVE_FROM_STORAGE', payload: { entryId: entry.entryId, operationId: crypto.randomUUID() } }) }]} />)}</div></section>
}
