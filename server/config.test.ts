import { afterEach, describe, expect, it } from 'vitest'
import { isAllowedOrigin, loadRuntimeConfig } from './config'

const original = { ...process.env }
afterEach(() => { process.env = { ...original } })

describe('production-safe environment configuration', () => {
  it('defaults dev authentication to disabled', () => {
    process.env.NODE_ENV = 'development'; delete process.env.ALLOW_DEV_AUTH; delete process.env.SESSION_SECRET
    expect(loadRuntimeConfig().allowDevAuth).toBe(false)
  })

  it('refuses production boot with development authentication', () => {
    Object.assign(process.env, { NODE_ENV: 'production', ALLOW_DEV_AUTH: 'true', SESSION_SECRET: 'production-session-secret-at-least-32-chars', TELEGRAM_BOT_TOKEN: 'bot', APP_ORIGIN: 'https://game.example' })
    expect(() => loadRuntimeConfig()).toThrow(/ALLOW_DEV_AUTH/)
  })

  it('accepts only configured production origins', () => {
    Object.assign(process.env, { NODE_ENV: 'production', ALLOW_DEV_AUTH: 'false', SESSION_SECRET: 'production-session-secret-at-least-32-chars', TELEGRAM_BOT_TOKEN: 'bot', APP_ORIGIN: 'https://game.example', ALLOWED_ORIGINS: 'https://admin.example' })
    const config = loadRuntimeConfig()
    expect(isAllowedOrigin('https://game.example', config)).toBe(true)
    expect(isAllowedOrigin('https://evil.example', config)).toBe(false)
    expect(isAllowedOrigin(undefined, config)).toBe(false)
  })
})
