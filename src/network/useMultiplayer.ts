import { useCallback, useEffect, useRef, useState } from 'react'
import type { Character } from '../types/game'
import type {
  ClientMessage, CombatSnapshot, ConnectionState, PartySnapshot, PartySummary, ServerMessage,
  CharacterState,
} from '../../shared/protocol'
import type { MarketSnapshot, TradeSnapshot } from '../../shared/economy-types'
import type { ChatHistorySnapshot, FriendsSnapshot, GuildListItem, GuildSnapshot, GuildStorageLogView, GuildStorageSnapshot, PrivateConversationView, SocialPlayer, UnreadSnapshot } from '../../shared/social-types'
import { clearSessionToken } from '../auth/authClient'
import type { ProfessionState } from '../../shared/professions'

const WS_URL = import.meta.env.VITE_WS_URL ?? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:8787/ws`

export interface MultiplayerClient {
  connection: ConnectionState
  parties: PartySummary[]
  party: PartySnapshot | null
  combat: CombatSnapshot | null
  error: string | null
  characterState: CharacterState | null
  professionState: ProfessionState | null
  accountId: string | null
  playerId: string | null
  market: MarketSnapshot | null
  trade: TradeSnapshot | null
  guild: GuildSnapshot | null
  guildList: GuildListItem[]
  guildStorage: GuildStorageSnapshot | null
  guildStorageHistory: GuildStorageLogView[]
  friends: FriendsSnapshot | null
  playerSearch: SocialPlayer | null
  chatHistory: ChatHistorySnapshot | null
  privateConversations: PrivateConversationView[]
  unread: UnreadSnapshot
  partyInvite: { partyId: string; inviterId: string; inviterName: string } | null
  send: (message: Exclude<ClientMessage, { type: 'HELLO' }>) => void
  clearError: () => void
}

export function useMultiplayer(character: Character | null, sessionToken: string | null): MultiplayerClient {
  const [connection, setConnection] = useState<ConnectionState>('offline')
  const [parties, setParties] = useState<PartySummary[]>([])
  const [party, setParty] = useState<PartySnapshot | null>(null)
  const [combat, setCombat] = useState<CombatSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [characterState, setCharacterState] = useState<CharacterState | null>(null)
  const [professionState, setProfessionState] = useState<ProfessionState | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [market, setMarket] = useState<MarketSnapshot | null>(null)
  const [trade, setTrade] = useState<TradeSnapshot | null>(null)
  const [guild, setGuild] = useState<GuildSnapshot | null>(null)
  const [guildList, setGuildList] = useState<GuildListItem[]>([])
  const [guildStorage, setGuildStorage] = useState<GuildStorageSnapshot | null>(null)
  const [guildStorageHistory, setGuildStorageHistory] = useState<GuildStorageLogView[]>([])
  const [friends, setFriends] = useState<FriendsSnapshot | null>(null)
  const [playerSearch, setPlayerSearch] = useState<SocialPlayer | null>(null)
  const [chatHistory, setChatHistory] = useState<ChatHistorySnapshot | null>(null)
  const [privateConversations, setPrivateConversations] = useState<PrivateConversationView[]>([])
  const [unread, setUnread] = useState<UnreadSnapshot>({ guild: 0, private: 0 })
  const [partyInvite, setPartyInvite] = useState<{ partyId: string; inviterId: string; inviterName: string } | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptRef = useRef(0)

  useEffect(() => {
    if (!character || !sessionToken) return
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
        const hello: ClientMessage = {
          type: 'HELLO',
          payload: { sessionToken },
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
          case 'PROFESSION_STATE': setProfessionState(message.payload); break
          case 'CRAFT_RESULT': setCharacterState(message.payload.state); break
          case 'LOOT_UPDATE': setCharacterState(message.payload.state); break
          case 'MARKET_SNAPSHOT': setMarket(message.payload); break
          case 'TRADE_REQUEST':
          case 'TRADE_STATE':
          case 'TRADE_COMPLETED':
          case 'TRADE_CANCELLED': setTrade(message.payload); break
          case 'ECONOMY_UPDATE': setCharacterState(message.payload); break
          case 'GUILD_STATE': setGuild(message.payload); break
          case 'GUILD_LIST': setGuildList(message.payload); break
          case 'GUILD_STORAGE_UPDATE': setGuildStorage(message.payload); break
          case 'GUILD_STORAGE_HISTORY': setGuildStorageHistory(message.payload); break
          case 'FRIENDS_STATE': setFriends(message.payload); break
          case 'PLAYER_SEARCH_RESULT': setPlayerSearch(message.payload); break
          case 'CHAT_HISTORY': setChatHistory(message.payload); break
          case 'CHAT_MESSAGE':
            setChatHistory((current) => current && ((current.channel === message.payload.channel) && (current.channel !== 'PRIVATE' || current.key === `private:${message.payload.conversationId}`)) ? { ...current, messages: [...current.messages.filter((item) => item.id !== message.payload.id), message.payload].slice(-100) } : current)
            break
          case 'PRIVATE_CONVERSATIONS': setPrivateConversations(message.payload); break
          case 'UNREAD_UPDATE': setUnread(message.payload); break
          case 'PARTY_INVITE': setPartyInvite(message.payload); break
          case 'PRESENCE_UPDATE':
            setGuild((current) => current ? { ...current, members: current.members.map((member) => member.playerId === message.payload.playerId ? { ...member, status: message.payload.status, online: message.payload.status !== 'OFFLINE' } : member) } : current)
            setFriends((current) => current ? { ...current, friends: current.friends.map((friend) => friend.playerId === message.payload.playerId ? { ...friend, status: message.payload.status, online: message.payload.status !== 'OFFLINE' } : friend) } : current)
            break
          case 'ERROR':
            if (message.payload.code === 'AUTH_SESSION_EXPIRED' || message.payload.code === 'SESSION_EXPIRED') { clearSessionToken(); window.location.reload(); return }
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
  }, [character, sessionToken])

  const send = useCallback((message: Exclude<ClientMessage, { type: 'HELLO' }>) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      setError('Сервер недоступний. Дочекайтеся відновлення зʼєднання.')
      return
    }
    socketRef.current.send(JSON.stringify(message))
  }, [])

  return { connection, parties, party, combat, error, characterState, professionState, accountId, playerId, market, trade, guild, guildList, guildStorage, guildStorageHistory, friends, playerSearch, chatHistory, privateConversations, unread, partyInvite, send, clearError: () => setError(null) }
}
