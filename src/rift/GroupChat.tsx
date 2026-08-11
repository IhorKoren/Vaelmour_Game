import { useState } from 'react'
import type { ChatMessage } from '../../shared/protocol'

interface Props { messages: ChatMessage[]; onSend: (message: string) => void }

export function GroupChat({ messages, onSend }: Props) {
  const [value, setValue] = useState('')
  const submit = () => {
    if (!value.trim()) return
    onSend(value.trim())
    setValue('')
  }
  return (
    <section className="group-chat">
      <div className="micro-heading"><span>Чат групи</span><small>ЛИШЕ УЧАСНИКИ</small></div>
      <div className="chat-feed">
        {messages.length === 0 && <p className="empty-chat">Тиша перед Розломом…</p>}
        {messages.slice(-8).map((item) => (
          <p key={item.id}><span>{new Date(item.timestamp).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</span><strong>{item.senderName}</strong>{item.message}</p>
        ))}
      </div>
      <div className="chat-compose">
        <input value={value} maxLength={300} placeholder="Повідомлення групі…" onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && submit()} />
        <button onClick={submit} aria-label="Надіслати">›</button>
      </div>
    </section>
  )
}
