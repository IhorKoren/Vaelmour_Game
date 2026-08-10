import { randomUUID } from 'node:crypto'
import { generateEnemyAction, resolveRound } from '../../src/combat/engine'
import { ENCOUNTERS, ZONES } from '../../src/data/config/balance'
import { applyXPAndLevelUps } from '../../src/progression/progression'
import type { Character, CombatAction, Enemy, Zone } from '../../src/types/game'
import {
  DEV_MIN_PARTY_SIZE, MAX_PARTY_SIZE, PROTOCOL_VERSION, RECONNECT_GRACE_MS,
  isZone, toCombatAction,
} from '../../shared/protocol'
import type {
  ClientMessage, CombatSnapshot, DevIdentity, PartySnapshot, PartySummary, PublicPartyMember, ServerMessage,
} from '../../shared/protocol'
import type { ClientPeer, RoomMember, RoomState } from '../types/room'
import { COIN_MULTIPLIER, FAILED_EXPEDITION_LOOT_LOSS } from '../../shared/game-data/economy'
import { HEALING_POTION_ID } from '../../shared/game-data/items'
import type { PersonalLoot } from '../../shared/game-data/types'
import { generateProfessionLoot } from '../loot/professionLoot'
import { EconomyError, PlayerStateService } from '../players/PlayerStateService'
import { EconomyService } from '../economy/EconomyService'
import type { EconomyRepository } from '../repositories/types'
import type { MarketSnapshot, TradeSnapshot } from '../../shared/economy-types'

interface ManagerOptions {
  roundDurationMs?: number
  reconnectGraceMs?: number
  now?: () => number
  random?: () => number
  autoTimers?: boolean
  playerStates?: PlayerStateService
  economy?: EconomyService
}

const ECONOMY_MUTATIONS = new Set<ClientMessage['type']>([
  'EQUIP_ITEM', 'UNEQUIP_ITEM', 'MOVE_TO_STORAGE', 'MOVE_FROM_STORAGE', 'LEARN_RECIPE', 'CRAFT_ITEM',
  'APPLY_TO_PARTY', 'CREATE_SELL_ORDER', 'CREATE_BUY_ORDER', 'CANCEL_MARKET_ORDER', 'BUY_NOW', 'SELL_NOW',
  'REQUEST_TRADE', 'ACCEPT_TRADE', 'DECLINE_TRADE', 'UPDATE_TRADE_OFFER', 'CONFIRM_TRADE', 'CANCEL_TRADE',
])

function randomZone(random: () => number): Zone {
  return ZONES[Math.floor(random() * ZONES.length)] ?? 'body'
}

export class RoomManager {
  readonly rooms = new Map<string, RoomState>()
  private readonly identities = new Map<string, Character>()
  private readonly peers = new Map<string, ClientPeer>()
  private readonly roundDurationMs: number
  private readonly reconnectGraceMs: number
  private readonly now: () => number
  private readonly random: () => number
  private readonly autoTimers: boolean
  readonly playerStates: PlayerStateService
  readonly economy: EconomyService

  constructor(options: ManagerOptions = {}) {
    this.roundDurationMs = options.roundDurationMs ?? 30_000
    this.reconnectGraceMs = options.reconnectGraceMs ?? RECONNECT_GRACE_MS
    this.now = options.now ?? Date.now
    this.random = options.random ?? Math.random
    this.autoTimers = options.autoTimers ?? true
    this.playerStates = options.playerStates ?? new PlayerStateService()
    this.economy = options.economy ?? new EconomyService(this.playerStates.repository as EconomyRepository, this.now)
  }

  async connect(identity: DevIdentity, peer: ClientPeer): Promise<string | null> {
    const authenticated = await this.playerStates.authenticate(identity)
    const playerId = authenticated.character.id
    const existingRoom = this.findMemberRoom(playerId)
    const existingMember = existingRoom?.members.get(playerId)
    if (existingMember?.disconnectedAt && this.now() - existingMember.disconnectedAt > this.reconnectGraceMs) {
      peer.send({ type: 'ERROR', payload: { code: 'SESSION_EXPIRED', message: 'Час для відновлення сесії минув.' } })
      return null
    }

    const previousPeer = this.peers.get(playerId)
    if (previousPeer && previousPeer.connectionId !== peer.connectionId) previousPeer.close?.()
    const character = existingMember?.character ?? authenticated.character
    this.identities.set(playerId, character)
    this.peers.set(playerId, peer)
    this.economy.setAvailability(playerId, true, existingRoom?.phase === 'COMBAT')

    if (existingMember) {
      existingMember.connected = true
      existingMember.disconnectedAt = null
      existingMember.peer = peer
    }

    peer.send({ type: 'WELCOME', payload: { accountId: authenticated.accountId, playerId, protocolVersion: PROTOCOL_VERSION } })
    peer.send({ type: 'CHARACTER_STATE', payload: await this.playerStates.snapshot(playerId) })
    this.sendPartyList(playerId)
    if (existingRoom) {
      this.sendPartyState(existingRoom, playerId)
      if (existingRoom.phase !== 'LOBBY') this.send(playerId, { type: 'COMBAT_SNAPSHOT', payload: this.combatSnapshot(existingRoom, playerId) })
      this.broadcastParty(existingRoom)
    }
    return playerId
  }

