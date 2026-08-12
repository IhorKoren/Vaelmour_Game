import { randomUUID } from 'node:crypto'
import { generateEnemyAction, resolveRound } from '../../src/combat/engine'
import { ZONES } from '../../src/data/config/balance'
import { applyXPAndLevelUps } from '../../src/progression/progression'
import { adjustedEnemyXP } from '../../shared/game-data/progression'
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
import { ITEM_CATALOG } from '../../shared/game-data/catalog'
import { POTION_IDS } from '../../shared/game-data/phase7Catalog'
import type { ContentTier, PersonalLoot } from '../../shared/game-data/types'
import { selectAutoPotion } from '../../shared/game-data/autoBattle'
import { generateProfessionLoot } from '../loot/professionLoot'
import { EconomyError, PlayerStateService } from '../players/PlayerStateService'
import { EconomyService } from '../economy/EconomyService'
import type { EconomyRepository } from '../repositories/types'
import type { SocialRepository } from '../repositories/types'
import type { MarketSnapshot, TradeSnapshot } from '../../shared/economy-types'
import { PresenceService } from '../social/PresenceService'
import { FriendsService } from '../social/FriendsService'
import { GuildService } from '../guilds/GuildService'
import { ChatService } from '../chat/ChatService'
import { floorDefinition, floorEncounters, nextUnlockAfterCompletion, riftDefinition } from '../../shared/game-data/rifts'
import { createRiftEnemy } from '../combat/firstRiftEnemyFactory'
import { NoopTelemetry, type TelemetrySink } from '../telemetry/PlaytestTelemetry'
import { SafeTelemetrySink } from '../telemetry/PlaytestTelemetry'
import { log } from '../logging/logger'

interface ManagerOptions {
  roundDurationMs?: number
  reconnectGraceMs?: number
  now?: () => number
  random?: () => number
  autoTimers?: boolean
  playerStates?: PlayerStateService
  economy?: EconomyService
  presence?: PresenceService
  friends?: FriendsService
  guilds?: GuildService
  chatService?: ChatService
  minPartySize?: number
  telemetry?: TelemetrySink
}

