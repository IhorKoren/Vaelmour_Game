import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { TelegramAuthError, validateTelegramInitData } from './telegramAuth'

const BOT_TOKEN = '123456:test-bot-token'
function signedInitData(user: Record<string, unknown>, authDate = 1_000): string {
  const params = new URLSearchParams({ auth_date: String(authDate), query_id: 'AA-test', signature: 'telegram-ed25519-signature', user: JSON.stringify(user) })
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n')
  const secret = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest()
  params.set('hash', createHmac('sha256', secret).update(check).digest('hex'))
  return params.toString()
}

describe('official Telegram Mini App init data validation', () => {
  it('accepts valid data and takes numeric user id from the signed payload', () => {
    expect(validateTelegramInitData(signedInitData({ id: 777, username: 'old', first_name: 'Ada' }), BOT_TOKEN, { now: 1_000_000 })).toEqual({ id: '777', username: 'old', firstName: 'Ada', lastName: undefined })
  })

  it('rejects modified signed data', () => {
    const modified = new URLSearchParams(signedInitData({ id: 777 }))
    modified.set('user', JSON.stringify({ id: 999 }))
    expect(() => validateTelegramInitData(modified.toString(), BOT_TOKEN, { now: 1_000_000 })).toThrow(TelegramAuthError)
  })

  it('rejects stale authentication', () => {
    expect(() => validateTelegramInitData(signedInitData({ id: 777 }, 100), BOT_TOKEN, { now: 1_000_000, maxAgeSeconds: 100 })).toThrowError(/expired/i)
  })
})
