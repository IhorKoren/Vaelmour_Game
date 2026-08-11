import { createHmac, randomUUID } from 'node:crypto'
import { CLASSES } from '../../src/data/config/balance'
import { calculateXPRequired } from '../../src/progression/progression'
import type { Character } from '../../src/types/game'
import type { CharacterState, DevIdentity } from '../../shared/protocol'
import { ITEM_CATALOG } from '../../shared/game-data/catalog'
import { HEALING_POTION_ID } from '../../shared/game-data/items'
import { RECIPES, STARTER_LEARNED_RECIPES } from '../../shared/game-data/recipes'
import { PROFESSION_RESOURCE_IDS } from '../../shared/game-data/resources'
import { isProfessionClass } from '../../shared/game-data/economy'
import type { EquipmentSlot, EquipmentState, InventoryEntry, PersonalLoot, PlayerRiftProgress } from '../../shared/game-data/types'
import { InMemoryPlayerRepository } from '../repositories/InMemoryPlayerRepository'
import type { AccountSetup, CoinLedgerRecord, PlayerRepository, RepositoryOperation, StoredPlayerProfile } from '../repositories/types'

export class EconomyError extends Error {
  constructor(readonly code: string, message: string) { super(message) }
}

const SLOTS: EquipmentSlot[] = ['weapon', 'head', 'chest', 'hands', 'legs', 'feet', 'ring1', 'ring2', 'amulet']

function emptyEquipment(): EquipmentState {
  return Object.fromEntries(SLOTS.map((slot) => [slot, null])) as EquipmentState
}

export class PlayerStateService {
  constructor(
    readonly repository: PlayerRepository = new InMemoryPlayerRepository(),
    private readonly authSecret = process.env.DEV_AUTH_SECRET ?? 'test-only-dev-auth-secret',
  ) {}

  async authenticate(identity: DevIdentity): Promise<{ accountId: string; character: Character }> {
    const token = identity.devToken ?? identity.playerId
    if (!token) throw new EconomyError('INVALID_DEV_TOKEN', 'Development session token відсутній.')
    const setup = identity.character ? {
      name: identity.character.name,
      classId: identity.character.classId,
      level: identity.character.level,
      legacyPlayerId: identity.devToken ? undefined : identity.playerId,
    } satisfies AccountSetup : null
    try {
      const profile = await this.repository.initialize(this.hashToken(token), setup, (accountId, playerId, initial) => this.starterProfile(accountId, playerId, initial))
      return { accountId: profile.accountId, character: this.toCharacter(profile) }
    } catch (error) {
      if (error instanceof Error && error.message === 'ACCOUNT_SETUP_REQUIRED') throw new EconomyError('ACCOUNT_SETUP_REQUIRED', 'Створіть персонажа для цієї development session.')
      throw error
    }
  }

  async getOrCreate(identity: DevIdentity): Promise<Character> { return (await this.authenticate(identity)).character }

  async authenticateAccount(accountId: string, setup: AccountSetup | null = null): Promise<{ accountId: string; character: Character }> {
    try {
      const profile = await this.repository.initializeAccount(accountId, setup, (nextAccountId, playerId, initial) => this.starterProfile(nextAccountId, playerId, initial))
      return { accountId: profile.accountId, character: this.toCharacter(profile) }
    } catch (error) {
      if (error instanceof Error && error.message === 'ACCOUNT_SETUP_REQUIRED') throw new EconomyError('ACCOUNT_SETUP_REQUIRED', 'Створіть персонажа для цього облікового запису.')
      throw error
    }
  }

  async character(playerId: string): Promise<Character> { return this.toCharacter(await this.requireProfile(playerId)) }

  async snapshot(playerId: string): Promise<CharacterState> {
    return this.toSnapshot(await this.requireProfile(playerId))
  }

  async riftProgress(playerId: string, riftId = 'first_rift'): Promise<PlayerRiftProgress> {
    const profile = await this.requireProfile(playerId)
    return profile.riftProgress?.[riftId] ?? { riftId, highestUnlockedFloor: 1, highestCompletedFloor: 0, completionCount: {} }
  }

