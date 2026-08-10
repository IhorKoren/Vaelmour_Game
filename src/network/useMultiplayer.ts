import { useCallback, useEffect, useRef, useState } from 'react'
import type { Character } from '../types/game'
import type {
  ClientMessage, CombatSnapshot, ConnectionState, PartySnapshot, PartySummary, ServerMessage,
  CharacterState,
} from '../../shared/protocol'
import type { MarketSnapshot, TradeSnapshot } from '../../shared/economy-types'
import { clearDevToken, getDevToken } from '../character/devIdentity'

const WS_URL = import.meta.env.VITE_WS_URL ?? `ws://${window.location.hostname}:8787`

export interface MultiplayerClient {
  connection: ConnectionState
  parties: PartySummary[]
  party: PartySnapshot | null
  combat: CombatSnapshot | null
  error: string | null
  characterState: CharacterState | null
  accountId: string | null
  playerId: string | null
  market: MarketSnapshot | null
  trade: TradeSnapshot | null
  send: (message: Exclude<ClientMessage, { type: 'HELLO' }>) => void
  clearError: () => void
}

export function useMultiplayer(character: Character | null): MultiplayerClient {
  const [connection, setConnection] = useState<ConnectionState>('offline')
  const [parties, setParties] = useState<PartySummary[]>([])
  const [party, setParty] = useState<PartySnapshot | null>(null)
  const [combat, setCombat] = useState<CombatSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [characterState, setCharacterState] = useState<CharacterState | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [market, setMarket] = useState<MarketSnapshot | null>(null)
  const [trade, setTrade] = useState<TradeSnapshot | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptRef = useRef(0)

  useEffect(() => {
    if (!character) return
    let active = true

    const connect = () => {
      if (!active) return
      setConnection(attemptRef.current ? 'reconnecting' : 'offline')
      const socket = new WebSocket(WS_URL)
      socketRef.current = socket
      socket.addEventListener('open', () => {
        if (!active) return
        attemptRef.current = 0
        setConnection('connected')
        const devToken = getDevToken()
        if (!devToken) { socket.close(); return }
        const hello: ClientMessage = {
          type: 'HELLO',
          payload: { devToken, character: character.name ? { name: character.name, classId: character.classId, level: character.level } : undefined },
        }
        socket.send(JSON.stringify(hello))
      })
      socket.addEventListener('message', (event) => {
        if (!active) return
        const message = JSON.parse(String(event.data)) as ServerMessage
        switch (message.type) {
          case 'WELCOME': setAccountId(message.payload.accountId); setPlayerId(message.payload.playerId); break
          case 'PARTY_LIST': setParties(message.payload); break
          case 'PARTY_STATE':
            setParty(message.payload)
            if (!message.payload || message.payload.phase === 'LOBBY') setCombat(null)
            break
          case 'EXPEDITION_STARTED':
          case 'COMBAT_SNAPSHOT':
          case 'ROUND_STARTED':
          case 'ROUND_RESOLVED':
          case 'ENCOUNTER_RESULT':
          case 'EXPEDITION_RESULT': setCombat(message.payload); break
          case 'PARTY_CHAT_MESSAGE':
            setParty((current) => current ? { ...current, chat: [...current.chat.filter((item) => item.id !== message.payload.id), message.payload].slice(-50) } : current)
            break
          case 'CHARACTER_STATE':
          case 'INVENTORY_UPDATE':
          case 'EQUIPMENT_UPDATE':
          case 'STORAGE_UPDATE': setCharacterState(message.payload); break
          case 'CRAFT_RESULT': setCharacterState(message.payload.state); break
          case 'LOOT_UPDATE': setCharacterState(message.payload.state); break
          case 'MARKET_SNAPSHOT': setMarket(message.payload); break
          case 'TRADE_REQUEST':
          case 'TRADE_STATE':
          case 'TRADE_COMPLETED':
          case 'TRADE_CANCELLED': setTrade(message.payload); break
          case 'ECONOMY_UPDATE': setCharacterState(message.payload); break
          case 'ERROR':
            if (message.payload.code === 'ACCOUNT_SETUP_REQUIRED') { clearDevToken(); window.location.reload(); return }
            setError(message.payload.message); break
        }
      })
      socket.addEventListener('close', () => {
        if (!active) return
        setConnection('reconnecting')
        attemptRef.current += 1
        retryRef.current = setTimeout(connect, Math.min(5000, 500 * 2 ** attemptRef.current))
      })
      socket.addEventListener('error', () => socket.close())
    }

    connect()
    return () => {
      active = false
      if (retryRef.current) clearTimeout(retryRef.current)
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [character])

  const send = useCallback((message: Exclude<ClientMessage, { type: 'HELLO' }>) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      setError('Сервер недоступний. Дочекайтеся відновлення зʼєднання.')
      return
    }
    socketRef.current.send(JSON.stringify(message))
  }, [])

  return { connection, parties, party, combat, error, characterState, accountId, playerId, market, trade, send, clearError: () => setError(null) }
}
