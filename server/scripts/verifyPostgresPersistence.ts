import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { recipeItemId } from '../../shared/game-data/catalog'
import { createPrismaClient } from '../db/prisma'
import { PlayerStateService } from '../players/PlayerStateService'
import { PrismaPlayerRepository } from '../repositories/PrismaPlayerRepository'
import { PresenceService } from '../social/PresenceService'
import { GuildService } from '../guilds/GuildService'
import { ChatService } from '../chat/ChatService'

const authSecret = process.env.DEV_AUTH_SECRET
if (!authSecret) throw new Error('DEV_AUTH_SECRET is required')

const token = `postgres-persistence-${randomUUID()}`
const firstRepository = new PrismaPlayerRepository(createPrismaClient())
const firstService = new PlayerStateService(firstRepository, authSecret)
let cleanupRepository: PrismaPlayerRepository = firstRepository
let cleanupService: PlayerStateService = firstService

try {
  const authenticated = await firstService.authenticate({ devToken: token, character: { name: 'DB Smoke', classId: 'alchemist', level: 99 } })
  const playerId = authenticated.character.id
  const crafted = await firstService.craft(playerId, 'recipe_alchemist_weapon', 'db-smoke-craft')
  const weapon = crafted.inventory.find((entry) => entry.itemId === 'crafted_alchemist_weapon')!
  await firstService.equip(playerId, weapon.entryId, 'weapon', 'db-smoke-equip')
  const potion = (await firstService.snapshot(playerId)).inventory.find((entry) => entry.itemId === 'healing_potion')!
  await firstService.move(playerId, potion.entryId, true, 2, 'db-smoke-storage')
  const recipeItem = await firstService.addItemForTesting(playerId, recipeItemId('recipe_alchemist_chest'), 1, 'db-smoke-recipe-item')
  await firstService.learnRecipe(playerId, recipeItem.entryId, 'db-smoke-learn')
  await firstService.awardProgression(playerId, 2, 7, 8, 'db-smoke-encounter')
  await firstService.awardProgression(playerId, 2, 7, 600, 'db-smoke-guild-fund')
  const firstPresence = new PresenceService(); firstPresence.set(playerId, 'CITY')
  const firstGuilds = new GuildService(firstRepository, firstPresence)
  const firstChat = new ChatService(firstRepository, firstPresence)
  await firstGuilds.create(playerId, { name: `Smoke ${randomUUID().slice(0, 8)}`, tag: `S${randomUUID().slice(0, 5)}` }, 'db-smoke-guild')
  const guildItem = await firstService.addItemForTesting(playerId, 'rift_iron', 3, 'db-smoke-guild-item')
  await firstGuilds.deposit(playerId, guildItem.entryId, 3, 'db-smoke-guild-deposit')
  await firstChat.send(playerId, { channel: 'GLOBAL', text: 'Persistence smoke' }, 'db-smoke-chat')
  await firstService.disconnect()

  const secondRepository = new PrismaPlayerRepository(createPrismaClient())
  const secondService = new PlayerStateService(secondRepository, authSecret)
  cleanupRepository = secondRepository
  cleanupService = secondService
  const reloaded = await secondService.authenticate({ devToken: token })
  const state = await secondService.snapshot(reloaded.character.id)
  const secondPresence = new PresenceService(); secondPresence.set(playerId, 'CITY')
  const secondGuilds = new GuildService(secondRepository, secondPresence)
  const secondChat = new ChatService(secondRepository, secondPresence)

  assert.equal(reloaded.character.id, playerId)
  assert.equal(state.level, 2)
  assert.equal(state.currentXP, 7)
  assert.equal(state.coins, 108)
  assert.equal(state.equipment.weapon?.entryId, weapon.entryId)
  assert.equal(state.storage.find((entry) => entry.itemId === 'healing_potion')?.quantity, 2)
  assert.ok(state.learnedRecipes.includes('recipe_alchemist_chest'))
  assert.equal((await secondService.ledger(playerId)).length, 3)
  assert.equal((await secondGuilds.state(playerId)).selfRank, 'LEADER')
  assert.equal((await secondGuilds.storage(playerId)).items.find((item) => item.itemId === 'rift_iron')?.quantity, 3)
  assert.equal((await secondGuilds.history(playerId))[0].action, 'DEPOSIT')
  assert.equal((await secondChat.history(playerId, { channel: 'GLOBAL' })).messages.at(-1)?.text, 'Persistence smoke')
  console.log('PostgreSQL persistence smoke test passed.')
} finally {
  await cleanupRepository.resetByDevTokenHash(cleanupService.hashToken(token)).catch(() => false)
  await cleanupService.disconnect().catch(() => undefined)
}
