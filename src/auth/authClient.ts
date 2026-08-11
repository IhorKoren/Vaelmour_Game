import type { Character, CharacterClass } from '../types/game'
import { ensureDevToken } from '../character/devIdentity'

const SESSION_KEY = 'first-rift-session'
const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

interface AuthResponse {
  sessionToken?: string
  character: Character | null
  needsCharacter: boolean
}

interface TelegramWebApp {
  initData: string
  ready(): void
  expand(): void
  colorScheme?: 'light' | 'dark'
  themeParams?: Record<string, string>
  viewportHeight?: number
  viewportStableHeight?: number
  BackButton?: { show(): void; hide(): void; onClick(callback: () => void): void; offClick(callback: () => void): void }
}

declare global { interface Window { Telegram?: { WebApp?: TelegramWebApp } } }

export function telegramWebApp(): TelegramWebApp | null { return window.Telegram?.WebApp ?? null }
export function getSessionToken(): string | null { return sessionStorage.getItem(SESSION_KEY) }
export function clearSessionToken(): void { sessionStorage.removeItem(SESSION_KEY) }

async function request(path: string, options: RequestInit = {}): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'content-type': 'application/json', ...options.headers } })
  const body = await response.json() as AuthResponse & { message?: string }
  if (!response.ok) throw new Error(body.message ?? 'Authentication failed.')
  if (body.sessionToken) sessionStorage.setItem(SESSION_KEY, body.sessionToken)
  return body
}

export async function bootstrapAuthentication(): Promise<AuthResponse> {
  const current = getSessionToken()
  if (current) {
    try { return await request('/auth/session', { headers: { authorization: `Bearer ${current}` } }) }
    catch { clearSessionToken() }
  }
  const telegram = telegramWebApp()
  if (telegram?.initData) {
    telegram.ready(); telegram.expand()
    return request('/auth/telegram', { method: 'POST', body: JSON.stringify({ initData: telegram.initData }) })
  }
  return request('/auth/dev', { method: 'POST', body: JSON.stringify({ devToken: ensureDevToken() }) })
}

export async function createAuthenticatedCharacter(name: string, classId: CharacterClass): Promise<Character> {
  const token = getSessionToken()
  if (!token) throw new Error('Authentication session is missing.')
  const result = await request('/auth/character', { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify({ name, classId }) })
  if (!result.character) throw new Error('Character creation failed.')
  return result.character
}

export function initializeTelegramEnvironment(): () => void {
  const telegram = telegramWebApp()
  if (!telegram) return () => undefined
  document.documentElement.dataset.telegram = 'true'
  document.documentElement.dataset.colorScheme = telegram.colorScheme ?? 'dark'
  for (const [key, value] of Object.entries(telegram.themeParams ?? {})) document.documentElement.style.setProperty(`--tg-theme-${key.replaceAll('_', '-')}`, value)
  const updateViewport = () => {
    document.documentElement.style.setProperty('--tg-viewport-height', `${telegram.viewportHeight ?? window.innerHeight}px`)
    document.documentElement.style.setProperty('--tg-viewport-stable-height', `${telegram.viewportStableHeight ?? window.innerHeight}px`)
  }
  updateViewport(); window.addEventListener('resize', updateViewport)
  return () => window.removeEventListener('resize', updateViewport)
}
