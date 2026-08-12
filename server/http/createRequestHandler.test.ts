import { describe, expect, it } from 'vitest'
import { RequestRateLimiter } from './createRequestHandler'

describe('HTTP abuse protection', () => {
  it('limits repeated authentication attempts and recovers after the window', () => {
    let now = 1_000
    const limiter = new RequestRateLimiter(2, 100, () => now)
    expect(limiter.consume('client')).toBe(true)
    expect(limiter.consume('client')).toBe(true)
    expect(limiter.consume('client')).toBe(false)
    expect(limiter.consume('other-client')).toBe(true)
    now += 101
    expect(limiter.consume('client')).toBe(true)
  })
})