  disconnect(playerId: string, connectionId: string): void {
    const peer = this.peers.get(playerId)
    if (!peer || peer.connectionId !== connectionId) return
    this.peers.delete(playerId)
    this.economy.setAvailability(playerId, false)
    void this.economy.cancelTradesForDisconnect(playerId).then((trades) => {
      for (const trade of trades) for (const id of [trade.requesterId, trade.receiverId]) this.send(id, { type: 'TRADE_CANCELLED', payload: trade })
    })
    for (const room of this.rooms.values()) {
      if (room.applications.delete(playerId)) {
        room.slotOffers.delete(playerId)
        void this.economy.refundPartySlot(room.id, playerId, `disconnect-application:${room.id}:${playerId}`).then(() => this.broadcastParty(room))
      }
    }
    const room = this.findMemberRoom(playerId)
    const member = room?.members.get(playerId)
    if (!room || !member) return
    member.connected = false
    member.peer = null
    member.disconnectedAt = this.now()
    this.broadcastParty(room)
    if (room.phase === 'COMBAT') this.broadcastCombat(room, 'COMBAT_SNAPSHOT')
    if (room.phase === 'LOBBY') {
      setTimeout(() => void this.removeExpiredLobbyMember(room.id, playerId), this.reconnectGraceMs)
    }
  }

  async handle(playerId: string, message: Exclude<ClientMessage, { type: 'HELLO' }>): Promise<void> {
    if (!this.peers.has(playerId)) return
    if (ECONOMY_MUTATIONS.has(message.type)) {
      const operationId = (message as { payload?: { operationId?: unknown } }).payload?.operationId
      if (typeof operationId !== 'string' || operationId.length < 1 || operationId.length > 100) {
        this.fail(playerId, 'INVALID_OPERATION_ID', 'Operation ID is required for economy mutations.')
        return
      }
    }
    switch (message.type) {
      case 'LIST_PARTIES': this.sendPartyList(playerId); break
      case 'CREATE_PARTY': this.createParty(playerId); break
      case 'APPLY_TO_PARTY': await this.applyToParty(playerId, message.payload.partyId, message.payload.slotOfferCoins ?? 0, message.payload.operationId); break
      case 'CANCEL_APPLICATION': await this.cancelApplication(playerId, message.payload.partyId); break
      case 'ACCEPT_APPLICATION': await this.reviewApplication(playerId, message.payload.applicantId, true); break
      case 'REJECT_APPLICATION': await this.reviewApplication(playerId, message.payload.applicantId, false); break
      case 'LEAVE_PARTY': await this.leaveParty(playerId); break
      case 'SET_READY': this.setReady(playerId, message.payload.ready); break
      case 'START_EXPEDITION': await this.startExpedition(playerId); break
      case 'SUBMIT_ACTION': await this.submitAction(playerId, message.payload); break
      case 'SET_AUTO_BATTLE': await this.setAutoBattle(playerId, message.payload.enabled); break
      case 'POST_ENCOUNTER_VOTE': await this.vote(playerId, message.payload.vote); break
      case 'PARTY_CHAT_MESSAGE': this.chat(playerId, message.payload.message); break
      case 'GET_CHARACTER_STATE': await this.sendCharacterState(playerId); break
      case 'EQUIP_ITEM': await this.economyAction(playerId, 'EQUIPMENT_UPDATE', () => this.playerStates.equip(playerId, message.payload.entryId, message.payload.slot, message.payload.operationId)); break
      case 'UNEQUIP_ITEM': await this.economyAction(playerId, 'EQUIPMENT_UPDATE', () => this.playerStates.unequip(playerId, message.payload.slot, message.payload.operationId)); break
      case 'MOVE_TO_STORAGE': await this.economyAction(playerId, 'STORAGE_UPDATE', () => this.playerStates.move(playerId, message.payload.entryId, true, message.payload.quantity, message.payload.operationId)); break
      case 'MOVE_FROM_STORAGE': await this.economyAction(playerId, 'STORAGE_UPDATE', () => this.playerStates.move(playerId, message.payload.entryId, false, message.payload.quantity, message.payload.operationId)); break
      case 'LEARN_RECIPE': await this.economyAction(playerId, 'INVENTORY_UPDATE', () => this.playerStates.learnRecipe(playerId, message.payload.entryId, message.payload.operationId)); break
      case 'CRAFT_ITEM': await this.craftAction(playerId, message.payload.recipeId, message.payload.operationId); break
      case 'GET_MARKET': await this.sendMarket(playerId, await this.economy.market(playerId, message.payload?.itemId ?? null)); break
      case 'GET_MY_ORDERS': await this.sendMarket(playerId, await this.economy.market(playerId)); break
      case 'CREATE_SELL_ORDER': await this.marketAction(playerId, () => this.economy.createSellOrder(playerId, message.payload.entryId, message.payload.quantity, message.payload.pricePerUnit, message.payload.operationId)); break
      case 'CREATE_BUY_ORDER': await this.marketAction(playerId, () => this.economy.createBuyOrder(playerId, message.payload.itemId, message.payload.quantity, message.payload.pricePerUnit, message.payload.operationId)); break
      case 'CANCEL_MARKET_ORDER': await this.marketAction(playerId, () => this.economy.cancelMarketOrder(playerId, message.payload.orderId, message.payload.operationId)); break
      case 'BUY_NOW': await this.marketAction(playerId, () => this.economy.buyNow(playerId, message.payload.itemId, message.payload.quantity, message.payload.operationId)); break
      case 'SELL_NOW': await this.marketAction(playerId, () => this.economy.sellNow(playerId, message.payload.entryId, message.payload.quantity, message.payload.operationId)); break
      case 'REQUEST_TRADE': await this.tradeAction(playerId, async () => this.economy.requestTrade(playerId, message.payload.receiverName, message.payload.operationId), true); break
      case 'ACCEPT_TRADE': await this.tradeAction(playerId, () => this.economy.acceptTrade(playerId, message.payload.tradeId, message.payload.operationId)); break
      case 'DECLINE_TRADE': await this.tradeAction(playerId, () => this.economy.declineTrade(playerId, message.payload.tradeId, message.payload.operationId)); break
      case 'UPDATE_TRADE_OFFER': await this.tradeAction(playerId, () => this.economy.updateTradeOffer(playerId, message.payload.tradeId, { items: message.payload.items, coins: message.payload.coins }, message.payload.operationId)); break
      case 'CONFIRM_TRADE': await this.tradeAction(playerId, () => this.economy.confirmTrade(playerId, message.payload.tradeId, message.payload.revision, message.payload.operationId)); break
      case 'CANCEL_TRADE': await this.tradeAction(playerId, () => this.economy.cancelTrade(playerId, message.payload.tradeId, message.payload.operationId)); break
    }
  }

