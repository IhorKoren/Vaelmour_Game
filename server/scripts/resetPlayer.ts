import 'dotenv/config'
import { createPrismaClient } from '../db/prisma'
import { PlayerStateService } from '../players/PlayerStateService'
import { PrismaPlayerRepository } from '../repositories/PrismaPlayerRepository'

if (process.env.NODE_ENV === 'production') throw new Error('dev:reset-player is disabled in production')

const token = process.argv[2] ?? process.env.DEV_PLAYER_TOKEN
if (!token) throw new Error('Pass the dev token as an argument or set DEV_PLAYER_TOKEN')
const authSecret = process.env.DEV_AUTH_SECRET
if (!authSecret) throw new Error('DEV_AUTH_SECRET is required')

const prisma = createPrismaClient()
const repository = new PrismaPlayerRepository(prisma)
const service = new PlayerStateService(repository, authSecret)

try {
  const removed = await repository.resetByDevTokenHash(service.hashToken(token))
  console.log(removed ? 'Development player reset.' : 'No player found for that dev token.')
} finally {
  await service.disconnect()
}
