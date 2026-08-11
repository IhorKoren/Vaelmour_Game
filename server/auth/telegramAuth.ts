import { createHmac, timingSafeEqual } from 'node:crypto'

export interface ValidatedTelegramUser {
  id: string
  username?: string
  firstName?: string
  lastName?: string
}

export class TelegramAuthError extends Error {
  constructor(readonly code: 'INVALID_TELEGRAM_DATA' | 'STALE_TELEGRAM_DATA', message: string) { super(message) }
}

function safeEqualHex(left: string, right: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(left) || !/^[0-9a-f]{64}$/i.test(right)) return false
  return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'))
}

/** Official Telegram Mini Apps bot-token validation algorithm. */
export function validateTelegramInitData(rawInitData: string, botToken: string, options: { now?: number; maxAgeSeconds?: number } = {}): ValidatedTelegramUser {
  if (!rawInitData || rawInitData.length > 16_384) throw new TelegramAuthError('INVALID_TELEGRAM_DATA', 'Telegram init data відсутні або завеликі.')
  const params = new URLSearchParams(rawInitData)
  const receivedHash = params.get('hash') ?? ''
  const authDate = Number(params.get('auth_date'))
  const userJson = params.get('user')
  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== 'hash' && key !== 'signature')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const expectedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
  if (!safeEqualHex(receivedHash, expectedHash)) throw new TelegramAuthError('INVALID_TELEGRAM_DATA', 'Telegram signature validation failed.')
  const now = Math.floor((options.now ?? Date.now()) / 1000)
  const maxAge = options.maxAgeSeconds ?? 3600
  if (!Number.isInteger(authDate) || authDate > now + 30 || now - authDate > maxAge) throw new TelegramAuthError('STALE_TELEGRAM_DATA', 'Telegram authentication data expired.')
  try {
    const user = JSON.parse(userJson ?? '') as { id?: unknown; username?: unknown; first_name?: unknown; last_name?: unknown }
    if ((typeof user.id !== 'number' && typeof user.id !== 'string') || !/^\d+$/.test(String(user.id))) throw new Error('invalid user id')
    return {
      id: String(user.id),
      username: typeof user.username === 'string' ? user.username : undefined,
      firstName: typeof user.first_name === 'string' ? user.first_name : undefined,
      lastName: typeof user.last_name === 'string' ? user.last_name : undefined,
    }
  } catch {
    throw new TelegramAuthError('INVALID_TELEGRAM_DATA', 'Telegram user payload is invalid.')
  }
}