const ECONOMY_MUTATIONS = new Set<ClientMessage['type']>([
  'EQUIP_ITEM', 'UNEQUIP_ITEM', 'MOVE_TO_STORAGE', 'MOVE_FROM_STORAGE', 'LEARN_RECIPE', 'CRAFT_ITEM',
  'APPLY_TO_PARTY', 'CREATE_SELL_ORDER', 'CREATE_BUY_ORDER', 'CANCEL_MARKET_ORDER', 'BUY_NOW', 'SELL_NOW',
  'REQUEST_TRADE', 'ACCEPT_TRADE', 'DECLINE_TRADE', 'UPDATE_TRADE_OFFER', 'CONFIRM_TRADE', 'CANCEL_TRADE',
  'CREATE_GUILD', 'APPLY_TO_GUILD', 'CANCEL_GUILD_APPLICATION', 'ACCEPT_GUILD_APPLICATION', 'REJECT_GUILD_APPLICATION',
  'INVITE_TO_GUILD', 'ACCEPT_GUILD_INVITE', 'DECLINE_GUILD_INVITE', 'LEAVE_GUILD', 'KICK_GUILD_MEMBER', 'SET_GUILD_RANK',
  'TRANSFER_GUILD_LEADERSHIP', 'UPDATE_GUILD', 'UPDATE_GUILD_PERMISSIONS', 'DISBAND_GUILD', 'DEPOSIT_GUILD_STORAGE',
  'WITHDRAW_GUILD_STORAGE', 'SEND_FRIEND_REQUEST', 'ACCEPT_FRIEND_REQUEST', 'DECLINE_FRIEND_REQUEST', 'REMOVE_FRIEND',
  'BLOCK_PLAYER', 'UNBLOCK_PLAYER', 'SEND_CHAT_MESSAGE',
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
  private readonly minPartySize: number
  private accepting = true
  private readonly playSessions = new Map<string, string>()
  readonly playerStates: PlayerStateService
  readonly economy: EconomyService
  readonly presence: PresenceService
  readonly friends: FriendsService
  readonly guilds: GuildService
  readonly chatService: ChatService
  readonly telemetry: TelemetrySink

  constructor(options: ManagerOptions = {}) {
    this.roundDurationMs = options.roundDurationMs ?? 30_000
    this.reconnectGraceMs = options.reconnectGraceMs ?? RECONNECT_GRACE_MS
    this.now = options.now ?? Date.now
    this.random = options.random ?? Math.random
    this.autoTimers = options.autoTimers ?? true
    this.minPartySize = options.minPartySize ?? DEV_MIN_PARTY_SIZE
    this.telemetry = options.telemetry instanceof SafeTelemetrySink ? options.telemetry : new SafeTelemetrySink(options.telemetry ?? new NoopTelemetry(), 10)
    this.playerStates = options.playerStates ?? new PlayerStateService()
    this.economy = options.economy ?? new EconomyService(this.playerStates.repository as EconomyRepository, this.now)
    this.presence = options.presence ?? new PresenceService()
    const socialRepository = this.playerStates.repository as SocialRepository
    this.friends = options.friends ?? new FriendsService(socialRepository, this.presence, this.now)
    this.guilds = options.guilds ?? new GuildService(socialRepository, this.presence, this.now)
    this.chatService = options.chatService ?? new ChatService(socialRepository, this.presence, this.now)
  }

  async connect(identity: DevIdentity, peer: ClientPeer): Promise<string | null> {
    const authenticated = await this.playerStates.authenticate(identity)
    return this.connectResolved(authenticated.accountId, authenticated.character, peer, randomUUID())
  }

  async connectAuthenticated(accountId: string, peer: ClientPeer, playSessionId: string): Promise<string | null> {
    const authenticated = await this.playerStates.authenticateAccount(accountId)
    return this.connectResolved(authenticated.accountId, authenticated.character, peer, playSessionId)
  }

  private async connectResolved(accountId: string, authenticatedCharacter: Character, peer: ClientPeer, playSessionId: string): Promise<string | null> {
    const authenticated = { accountId, character: authenticatedCharacter }
    const playerId = authenticated.character.id
    let existingRoom = this.findMemberRoom(playerId)
    let existingMember = existingRoom?.members.get(playerId)
    if (existingMember?.disconnectedAt && this.now() - existingMember.disconnectedAt > this.reconnectGraceMs) {
      if (existingRoom?.phase === 'LOBBY') {
        await this.removeExpiredLobbyMember(existingRoom.id, playerId)
        existingRoom = undefined
        existingMember = undefined
      } else if (existingRoom && (existingRoom.phase === 'COMBAT' || existingRoom.phase === 'POST_ENCOUNTER')) {
        peer.send({ type: 'ERROR', payload: { code: 'RIFT_RECONNECT_EXPIRED', message: 'Час для відновлення Rift-сесії минув. Дочекайтеся завершення поточного забігу.' } })
        return null
      } else if (existingRoom) {
        this.finalizeRoom(existingRoom)
        existingRoom = undefined
        existingMember = undefined
      }
    }

    const previousPeer = this.peers.get(playerId)
    if (previousPeer && previousPeer.connectionId !== peer.connectionId) previousPeer.close?.()
    const character = existingMember?.character ?? authenticated.character
    this.identities.set(playerId, character)
    this.peers.set(playerId, peer)
    this.playSessions.set(playerId, playSessionId)
    this.economy.setAvailability(playerId, true, existingRoom?.phase === 'COMBAT')
    this.presence.set(playerId, existingRoom ? (existingRoom.phase === 'LOBBY' ? 'PARTY_LOBBY' : 'RIFT') : 'CITY')

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
    if (!existingRoom || existingRoom.phase === 'LOBBY') await this.sendSocialState(playerId)
    if (await this.telemetry.consumeInterruption(playerId)) peer.send({ type: 'ERROR', payload: { code: 'SERVER_INTERRUPTED_RIFT', message: 'Експедицію було перервано сервером.' } })
    if (existingMember) await this.telemetry.record({ type: 'PLAYER_RECONNECTED', playSessionId, expeditionId: existingRoom?.expeditionId ?? undefined, playerId, riftId: existingRoom?.riftId, floor: existingRoom?.floorNumber, payload: { reconnectCount: 1 } })
    this.broadcastPresence(playerId)
    return playerId
  }

  disconnect(playerId: string, connectionId: string): void {
    const peer = this.peers.get(playerId)
    if (!peer || peer.connectionId !== connectionId) return
    this.peers.delete(playerId)
    this.economy.setAvailability(playerId, false)
    this.presence.set(playerId, 'OFFLINE')
    this.broadcastPresence(playerId)
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
    const timer = setTimeout(() => { void this.handleReconnectExpiry(room.id, playerId).catch((error) => log('error', 'rift_reconnect_expiry_failed', { roomId: room.id, playerId }, error)) }, this.reconnectGraceMs)
    timer.unref?.()
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
      case 'SELECT_RIFT_FLOOR': await this.selectRiftFloor(playerId, message.payload.riftId, message.payload.floorNumber); break
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
      case 'GET_GUILD_STATE': if (this.socialAllowed(playerId)) await this.sendGuildState(playerId); break
      case 'SEARCH_GUILDS': if (this.socialAllowed(playerId)) this.send(playerId, { type: 'GUILD_LIST', payload: await this.guilds.search(message.payload.query) }); break
      case 'CREATE_GUILD': await this.guildAction(playerId, () => this.guilds.create(playerId, message.payload, message.payload.operationId), true); break
      case 'APPLY_TO_GUILD': await this.guildAction(playerId, () => this.guilds.apply(playerId, message.payload.guildId, message.payload.message, message.payload.operationId)); break
      case 'CANCEL_GUILD_APPLICATION': await this.guildAction(playerId, () => this.guilds.cancelApplication(playerId, message.payload.applicationId, message.payload.operationId)); break
      case 'ACCEPT_GUILD_APPLICATION': await this.guildAction(playerId, () => this.guilds.reviewApplication(playerId, message.payload.applicationId, true, message.payload.operationId)); break
      case 'REJECT_GUILD_APPLICATION': await this.guildAction(playerId, () => this.guilds.reviewApplication(playerId, message.payload.applicationId, false, message.payload.operationId)); break
      case 'INVITE_TO_GUILD': await this.guildAction(playerId, () => this.guilds.invite(playerId, message.payload.playerName, message.payload.operationId)); break
      case 'ACCEPT_GUILD_INVITE': await this.guildAction(playerId, () => this.guilds.respondInvite(playerId, message.payload.inviteId, true, message.payload.operationId)); break
      case 'DECLINE_GUILD_INVITE': await this.guildAction(playerId, () => this.guilds.respondInvite(playerId, message.payload.inviteId, false, message.payload.operationId)); break
      case 'LEAVE_GUILD': await this.guildAction(playerId, () => this.guilds.leave(playerId, message.payload.operationId)); break
      case 'KICK_GUILD_MEMBER': await this.guildAction(playerId, () => this.guilds.kick(playerId, message.payload.playerId, message.payload.operationId)); break
      case 'SET_GUILD_RANK': await this.guildAction(playerId, () => this.guilds.setRank(playerId, message.payload.playerId, message.payload.rank, message.payload.operationId)); break
      case 'TRANSFER_GUILD_LEADERSHIP': await this.guildAction(playerId, () => this.guilds.transferLeadership(playerId, message.payload.playerId, message.payload.operationId)); break
      case 'UPDATE_GUILD': await this.guildAction(playerId, () => this.guilds.update(playerId, message.payload, message.payload.operationId)); break
      case 'UPDATE_GUILD_PERMISSIONS': await this.guildAction(playerId, () => this.guilds.updatePermission(playerId, message.payload.rank, message.payload, message.payload.operationId)); break
      case 'DISBAND_GUILD': await this.guildAction(playerId, () => this.guilds.disband(playerId, message.payload.confirmed, message.payload.operationId)); break
      case 'GET_GUILD_STORAGE': if (this.socialAllowed(playerId)) this.send(playerId, { type: 'GUILD_STORAGE_UPDATE', payload: await this.guilds.storage(playerId) }); break
      case 'DEPOSIT_GUILD_STORAGE': await this.guildStorageAction(playerId, () => this.guilds.deposit(playerId, message.payload.entryId, message.payload.quantity, message.payload.operationId)); break
      case 'WITHDRAW_GUILD_STORAGE': await this.guildStorageAction(playerId, () => this.guilds.withdraw(playerId, message.payload.storageItemId, message.payload.quantity, message.payload.operationId)); break
      case 'GET_GUILD_STORAGE_HISTORY': if (this.socialAllowed(playerId)) this.send(playerId, { type: 'GUILD_STORAGE_HISTORY', payload: await this.guilds.history(playerId, message.payload?.limit) }); break
      case 'SEARCH_PLAYER': if (this.socialAllowed(playerId)) this.send(playerId, { type: 'PLAYER_SEARCH_RESULT', payload: await this.friends.searchExact(playerId, message.payload.name) }); break
      case 'GET_FRIENDS_STATE': if (this.socialAllowed(playerId)) this.send(playerId, { type: 'FRIENDS_STATE', payload: await this.friends.state(playerId) }); break
      case 'SEND_FRIEND_REQUEST': await this.friendsAction(playerId, () => this.friends.sendRequest(playerId, message.payload.playerName, message.payload.operationId)); break
      case 'ACCEPT_FRIEND_REQUEST': await this.friendsAction(playerId, () => this.friends.respond(playerId, message.payload.requestId, true, message.payload.operationId)); break
      case 'DECLINE_FRIEND_REQUEST': await this.friendsAction(playerId, () => this.friends.respond(playerId, message.payload.requestId, false, message.payload.operationId)); break
      case 'REMOVE_FRIEND': await this.friendsAction(playerId, () => this.friends.remove(playerId, message.payload.playerId, message.payload.operationId)); break
      case 'BLOCK_PLAYER': await this.friendsAction(playerId, () => this.friends.block(playerId, message.payload.playerName, message.payload.operationId)); break
      case 'UNBLOCK_PLAYER': await this.friendsAction(playerId, () => this.friends.unblock(playerId, message.payload.playerId, message.payload.operationId)); break
      case 'SEND_CHAT_MESSAGE': await this.chatAction(playerId, message.payload); break
      case 'GET_CHAT_HISTORY': if (this.socialAllowed(playerId)) await this.sendChatHistory(playerId, message.payload); break
      case 'GET_PRIVATE_CONVERSATIONS': if (this.socialAllowed(playerId)) this.send(playerId, { type: 'PRIVATE_CONVERSATIONS', payload: await this.chatService.conversations(playerId) }); break
      case 'INVITE_TO_PARTY': this.inviteToParty(playerId, message.payload.playerId); break
    }
  }

  createParty(playerId: string): RoomState | null {
    if (!this.accepting) return this.fail(playerId, 'SERVER_SHUTTING_DOWN', 'Сервер завершує роботу. Спробуйте пізніше.')
    if (this.findMemberRoom(playerId)) return this.fail(playerId, 'ALREADY_IN_PARTY', 'Ви вже перебуваєте у групі.')
    const character = this.identities.get(playerId)
    if (!character) return null
    const room: RoomState = {
      id: randomUUID().slice(0, 8), expeditionId: null, playSessionId: null, expeditionStartedAt: null, encounterStartedAt: null,
      phase: 'LOBBY', leaderId: playerId,
      riftId: 'first_rift', floorNumber: 1,
      members: new Map([[playerId, this.createMember(character)]]), applications: new Map(), slotOffers: new Map([[playerId, 0]]),
      encounterIndex: 0, enemy: null, round: 0, roundEndsAt: null, actions: new Map(),
      log: [], chat: [], reward: null, accumulated: { xp: 0, coins: 0, loot: [] },
      votes: new Map(), roundTimer: null, resolving: false,
      personalRewards: new Map(), expeditionLoot: new Map(), extracted: false,
    }
    room.members.get(playerId)!.peer = this.peers.get(playerId) ?? null
    this.rooms.set(room.id, room)
    void this.telemetry.record({ type: 'PARTY_CREATED', playSessionId: this.playSessions.get(playerId), playerId, payload: { roomId: room.id } })
    this.presence.set(playerId, 'PARTY_LOBBY'); this.broadcastPresence(playerId)
    this.broadcastParty(room)
    this.broadcastPartyLists()
    return room
  }

  async selectRiftFloor(playerId: string, riftOrFloor: string | number, requestedFloor?: number): Promise<boolean> {
    const riftId = typeof riftOrFloor === 'string' ? riftOrFloor : 'first_rift'
    const floorNumber = typeof riftOrFloor === 'number' ? riftOrFloor : requestedFloor!
    const room = this.findMemberRoom(playerId)
    if (!room || room.leaderId !== playerId) return Boolean(this.fail(playerId, 'LEADER_ONLY', 'Only the leader can select a floor.'))
    if (room.phase !== 'LOBBY') return Boolean(this.fail(playerId, 'PARTY_LOCKED', 'The floor can only be changed in the lobby.'))
    if (!floorDefinition(riftId, floorNumber)) return Boolean(this.fail(playerId, 'INVALID_FLOOR', 'That Rift floor does not exist.'))
    const progress = await this.playerStates.riftProgress(playerId, riftId)
    if (floorNumber > progress.highestUnlockedFloor) return Boolean(this.fail(playerId, 'FLOOR_LOCKED', `You have not unlocked Floor ${floorNumber}.`))
    room.riftId = riftId
    room.floorNumber = floorNumber
    room.members.forEach((member) => { member.ready = false })
    this.broadcastParty(room)
    this.broadcastPartyLists()
    return true
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
      this.presence.set(applicantId, 'PARTY_LOBBY'); this.broadcastPresence(applicantId)
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
    this.presence.set(playerId, 'CITY'); this.broadcastPresence(playerId)
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
    if (!this.accepting) return Boolean(this.fail(playerId, 'SERVER_SHUTTING_DOWN', 'Сервер завершує роботу. Нові експедиції вимкнені.'))
    const room = this.findMemberRoom(playerId)
    if (!room || room.leaderId !== playerId) return Boolean(this.fail(playerId, 'LEADER_ONLY', 'Лише лідер може почати експедицію.'))
    if (room.phase !== 'LOBBY') return Boolean(this.fail(playerId, 'ALREADY_STARTED', 'Експедиція вже почалася.'))
    if (room.members.size < this.minPartySize) return Boolean(this.fail(playerId, 'PARTY_TOO_SMALL', 'Група повинна містити лідера.'))
    const disconnected = [...room.members.values()].find((member) => !member.connected || !member.peer || !this.peers.has(member.character.id))
    if (disconnected) return Boolean(this.fail(playerId, 'PARTY_MEMBER_DISCONNECTED', `"${disconnected.character.name}" відключився. Дочекайтеся повернення або видаліть його з групи.`))
    if ([...room.members.values()].some((member) => !member.ready)) return Boolean(this.fail(playerId, 'NOT_READY', 'Усі учасники мають підтвердити готовність.'))
    for (const [id, member] of room.members) {
      const progress = await this.playerStates.riftProgress(id, room.riftId)
      if (room.floorNumber > progress.highestUnlockedFloor) return Boolean(this.fail(playerId, 'PARTY_FLOOR_LOCKED', `${member.character.name} has not unlocked Floor ${room.floorNumber}.`))
    }

    room.expeditionId = randomUUID()
    room.playSessionId = this.playSessions.get(playerId) ?? randomUUID()
    try {
      for (const applicantId of room.applications.keys()) await this.economy.refundPartySlot(room.id, applicantId, `start-reject:${room.id}:${applicantId}`)
      const disconnectedDuringStart = [...room.members.values()].find((member) => !member.connected || !member.peer || !this.peers.has(member.character.id))
      if (disconnectedDuringStart) return Boolean(this.fail(playerId, 'PARTY_MEMBER_DISCONNECTED', `"${disconnectedDuringStart.character.name}" відключився. Дочекайтеся повернення або видаліть його з групи.`))

      // Complete every fallible database read before the atomic paid START.
      // Once startExpedition commits payment + the durable marker, only
      // deterministic in-memory state changes and isolated telemetry remain.
      const prepared = new Map(await Promise.all([...room.members.keys()].map(async (id) => {
        const character = await this.playerStates.character(id)
        const potionQuantities = Object.fromEntries(await Promise.all(Object.values(POTION_IDS).map(async (itemId) => [itemId, await this.playerStates.countItem(id, itemId)]))) as Record<string, number>
        const state = await this.playerStates.snapshot(id)
        return [id, { character, potionQuantities, state }] as const
      })))
      const enemy = this.createEnemy(room.riftId, room.floorNumber, 0, room.members.size)
      const composition: Record<string, number> = {}
      for (const member of room.members.values()) composition[member.character.classId] = (composition[member.character.classId] ?? 0) + 1
      const compositionPayload = {
        partySize: room.members.size,
        composition,
        playerLevels: [...room.members.values()].map((member) => member.character.level),
        gearTiers: [...prepared.values()].map(({ state }) => Object.values(state.equipment).filter(Boolean).map((entry) => ITEM_CATALOG[entry!.itemId]?.tier ?? 0)),
      }
      const started = await this.economy.startExpedition({ expeditionId: room.expeditionId, playSessionId: room.playSessionId, roomId: room.id, riftId: room.riftId, floor: room.floorNumber, playerIds: [...room.members.keys()] }, playerId, [...room.members.keys()])
      room.expeditionId = started.marker.expeditionId
      room.playSessionId = started.marker.playSessionId

      room.expeditionStartedAt = this.now()
      room.encounterStartedAt = this.now()
      room.phase = 'COMBAT'
      room.applications.clear()
      room.encounterIndex = 0
      room.enemy = enemy
      room.round = 1
      room.log = [`Експедиція входить до ${riftDefinition(room.riftId)?.name ?? room.riftId}.`]
      room.personalRewards.clear()
      room.expeditionLoot = new Map([...room.members.keys()].map((id) => [id, { resources: {}, recipeIds: [] }]))
      room.extracted = false
      for (const [id, member] of room.members) {
        const memberState = prepared.get(id)!
        this.economy.setAvailability(id, member.connected, true)
        member.character = { ...memberState.character, currentHP: memberState.character.maxHP, alive: true, ready: false }
        member.potionCooldown = 0
        member.expeditionPotionQuantities = memberState.potionQuantities
        member.expeditionPotions = Object.values(memberState.potionQuantities).reduce((sum, quantity) => sum + quantity, 0)
        this.presence.set(id, 'RIFT')
        this.broadcastPresence(id)
        this.send(id, { type: 'CHARACTER_STATE', payload: memberState.state })
      }
      await Promise.all([
        this.telemetry.record({ type: 'PARTY_STARTED', eventKey: `party-started:${room.expeditionId}`, playSessionId: room.playSessionId, expeditionId: room.expeditionId, playerId, riftId: room.riftId, floor: room.floorNumber, payload: compositionPayload }),
        this.telemetry.record({ type: 'RIFT_STARTED', eventKey: `rift-started:${room.expeditionId}`, playSessionId: room.playSessionId, expeditionId: room.expeditionId, playerId, riftId: room.riftId, floor: room.floorNumber, payload: compositionPayload }),
        this.telemetry.record({ type: 'ENCOUNTER_STARTED', eventKey: `encounter-started:${room.expeditionId}:0`, playSessionId: room.playSessionId, expeditionId: room.expeditionId, riftId: room.riftId, floor: room.floorNumber, encounter: 0, payload: { ...compositionPayload, enemyId: room.enemy.id } }),
      ])
    } catch (error) { if (error instanceof EconomyError) { this.fail(playerId, error.code, error.message); return false } throw error }
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
    await this.telemetry.record({ type: 'PLAYER_ACTION_SUBMITTED', eventKey: `action:${room.expeditionId}:${room.encounterIndex}:${room.round}:${playerId}`, playSessionId: room.playSessionId ?? undefined, expeditionId: room.expeditionId ?? undefined, playerId, riftId: room.riftId, floor: room.floorNumber, encounter: room.encounterIndex, round: room.round, payload: { attackZone: payload.attackZone, defendZone: payload.defendZone, usePotion: payload.usePotion, confirmSeconds: Math.max(0, (this.roundDurationMs - Math.max(0, (room.roundEndsAt ?? this.now()) - this.now())) / 1000), auto: false } })
    this.broadcastCombat(room, 'COMBAT_SNAPSHOT')
    if (this.canResolveEarly(room)) await this.resolveRoomRound(room)
    return true
  }

  async setAutoBattle(playerId: string, enabled: boolean): Promise<void> {
    const room = this.findMemberRoom(playerId)
    const member = room?.members.get(playerId)
    if (!room || !member || room.phase !== 'COMBAT') return void this.fail(playerId, 'NOT_IN_COMBAT', 'Auto Battle доступний лише в бою.')
    member.autoBattle = enabled
    await this.telemetry.record({ type: enabled ? 'AUTO_ENABLED' : 'AUTO_DISABLED', playSessionId: this.playSessions.get(playerId), expeditionId: room.expeditionId ?? undefined, playerId, riftId: room.riftId, floor: room.floorNumber, encounter: room.encounterIndex, round: room.round })
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
    if (!room || !member) return
    const message = this.chatService.groupMessage(playerId, room.id, member.character.name, rawMessage)
    const chatMessage = { id: message.id, senderId: playerId, senderName: member.character.name, message: message.text, timestamp: message.createdAt }
    room.chat = [...room.chat.slice(-49), chatMessage]
    for (const id of room.members.keys()) this.send(id, { type: 'PARTY_CHAT_MESSAGE', payload: chatMessage })
  }

  async dispose(): Promise<void> {
    this.accepting = false
    for (const room of this.rooms.values()) if (room.roundTimer) clearTimeout(room.roundTimer)
    for (const id of this.peers.keys()) await this.economy.cancelTradesForDisconnect(id)
    await this.playerStates.disconnect()
  }

  stopAccepting(): void { this.accepting = false }

  private createMember(character: Character): RoomMember {
    return { character: { ...character }, connected: true, peer: null, ready: false, autoBattle: false, potionCooldown: 0, expeditionPotions: 0, expeditionPotionQuantities: {}, disconnectedAt: null }
  }

  private createEnemy(riftId: string, floorNumber: number, index: number, partySize: number): Enemy {
    return createRiftEnemy(riftId, floorNumber, index, partySize)
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
    try {
      if (room.roundTimer) clearTimeout(room.roundTimer)
      room.roundTimer = null
    const resolvedEarly = this.now() < (room.roundEndsAt ?? this.now())
    const submittedIds = new Set(room.actions.keys())
    const before = new Map([...room.members].map(([id, member]) => [id, { hp: member.character.currentHP, alive: member.character.alive, potionCooldown: member.potionCooldown }]))
    const actions: Record<string, CombatAction> = Object.fromEntries(room.actions)
    const autoGeneratedIds = new Set<string>()
    const contentTier = (floorDefinition(room.riftId, room.floorNumber)?.resourceTier ?? 1) as ContentTier
    for (const [id, member] of room.members) {
      if (!member.character.alive || actions[id]) continue
      if (member.connected && member.autoBattle) {
        autoGeneratedIds.add(id)
        const potion = selectAutoPotion({
          currentHP: member.character.currentHP,
          maxHP: member.character.maxHP,
          potionCooldown: member.potionCooldown,
          contentTier,
          potions: Object.entries(member.expeditionPotionQuantities).map(([itemId, quantity]) => ({ itemId, quantity, healPercent: ITEM_CATALOG[itemId]?.potionHealPercent ?? 0 })),
        })
        actions[id] = potion
          ? { type: 'potion', potionItemId: potion.potionItemId, defendZone: randomZone(this.random) }
          : { type: 'attack', attackZone: randomZone(this.random), defendZone: randomZone(this.random) }
      } else actions[id] = { type: 'attack', defendZone: randomZone(this.random) }
    }
    for (const [id, action] of Object.entries(actions)) {
      if (action.type !== 'potion') continue
      const member = room.members.get(id)
      const available = Object.entries(member?.expeditionPotionQuantities ?? {}).filter(([, quantity]) => quantity > 0)
      const potionItemId = action.potionItemId && (member?.expeditionPotionQuantities[action.potionItemId] ?? 0) > 0
        ? action.potionItemId : available.sort(([a], [b]) => (ITEM_CATALOG[b]?.potionHealPercent ?? 0) - (ITEM_CATALOG[a]?.potionHealPercent ?? 0))[0]?.[0]
      if (!member || !potionItemId || !await this.playerStates.consumeItem(id, potionItemId, 1, `potion:${room.expeditionId}:${room.encounterIndex}:${room.round}:${id}`)) {
        actions[id] = { type: 'attack', defendZone: action.defendZone }
        continue
      }
      action.potionItemId = potionItemId
      member.expeditionPotionQuantities[potionItemId] -= 1
      member.expeditionPotions -= 1
    }
    const party = [...room.members.values()].map((member) => member.character)
    const cooldowns = Object.fromEntries([...room.members].map(([id, member]) => [id, member.potionCooldown]))
    const potionHealPercents = Object.fromEntries(Object.entries(actions).map(([id, action]) => [id, action.type === 'potion' ? ITEM_CATALOG[action.potionItemId ?? HEALING_POTION_ID]?.potionHealPercent ?? 0.35 : 0.35]))
    const enemyAction = generateEnemyAction(room.enemy, party, this.random)
    const result = resolveRound({
      party, enemy: room.enemy, actions, enemyAction,
      potionCooldown: cooldowns[party[0]?.id] ?? 0, potionCooldowns: cooldowns, potionHealPercents, random: this.random,
    })
    room.enemy = result.enemy
    result.party.forEach((character) => {
      const member = room.members.get(character.id)
      if (!member) return
      member.character = character
      member.potionCooldown = result.potionCooldowns?.[character.id] ?? member.potionCooldown
    })
    const manualTimeoutCount = [...room.members].filter(([id, member]) => before.get(id)?.alive && !member.autoBattle && !submittedIds.has(id)).length
    const disconnectedTimeoutCount = [...room.members].filter(([id, member]) => before.get(id)?.alive && !member.connected && !submittedIds.has(id)).length
    await this.telemetry.record({
      type: 'ROUND_RESOLVED', eventKey: `round:${room.expeditionId}:${room.encounterIndex}:${room.round}`,
      playSessionId: room.playSessionId ?? undefined, expeditionId: room.expeditionId ?? undefined, riftId: room.riftId,
      floor: room.floorNumber, encounter: room.encounterIndex, round: room.round,
      payload: {
        durationSeconds: Math.min(this.roundDurationMs, Math.max(0, this.roundDurationMs - Math.max(0, (room.roundEndsAt ?? this.now()) - this.now()))) / 1000,
        resolvedEarly, waitedFullTimer: !resolvedEarly, manualTimeoutCount, disconnectedTimeoutCount,
        autoRoundCount: [...room.members.values()].filter((member) => member.autoBattle && member.character.alive).length,
        zones: Object.entries(actions).map(([id, action]) => ({ attack: action.type === 'attack' ? action.attackZone : undefined, defense: action.defendZone, auto: autoGeneratedIds.has(id) })),
        enemyZones: { attack: enemyAction.attackZone, defense: enemyAction.defendZone },
      },
    })
    for (const [id, action] of Object.entries(actions)) {
      const member = room.members.get(id)!
      const previous = before.get(id)!
      if (autoGeneratedIds.has(id)) await this.telemetry.record({ type: 'PLAYER_ACTION_SUBMITTED', eventKey: `auto-action:${room.expeditionId}:${room.encounterIndex}:${room.round}:${id}`, playSessionId: room.playSessionId ?? undefined, expeditionId: room.expeditionId ?? undefined, playerId: id, riftId: room.riftId, floor: room.floorNumber, encounter: room.encounterIndex, round: room.round, payload: { auto: true, usePotion: action.type === 'potion', potionItemId: action.type === 'potion' ? action.potionItemId : undefined, attackZone: action.type === 'attack' ? action.attackZone : undefined, defendZone: action.defendZone, hpBefore: previous.hp, remainingPotionCount: member.expeditionPotions, cooldownBefore: previous.potionCooldown, cooldownAfter: member.potionCooldown } })
      if (action.type === 'potion') {
        const expected = Math.floor(member.character.maxHP * (ITEM_CATALOG[action.potionItemId ?? HEALING_POTION_ID]?.potionHealPercent ?? 0.35))
        const healValue = Math.min(expected, Math.max(0, member.character.maxHP - previous.hp))
        await this.telemetry.record({ type: 'POTION_USED', eventKey: `potion-event:${room.expeditionId}:${room.encounterIndex}:${room.round}:${id}`, playSessionId: room.playSessionId ?? undefined, expeditionId: room.expeditionId ?? undefined, playerId: id, riftId: room.riftId, floor: room.floorNumber, encounter: room.encounterIndex, round: room.round, payload: { auto: autoGeneratedIds.has(id), potionItemId: action.potionItemId, hpBefore: previous.hp, hpHealed: healValue, overheal: Math.max(0, expected - healValue), survivedRound: member.character.alive, remainingPotionCount: member.expeditionPotions, cooldownBefore: previous.potionCooldown, cooldownAfter: member.potionCooldown } })
      }
      if (previous.alive && !member.character.alive) await this.telemetry.record({ type: 'PLAYER_DIED', eventKey: `death:${room.expeditionId}:${room.encounterIndex}:${room.round}:${id}`, playSessionId: room.playSessionId ?? undefined, expeditionId: room.expeditionId ?? undefined, playerId: id, riftId: room.riftId, floor: room.floorNumber, encounter: room.encounterIndex, round: room.round })
    }
    room.log = [...result.log, ...room.log].slice(0, 30)
    this.broadcastCombat(room, 'ROUND_RESOLVED')

    if (![...room.members.values()].some((member) => member.character.alive)) {
      room.phase = 'FAILED'; room.roundEndsAt = null
      for (const id of room.members.keys()) { this.presence.set(id, 'CITY'); this.broadcastPresence(id) }
      for (const id of room.members.keys()) this.economy.setAvailability(id, room.members.get(id)!.connected, false)
      await this.extractLoot(room, false)
      await this.telemetry.record({ type: 'RIFT_FAILED', eventKey: `rift-failed:${room.expeditionId}`, playSessionId: room.playSessionId ?? undefined, expeditionId: room.expeditionId ?? undefined, riftId: room.riftId, floor: room.floorNumber, payload: this.outcomePayload(room) })
      if (room.expeditionId) await this.telemetry.finishExpedition(room.expeditionId, 'FAILED')
      this.broadcastCombat(room, 'EXPEDITION_RESULT')
      this.finalizeRoom(room)
      return
    }
    if (room.enemy.currentHP <= 0) {
      await this.completeEncounter(room)
      return
    }
    room.round += 1
    this.startRound(room, 'ROUND_STARTED')
    } catch (error) {
      log('error', 'rift_round_resolution_failed', { roomId: room.id, expeditionId: room.expeditionId, round: room.round, phase: room.phase }, error)
      for (const id of room.members.keys()) this.fail(id, 'RIFT_RESOLUTION_FAILED', 'Раунд не вдалося завершити. Сервер безпечно зупинив експедицію.')
      room.phase = 'FAILED'
      room.roundEndsAt = null
      if (room.roundTimer) clearTimeout(room.roundTimer)
      room.roundTimer = null
      if (room.expeditionId) await this.telemetry.finishExpedition(room.expeditionId, 'FAILED')
      this.broadcastCombat(room, 'EXPEDITION_RESULT')
      this.finalizeRoom(room)
    } finally {
      room.resolving = false
    }
  }

  private async completeEncounter(room: RoomState): Promise<void> {
    const encounters = floorEncounters(room.riftId, room.floorNumber)
    const definition = encounters[room.encounterIndex]
    const kind = definition.type === 'NORMAL' ? 'mob' : definition.type === 'ELITE' ? 'elite' : 'boss'
    const lootLabel = `Tier ${definition.lootTier} profession materials`
    room.reward = { xp: definition.baseXP, coins: definition.baseCoins, loot: lootLabel }
    room.accumulated.xp += definition.baseXP
    room.accumulated.coins += definition.baseCoins
    room.accumulated.loot.push(lootLabel)
    const generatedLoot = generateProfessionLoot(
      [...room.members].map(([id, member]) => ({ id, classId: member.character.classId, alive: member.character.alive })),
      room.encounterIndex,
      kind,
      { random: this.random, tier: definition.lootTier },
    )
    room.personalRewards.clear()
    for (const [id, member] of room.members) {
      const wasAlive = member.character.alive
      const xp = wasAlive ? adjustedEnemyXP(definition.baseXP, member.character.level, definition.level) : 0
      member.character = applyXPAndLevelUps(member.character, xp).character
      if (!wasAlive) member.character = { ...member.character, currentHP: 0, alive: false }
      this.identities.set(member.character.id, member.character)
      const coins = wasAlive ? Math.floor(definition.baseCoins * COIN_MULTIPLIER[member.character.classId]) : 0
      await this.playerStates.awardProgression(id, member.character.level, member.character.currentXP, coins, `${room.id}:encounter:${room.encounterIndex}`)
      const loot = generatedLoot.personal[id] ?? { resources: {}, recipeIds: [] }
      const stateBeforeDrop = await this.playerStates.snapshot(id)
      room.personalRewards.set(id, { xp, coins, resources: loot.resources, recipeIds: loot.recipeIds })
      this.mergeLoot(room.expeditionLoot.get(id)!, loot)
      if (loot.recipeIds.length) await this.telemetry.record({ type: 'RECIPE_DROPPED', eventKey: `recipe-drop:${room.expeditionId}:${room.encounterIndex}:${id}`, playSessionId: room.playSessionId ?? undefined, expeditionId: room.expeditionId ?? undefined, playerId: id, riftId: room.riftId, floor: room.floorNumber, encounter: room.encounterIndex, payload: { recipeDrops: loot.recipeIds.map((recipeId) => ({ recipeId, profession: ITEM_CATALOG[`recipe_item:${recipeId}`]?.allowedClass, known: stateBeforeDrop.learnedRecipes.includes(recipeId), duplicate: stateBeforeDrop.learnedRecipes.includes(recipeId) || (room.expeditionLoot.get(id)?.recipeIds.filter((value) => value === recipeId).length ?? 0) > 1 })) } })
    }
    await this.telemetry.record({ type: 'ENCOUNTER_COMPLETED', eventKey: `encounter-completed:${room.expeditionId}:${room.encounterIndex}`, playSessionId: room.playSessionId ?? undefined, expeditionId: room.expeditionId ?? undefined, riftId: room.riftId, floor: room.floorNumber, encounter: room.encounterIndex, payload: { enemyId: definition.id, durationSeconds: Math.max(0, this.now() - (room.encounterStartedAt ?? this.now())) / 1000, rounds: room.round, deaths: [...room.members.values()].filter((member) => !member.character.alive).length } })
    if (room.encounterIndex === encounters.length - 1) {
      for (const id of room.members.keys()) {
        await this.playerStates.completeRiftFloor(id, room.riftId, room.floorNumber, `${room.id}:floor:${room.floorNumber}`)
        const unlocked = nextUnlockAfterCompletion(room.riftId, room.floorNumber)
        await this.telemetry.record({ type: 'FLOOR_UNLOCKED', eventKey: `floor-unlocked:${room.expeditionId}:${id}`, playSessionId: room.playSessionId ?? undefined, expeditionId: room.expeditionId ?? undefined, playerId: id, riftId: unlocked.riftId, floor: unlocked.floorNumber, payload: { completedRiftId: room.riftId, completedFloor: room.floorNumber } })
      }
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
    const encounters = floorEncounters(room.riftId, room.floorNumber)
    if (decision === 'EXIT' || room.encounterIndex >= encounters.length - 1) {
      room.phase = 'FINISHED'
      for (const id of room.members.keys()) { this.presence.set(id, 'CITY'); this.broadcastPresence(id) }
      for (const id of room.members.keys()) this.economy.setAvailability(id, room.members.get(id)!.connected, false)
      await this.extractLoot(room, true)
      const completed = room.encounterIndex >= encounters.length - 1
      await this.telemetry.record({ type: completed ? 'RIFT_COMPLETED' : 'RIFT_EXIT', eventKey: `rift-result:${room.expeditionId}`, playSessionId: room.playSessionId ?? undefined, expeditionId: room.expeditionId ?? undefined, riftId: room.riftId, floor: room.floorNumber, payload: this.outcomePayload(room) })
      if (room.expeditionId) await this.telemetry.finishExpedition(room.expeditionId, completed ? 'COMPLETED' : 'EXITED')
      this.broadcastCombat(room, 'EXPEDITION_RESULT')
      this.finalizeRoom(room)
      return
    }
    room.encounterIndex += 1
    room.enemy = this.createEnemy(room.riftId, room.floorNumber, room.encounterIndex, room.members.size)
    room.round = 1
    room.reward = null
    room.personalRewards.clear()
    room.votes.clear()
    room.phase = 'COMBAT'
    room.encounterStartedAt = this.now()
    await this.telemetry.record({ type: 'ENCOUNTER_STARTED', eventKey: `encounter-started:${room.expeditionId}:${room.encounterIndex}`, playSessionId: room.playSessionId ?? undefined, expeditionId: room.expeditionId ?? undefined, riftId: room.riftId, floor: room.floorNumber, encounter: room.encounterIndex, payload: { ...(await this.compositionPayload(room)), enemyId: room.enemy.id } })
    for (const id of room.members.keys()) { this.presence.set(id, 'RIFT'); this.broadcastPresence(id) }
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
      potionQuantities: { ...member.expeditionPotionQuantities },
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
      riftId: room.riftId, floorNumber: room.floorNumber,
    }
  }

  private combatSnapshot(room: RoomState, viewerId: string): CombatSnapshot {
    return {
      roomId: room.id, riftId: room.riftId, floorNumber: room.floorNumber, phase: room.phase, leaderId: room.leaderId,
      encounterIndex: room.encounterIndex, encounterTotal: floorEncounters(room.riftId, room.floorNumber).length, round: room.round,
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
      riftId: room.riftId, floorNumber: room.floorNumber,
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

  private async sendSocialState(playerId: string): Promise<void> {
    await Promise.all([this.sendGuildState(playerId), this.friends.state(playerId).then((payload) => this.send(playerId, { type: 'FRIENDS_STATE', payload })), this.chatService.unread(playerId).then((payload) => this.send(playerId, { type: 'UNREAD_UPDATE', payload }))])
  }

  private async sendGuildState(playerId: string): Promise<void> { this.send(playerId, { type: 'GUILD_STATE', payload: await this.guilds.state(playerId) }) }

  private broadcastPresence(playerId: string): void {
    const payload = { playerId, status: this.presence.get(playerId) }
    void (this.playerStates.repository as SocialRepository).socialRead((state) => {
      const recipients = new Set<string>([playerId])
      const room = this.findMemberRoom(playerId)
      for (const id of room?.members.keys() ?? []) recipients.add(id)
      for (const friendship of state.friendships.values()) {
        if (friendship.playerLowId === playerId) recipients.add(friendship.playerHighId)
        if (friendship.playerHighId === playerId) recipients.add(friendship.playerLowId)
      }
      const guildId = state.guildMembers.get(playerId)?.guildId
      if (guildId) for (const member of state.guildMembers.values()) if (member.guildId === guildId) recipients.add(member.playerId)
      return [...recipients].filter((id) => !state.blocks.has(`${id}:${playerId}`) && !state.blocks.has(`${playerId}:${id}`))
    }).then((recipients) => {
      for (const id of recipients) if (this.peers.has(id)) this.send(id, { type: 'PRESENCE_UPDATE', payload })
    }).catch((error) => log('error', 'presence_fanout_failed', { playerId }, error))
  }

  private async broadcastSocialState(): Promise<void> {
    for (const id of this.peers.keys()) if (!this.isCombatActive(id)) await this.sendSocialState(id)
  }

  private async guildAction(playerId: string, action: () => Promise<Awaited<ReturnType<GuildService['state']>>>, economyChanged = false): Promise<void> {
    if (!this.socialAllowed(playerId)) return
    try {
      this.send(playerId, { type: 'GUILD_STATE', payload: await action() })
      if (economyChanged) this.send(playerId, { type: 'ECONOMY_UPDATE', payload: await this.playerStates.snapshot(playerId) })
      await this.broadcastSocialState()
    } catch (error) { if (error instanceof EconomyError) this.fail(playerId, error.code, error.message); else throw error }
  }

  private async guildStorageAction(playerId: string, action: () => Promise<Awaited<ReturnType<GuildService['storage']>>>): Promise<void> {
    if (this.economyLocked(playerId)) return
    try {
      this.send(playerId, { type: 'GUILD_STORAGE_UPDATE', payload: await action() })
      this.send(playerId, { type: 'ECONOMY_UPDATE', payload: await this.playerStates.snapshot(playerId) })
      await this.broadcastSocialState()
    } catch (error) { if (error instanceof EconomyError) this.fail(playerId, error.code, error.message); else throw error }
  }

  private async friendsAction(playerId: string, action: () => Promise<Awaited<ReturnType<FriendsService['state']>>>): Promise<void> {
    if (!this.socialAllowed(playerId)) return
    try { this.send(playerId, { type: 'FRIENDS_STATE', payload: await action() }); await this.broadcastSocialState() }
    catch (error) { if (error instanceof EconomyError) this.fail(playerId, error.code, error.message); else throw error }
  }

  private async chatAction(playerId: string, payload: Extract<ClientMessage, { type: 'SEND_CHAT_MESSAGE' }>['payload']): Promise<void> {
    if (!this.socialAllowed(playerId)) return
    try {
      const message = await this.chatService.send(playerId, payload, payload.operationId)
      const recipients = await this.chatService.recipients(message)
      for (const id of recipients) if (this.peers.has(id) && !this.isCombatActive(id)) this.send(id, { type: 'CHAT_MESSAGE', payload: message })
      for (const id of recipients) if (this.peers.has(id) && !this.isCombatActive(id)) this.send(id, { type: 'UNREAD_UPDATE', payload: await this.chatService.unread(id) })
      if (message.channel === 'PRIVATE') for (const id of recipients) if (this.peers.has(id) && !this.isCombatActive(id)) this.send(id, { type: 'PRIVATE_CONVERSATIONS', payload: await this.chatService.conversations(id) })
    } catch (error) { if (error instanceof EconomyError) this.fail(playerId, error.code, error.message); else throw error }
  }

  private inviteToParty(playerId: string, targetId: string): void {
    if (!this.peers.has(targetId) || this.findMemberRoom(targetId)) return void this.fail(playerId, 'PARTY_INVITE_UNAVAILABLE', 'Player is offline or already in a party.')
    let room = this.findMemberRoom(playerId)
    if (!room) room = this.createParty(playerId) ?? undefined
    if (!room || room.phase !== 'LOBBY') return void this.fail(playerId, 'PARTY_LOCKED', 'Party invitation requires a lobby.')
    this.send(targetId, { type: 'PARTY_INVITE', payload: { partyId: room.id, inviterId: playerId, inviterName: this.identities.get(playerId)?.name ?? 'Player' } })
  }

  private async sendChatHistory(playerId: string, payload: Extract<ClientMessage, { type: 'GET_CHAT_HISTORY' }>['payload']): Promise<void> {
    this.send(playerId, { type: 'CHAT_HISTORY', payload: await this.chatService.history(playerId, payload) })
    this.send(playerId, { type: 'UNREAD_UPDATE', payload: await this.chatService.unread(playerId) })
  }

  private isCombatActive(playerId: string): boolean { const phase = this.findMemberRoom(playerId)?.phase; return phase === 'COMBAT' || phase === 'POST_ENCOUNTER' }
  private socialAllowed(playerId: string): boolean { if (this.isCombatActive(playerId)) { this.fail(playerId, 'SOCIAL_UNAVAILABLE_IN_RIFT', 'Only Group Chat is loaded during an active Rift.'); return false } return true }

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

  private async compositionPayload(room: RoomState): Promise<Record<string, unknown>> {
    const composition: Record<string, number> = {}
    for (const member of room.members.values()) composition[member.character.classId] = (composition[member.character.classId] ?? 0) + 1
    const states = await Promise.all([...room.members.keys()].map((id) => this.playerStates.snapshot(id)))
    return {
      partySize: room.members.size,
      composition,
      playerLevels: [...room.members.values()].map((member) => member.character.level),
      gearTiers: states.map((state) => Object.values(state.equipment).filter(Boolean).map((entry) => ITEM_CATALOG[entry!.itemId]?.tier ?? 0)),
    }
  }

  private outcomePayload(room: RoomState): Record<string, unknown> {
    const retained = room.phase === 'FAILED' ? 1 - FAILED_EXPEDITION_LOOT_LOSS : 1
    const resources = [...room.expeditionLoot.values()].reduce((sum, loot) => sum + Object.values(loot.resources).reduce((subtotal, quantity) => subtotal + Math.floor(quantity * retained), 0), 0)
    const recipes = [...room.expeditionLoot.values()].reduce((sum, loot) => sum + Math.floor(loot.recipeIds.length * retained), 0)
    return {
      partySize: room.members.size,
      durationSeconds: Math.max(0, this.now() - (room.expeditionStartedAt ?? this.now())) / 1000,
      encountersCompleted: room.encounterIndex + (room.reward ? 1 : 0),
      xp: room.accumulated.xp,
      coins: room.accumulated.coins,
      professionResources: resources,
      recipeDrops: recipes,
      deaths: [...room.members.values()].filter((member) => !member.character.alive).length,
      autoPlayers: [...room.members.values()].filter((member) => member.autoBattle).length,
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

  private async handleReconnectExpiry(roomId: string, playerId: string): Promise<void> {
    const room = this.rooms.get(roomId)
    const member = room?.members.get(playerId)
    if (!room || !member || member.connected || !member.disconnectedAt || this.now() - member.disconnectedAt < this.reconnectGraceMs) return
    if (room.phase === 'LOBBY') return this.removeExpiredLobbyMember(roomId, playerId)
    if (room.phase === 'POST_ENCOUNTER' && ![...room.members.values()].some((candidate) => candidate.connected && candidate.character.alive)) {
      room.phase = 'FAILED'
      await this.extractLoot(room, false)
      if (room.expeditionId) await this.telemetry.finishExpedition(room.expeditionId, 'FAILED')
      this.broadcastCombat(room, 'EXPEDITION_RESULT')
      this.finalizeRoom(room)
    }
  }

  private finalizeRoom(room: RoomState): void {
    if (room.phase !== 'FINISHED' && room.phase !== 'FAILED') return
    if (room.roundTimer) clearTimeout(room.roundTimer)
    room.roundTimer = null
    for (const id of room.members.keys()) {
      this.economy.setAvailability(id, this.peers.has(id), false)
      this.presence.set(id, this.peers.has(id) ? 'CITY' : 'OFFLINE')
      this.broadcastPresence(id)
    }
    room.members.clear()
    room.applications.clear()
    this.rooms.delete(room.id)
  }
}
