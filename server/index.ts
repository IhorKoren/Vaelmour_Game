import 'dotenv/config'
import { createServer } from 'node:http'
import { WebSocketServer } from 'ws'
import { SERVER_HOST, SERVER_PORT, isAllowedOrigin, loadRuntimeConfig } from './config'
import { createPrismaClient } from './db/prisma'
import { PlayerStateService } from './players/PlayerStateService'
import { PrismaPlayerRepository } from './repositories/PrismaPlayerRepository'
import { EconomyService } from './economy/EconomyService'
import { RoomManager } from './rooms/RoomManager'
import { PRODUCTION_MIN_PARTY_SIZE } from '../shared/game-data/balance'
import { attachWebSocket } from './websocket/attachWebSocket'
import { AuthService } from './auth/AuthService'
import { PlaytestTelemetry, SafeTelemetrySink } from './telemetry/PlaytestTelemetry'
import { createRequestHandler } from './http/createRequestHandler'
import { AdminService } from './admin/AdminService'
import { log } from './logging/logger'

const config = loadRuntimeConfig()
const prisma = createPrismaClient()
const repository = new PrismaPlayerRepository(prisma)
const playerStates = new PlayerStateService(repository, process.env.DEV_AUTH_SECRET ?? config.sessionSecret)
const auth = new AuthService(prisma, config)
const economy = new EconomyService(repository)
const telemetryStore = new PlaytestTelemetry(prisma)
const telemetry = new SafeTelemetrySink(telemetryStore)
const admin = new AdminService(prisma, playerStates, config)
let initialized = false
let shuttingDown = false

const rooms = new RoomManager({ playerStates, economy, telemetry, minPartySize: PRODUCTION_MIN_PARTY_SIZE })
const requestHandler = createRequestHandler({
  auth, players: playerStates, telemetry, admin, config,
  isInitialized: () => initialized, isShuttingDown: () => shuttingDown,
  checkDatabase: async () => {
    await prisma.$queryRaw`SELECT 1`
    const migration = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS "ok" FROM "_prisma_migrations" WHERE "migration_name" = '20260812010000_phase8_reliability' AND "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL`
    if (!migration.length) throw new Error('Phase 8 database migration is not applied.')
  },
})
const httpServer = createServer(requestHandler)
const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 })
attachWebSocket(wss, rooms, { validateSession: (token) => auth.validateSession(token) })

httpServer.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url ?? '/', 'http://server.local').pathname
  if (pathname !== '/ws' || !isAllowedOrigin(request.headers.origin, config) || shuttingDown) {
    socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); socket.destroy(); return
  }
  wss.handleUpgrade(request, socket, head, (webSocket) => wss.emit('connection', webSocket, request))
})

await prisma.$connect()
log('info', 'startup_database_connected')
// These recovery jobs can touch overlapping economy rows. Run them in order so
// a cold start cannot deadlock before the HTTP server begins listening.
const cancelledTrades = await economy.cleanupOrphanedTrades()
const refundedSlots = await economy.cleanupOrphanedPartySlots()
const interruptedRifts = await telemetryStore.recoverInterruptedExpeditions()
const expiredSessions = await auth.cleanupExpiredSessions()
const sessionCleanupTimer = setInterval(() => { void auth.cleanupExpiredSessions().catch((error) => log('error', 'session_cleanup_failed', {}, error)) }, config.sessionCleanupIntervalMs ?? 15 * 60_000)
sessionCleanupTimer.unref?.()
initialized = true
httpServer.listen(SERVER_PORT, SERVER_HOST, () => log('info', 'server_ready', { host: SERVER_HOST, port: SERVER_PORT, cancelledTrades, refundedSlots, interruptedRifts, expiredSessions, nodeEnv: config.nodeEnv }))

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  rooms.stopAccepting()
  log('info', 'shutdown_started', { signal })
  const deadline = new Promise<void>((resolve) => setTimeout(resolve, 10_000))
  const graceful = (async () => {
    clearInterval(sessionCleanupTimer)
    const httpClosed = new Promise<void>((resolve) => httpServer.close(() => resolve()))
    for (const client of wss.clients) client.close(1012, 'Server restarting')
    await new Promise<void>((resolve) => wss.close(() => resolve()))
    await httpClosed
    await rooms.dispose()
    await prisma.$disconnect()
  })()
  await Promise.race([graceful, deadline])
  log('info', 'shutdown_complete', { signal })
  process.exit(0)
}

process.on('SIGINT', () => { void shutdown('SIGINT') })
process.on('SIGTERM', () => { void shutdown('SIGTERM') })
process.on('uncaughtException', (error) => { log('error', 'uncaught_exception', {}, error); void shutdown('uncaughtException') })
process.on('unhandledRejection', (error) => { log('error', 'unhandled_rejection', {}, error) })