  async completeRiftFloor(playerId: string, riftId: string, floorNumber: number, operationId: string): Promise<PlayerRiftProgress> {
    const result = await this.repository.transact(playerId, { key: `rift-progress:${playerId}:${operationId}`, type: 'RIFT_FLOOR_COMPLETE', referenceId: operationId }, (profile) => {
      const current = profile.riftProgress?.[riftId] ?? { riftId, highestUnlockedFloor: 1, highestCompletedFloor: 0, completionCount: {} }
      profile.riftProgress ??= {}
      profile.riftProgress[riftId] = { riftId,
        highestCompletedFloor: Math.max(current.highestCompletedFloor, floorNumber),
        highestUnlockedFloor: Math.max(current.highestUnlockedFloor, Math.min(3, floorNumber + 1)),
        completionCount: { ...current.completionCount, [floorNumber]: (current.completionCount[floorNumber] ?? 0) + 1 } }
    })
    return result.profile.riftProgress![riftId]
  }

  async calculateStats(profileOrId: StoredPlayerProfile | string): Promise<{ attack: number; maxHP: number }> {
    const profile = typeof profileOrId === 'string' ? await this.requireProfile(profileOrId) : profileOrId
    return this.stats(profile)
  }

  async equip(playerId: string, entryId: string, requestedSlot?: EquipmentSlot, operationId: string = randomUUID()): Promise<CharacterState> {
    const profile = await this.mutate(playerId, { key: `equip:${playerId}:${operationId}`, type: 'EQUIP' }, (working) => {
      const index = working.inventory.findIndex((entry) => entry.entryId === entryId)
      if (index < 0) throw new EconomyError('ITEM_NOT_OWNED', 'Цей предмет не належить персонажу.')
      const entry = working.inventory[index]
      const item = ITEM_CATALOG[entry.itemId]
      if (!item?.equipType) throw new EconomyError('NOT_EQUIPMENT', 'Предмет не можна вдягнути.')
      if (item.allowedClass && item.allowedClass !== working.classId) throw new EconomyError('WRONG_CLASS', 'Цей предмет призначений для іншого класу.')
      const slot = this.resolveSlot(item.equipType, requestedSlot, working.equipment)
      const equipped = working.equipment[slot]
      working.inventory.splice(index, 1)
      working.equipment[slot] = { ...entry, quantity: 1 }
      if (equipped) working.inventory.push(equipped)
    })
    return this.toSnapshot(profile)
  }

  async unequip(playerId: string, slot: EquipmentSlot, operationId: string = randomUUID()): Promise<CharacterState> {
    const profile = await this.mutate(playerId, { key: `unequip:${playerId}:${operationId}`, type: 'UNEQUIP' }, (working) => {
      const entry = working.equipment[slot]
      if (!entry) throw new EconomyError('SLOT_EMPTY', 'Слот уже порожній.')
      working.equipment[slot] = null
      working.inventory.push(entry)
    })
    return this.toSnapshot(profile)
  }

  async move(playerId: string, entryId: string, toStorage: boolean, requestedQuantity?: number, operationId: string = randomUUID()): Promise<CharacterState> {
    const profile = await this.mutate(playerId, { key: `move:${playerId}:${operationId}`, type: 'MOVE_ITEM' }, (working) => {
      const source = toStorage ? working.inventory : working.storage
      const target = toStorage ? working.storage : working.inventory
      const index = source.findIndex((entry) => entry.entryId === entryId)
      if (index < 0) throw new EconomyError('ITEM_NOT_OWNED', 'Предмет не знайдено.')
      const entry = source[index]
      const quantity = Math.max(1, Math.min(entry.quantity, Math.floor(requestedQuantity ?? entry.quantity)))
      const movingWholeEntry = quantity === entry.quantity
      entry.quantity -= quantity
      if (entry.quantity === 0) source.splice(index, 1)
      this.addItem(target, entry.itemId, quantity, movingWholeEntry ? entry.entryId : undefined)
    })
    return this.toSnapshot(profile)
  }

  async learnRecipe(playerId: string, entryId: string, operationId: string = randomUUID()): Promise<CharacterState> {
    const profile = await this.mutate(playerId, { key: `learn:${playerId}:${operationId}`, type: 'LEARN_RECIPE' }, (working) => {
      const entry = working.inventory.find((item) => item.entryId === entryId)
      const item = entry ? ITEM_CATALOG[entry.itemId] : undefined
      const recipe = item?.recipeId ? RECIPES[item.recipeId] : undefined
      if (!entry || !recipe) throw new EconomyError('RECIPE_NOT_OWNED', 'Рецепт не знайдено.')
      if (!isProfessionClass(working.classId) || recipe.profession !== working.classId) throw new EconomyError('WRONG_PROFESSION', 'Цей рецепт належить іншій професії.')
      if (working.learnedRecipes.has(recipe.id)) throw new EconomyError('ALREADY_LEARNED', 'Цей рецепт уже вивчено.')
      working.learnedRecipes.add(recipe.id)
      this.removeQuantity(working.inventory, entry.entryId, 1)
    })
    return this.toSnapshot(profile)
  }