  createParty(playerId: string): RoomState | null {
    if (this.findMemberRoom(playerId)) return this.fail(playerId, 'ALREADY_IN_PARTY', 'Ви вже перебуваєте у групі.')
    const character = this.identities.get(playerId)
    if (!character) return null
    const room: RoomState = {
      id: randomUUID().slice(0, 8), phase: 'LOBBY', leaderId: playerId,
      members: new Map([[playerId, this.createMember(character)]]), applications: new Map(), slotOffers: new Map([[playerId, 0]]),
      encounterIndex: 0, enemy: null, round: 0, roundEndsAt: null, actions: new Map(),
      log: [], chat: [], reward: null, accumulated: { xp: 0, coins: 0, loot: [] },
      votes: new Map(), roundTimer: null, resolving: false,
      personalRewards: new Map(), expeditionLoot: new Map(), extracted: false,
    }
    room.members.get(playerId)!.peer = this.peers.get(playerId) ?? null
    this.rooms.set(room.id, room)
    this.broadcastParty(room)
    this.broadcastPartyLists()
    return room
  }

  async applyToParty(playerId: string, partyId: string, slotOfferCoins = 0, operationId: string = randomUUID()): Promise<boolean> {
    const room = this.rooms.get(partyId)
    const character = this.identities.get(playerId)
    if (!room || !character) return Boolean(this.fail(playerId, 'PARTY_NOT_FOUND', 'Групу не знайдено.'))
    if (room.phase !== 'LOBBY') return Boolean(this.fail(playerId, 'PARTY_LOCKED', 'Експедиція вже почалася.'))
    if (this.findMemberRoom(playerId)) return Boolean(this.fail(playerId, 'ALREADY_IN_PARTY', 'Ви вже у групі.'))
    if (room.members.size >= MAX_PARTY_SIZE) return Boolean(this.fail(playerId, 'PARTY_FULL', 'У групі вже 5 гравців.'))
    try { await this.economy.reservePartySlot(room.id, playerId, room.leaderId, slotOfferCoins, operationId) } catch (error) { if (error instanceof EconomyError) { this.fail(playerId, error.code, error.message); return false } throw error }
    room.applications.set(playerId, character)
    room.slotOffers.set(playerId, slotOfferCoins)
    await this.sendCharacterState(playerId)
    this.sendPartyState(room, room.leaderId)
    this.sendPartyList(playerId)
    return true
  }

  async cancelApplication(playerId: string, partyId: string): Promise<void> {
    const room = this.rooms.get(partyId)
    if (!room?.applications.delete(playerId)) return
    await this.economy.refundPartySlot(room.id, playerId, `cancel-application:${room.id}:${playerId}`)
    await this.sendCharacterState(playerId)
    room.slotOffers.delete(playerId)
    this.sendPartyState(room, room.leaderId)
    this.sendPartyList(playerId)
  }

