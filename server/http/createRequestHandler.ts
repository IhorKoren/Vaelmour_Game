import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AuthService } from '../auth/AuthService'
import { AuthenticationError } from '../auth/AuthService'
import type { RuntimeConfig } from '../config'
import { isAllowedOrigin } from '../config'
import type { PlayerStateService } from '../players/PlayerStateService'
import { EconomyError } from '../players/PlayerStateService'
import type { TelemetrySink } from '../telemetry/PlaytestTelemetry'
import type { AdminAction, AdminService } from '../admin/AdminService'
import type { CharacterClass } from '../../src/types/game'
import { log } from '../logging/logger'

interface HandlerDependencies {
  auth: AuthService
  players: PlayerStateService
  telemetry: TelemetrySink
  admin: AdminService
  config: RuntimeConfig
  isInitialized: () => boolean
  isShuttingDown: () => boolean
  checkDatabase: () => Promise<void>
}

async function jsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk)
    size += buffer.length
    if (size > 64 * 1024) throw new EconomyError('PAYLOAD_TOO_LARGE', 'Request body is too large.')
    chunks.push(buffer)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as Record<string, unknown> }
  catch { throw new EconomyError('INVALID_JSON', 'Invalid JSON body.') }
}

function send(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  response.end(JSON.stringify(payload))
}

function bearer(request: IncomingMessage): string {
  const [scheme, token] = (request.headers.authorization ?? '').split(' ')
  if (scheme !== 'Bearer' || !token) throw new AuthenticationError('SESSION_REQUIRED', 'Authenticated session is required.')
  return token
}

const CLASSES = new Set<CharacterClass>(['warrior', 'ranger', 'blacksmith', 'alchemist', 'jeweler'])

export class RequestRateLimiter {
  private readonly attempts = new Map<string, number[]>()
  constructor(private readonly limit: number, private readonly windowMs: number, private readonly now: () => number = Date.now) {}

  consume(key: string): boolean {
    const cutoff = this.now() - this.windowMs
    const recent = (this.attempts.get(key) ?? []).filter((timestamp) => timestamp > cutoff)
    if (recent.length >= this.limit) { this.attempts.set(key, recent); return false }
    recent.push(this.now()); this.attempts.set(key, recent)
    return true
  }
}

function requestClientKey(request: IncomingMessage): string {
  const forwarded = request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim()
  return `${request.socket.remoteAddress ?? 'unknown'}:${forwarded ?? 'direct'}`.slice(0, 200)
}

export function createRequestHandler(deps: HandlerDependencies): (request: IncomingMessage, response: ServerResponse) => void {
  const authLimiter = new RequestRateLimiter(30, 10 * 60_000)
  return (request, response) => { void (async () => {
    const requestId = request.headers['x-request-id']?.toString().slice(0, 100) || crypto.randomUUID()
    const url = new URL(request.url ?? '/', 'http://server.local')
    const origin = request.headers.origin
    if (origin && isAllowedOrigin(origin, deps.config)) {
      response.setHeader('access-control-allow-origin', origin)
      response.setHeader('vary', 'Origin')
      response.setHeader('access-control-allow-headers', 'authorization, content-type, x-request-id')
      response.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS')
    }
    if (request.method === 'OPTIONS') {
      if (!isAllowedOrigin(origin, deps.config)) return send(response, 403, { ok: false, code: 'ORIGIN_FORBIDDEN' })
      response.writeHead(204); response.end(); return
    }
    if (request.method === 'GET' && url.pathname === '/health') return send(response, deps.isShuttingDown() ? 503 : 200, { ok: !deps.isShuttingDown(), status: deps.isShuttingDown() ? 'shutting_down' : 'alive' })
    if (request.method === 'GET' && url.pathname === '/ready') {
      if (!deps.isInitialized() || deps.isShuttingDown()) return send(response, 503, { ok: false, status: 'not_ready' })
      try { await deps.checkDatabase(); return send(response, 200, { ok: true, status: 'ready' }) }
      catch (error) { log('error', 'readiness_failed', { requestId }, error); return send(response, 503, { ok: false, status: 'database_unavailable' }) }
    }
    if (!isAllowedOrigin(origin, deps.config)) return send(response, 403, { ok: false, code: 'ORIGIN_FORBIDDEN' })

    if (request.method === 'POST' && (url.pathname === '/auth/telegram' || url.pathname === '/auth/dev')) {
      if (!authLimiter.consume(requestClientKey(request))) throw new AuthenticationError('AUTH_RATE_LIMITED', 'Too many authentication attempts. Try again later.')
      const body = await jsonBody(request)
      const login = url.pathname === '/auth/telegram'
        ? await deps.auth.authenticateTelegram(String(body.initData ?? ''))
        : await deps.auth.authenticateDev(String(body.devToken ?? ''))
      const character = login.playerId ? await deps.players.character(login.playerId) : null
      return send(response, 200, { sessionToken: login.sessionToken, expiresAt: login.expiresAt.toISOString(), accountId: login.accountId, character, needsCharacter: !character })
    }
    if (request.method === 'GET' && url.pathname === '/auth/session') {
      const session = await deps.auth.validateSession(bearer(request))
      const character = session.playerId ? await deps.players.character(session.playerId) : null
      return send(response, 200, { accountId: session.accountId, character, needsCharacter: !character, expiresAt: session.expiresAt.toISOString() })
    }
    if (request.method === 'POST' && url.pathname === '/auth/character') {
      const token = bearer(request)
      const session = await deps.auth.validateSession(token)
      const body = await jsonBody(request)
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      const classId = body.classId as CharacterClass
      if (!name || name.length > 18 || !CLASSES.has(classId)) throw new EconomyError('INVALID_CHARACTER', 'Invalid character setup.')
      const authenticated = await deps.players.authenticateAccount(session.accountId, { name, classId, level: 1 })
      await deps.telemetry.record({ type: 'CHARACTER_CREATED', eventKey: `character-created:${authenticated.character.id}`, playSessionId: session.sessionId, playerId: authenticated.character.id, payload: { classId } })
      return send(response, 200, { character: authenticated.character })
    }
    if (request.method === 'POST' && url.pathname === '/auth/logout') {
      await deps.auth.revokeSession(bearer(request)); return send(response, 200, { ok: true })
    }
    if (request.method === 'GET' && url.pathname === '/admin/player') {
      const session = await deps.auth.validateSession(bearer(request))
      return send(response, 200, { player: await deps.admin.findExact(session, url.searchParams.get('name') ?? '') })
    }
    if (request.method === 'POST' && url.pathname === '/admin/action') {
      const session = await deps.auth.validateSession(bearer(request))
      const body = await jsonBody(request) as unknown as AdminAction
      return send(response, 200, { state: await deps.admin.mutate(session, body) })
    }
    return send(response, 404, { ok: false, code: 'NOT_FOUND' })
  })().catch((error) => {
    const code = error instanceof AuthenticationError || error instanceof EconomyError ? error.code : 'INTERNAL_ERROR'
    const status = code === 'INTERNAL_ERROR' ? 500 : code === 'AUTH_RATE_LIMITED' ? 429 : code.includes('FORBIDDEN') || code === 'ORIGIN_FORBIDDEN' ? 403 : code.includes('DISABLED') ? 403 : 400
    log(status === 500 ? 'error' : 'warn', 'http_request_failed', { path: request.url, code }, error)
    if (!response.headersSent) send(response, status, { ok: false, code, message: status === 500 ? 'Internal server error.' : error instanceof Error ? error.message : 'Request failed.' })
    else response.end()
  }) }
}
