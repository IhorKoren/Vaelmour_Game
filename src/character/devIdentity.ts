const DEV_TOKEN_KEY = 'first-rift-dev-token'

export function getDevToken(): string | null {
  return localStorage.getItem(DEV_TOKEN_KEY)
}

export function ensureDevToken(): string {
  const existing = getDevToken()
  if (existing) return existing
  const token = globalThis.crypto?.randomUUID?.() ?? `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`
  localStorage.setItem(DEV_TOKEN_KEY, token)
  return token
}

export function clearDevToken(): void {
  localStorage.removeItem(DEV_TOKEN_KEY)
}