  async reviewApplication(leaderId: string, applicantId: string, accept: boolean): Promise<boolean> {
    const room = this.findMemberRoom(leaderId)
    if (!room || room.leaderId !== leaderId) return Boolean(this.fail(leaderId, 'LEADER_ONLY', 'Ця дія доступна лише лідеру.'))
    if (room.phase !== 'LOBBY') return Boolean(this.fail(leaderId, 'PARTY_LOCKED', 'Склад експедиції заблоковано.'))
    const character = room.applications.get(applicantId)
    if (!character) return Boolean(this.fail(leaderId, 'APPLICATION_NOT_FOUND', 'Заявку не знайдено.'))
    if (accept && room.members.size >= MAX_PARTY_SIZE) return Boolean(this.fail(leaderId, 'PARTY_FULL', 'У групі вже 5 гравців.'))
    room.applications.delete(applicantId)
    if (accept) {
      await this.economy.acceptPartySlot(room.id, applicantId, leaderId, `accept:${room.id}:${applicantId}`)
      const member = this.createMember(character)
      member.peer = this.peers.get(applicantId) ?? null
      member.connected = Boolean(member.peer)
      room.members.set(applicantId, member)
      for (const other of this.rooms.values()) {
        if (other.id !== room.id && other.applications.delete(applicantId)) {
          await this.economy.refundPartySlot(other.id, applicantId, `accepted-elsewhere:${other.id}:${applicantId}`)
          other.slotOffers.delete(applicantId)
          this.broadcastParty(other)
        }
      }
    } else { await this.economy.refundPartySlot(room.id, applicantId, `reject:${room.id}:${applicantId}`); await this.sendCharacterState(applicantId); room.slotOffers.delete(applicantId) }
    this.broadcastParty(room)
    this.broadcastPartyLists()
    return true
  }

  async leaveParty(playerId: string): Promise<void> {
    const room = this.findMemberRoom(playerId)
    if (!room) return
    if (room.phase === 'COMBAT' || room.phase === 'POST_ENCOUNTER') return void this.fail(playerId, 'PARTY_LOCKED', 'Після старту склад заблоковано до завершення експедиції.')
    if (room.phase === 'LOBBY') await this.economy.refundPartySlot(room.id, playerId, `leave:${room.id}:${playerId}`)
    if (room.phase === 'LOBBY') await this.sendCharacterState(playerId)
    if (room.phase === 'LOBBY' && room.leaderId === playerId) {
      for (const id of new Set([...room.members.keys(), ...room.applications.keys()])) {
        if (id !== playerId) await this.economy.refundPartySlot(room.id, id, `leader-left:${room.id}:${id}`)
        room.slotOffers.set(id, 0)
      }
    }
    room.slotOffers.delete(playerId)
    room.members.delete(playerId)
    if (!room.members.size) {
      for (const applicantId of room.applications.keys()) await this.economy.refundPartySlot(room.id, applicantId, `disband:${room.id}:${applicantId}`)
      this.rooms.delete(room.id)
    }
    else {
      if (room.leaderId === playerId) room.leaderId = room.members.keys().next().value as string
      this.broadcastParty(room)
    }
    this.send(playerId, { type: 'PARTY_STATE', payload: null })
    this.broadcastPartyLists()
  }

  setReady(playerId: string, ready: boolean): void {
    const room = this.findMemberRoom(playerId)
    const member = room?.members.get(playerId)
    if (!room || !member || room.phase !== 'LOBBY') return void this.fail(playerId, 'INVALID_STATE', 'Ready доступний лише в lobby.')
    member.ready = ready
    this.broadcastParty(room)
  }

  async startExpedition(playerId: string): Promise<boolean> {
    const room = this.findMemberRoom(playerId)
    if (!room || room.leaderId !== playerId) return Boolean(this.fail(playerId, 'LEADER_ONLY', 'Лише лідер може почати експедицію.'))
    if (room.phase !== 'LOBBY') return Boolean(this.fail(playerId, 'ALREADY_STARTED', 'Експедиція вже почалася.'))
    if (room.members.size < DEV_MIN_PARTY_SIZE) return Boolean(this.fail(playerId, 'PARTY_TOO_SMALL', `Потрібно щонайменше ${DEV_MIN_PARTY_SIZE} гравці.`))
    if ([...room.members.values()].some((member) => !member.ready)) return Boolean(this.fail(playerId, 'NOT_READY', 'Усі учасники мають підтвердити готовність.'))

    try {
      for (const applicantId of room.applications.keys()) await this.economy.refundPartySlot(room.id, applicantId, `start-reject:${room.id}:${applicantId}`)
      await this.economy.settlePartySlots(room.id, playerId, [...room.members.keys()], `start:${room.id}`)
    } catch (error) { if (error instanceof EconomyError) { this.fail(playerId, error.code, error.message); return false } throw error }
    room.phase = 'COMBAT'
    for (const id of room.members.keys()) await this.sendCharacterState(id)
    room.applications.clear()
    room.encounterIndex = 0
    room.enemy = this.createEnemy(0)
    room.round = 1
    room.log = ['Експедиція входить до Першого Розлому.']
    room.personalRewards.clear()
    room.expeditionLoot = new Map([...room.members.keys()].map((id) => [id, { resources: {}, recipeIds: [] }]))
    room.extracted = false
    for (const [id, member] of room.members) {
      this.economy.setAvailability(id, member.connected, true)
      const lockedCharacter = await this.playerStates.character(id)
      member.character = { ...lockedCharacter, currentHP: lockedCharacter.maxHP, alive: true, ready: false }
      member.potionCooldown = 0
      member.expeditionPotions = await this.playerStates.countItem(id, HEALING_POTION_ID)
    }
    this.startRound(room, 'EXPEDITION_STARTED')
    this.broadcastPartyLists()
    return true
  }

