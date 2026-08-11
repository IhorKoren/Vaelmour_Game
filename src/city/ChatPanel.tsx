import { useEffect, useState } from 'react'
import type { MultiplayerClient } from '../network/useMultiplayer'
import type { ChatChannel } from '../../shared/social-types'
const operationId = () => crypto.randomUUID()

export function ChatPanel({ client }: { client: MultiplayerClient }) {
  const sendMessage = client.send
  const [tab, setTab] = useState<ChatChannel>('GLOBAL')
  const [text, setText] = useState('')
  const [targetName, setTargetName] = useState('')
  const [conversationId, setConversationId] = useState<string | undefined>()
  const guildId = client.guild?.guild?.id
  useEffect(() => {
    if (tab === 'GLOBAL') sendMessage({ type: 'GET_CHAT_HISTORY', payload: { channel: 'GLOBAL' } })
    if (tab === 'GUILD' && guildId) sendMessage({ type: 'GET_CHAT_HISTORY', payload: { channel: 'GUILD' } })
    if (tab === 'PRIVATE') sendMessage({ type: 'GET_PRIVATE_CONVERSATIONS' })
  }, [tab, guildId, sendMessage])
  const send = () => { if (!text.trim()) return; if (tab === 'GROUP') client.send({ type: 'PARTY_CHAT_MESSAGE', payload: { message: text } }); else client.send({ type: 'SEND_CHAT_MESSAGE', payload: { channel: tab, text, targetName: targetName || undefined, conversationId, operationId: operationId() } }); setText('') }
  const history = client.chatHistory?.channel === tab ? client.chatHistory : null
  return <section className="city-content-panel social-panel"><header className="panel-heading"><div><p className="eyebrow">Plain text · server time</p><h2>Чат</h2></div><span>Guild {client.unread.guild} · Private {client.unread.private}</span></header><nav className="subtabs">{(['GLOBAL', 'GUILD', 'GROUP', 'PRIVATE'] as ChatChannel[]).filter((channel) => channel !== 'GUILD' || client.guild?.guild).filter((channel) => channel !== 'GROUP' || client.party).map((channel) => <button className={tab === channel ? 'active' : ''} key={channel} onClick={() => setTab(channel)}>{channel}</button>)}</nav>{tab === 'PRIVATE' && <div className="private-layout"><aside className="conversation-list"><div className="inline-form"><input value={targetName} placeholder="Точне ім’я" onChange={(event) => setTargetName(event.target.value)} /></div>{client.privateConversations.map((conversation) => <button className={conversationId === conversation.id ? 'active' : ''} key={conversation.id} onClick={() => { setConversationId(conversation.id); setTargetName(conversation.other.name); client.send({ type: 'GET_CHAT_HISTORY', payload: { channel: 'PRIVATE', conversationId: conversation.id } }) }}><strong>{conversation.other.name}</strong><small>{conversation.lastMessage?.text ?? 'Нова розмова'} {conversation.unread ? `· ${conversation.unread}` : ''}</small></button>)}</aside><ChatMessages messages={history?.messages ?? []} /></div>}{tab === 'GROUP' && <ChatMessages messages={(client.party?.chat ?? []).map((message) => ({ id: message.id, channel: 'GROUP', senderId: message.senderId, senderName: message.senderName, text: message.message, roomId: client.party!.id, createdAt: message.timestamp }))} />}{tab !== 'PRIVATE' && tab !== 'GROUP' && <ChatMessages messages={history?.messages ?? []} />}{history?.nextCursor && <button className="ghost-button" onClick={() => client.send({ type: 'GET_CHAT_HISTORY', payload: { channel: tab as 'GLOBAL' | 'GUILD' | 'PRIVATE', conversationId, beforeMessageId: history.nextCursor! } })}>Load more</button>}<div className="chat-compose"><input value={text} maxLength={300} placeholder={tab === 'PRIVATE' && !targetName ? 'Спочатку введіть ім’я…' : 'Повідомлення…'} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && send()} /><button onClick={send}>›</button></div></section>
}

function ChatMessages({ messages }: { messages: Array<{ id: string; senderName: string; text: string; createdAt: number }> }) { return <div className="social-chat-feed large">{messages.length === 0 && <p>Повідомлень ще немає.</p>}{messages.map((message) => <p key={message.id}><span>{new Date(message.createdAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</span><strong>{message.senderName}</strong>{message.text}</p>)}</div> }
