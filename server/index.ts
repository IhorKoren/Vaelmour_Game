import 'dotenv/config'
import { createServer } from 'node:http'
import { WebSocketServer } from 'ws'
import { SERVER_PORT } from './config'
import { createPrismaClient } from './db/prisma'
import { PlayerStateService } from './players/PlayerStateService'
import { PrismaPlayerRepository } from './repositories/PrismaPlayerRepository'
import { EconomyService } from './economy/EconomyService'
import { RoomManager } from './rooms/RoomManager'
import { attachWebSocket } from './websocket/attachWebSocket'

const httpServer = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ ok: true }))
    return
  }
  response.writeHead(404)
  response.end()
})

const prisma = createPrismaClient()
const repository = new PrismaPlayerRepository(prisma)
const authSecret = process.env.DEV_AUTH_SECRET
if (!authSecret) throw new Error('DEV_AUTH_SECRET is required. Copy .env.example to .env.')
await prisma.$connect()
const economy = new EconomyService(repository)
await economy.cleanupOrphanedTrades()
await economy.cleanupOrphanedPartySlots()
const rooms = new RoomManager({ playerStates: new PlayerStateService(repository, authSecret), economy })
const wss = new WebSocketServer({ server: httpServer })
attachWebSocket(wss, rooms)

httpServer.listen(SERVER_PORT, '127.0.0.1', () => {
  console.log(`[rift-server] WebSocket ready at ws://127.0.0.1:${SERVER_PORT}`)
})

let shuttingDown = false
async function shutdown(): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  await rooms.dispose()
  wss.close(() => httpServer.close())
}

process.on('SIGINT', () => { void shutdown() })
process.on('SIGTERM', () => { void shutdown() })