  async submitAction(playerId: string, payload: Extract<ClientMessage, { type: 'SUBMIT_ACTION' }>['payload']): Promise<boolean> {
    const room = this.findMemberRoom(playerId)
    const member = room?.members.get(playerId)
    if (!room || !member || room.phase !== 'COMBAT') return Boolean(this.fail(playerId, 'NOT_IN_COMBAT', 'Бій зараз не активний.'))
    if (payload.round !== room.round) return Boolean(this.fail(playerId, 'STALE_ROUND', 'Ця дія належить іншому раунду.'))
    if (!member.character.alive) return Boolean(this.fail(playerId, 'PLAYER_DEAD', 'Мертвий персонаж не може діяти.'))
    if (!isZone(payload.defendZone) || (payload.attackZone !== undefined && !isZone(payload.attackZone))) return Boolean(this.fail(playerId, 'INVALID_ZONE', 'Некоректна зона атаки або захисту.'))
    if (payload.usePotion && payload.attackZone !== undefined) return Boolean(this.fail(playerId, 'INVALID_ACTION', 'Зілля не можна поєднати з атакою.'))
    if (!payload.usePotion && !payload.attackZone) return Boolean(this.fail(playerId, 'ATTACK_REQUIRED', 'Оберіть зону атаки.'))
    if (payload.usePotion && member.potionCooldown > 0) return Boolean(this.fail(playerId, 'POTION_COOLDOWN', 'Зілля ще відновлюється.'))
    if (payload.usePotion && member.expeditionPotions <= 0) return Boolean(this.fail(playerId, 'NO_POTIONS', 'У експедиції не залишилося зілля.'))

    room.actions.set(playerId, toCombatAction(payload))
    this.broadcastCombat(room, 'COMBAT_SNAPSHOT')
    if (this.canResolveEarly(room)) await this.resolveRoomRound(room)
    return true
  }

  async setAutoBattle(playerId: string, enabled: boolean): Promise<void> {
    const room = this.findMemberRoom(playerId)
    const member = room?.members.get(playerId)
    if (!room || !member || room.phase !== 'COMBAT') return void this.fail(playerId, 'NOT_IN_COMBAT', 'Auto Battle доступний лише в бою.')
    member.autoBattle = enabled
    this.broadcastCombat(room, 'COMBAT_SNAPSHOT')
    if (!enabled && this.canResolveEarly(room)) await this.resolveRoomRound(room)
  }

  async resolveDueRounds(at = this.now()): Promise<void> {
    for (const room of this.rooms.values()) {
      if (room.phase === 'COMBAT' && room.roundEndsAt !== null && at >= room.roundEndsAt) await this.resolveRoomRound(room)
    }
  }

  async vote(playerId: string, vote: 'CONTINUE' | 'EXIT'): Promise<void> {
    const room = this.findMemberRoom(playerId)
    const member = room?.members.get(playerId)
    if (!room || !member || room.phase !== 'POST_ENCOUNTER' || !member.connected || (!member.character.alive && playerId !== room.leaderId)) return void this.fail(playerId, 'INVALID_VOTE', 'Зараз голосувати не можна.')
    room.votes.set(playerId, vote)
    this.broadcastCombat(room, 'COMBAT_SNAPSHOT')
    await this.evaluateVotes(room)
  }

  chat(playerId: string, rawMessage: string): void {
    const room = this.findMemberRoom(playerId)
    const member = room?.members.get(playerId)
    const message = rawMessage.trim().slice(0, 280)
    if (!room || !member || !message) return
    const chatMessage = { id: randomUUID(), senderId: playerId, senderName: member.character.name, message, timestamp: this.now() }
    room.chat = [...room.chat.slice(-49), chatMessage]
    for (const id of room.members.keys()) this.send(id, { type: 'PARTY_CHAT_MESSAGE', payload: chatMessage })
  }

  async dispose(): Promise<void> {
    for (const room of this.rooms.values()) if (room.roundTimer) clearTimeout(room.roundTimer)
    for (const id of this.peers.keys()) await this.economy.cancelTradesForDisconnect(id)
    await this.playerStates.disconnect()
  }

  private createMember(character: Character): RoomMember {
    return { character: { ...character }, connected: true, peer: null, ready: false, autoBattle: false, potionCooldown: 0, expeditionPotions: 0, disconnectedAt: null }
  }

  private createEnemy(index: number): Enemy {
    const config = ENCOUNTERS[index]
    return { id: `enemy-${index}`, name: config.name, kind: config.kind, attack: config.attack, maxHP: config.maxHP, currentHP: config.maxHP, attackCount: 0 }
  }

  private startRound(room: RoomState, messageType: 'EXPEDITION_STARTED' | 'ROUND_STARTED'): void {
    if (room.roundTimer) clearTimeout(room.roundTimer)
    room.actions.clear()
    room.roundEndsAt = this.now() + this.roundDurationMs
    if (this.autoTimers) room.roundTimer = setTimeout(() => void this.resolveRoomRound(room), this.roundDurationMs)
    this.broadcastCombat(room, messageType)
  }