  async craft(playerId: string, recipeId: string, operationId: string = randomUUID()): Promise<CharacterState> {
    const profile = await this.mutate(playerId, { key: `craft:${playerId}:${operationId}`, type: 'CRAFT', referenceId: operationId }, (working) => {
      const recipe = RECIPES[recipeId]
      if (!recipe || !working.learnedRecipes.has(recipeId)) throw new EconomyError('RECIPE_NOT_LEARNED', 'Спочатку вивчіть рецепт.')
      if (!isProfessionClass(working.classId) || recipe.profession !== working.classId) throw new EconomyError('WRONG_PROFESSION', 'Рецепт недоступний цьому класу.')
      for (const [itemId, quantity] of Object.entries(recipe.requirements)) if (this.countIn(working.inventory, itemId) < quantity) throw new EconomyError('NOT_ENOUGH_RESOURCES', 'Недостатньо ресурсів.')
      for (const [itemId, quantity] of Object.entries(recipe.requirements)) this.consumeByItemId(working.inventory, itemId, quantity)
      this.addItem(working.inventory, recipe.outputItemId, recipe.outputQuantity)
    })
    return this.toSnapshot(profile)
  }

  async countItem(playerId: string, itemId: string): Promise<number> {
    return this.countIn((await this.requireProfile(playerId)).inventory, itemId)
  }

  async consumeItem(playerId: string, itemId: string, quantity: number, operationId: string = randomUUID()): Promise<boolean> {
    try {
      const result = await this.repository.transact(playerId, { key: `consume:${playerId}:${operationId}`, type: 'CONSUME_ITEM', referenceId: operationId }, (working) => {
        if (this.countIn(working.inventory, itemId) < quantity) throw new EconomyError('NOT_ENOUGH_ITEMS', 'Недостатньо предметів.')
        this.consumeByItemId(working.inventory, itemId, quantity)
      })
      return result.applied
    } catch (error) {
      if (error instanceof EconomyError && error.code === 'NOT_ENOUGH_ITEMS') return false
      throw error
    }
  }

  async awardProgression(playerId: string, level: number, currentXP: number, coins: number, encounterReference: string = randomUUID()): Promise<boolean> {
    const result = await this.repository.transact(playerId, {
      key: `encounter:${playerId}:${encounterReference}`, type: 'ENCOUNTER_REWARD', referenceId: encounterReference,
      ledger: { amount: coins, reason: 'RIFT_REWARD', referenceId: encounterReference },
    }, (profile) => {
      profile.level = level
      profile.currentXP = currentXP
      profile.coins += coins
    })
    return result.applied
  }

  async commitLoot(playerId: string, loot: PersonalLoot, retainedFraction = 1, extractionReference: string = randomUUID()): Promise<{ committed: PersonalLoot; applied: boolean }> {
    const committed: PersonalLoot = { resources: {}, recipeIds: [] }
    const result = await this.repository.transact(playerId, { key: `extraction:${playerId}:${extractionReference}`, type: 'EXTRACTION', referenceId: extractionReference }, (profile) => {
      for (const [itemId, quantity] of Object.entries(loot.resources)) {
        const kept = Math.floor(quantity * retainedFraction)
        if (kept > 0) { this.addItem(profile.inventory, itemId, kept); committed.resources[itemId] = kept }
      }
      const recipeCount = Math.floor(loot.recipeIds.length * retainedFraction)
      for (const recipeId of loot.recipeIds.slice(0, recipeCount)) {
        this.addItem(profile.inventory, `recipe_item:${recipeId}`, 1)
        committed.recipeIds.push(recipeId)
      }
    })
    return { committed: result.applied ? committed : { resources: {}, recipeIds: [] }, applied: result.applied }
  }

