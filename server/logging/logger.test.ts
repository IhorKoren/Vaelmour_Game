import { describe, expect, it } from 'vitest'
import { sanitizeErrorText } from './logger'

describe('structured log secret sanitization', () => {
  it('redacts database URLs, bearer credentials, and common secret assignments', () => {
    const input = 'connect postgresql://user:pass@host/db Authorization: Bearer abc.def token=secret-value useful-marker'
    const output = sanitizeErrorText(input)
    expect(output).not.toContain('user:pass')
    expect(output).not.toContain('abc.def')
    expect(output).not.toContain('secret-value')
    expect(output).toContain('useful-marker')
  })
})