  private canResolveEarly(room: RoomState): boolean {
    const alive = [...room.members.entries()].filter(([, member]) => member.character.alive)
    return alive.length > 0
      && alive.every(([, member]) => !member.autoBattle)
      && alive.every(([id, member]) => member.connected && room.actions.has(id))
  }

  private async resolveRoomRound(room: RoomState): Promise<void> {
    if (room.resolving || room.phase !== 'COMBAT' || !room.enemy) return
    room.resolving = true
    if (room.roundTimer) clearTimeout(room.roundTimer)
    room.roundTimer = null
    const actions: Record<string, CombatAction> = Object.fromEntries(room.actions)
    for (const [id, member] of room.members) {
      if (!member.character.alive || actions[id]) continue
      actions[id] = member.connected && member.autoBattle
        ? { type: 'attack', attackZone: randomZone(this.random), defendZone: randomZone(this.random) }
        : { type: 'attack', defendZone: randomZone(this.random) }
    }
    for (const [id, action] of Object.entries(actions)) {
      if (action.type !== 'potion') continue
      const member = room.members.get(id)
      if (!member || member.expeditionPotions <= 0 || !await this.playerStates.consumeItem(id, HEALING_POTION_ID, 1, `potion:${room.id}:${room.round}:${id}`)) {
        actions[id] = { type: 'attack', defendZone: action.defendZone }
        continue
      }
      member.expeditionPotions -= 1
    }
    const party = [...room.members.values()].map((member) => member.character)
    const cooldowns = Object.fromEntries([...room.members].map(([id, member]) => [id, member.potionCooldown]))
    const result = resolveRound({
      party, enemy: room.enemy, actions, enemyAction: generateEnemyAction(room.enemy, party, this.random),
      potionCooldown: cooldowns[party[0]?.id] ?? 0, potionCooldowns: cooldowns, random: this.random,
    })
    room.enemy = result.enemy
    result.party.forEach((character) => {
      const member = room.members.get(character.id)
      if (!member) return
      member.character = character
      member.potionCooldown = result.potionCooldowns?.[character.id] ?? member.potionCooldown
    })
    room.log = [...result.log, ...room.log].slice(0, 30)
    this.broadcastCombat(room, 'ROUND_RESOLVED')

    if (![...room.members.values()].some((member) => member.character.alive)) {
      room.phase = 'FAILED'; room.roundEndsAt = null; room.resolving = false
      for (const id of room.members.keys()) this.economy.setAvailability(id, room.members.get(id)!.connected, false)
      await this.extractLoot(room, false)
      this.broadcastCombat(room, 'EXPEDITION_RESULT')
      return
    }
    if (room.enemy.currentHP <= 0) {
      await this.completeEncounter(room)
      room.resolving = false
      return
    }
    room.round += 1
    room.resolving = false
    this.startRound(room, 'ROUND_STARTED')
  }

  private async completeEncounter(room: RoomState): Promise<void> {
    const definition = ENCOUNTERS[room.encounterIndex]
    room.reward = { xp: definition.xp, coins: definition.coins, loot: definition.loot }
    room.accumulated.xp += definition.xp
    room.accumulated.coins += definition.coins
    room.accumulated.loot.push(definition.loot)
    const generatedLoot = generateProfessionLoot(
      [...room.members].map(([id, member]) => ({ id, classId: member.character.classId, alive: member.character.alive })),
      room.encounterIndex,
      definition.kind,
      { random: this.random },
    )
    room.personalRewards.clear()
    for (const [id, member] of room.members) {
      const wasAlive = member.character.alive
      member.character = applyXPAndLevelUps(member.character, definition.xp).character
      if (!wasAlive) member.character = { ...member.character, currentHP: 0, alive: false }
      this.identities.set(member.character.id, member.character)
      const coins = Math.floor(definition.coins * COIN_MULTIPLIER[member.character.classId])
      await this.playerStates.awardProgression(id, member.character.level, member.character.currentXP, coins, `${room.id}:encounter:${room.encounterIndex}`)
      const loot = generatedLoot.personal[id] ?? { resources: {}, recipeIds: [] }
      room.personalRewards.set(id, { xp: definition.xp, coins, resources: loot.resources, recipeIds: loot.recipeIds })
      this.mergeLoot(room.expeditionLoot.get(id)!, loot)
    }
    room.phase = 'POST_ENCOUNTER'
    room.roundEndsAt = null
    room.votes.clear()
    this.broadcastCombat(room, 'ENCOUNTER_RESULT')
  }