  async addItemForTesting(playerId: string, itemId: string, quantity = 1, operationId: string = randomUUID()): Promise<InventoryEntry> {
    let entryId = ''
    await this.mutate(playerId, { key: `test-item:${playerId}:${operationId}`, type: 'TEST_ITEM' }, (profile) => {
      entryId = this.addItem(profile.inventory, itemId, quantity).entryId
    })
    return { entryId, itemId, quantity }
  }

  async adminGrantItem(playerId: string, itemId: string, quantity: number, operationId: string): Promise<CharacterState> {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10_000) throw new EconomyError('INVALID_ADMIN_VALUE', 'Invalid item quantity.')
    const profile = await this.mutate(playerId, { key: `admin-item:${playerId}:${operationId}`, type: 'ADMIN', referenceId: operationId }, (working) => { this.addItem(working.inventory, itemId, quantity) })
    return this.toSnapshot(profile)
  }

  async adminGrantCoins(playerId: string, amount: number, operationId: string): Promise<CharacterState> {
    if (!Number.isInteger(amount) || amount < 1 || amount > 1_000_000) throw new EconomyError('INVALID_ADMIN_VALUE', 'Invalid coin amount.')
    const result = await this.repository.transact(playerId, { key: `admin-coins:${playerId}:${operationId}`, type: 'ADMIN', referenceId: operationId, ledger: { amount, reason: 'ADMIN', referenceId: operationId } }, (working) => { working.coins += amount })
    return this.toSnapshot(result.profile)
  }

  async adminResetRift(playerId: string, operationId: string): Promise<CharacterState> {
    const profile = await this.mutate(playerId, { key: `admin-rift:${playerId}:${operationId}`, type: 'ADMIN', referenceId: operationId }, (working) => {
      working.riftProgress = { first_rift: { riftId: 'first_rift', highestUnlockedFloor: 1, highestCompletedFloor: 0, completionCount: {} } }
    })
    return this.toSnapshot(profile)
  }

  async adminSetLevel(playerId: string, level: number, operationId: string): Promise<CharacterState> {
    if (!Number.isInteger(level) || level < 1 || level > 100) throw new EconomyError('INVALID_ADMIN_VALUE', 'Invalid level.')
    const profile = await this.mutate(playerId, { key: `admin-level:${playerId}:${operationId}`, type: 'ADMIN', referenceId: operationId }, (working) => { working.level = level; working.currentXP = 0 })
    return this.toSnapshot(profile)
  }

  async ledger(playerId: string): Promise<CoinLedgerRecord[]> { return this.repository.ledger(playerId) }
  async disconnect(): Promise<void> { await this.repository.disconnect() }
  hashToken(token: string): string { return createHmac('sha256', this.authSecret).update(token).digest('hex') }

  private starterProfile(accountId: string, playerId: string, setup: AccountSetup): StoredPlayerProfile {
    const classId = setup.classId in CLASSES ? setup.classId : 'warrior'
    const profile: StoredPlayerProfile = {
      accountId, playerId, name: setup.name.trim().slice(0, 18) || 'Мандрівник', classId,
      level: setup.legacyPlayerId ? Math.max(1, Math.min(100, Math.floor(setup.level || 1))) : 1, currentXP: 0, coins: 0, reservedCoins: 0,
      inventory: [], storage: [], equipment: emptyEquipment(),
      learnedRecipes: new Set(isProfessionClass(classId) ? STARTER_LEARNED_RECIPES[classId] ?? [] : []),
      reservedItems: [],
      riftProgress: { first_rift: { riftId: 'first_rift', highestUnlockedFloor: 1, highestCompletedFloor: 0, completionCount: {} } },
    }
    this.addItem(profile.inventory, HEALING_POTION_ID, 5)
    profile.equipment.weapon = this.newEntry(`starter_${classId}_weapon`, 1)
    profile.equipment.chest = this.newEntry(`starter_${classId}_chest`, 1)
    const resources = isProfessionClass(classId) ? PROFESSION_RESOURCE_IDS[classId] : ['rift_iron', 'rift_essence', 'rift_crystal']
    resources.forEach((resourceId) => this.addItem(profile.inventory, resourceId, isProfessionClass(classId) ? 8 : 2))
    return profile
  }

  private async mutate(playerId: string, operation: RepositoryOperation, action: (profile: StoredPlayerProfile) => void): Promise<StoredPlayerProfile> {
    return (await this.repository.transact(playerId, operation, action)).profile
  }

  private async requireProfile(playerId: string): Promise<StoredPlayerProfile> {
    const profile = await this.repository.read(playerId)
    if (!profile) throw new EconomyError('PLAYER_NOT_FOUND', 'Персонажа не знайдено.')
    return profile
  }

  private stats(profile: StoredPlayerProfile): { attack: number; maxHP: number } {
    const base = CLASSES[profile.classId]
    let attack = base.attack + profile.level - 1
    let maxHP = base.maxHP + (profile.level - 1) * 5
    for (const entry of Object.values(profile.equipment)) {
      if (!entry) continue
      const item = ITEM_CATALOG[entry.itemId]
      attack += item?.attack ?? 0
      maxHP += item?.hp ?? 0
    }
    return { attack, maxHP }
  }

  private toCharacter(profile: StoredPlayerProfile): Character {
    const stats = this.stats(profile)
    return { id: profile.playerId, name: profile.name, classId: profile.classId, level: profile.level, currentXP: profile.currentXP, attack: stats.attack, maxHP: stats.maxHP, currentHP: stats.maxHP, alive: true, ready: false }
  }

  private toSnapshot(profile: StoredPlayerProfile): CharacterState {
    const character = this.toCharacter(profile)
    return {
      playerId: profile.playerId, name: profile.name, classId: profile.classId, level: profile.level,
      currentXP: profile.currentXP, xpRequired: calculateXPRequired(profile.level), attack: character.attack,
      maxHP: character.maxHP, currentHP: character.currentHP, coins: profile.coins + profile.reservedCoins,
      reservedCoins: profile.reservedCoins, availableCoins: profile.coins,
      inventory: profile.inventory.map((entry) => ({ ...entry })), storage: profile.storage.map((entry) => ({ ...entry })),
      equipment: Object.fromEntries(SLOTS.map((slot) => [slot, profile.equipment[slot] ? { ...profile.equipment[slot]! } : null])) as EquipmentState,
      learnedRecipes: [...profile.learnedRecipes],
      riftProgress: Object.fromEntries(Object.entries(profile.riftProgress ?? {}).map(([id, progress]) => [id, { ...progress, completionCount: { ...progress.completionCount } }])),
    }
  }

  private resolveSlot(type: string, requested: EquipmentSlot | undefined, equipment: EquipmentState): EquipmentSlot {
    if (type === 'ring') {
      if (requested && requested !== 'ring1' && requested !== 'ring2') throw new EconomyError('WRONG_SLOT', 'Перстень можна вдягнути лише у слот Ring.')
      return requested ?? (!equipment.ring1 ? 'ring1' : 'ring2')
    }
    const slot = type as EquipmentSlot
    if (requested && requested !== slot) throw new EconomyError('WRONG_SLOT', 'Предмет не відповідає вибраному слоту.')
    return slot
  }

  private newEntry(itemId: string, quantity: number, entryId: string = randomUUID()): InventoryEntry {
    if (!ITEM_CATALOG[itemId]) throw new EconomyError('UNKNOWN_ITEM', 'Невідомий предмет.')
    return { entryId, itemId, quantity }
  }

  private addItem(target: InventoryEntry[], itemId: string, quantity: number, preferredEntryId?: string): InventoryEntry {
    const definition = ITEM_CATALOG[itemId]
    if (!definition) throw new EconomyError('UNKNOWN_ITEM', 'Невідомий предмет.')
    if (definition.stackable) {
      const existing = target.find((entry) => entry.itemId === itemId)
      if (existing) { existing.quantity += quantity; return existing }
    }
    const entry = this.newEntry(itemId, quantity, preferredEntryId)
    target.push(entry)
    return entry
  }

  private countIn(entries: InventoryEntry[], itemId: string): number { return entries.filter((entry) => entry.itemId === itemId).reduce((sum, entry) => sum + entry.quantity, 0) }
  private consumeByItemId(entries: InventoryEntry[], itemId: string, quantity: number): void {
    let remaining = quantity
    for (const entry of [...entries]) {
      if (entry.itemId !== itemId || remaining <= 0) continue
      const used = Math.min(entry.quantity, remaining)
      this.removeQuantity(entries, entry.entryId, used); remaining -= used
    }
  }
  private removeQuantity(entries: InventoryEntry[], entryId: string, quantity: number): void {
    const index = entries.findIndex((entry) => entry.entryId === entryId)
    if (index < 0) return
    entries[index].quantity -= quantity
    if (entries[index].quantity <= 0) entries.splice(index, 1)
  }
}
