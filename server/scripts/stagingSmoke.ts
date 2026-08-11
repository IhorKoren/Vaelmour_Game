import 'dotenv/config'
import WebSocket from 'ws'

const apiUrl = (process.env.SMOKE_API_URL ?? process.env.VITE_API_URL ?? 'http://127.0.0.1:8787').replace(/\/$/, '')
const wsUrl = process.env.SMOKE_WS_URL ?? process.env.VITE_WS_URL ?? 'ws://127.0.0.1:8787/ws'
const appOrigin = (process.env.SMOKE_APP_ORIGIN ?? process.env.APP_ORIGIN ?? 'http://127.0.0.1:5173').replace(/\/$/, '')

async function check(path: string): Promise<void> {
  const response = await fetch(`${apiUrl}${path}`, { headers: { origin: appOrigin } })
  if (!response.ok) throw new Error(`${path} returned ${response.status}`)
  console.log(`PASS ${path}`)
}

async function sessionToken(): Promise<string> {
  if (process.env.SMOKE_SESSION_TOKEN) return process.env.SMOKE_SESSION_TOKEN
  const initData = process.env.SMOKE_TELEGRAM_INIT_DATA
  const devToken = process.env.SMOKE_DEV_TOKEN
  if (!initData && !devToken) throw new Error('Set SMOKE_SESSION_TOKEN, SMOKE_TELEGRAM_INIT_DATA, or an explicitly enabled SMOKE_DEV_TOKEN.')
  const endpoint = initData ? '/auth/telegram' : '/auth/dev'
  const body = initData ? { initData } : { devToken }
  const response = await fetch(`${apiUrl}${endpoint}`, { method: 'POST', headers: { origin: appOrigin, 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const payload = await response.json() as { sessionToken?: string; needsCharacter?: boolean; message?: string }
  if (!response.ok || !payload.sessionToken) throw new Error(payload.message ?? `${endpoint} failed`)
  if (payload.needsCharacter) throw new Error('Smoke account needs an existing character; create it once in the staging Mini App.')
  console.log(`PASS ${endpoint}`)
  return payload.sessionToken
}

await check('/health')
await check('/ready')
const frontend = await fetch(appOrigin)
if (!frontend.ok) throw new Error(`Frontend returned ${frontend.status}`)
console.log('PASS frontend')

const token = await sessionToken()
const socket = new WebSocket(wsUrl, { origin: appOrigin })
const expected = new Set(['WELCOME', 'CHARACTER_STATE', 'MARKET_SNAPSHOT', 'GUILD_STATE', 'PARTY_LIST'])
await new Promise<void>((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`WebSocket smoke timeout; missing: ${[...expected].join(', ')}`)), 10_000)
  socket.on('open', () => socket.send(JSON.stringify({ type: 'HELLO', payload: { sessionToken: token, playerId: 'ignored-spoof' } })))
  socket.on('message', (raw) => {
    const message = JSON.parse(raw.toString()) as { type: string; payload?: unknown }
    if (message.type === 'WELCOME') {
      socket.send(JSON.stringify({ type: 'GET_MARKET' }))
      socket.send(JSON.stringify({ type: 'GET_GUILD_STATE' }))
      socket.send(JSON.stringify({ type: 'LIST_PARTIES' }))
    }
    expected.delete(message.type)
    if (!expected.size) { clearTimeout(timer); resolve() }
  })
  socket.on('error', reject)
})
socket.close()
console.log('PASS authenticated WebSocket, character, Market, Guild, and Rift Lobby state')
