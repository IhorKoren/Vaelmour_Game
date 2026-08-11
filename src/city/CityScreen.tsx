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
import { GuildPanel } from './GuildPanel'
import { FriendsPanel } from './FriendsPanel'
import { ChatPanel } from './ChatPanel'

interface Props { character: Character; client: MultiplayerClient; onEnterRift: () => void; onReset: () => void }
type CityTab = 'character' | 'inventory' | 'storage' | 'craft' | 'market' | 'trade' | 'guild' | 'friends' | 'chat'
const NAV_ITEMS: Array<{ id: CityTab | 'rifts'; icon: string; label: string }> = [
  { id: 'character', icon: '♟', label: 'Персонаж' }, { id: 'inventory', icon: '▧', label: 'Інвентар' },
  { id: 'storage', icon: '▣', label: 'Сховище' }, { id: 'craft', icon: '⚒', label: 'Крафт' },
  { id: 'rifts', icon: '◇', label: 'Розломи' }, { id: 'market', icon: '⌁', label: 'Market' },
  { id: 'trade', icon: '⇄', label: 'Trade' }, { id: 'guild', icon: '♜', label: 'Гільдія' },
  { id: 'friends', icon: '♧', label: 'Друзі' }, { id: 'chat', icon: '◉', label: 'Чат' },
]

export function CityScreen({ character, client, onEnterRift, onReset }: Props) {
  const [tab, setTab] = useState<CityTab | null>(null)
  const state = client.characterState
  const navigate = (id: CityTab | 'rifts') => id === 'rifts' ? onEnterRift() : setTab(id)
  return <main className="city-shell">
    <header className="city-header"><div className="brand-mark">◈</div><div><p>Попеляста Межа</p><span>Західна брама · Світанок</span></div><ConnectionIndicator state={client.connection} /></header>
    {client.error && <button className="network-error" onClick={client.clearError}>{client.error}<span>×</span></button>}
    {client.partyInvite && <button className="network-error party-invite" onClick={() => client.send({ type: 'APPLY_TO_PARTY', payload: { partyId: client.partyInvite!.partyId, operationId: crypto.randomUUID() } })}>{client.partyInvite.inviterName} запрошує у групу · Натисніть, щоб подати заявку</button>}
    {!tab && <section className="hero-panel"><div className="hero-copy"><p className="eyebrow">Економіка та спільнота відкриті</p><h1>Вітаємо, {state?.name ?? character.name}</h1><p>Споряджайтеся, торгуйте, координуйте гільдію та готуйте групу до наступного походу в Розлом.</p></div></section>}
    <nav className="city-nav" aria-label="Міські розділи">{NAV_ITEMS.map((item) => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => navigate(item.id)}><span>{item.icon}</span><strong>{item.label}{item.id === 'chat' && client.unread.private + client.unread.guild > 0 ? ` · ${client.unread.private + client.unread.guild}` : ''}</strong><small>Відкрити</small></button>)}</nav>
    {!state ? <section className="city-content-panel loading-panel"><span>◇</span><p>Отримуємо server character state…</p></section> : <>
      {tab === 'character' && <CharacterPanel state={state} send={client.send} />}
      {tab === 'inventory' && <InventoryPanel state={state} send={client.send} />}
      {tab === 'storage' && <StoragePanel state={state} send={client.send} />}
      {tab === 'craft' && <CraftPanel state={state} send={client.send} />}
      {tab === 'market' && <MarketPanel client={client} />}
      {tab === 'trade' && <TradePanel client={client} />}
      {tab === 'guild' && <GuildPanel client={client} />}
      {tab === 'friends' && <FriendsPanel client={client} />}
      {tab === 'chat' && <ChatPanel client={client} />}
    </>}
    {!tab && <section className="rift-callout"><div className="rift-symbol"><span>◇</span></div><div className="rift-copy"><p className="eyebrow">Multiplayer expedition</p><h2>Перший Розлом</h2><p>Поверх 1 · 4 зустрічі · Персональний лут</p></div><div className="rift-danger"><span>НЕСТАБІЛЬНО</span><small>Potions: {state?.inventory.find((item) => item.itemId === 'healing_potion')?.quantity ?? 0}</small></div><button className="primary-button" onClick={onEnterRift}>Увійти в Lobby <span>›</span></button></section>}
    {tab && <button className="secondary-button city-back" onClick={() => setTab(null)}>← Повернутися на площу</button>}
    <button className="text-button reset-button" onClick={onReset}>Створити іншого персонажа</button>
    <footer className="city-footer"><span>◀ Server-authoritative economy & social</span><span>Phase 6 · PostgreSQL</span></footer>
  </main>
}
