const SENSITIVE = /(token|secret|password|init.?data|authorization|cookie)/i

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key]) => !SENSITIVE.test(key)).map(([key, nested]) => [key, sanitize(nested)]))
  return value
}

export function log(level: 'info' | 'warn' | 'error', event: string, context: Record<string, unknown> = {}, error?: unknown): void {
  const entry: Record<string, unknown> = { level, timestamp: new Date().toISOString(), event, ...sanitize(context) as Record<string, unknown> }
  if (error instanceof Error) entry.error = { name: error.name, message: error.message, stack: error.stack }
  const output = JSON.stringify(entry)
  if (level === 'error') console.error(output)
  else if (level === 'warn') console.warn(output)
  else console.log(output)
}