  private async evaluateVotes(room: RoomState): Promise<void> {
    const eligible = [...room.members.entries()].filter(([, member]) => member.connected && member.character.alive).map(([id]) => id)
    const continueVotes = eligible.filter((id) => room.votes.get(id) === 'CONTINUE').length
    const exitVotes = eligible.filter((id) => room.votes.get(id) === 'EXIT').length
    const majority = Math.floor(eligible.length / 2) + 1
    let decision: 'CONTINUE' | 'EXIT' | null = continueVotes >= majority ? 'CONTINUE' : exitVotes >= majority ? 'EXIT' : null
    if (!decision && eligible.every((id) => room.votes.has(id))) {
      decision = continueVotes === exitVotes ? (room.votes.get(room.leaderId) ?? 'EXIT') : continueVotes > exitVotes ? 'CONTINUE' : 'EXIT'
    }
    if (!decision) return
    if (decision === 'EXIT' || room.encounterIndex >= ENCOUNTERS.length - 1) {
      room.phase = 'FINISHED'
      for (const id of room.members.keys()) this.economy.setAvailability(id, room.members.get(id)!.connected, false)
      await this.extractLoot(room, true)
      this.broadcastCombat(room, 'EXPEDITION_RESULT')
      return
    }
    room.encounterIndex += 1
    room.enemy = this.createEnemy(room.encounterIndex)
    room.round = 1
    room.reward = null
    room.personalRewards.clear()
    room.votes.clear()
    room.phase = 'COMBAT'
    this.startRound(room, 'ROUND_STARTED')
  }

  private publicMember(room: RoomState, id: string, member: RoomMember): PublicPartyMember {
    const character = member.character
    return {
      id, name: character.name, classId: character.classId, level: character.level,
      attack: character.attack, maxHP: character.maxHP, currentHP: character.currentHP,
      alive: character.alive, ready: member.ready, connected: member.connected,
      confirmed: room.actions.has(id), autoBattle: member.autoBattle,
      potionCooldown: member.potionCooldown, potionQuantity: member.expeditionPotions, isLeader: room.leaderId === id,
    }
  }

  private partySnapshot(room: RoomState, viewerId: string): PartySnapshot {
    return {
      id: room.id, phase: room.phase, leaderId: room.leaderId, locked: room.phase !== 'LOBBY',
      members: [...room.members].map(([id, member]) => this.publicMember(room, id, member)),
      applications: viewerId === room.leaderId ? [...room.applications].map(([playerId, character]) => ({
        playerId, name: character.name, classId: character.classId, level: character.level,
        attack: character.attack, maxHP: character.maxHP, slotOfferCoins: room.slotOffers.get(playerId) ?? 0,
      })) : [],
      chat: room.chat,
    }
  }

  private combatSnapshot(room: RoomState, viewerId: string): CombatSnapshot {
    return {
      roomId: room.id, phase: room.phase, leaderId: room.leaderId,
      encounterIndex: room.encounterIndex, encounterTotal: ENCOUNTERS.length, round: room.round,
      roundEndsAt: room.roundEndsAt, serverNow: this.now(), enemy: room.enemy,
      party: [...room.members].map(([id, member]) => this.publicMember(room, id, member)),
      log: room.log, reward: room.reward, personalReward: room.personalRewards.get(viewerId) ?? null,
      expeditionLoot: room.expeditionLoot.get(viewerId) ?? { resources: {}, recipeIds: [] },
      accumulated: room.accumulated,
      votes: Object.fromEntries(room.votes),
    }
  }

  private partyList(): PartySummary[] {
    return [...this.rooms.values()].filter((room) => room.phase === 'LOBBY').map((room) => ({
      id: room.id, leaderName: room.members.get(room.leaderId)?.character.name ?? '—',
      playerCount: room.members.size, maxPlayers: MAX_PARTY_SIZE, phase: room.phase,
    }))
  }

  private broadcastParty(room: RoomState): void {
    for (const id of room.members.keys()) this.sendPartyState(room, id)
  }

  private sendPartyState(room: RoomState, playerId: string): void {
    this.send(playerId, { type: 'PARTY_STATE', payload: this.partySnapshot(room, playerId) })
  }

  private broadcastCombat(room: RoomState, type: 'EXPEDITION_STARTED' | 'COMBAT_SNAPSHOT' | 'ROUND_STARTED' | 'ROUND_RESOLVED' | 'ENCOUNTER_RESULT' | 'EXPEDITION_RESULT'): void {
    for (const id of room.members.keys()) this.send(id, { type, payload: this.combatSnapshot(room, id) } as ServerMessage)
  }

  private sendPartyList(playerId: string): void { this.send(playerId, { type: 'PARTY_LIST', payload: this.partyList() }) }
  private broadcastPartyLists(): void { for (const id of this.peers.keys()) this.sendPartyList(id) }
  private send(playerId: string, message: ServerMessage): void { this.peers.get(playerId)?.send(message) }

  private async sendCharacterState(playerId: string): Promise<void> {
    try { this.send(playerId, { type: 'CHARACTER_STATE', payload: await this.playerStates.snapshot(playerId) }) } catch { /* disconnected or unknown player */ }
  }

  private async economyAction(
    playerId: string,
    type: 'INVENTORY_UPDATE' | 'EQUIPMENT_UPDATE' | 'STORAGE_UPDATE',
    action: () => Promise<Awaited<ReturnType<PlayerStateService['snapshot']>>>,
  ): Promise<void> {
    if (this.economyLocked(playerId)) return
    try {
      const state = await action()
      await this.syncLobbyCharacter(playerId)
      this.send(playerId, { type, payload: state } as ServerMessage)
    } catch (error) {
      if (error instanceof EconomyError) this.fail(playerId, error.code, error.message)
      else throw error
    }
  }

