import { useState } from 'react'
import type { Character } from '../types/game'
import type { MultiplayerClient } from '../network/useMultiplayer'
import { ConnectionIndicator } from '../network/ConnectionIndicator'
import { CharacterPanel } from './CharacterPanel'
import { InventoryPanel } from './InventoryPanel'
import { StoragePanel } from './StoragePanel'
import { CraftPanel } from './CraftPanel'
import { MarketPanel } from './MarketPanel'
import { TradePanel } from './TradePanel'

interface Props {
  character: Character
  client: MultiplayerClient
  onEnterRift: () => void
  onReset: () => void
}

type CityTab = 'character' | 'inventory' | 'storage' | 'craft' | 'market' | 'trade'

const NAV_ITEMS: Array<{ id: CityTab | 'rifts' | 'placeholder'; icon: string; label: string }> = [
  { id: 'character', icon: '♙', label: 'Персонаж' }, { id: 'inventory', icon: '▧', label: 'Інвентар' },
  { id: 'storage', icon: '▣', label: 'Сховище' }, { id: 'craft', icon: '⚒', label: 'Крафт' },
  { id: 'rifts', icon: '◇', label: 'Розломи' }, { id: 'market', icon: '⌁', label: 'Market' },
  { id: 'trade', icon: '⇄', label: 'Trade' },
  { id: 'placeholder', icon: '♜', label: 'Гільдія' }, { id: 'placeholder', icon: '♧', label: 'Друзі' },
  { id: 'placeholder', icon: '◌', label: 'Чат' },
]

export function CityScreen({ character, client, onEnterRift, onReset }: Props) {
  const [tab, setTab] = useState<CityTab | null>(null)
  const state = client.characterState

  const navigate = (id: CityTab | 'rifts' | 'placeholder') => {
    if (id === 'rifts') onEnterRift()
    else if (id !== 'placeholder') setTab(id)
  }

  return (
    <main className="city-shell">
      <header className="city-header"><div className="brand-mark">Ⅰ</div><div><p>Попеляста Межа</p><span>Західна брама · Світанок</span></div><ConnectionIndicator state={client.connection} /></header>
      {client.error && <button className="network-error" onClick={client.clearError}>{client.error}<span>×</span></button>}

      {!tab && <section className="hero-panel"><div className="hero-copy"><p className="eyebrow">Економічний цикл відкрито</p><h1>Вітаємо, {state?.name ?? character.name}</h1><p>Споряджайтеся, працюйте з ресурсами та готуйтеся до наступного походу в Розлом.</p></div></section>}

      <nav className="city-nav" aria-label="Міські розділи">
        {NAV_ITEMS.map((item, index) => <button key={`${item.label}-${index}`} className={`${tab === item.id ? 'active' : ''} ${item.id === 'placeholder' ? 'disabled' : ''}`} onClick={() => navigate(item.id)} disabled={item.id === 'placeholder'}><span>{item.icon}</span><strong>{item.label}</strong><small>{item.id === 'placeholder' ? 'Незабаром' : 'Відкрити'}</small></button>)}
      </nav>

      {!state ? <section className="city-content-panel loading-panel"><span>◇</span><p>Отримуємо server character state…</p></section> : <>
        {tab === 'character' && <CharacterPanel state={state} send={client.send} />}
        {tab === 'inventory' && <InventoryPanel state={state} send={client.send} />}
        {tab === 'storage' && <StoragePanel state={state} send={client.send} />}
        {tab === 'craft' && <CraftPanel state={state} send={client.send} />}
        {tab === 'market' && <MarketPanel client={client} />}
        {tab === 'trade' && <TradePanel client={client} />}
      </>}

      {!tab && <section className="rift-callout"><div className="rift-symbol"><span>◇</span></div><div className="rift-copy"><p className="eyebrow">Multiplayer expedition</p><h2>Перший Розлом</h2><p>Поверх 1 · 4 зустрічі · Персональний лут</p></div><div className="rift-danger"><span>НЕСТАБІЛЬНО</span><small>Potions: {state?.inventory.find((item) => item.itemId === 'healing_potion')?.quantity ?? 0}</small></div><button className="primary-button" onClick={onEnterRift}>Увійти в Lobby <span>›</span></button></section>}

      {tab && <button className="secondary-button city-back" onClick={() => setTab(null)}>← Повернутися на площу</button>}
      <button className="text-button reset-button" onClick={onReset}>Створити іншого персонажа</button>
      <footer className="city-footer"><span>◈ Server-authoritative economy</span><span>Phase 5 · PostgreSQL</span></footer>
    </main>
  )
}
