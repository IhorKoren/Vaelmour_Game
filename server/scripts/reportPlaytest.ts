import 'dotenv/config'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { createPrismaClient } from '../db/prisma'
import { generatePlaytestReport } from '../telemetry/playtestReport'

const prisma = createPrismaClient()
await prisma.$connect()
try {
  const events = await prisma.playtestEvent.findMany({ orderBy: { createdAt: 'asc' }, select: { type: true, floor: true, expeditionId: true, playerId: true, payload: true } })
  const target = resolve('reports/playtest-report.md')
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, generatePlaytestReport(events), 'utf8')
  console.log(`Playtest report generated from ${events.length} events: ${target}`)
} finally { await prisma.$disconnect() }