  private async craftAction(playerId: string, recipeId: string, operationId: string): Promise<void> {
    if (this.economyLocked(playerId)) return
    try {
      const state = await this.playerStates.craft(playerId, recipeId, operationId)
      this.send(playerId, { type: 'CRAFT_RESULT', payload: { recipeId, state } })
    } catch (error) {
      if (error instanceof EconomyError) this.fail(playerId, error.code, error.message)
      else throw error
    }
  }

  private async marketAction(playerId: string, action: () => Promise<MarketSnapshot>): Promise<void> {
    if (this.economyLocked(playerId)) return
    try {
      const snapshot = await action()
      for (const id of this.peers.keys()) {
        await this.sendMarket(id, id === playerId ? snapshot : await this.economy.market(id, snapshot.selectedItemId))
        this.send(id, { type: 'ECONOMY_UPDATE', payload: await this.playerStates.snapshot(id) })
      }
    } catch (error) {
      if (error instanceof EconomyError) this.fail(playerId, error.code, error.message)
      else throw error
    }
  }

  private async sendMarket(playerId: string, snapshot: MarketSnapshot): Promise<void> {
    this.send(playerId, { type: 'MARKET_SNAPSHOT', payload: snapshot })
  }

  private async tradeAction(playerId: string, action: () => Promise<TradeSnapshot>, request = false): Promise<void> {
    try {
      const snapshot = await action()
      const type = snapshot.status === 'COMPLETED' ? 'TRADE_COMPLETED' : snapshot.status === 'CANCELLED' || snapshot.status === 'DECLINED' ? 'TRADE_CANCELLED' : 'TRADE_STATE'
      this.send(snapshot.requesterId, { type, payload: snapshot })
      this.send(snapshot.receiverId, { type: request && snapshot.status === 'REQUESTED' ? 'TRADE_REQUEST' : type, payload: snapshot } as ServerMessage)
      for (const id of [snapshot.requesterId, snapshot.receiverId]) if (this.peers.has(id)) this.send(id, { type: 'ECONOMY_UPDATE', payload: await this.playerStates.snapshot(id) })
    } catch (error) {
      if (error instanceof EconomyError) this.fail(playerId, error.code, error.message)
      else throw error
    }
  }

  private economyLocked(playerId: string): boolean {
    const room = this.findMemberRoom(playerId)
    if (room?.phase === 'COMBAT' || room?.phase === 'POST_ENCOUNTER') {
      this.fail(playerId, 'EXPEDITION_LOCKED', 'Inventory, equipment і crafting заблоковані під час експедиції.')
      return true
    }
    return false
  }

  private async syncLobbyCharacter(playerId: string): Promise<void> {
    const character = await this.playerStates.character(playerId)
    this.identities.set(playerId, character)
    for (const room of this.rooms.values()) {
      const member = room.members.get(playerId)
      if (member && room.phase === 'LOBBY') {
        member.character = character
        this.broadcastParty(room)
      }
      if (room.applications.has(playerId)) {
        room.applications.set(playerId, character)
        this.sendPartyState(room, room.leaderId)
      }
    }
  }

  private mergeLoot(target: PersonalLoot, added: PersonalLoot): void {
    for (const [resourceId, quantity] of Object.entries(added.resources)) target.resources[resourceId] = (target.resources[resourceId] ?? 0) + quantity
    target.recipeIds.push(...added.recipeIds)
  }

  private async extractLoot(room: RoomState, successful: boolean): Promise<void> {
    if (room.extracted) return
    const retained = successful ? 1 : 1 - FAILED_EXPEDITION_LOOT_LOSS
    for (const id of room.members.keys()) {
      const extraction = await this.playerStates.commitLoot(id, room.expeditionLoot.get(id) ?? { resources: {}, recipeIds: [] }, retained, room.id)
      this.send(id, { type: 'LOOT_UPDATE', payload: { state: await this.playerStates.snapshot(id), extracted: extraction.committed } })
    }
    room.extracted = true
  }

  private fail(playerId: string, code: string, message: string): null {
    this.send(playerId, { type: 'ERROR', payload: { code, message } })
    return null
  }

  private findMemberRoom(playerId: string): RoomState | undefined {
    return [...this.rooms.values()].find((room) => room.members.has(playerId))
  }

  private async removeExpiredLobbyMember(roomId: string, playerId: string): Promise<void> {
    const room = this.rooms.get(roomId)
    const member = room?.members.get(playerId)
    if (!room || room.phase !== 'LOBBY' || !member || member.connected || !member.disconnectedAt) return
    if (this.now() - member.disconnectedAt < this.reconnectGraceMs) return
    await this.economy.refundPartySlot(room.id, playerId, `expired:${room.id}:${playerId}`)
    room.slotOffers.delete(playerId)
    room.members.delete(playerId)
    if (!room.members.size) this.rooms.delete(room.id)
    else {
      if (room.leaderId === playerId) room.leaderId = room.members.keys().next().value as string
      this.broadcastParty(room)
    }
    this.broadcastPartyLists()
  }
}
