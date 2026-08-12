export const SERVER_PORT = Number(process.env.PORT ?? 8787)
export const SERVER_HOST = process.env.HOST ?? (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1')
export const ROUND_DURATION_MS = 30_000

function enabled(name: string, fallback = false): boolean {
  const value = process.env[name]
  return value === undefined ? fallback : value.toLowerCase() === 'true'
}

function csv(name: string): string[] {
  return (process.env[name] ?? '').split(',').map((value) => value.trim()).filter(Boolean)
}

export interface RuntimeConfig {
  nodeEnv: string
  isProduction: boolean
  allowDevAuth: boolean
  adminMode: boolean
  telegramBotToken: string | null
  sessionSecret: string
  sessionTtlSeconds: number
  maxSessionsPerAccount?: number
  sessionCleanupIntervalMs?: number
  telegramMaxAgeSeconds: number
  appOrigin: string | null
  allowedOrigins: Set<string>
  adminTelegramUserIds: Set<string>
}

export function loadRuntimeConfig(): RuntimeConfig {
  const nodeEnv = process.env.NODE_ENV ?? 'development'
  const isProduction = nodeEnv === 'production'
  const appOrigin = process.env.APP_ORIGIN?.replace(/\/$/, '') ?? null
  const allowed = csv('ALLOWED_ORIGINS').map((origin) => origin.replace(/\/$/, ''))
  if (appOrigin) allowed.push(appOrigin)
  if (!isProduction) allowed.push('http://127.0.0.1:5173', 'http://localhost:5173')
  const sessionSecret = process.env.SESSION_SECRET ?? (!isProduction ? 'local-only-session-secret-change-me' : '')
  if (!sessionSecret || sessionSecret.length < 24) throw new Error('SESSION_SECRET must contain at least 24 characters.')
  const allowDevAuth = enabled('ALLOW_DEV_AUTH', false)
  if (isProduction && allowDevAuth) throw new Error('ALLOW_DEV_AUTH must be false in production.')
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || null
  if (isProduction && !telegramBotToken) throw new Error('TELEGRAM_BOT_TOKEN is required in production.')
  if (isProduction && allowed.length === 0) throw new Error('ALLOWED_ORIGINS or APP_ORIGIN is required in production.')
  return {
    nodeEnv, isProduction, allowDevAuth, telegramBotToken, sessionSecret,
    adminMode: enabled('ADMIN_MODE', false),
    sessionTtlSeconds: Math.max(300, Number(process.env.SESSION_TTL_SECONDS ?? 86_400)),
    maxSessionsPerAccount: Math.max(2, Math.min(20, Number(process.env.MAX_SESSIONS_PER_ACCOUNT ?? 8))),
    sessionCleanupIntervalMs: Math.max(60_000, Number(process.env.SESSION_CLEANUP_INTERVAL_MS ?? 15 * 60_000)),
    telegramMaxAgeSeconds: Math.max(60, Number(process.env.TELEGRAM_AUTH_MAX_AGE_SECONDS ?? 3600)),
    appOrigin,
    allowedOrigins: new Set(allowed),
    adminTelegramUserIds: new Set(csv('ADMIN_TELEGRAM_USER_IDS')),
  }
}

export function isAllowedOrigin(origin: string | undefined, config: RuntimeConfig): boolean {
  if (!origin) return !config.isProduction
  return config.allowedOrigins.has(origin.replace(/\/$/, ''))
}
