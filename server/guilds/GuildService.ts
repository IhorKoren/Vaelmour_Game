import { randomUUID } from 'node:crypto'
import { ITEM_CATALOG } from '../../shared/game-data/catalog'
import { GUILD_CREATION_COST, GUILD_MAX_MEMBERS } from '../../shared/game-data/social'
import type { GuildListItem, GuildPermissionView, GuildRank, GuildSnapshot, GuildStorageLogView, GuildStorageSnapshot } from '../../shared/social-types'
import { EconomyError } from '../players/PlayerStateService'
import type { SocialRepository, SocialState } from '../repositories/types'
import type { PresenceService } from '../social/PresenceService'
import { memberGuildId, publicPlayer } from '../social/social-utils'

const RANKS: GuildRank[] = ['LEADER', 'OFFICER', 'MEMBER', 'RECRUIT']
const DEFAULT_PERMISSIONS: Record<GuildRank, { canDeposit: boolean; canWithdraw: boolean }> = {
  LEADER: { canDeposit: true, canWithdraw: true }, OFFICER: { canDeposit: true, canWithdraw: true },
  MEMBER: { canDeposit: true, canWithdraw: true }, RECRUIT: { canDeposit: true, canWithdraw: false },
}

export class GuildService {
  constructor(private readonly repository: SocialRepository, private readonly presence: PresenceService, private readonly now: () => number = Date.now) {}

  async create(playerId: string, input: { name: string; tag: string; description?: string; messageOfTheDay?: string }, operationId: string): Promise<GuildSnapshot> {
    const name = input.name.trim(); const tag = input.tag.trim().toUpperCase()
    if (name.length < 3 || name.length > 40) throw new EconomyError('INVALID_GUILD_NAME', 'Guild name must contain 3–40 characters.')
    if (!/^[A-Z0-9]{2,8}$/.test(tag)) throw new EconomyError('INVALID_GUILD_TAG', 'Guild tag must contain 2–8 letters or digits.')
    await this.repository.socialTransact(playerId, `guild-create:${playerId}:${operationId}`, 'CREATE_GUILD', (state) => {
      const player = this.player(state, playerId)
      if (memberGuildId(state, playerId)) throw new EconomyError('ALREADY_IN_GUILD', 'Player already belongs to a guild.')
      const nameKey = name.toLocaleLowerCase(); const tagKey = tag.toLocaleLowerCase()
      if ([...state.guilds.values()].some((guild) => guild.nameKey === nameKey)) throw new EconomyError('GUILD_NAME_TAKEN', 'Guild name is already used.')
      if ([...state.guilds.values()].some((guild) => guild.tagKey === tagKey)) throw new EconomyError('GUILD_TAG_TAKEN', 'Guild tag is already used.')
      if (player.coins < GUILD_CREATION_COST) throw new EconomyError('INSUFFICIENT_AVAILABLE_COINS', 'Not enough available coins.')
      const id = randomUUID(); const timestamp = this.now()
      player.coins -= GUILD_CREATION_COST
      state.guilds.set(id, { id, name, nameKey, tag, tagKey, description: (input.description ?? '').trim().slice(0, 500), messageOfTheDay: (input.messageOfTheDay ?? '').trim().slice(0, 300), leaderPlayerId: playerId, createdAt: timestamp, updatedAt: timestamp })
      state.guildMembers.set(playerId, { guildId: id, playerId, rank: 'LEADER', joinedAt: timestamp })
      for (const rank of RANKS) state.guildPermissions.set(`${id}:${rank}`, { guildId: id, rank, ...DEFAULT_PERMISSIONS[rank] })
      state.ledger.push({ id: randomUUID(), playerId, amount: -GUILD_CREATION_COST, resultingBalance: player.coins, reason: 'GUILD_CREATION', referenceId: id, createdAt: new Date(timestamp) })
    })
    return this.state(playerId)
  }

  async search(query = ''): Promise<GuildListItem[]> {
    const normalized = query.trim().toLocaleLowerCase()
    return this.repository.socialRead((state) => [...state.guilds.values()]
      .filter((guild) => !normalized || guild.nameKey.includes(normalized) || guild.tagKey.includes(normalized))
      .map((guild) => this.listItem(state, guild.id)).sort((a, b) => b.memberCount - a.memberCount || a.name.localeCompare(b.name)).slice(0, 50))
  }

  async state(playerId: string): Promise<GuildSnapshot> {
    return this.repository.socialRead((state) => this.snapshot(state, playerId))
  }

  async apply(playerId: string, guildId: string, message: string | undefined, operationId: string): Promise<GuildSnapshot> {
    await this.repository.socialTransact(playerId, `guild-apply:${playerId}:${operationId}`, 'APPLY_TO_GUILD', (state) => {
      this.player(state, playerId); this.guild(state, guildId)
      if (memberGuildId(state, playerId)) throw new EconomyError('ALREADY_IN_GUILD', 'Leave the current guild first.')
      const existing = [...state.guildApplications.values()].find((value) => value.guildId === guildId && value.playerId === playerId)
      if (existing?.status === 'PENDING') throw new EconomyError('APPLICATION_EXISTS', 'Application is already pending.')
      const id = existing?.id ?? randomUUID()
      state.guildApplications.set(id, { id, guildId, playerId, message: message?.trim().slice(0, 200) || undefined, status: 'PENDING', createdAt: this.now() })
    })
    return this.state(playerId)
  }

  async cancelApplication(playerId: string, applicationId: string, operationId: string): Promise<GuildSnapshot> {
    await this.repository.socialTransact(playerId, `guild-cancel-application:${playerId}:${operationId}`, 'CANCEL_GUILD_APPLICATION', (state) => {
      const application = state.guildApplications.get(applicationId)
      if (!application || application.playerId !== playerId || application.status !== 'PENDING') throw new EconomyError('APPLICATION_NOT_FOUND', 'Pending application not found.')
      application.status = 'CANCELLED'
    })
    return this.state(playerId)
  }

  async reviewApplication(actorId: string, applicationId: string, accept: boolean, operationId: string): Promise<GuildSnapshot> {
    await this.repository.socialTransact(actorId, `guild-review-application:${actorId}:${operationId}`, accept ? 'ACCEPT_GUILD_APPLICATION' : 'REJECT_GUILD_APPLICATION', (state) => {
      const actor = this.requireRank(state, actorId, ['LEADER', 'OFFICER'])
      const application = state.guildApplications.get(applicationId)
      if (!application || application.guildId !== actor.guildId || application.status !== 'PENDING') throw new EconomyError('APPLICATION_NOT_FOUND', 'Pending application not found.')
      if (!accept) { application.status = 'DECLINED'; return }
      if (memberGuildId(state, application.playerId)) throw new EconomyError('ALREADY_IN_GUILD', 'Applicant joined another guild.')
      this.ensureCapacity(state, actor.guildId)
      application.status = 'ACCEPTED'
      state.guildMembers.set(application.playerId, { guildId: actor.guildId, playerId: application.playerId, rank: 'RECRUIT', joinedAt: this.now() })
      this.closeOtherJoinRequests(state, application.playerId, actor.guildId)
    })
    return this.state(actorId)
  }

  async invite(actorId: string, playerName: string, operationId: string): Promise<GuildSnapshot> {
    await this.repository.socialTransact(actorId, `guild-invite:${actorId}:${operationId}`, 'INVITE_TO_GUILD', (state) => {
      const actor = this.requireRank(state, actorId, ['LEADER', 'OFFICER'])
      const target = this.exactPlayer(state, playerName)
      if (memberGuildId(state, target.playerId)) throw new EconomyError('ALREADY_IN_GUILD', 'Player already belongs to a guild.')
      if ([...state.guildInvites.values()].some((value) => value.guildId === actor.guildId && value.playerId === target.playerId && value.status === 'PENDING')) throw new EconomyError('INVITE_EXISTS', 'Invitation is already pending.')
      const id = randomUUID(); state.guildInvites.set(id, { id, guildId: actor.guildId, playerId: target.playerId, invitedByPlayerId: actorId, status: 'PENDING', createdAt: this.now() })
    })
    return this.state(actorId)
  }

  async respondInvite(playerId: string, inviteId: string, accept: boolean, operationId: string): Promise<GuildSnapshot> {
    await this.repository.socialTransact(playerId, `guild-invite-response:${playerId}:${operationId}`, accept ? 'ACCEPT_GUILD_INVITE' : 'DECLINE_GUILD_INVITE', (state) => {
      const invite = state.guildInvites.get(inviteId)
      if (!invite || invite.playerId !== playerId || invite.status !== 'PENDING' || (invite.expiresAt && invite.expiresAt <= this.now())) throw new EconomyError('INVITE_NOT_FOUND', 'Pending invitation not found.')
      if (!accept) { invite.status = 'DECLINED'; return }
      if (memberGuildId(state, playerId)) throw new EconomyError('ALREADY_IN_GUILD', 'Player already belongs to a guild.')
      this.ensureCapacity(state, invite.guildId)
      invite.status = 'ACCEPTED'; state.guildMembers.set(playerId, { guildId: invite.guildId, playerId, rank: 'RECRUIT', joinedAt: this.now() })
      this.closeOtherJoinRequests(state, playerId, invite.guildId)
    })
    return this.state(playerId)
  }

  async leave(playerId: string, operationId: string): Promise<GuildSnapshot> {
    await this.repository.socialTransact(playerId, `guild-leave:${playerId}:${operationId}`, 'LEAVE_GUILD', (state) => {
      const membership = this.requireMembership(state, playerId)
      if (membership.rank === 'LEADER') throw new EconomyError('LEADER_CANNOT_LEAVE', 'Transfer leadership or disband the guild first.')
      state.guildMembers.delete(playerId)
    })
    return this.state(playerId)
  }

  async kick(actorId: string, targetId: string, operationId: string): Promise<GuildSnapshot> {
    await this.repository.socialTransact(actorId, `guild-kick:${actorId}:${operationId}`, 'KICK_GUILD_MEMBER', (state) => {
      const actor = this.requireRank(state, actorId, ['LEADER', 'OFFICER']); const target = this.requireMembership(state, targetId)
      if (actor.guildId !== target.guildId || actorId === targetId) throw new EconomyError('INVALID_GUILD_MEMBER', 'Guild member not found.')
      if (target.rank === 'LEADER' || (actor.rank === 'OFFICER' && target.rank === 'OFFICER')) throw new EconomyError('GUILD_PERMISSION_DENIED', 'Rank cannot kick this member.')
      state.guildMembers.delete(targetId)
    })
    return this.state(actorId)
  }

  async setRank(actorId: string, targetId: string, rank: Exclude<GuildRank, 'LEADER'>, operationId: string): Promise<GuildSnapshot> {
    await this.repository.socialTransact(actorId, `guild-rank:${actorId}:${operationId}`, 'SET_GUILD_RANK', (state) => {
      const actor = this.requireRank(state, actorId, ['LEADER']); const target = this.requireMembership(state, targetId)
      if (actor.guildId !== target.guildId || target.rank === 'LEADER') throw new EconomyError('INVALID_GUILD_MEMBER', 'Guild member cannot be ranked.')
      target.rank = rank
    })
    return this.state(actorId)
  }

  async transferLeadership(actorId: string, targetId: string, operationId: string): Promise<GuildSnapshot> {
    await this.repository.socialTransact(actorId, `guild-transfer:${actorId}:${operationId}`, 'TRANSFER_GUILD_LEADERSHIP', (state) => {
      const actor = this.requireRank(state, actorId, ['LEADER']); const target = this.requireMembership(state, targetId)
      if (actor.guildId !== target.guildId || actorId === targetId) throw new EconomyError('INVALID_GUILD_MEMBER', 'Leadership target must be another member.')
      actor.rank = 'OFFICER'; target.rank = 'LEADER'; const guild = this.guild(state, actor.guildId); guild.leaderPlayerId = targetId; guild.updatedAt = this.now()
    })
    return this.state(actorId)
  }

  async update(actorId: string, input: { description?: string; messageOfTheDay?: string }, operationId: string): Promise<GuildSnapshot> {
    await this.repository.socialTransact(actorId, `guild-update:${actorId}:${operationId}`, 'UPDATE_GUILD', (state) => {
      const actor = this.requireRank(state, actorId, ['LEADER']); const guild = this.guild(state, actor.guildId)
      if (input.description !== undefined) guild.description = input.description.trim().slice(0, 500)
      if (input.messageOfTheDay !== undefined) guild.messageOfTheDay = input.messageOfTheDay.trim().slice(0, 300)
      guild.updatedAt = this.now()
    })
    return this.state(actorId)
  }

  async updatePermission(actorId: string, rank: Exclude<GuildRank, 'LEADER'>, permission: { canDeposit: boolean; canWithdraw: boolean }, operationId: string): Promise<GuildSnapshot> {
    await this.repository.socialTransact(actorId, `guild-permission:${actorId}:${operationId}`, 'UPDATE_GUILD_PERMISSIONS', (state) => {
      const actor = this.requireRank(state, actorId, ['LEADER'])
      state.guildPermissions.set(`${actor.guildId}:${rank}`, { guildId: actor.guildId, rank, canDeposit: permission.canDeposit, canWithdraw: permission.canWithdraw })
    })
    return this.state(actorId)
  }

  async disband(actorId: string, confirmed: boolean, operationId: string): Promise<GuildSnapshot> {
    await this.repository.socialTransact(actorId, `guild-disband:${actorId}:${operationId}`, 'DISBAND_GUILD', (state) => {
      const actor = this.requireRank(state, actorId, ['LEADER'])
      if (!confirmed) throw new EconomyError('DISBAND_CONFIRMATION_REQUIRED', 'Explicit confirmation is required.')
      if ([...state.guildStorageItems.values()].some((item) => item.guildId === actor.guildId)) throw new EconomyError('GUILD_STORAGE_NOT_EMPTY', 'Спочатку заберіть усі предмети зі сховища.')
      this.deleteGuild(state, actor.guildId)
    })
    return this.state(actorId)
  }

  async storage(playerId: string): Promise<GuildStorageSnapshot> {
    return this.repository.socialRead((state) => this.storageSnapshot(state, playerId))
  }

  async deposit(playerId: string, entryId: string, requestedQuantity: number | undefined, operationId: string): Promise<GuildStorageSnapshot> {
    await this.repository.socialTransact(playerId, `guild-deposit:${playerId}:${operationId}`, 'DEPOSIT_GUILD_STORAGE', (state) => {
      const membership = this.requireStoragePermission(state, playerId, 'canDeposit'); const player = this.player(state, playerId)
      if (Object.values(player.equipment).some((entry) => entry?.entryId === entryId)) throw new EconomyError('EQUIPPED_ITEM', 'Equipped item cannot be deposited.')
      if (player.reservedItems.some((entry) => entry.entryId === entryId)) throw new EconomyError('RESERVED_ITEM', 'Reserved Market/Trade item cannot be deposited.')
      const index = player.inventory.findIndex((entry) => entry.entryId === entryId)
      if (index < 0) throw new EconomyError('ITEM_NOT_OWNED', 'Only personal inventory items can be deposited.')
      const entry = player.inventory[index]; const definition = ITEM_CATALOG[entry.itemId]
      if (!definition) throw new EconomyError('UNKNOWN_ITEM', 'Unknown item.')
      const quantity = this.quantity(entry.quantity, requestedQuantity, definition.stackable)
      const whole = quantity === entry.quantity; const storageId = whole ? entry.entryId : randomUUID(); const timestamp = this.now()
      entry.quantity -= quantity; if (!entry.quantity) player.inventory.splice(index, 1)
      state.guildStorageItems.set(storageId, { id: storageId, guildId: membership.guildId, itemId: entry.itemId, quantity, createdAt: timestamp, updatedAt: timestamp })
      state.guildStorageLogs.push({ id: randomUUID(), guildId: membership.guildId, playerId, action: 'DEPOSIT', itemId: entry.itemId, itemEntryId: storageId, quantity, createdAt: timestamp })
    })
    return this.storage(playerId)
  }

  async withdraw(playerId: string, storageItemId: string, requestedQuantity: number | undefined, operationId: string): Promise<GuildStorageSnapshot> {
    await this.repository.socialTransact(playerId, `guild-withdraw:${playerId}:${operationId}`, 'WITHDRAW_GUILD_STORAGE', (state) => {
      const membership = this.requireStoragePermission(state, playerId, 'canWithdraw'); const player = this.player(state, playerId)
      const item = state.guildStorageItems.get(storageItemId)
      if (!item || item.guildId !== membership.guildId) throw new EconomyError('GUILD_STORAGE_ITEM_NOT_FOUND', 'Guild storage item not found.')
      const definition = ITEM_CATALOG[item.itemId]
      if (!definition) throw new EconomyError('UNKNOWN_ITEM', 'Unknown item.')
      const quantity = this.quantity(item.quantity, requestedQuantity, definition.stackable); const whole = quantity === item.quantity
      item.quantity -= quantity; item.updatedAt = this.now(); if (!item.quantity) state.guildStorageItems.delete(item.id)
      if (definition.stackable) {
        const existing = player.inventory.find((entry) => entry.itemId === item.itemId)
        if (existing) existing.quantity += quantity
        else player.inventory.push({ entryId: whole ? item.id : randomUUID(), itemId: item.itemId, quantity })
      } else player.inventory.push({ entryId: item.id, itemId: item.itemId, quantity: 1 })
      state.guildStorageLogs.push({ id: randomUUID(), guildId: membership.guildId, playerId, action: 'WITHDRAW', itemId: item.itemId, itemEntryId: item.id, quantity, createdAt: this.now() })
    })
    return this.storage(playerId)
  }

  async history(playerId: string, limit = 100): Promise<GuildStorageLogView[]> {
    return this.repository.socialRead((state) => {
      const membership = this.requireMembership(state, playerId)
      return state.guildStorageLogs.filter((log) => log.guildId === membership.guildId).reverse().sort((a, b) => b.createdAt - a.createdAt).slice(0, Math.min(100, Math.max(1, limit))).map((log) => ({ ...log, playerName: state.players.get(log.playerId)?.name ?? 'Unknown', itemName: ITEM_CATALOG[log.itemId]?.name ?? log.itemId }))
    })
  }

  private snapshot(state: SocialState, playerId: string): GuildSnapshot {
    this.player(state, playerId)
    const membership = state.guildMembers.get(playerId); const invites = [...state.guildInvites.values()].filter((value) => value.playerId === playerId && value.status === 'PENDING' && (!value.expiresAt || value.expiresAt > this.now())).map((invite) => ({ id: invite.id, guild: this.listItem(state, invite.guildId), invitedByName: state.players.get(invite.invitedByPlayerId)?.name ?? 'Unknown', createdAt: invite.createdAt, expiresAt: invite.expiresAt }))
    if (!membership) return { guild: null, selfRank: null, members: [], applications: [], invites, permissions: [] }
    const guild = this.guild(state, membership.guildId); const members = [...state.guildMembers.values()].filter((value) => value.guildId === guild.id).map((value) => ({ ...publicPlayer(state, value.playerId, this.presence), rank: value.rank, joinedAt: value.joinedAt })).sort((a, b) => RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank) || a.name.localeCompare(b.name))
    const canReview = membership.rank === 'LEADER' || membership.rank === 'OFFICER'
    const applications = canReview ? [...state.guildApplications.values()].filter((value) => value.guildId === guild.id && value.status === 'PENDING').map((value) => ({ id: value.id, message: value.message, createdAt: value.createdAt, player: publicPlayer(state, value.playerId, this.presence) })) : []
    return { guild: { id: guild.id, name: guild.name, tag: guild.tag, description: guild.description, messageOfTheDay: guild.messageOfTheDay, leaderPlayerId: guild.leaderPlayerId, memberCount: members.length, maxMembers: GUILD_MAX_MEMBERS, onlineCount: members.filter((member) => member.online).length }, selfRank: membership.rank, members, applications, invites, permissions: this.permissions(state, guild.id) }
  }

  private storageSnapshot(state: SocialState, playerId: string): GuildStorageSnapshot {
    const membership = this.requireMembership(state, playerId); const permission = this.permission(state, membership.guildId, membership.rank)
    return { items: [...state.guildStorageItems.values()].filter((item) => item.guildId === membership.guildId).map((item) => { const definition = ITEM_CATALOG[item.itemId]; return { ...item, name: definition?.name ?? item.itemId, icon: definition?.icon ?? '·', category: definition?.category ?? 'resource', attack: definition?.attack, hp: definition?.hp } }).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)), canDeposit: permission.canDeposit, canWithdraw: permission.canWithdraw }
  }

  private permissions(state: SocialState, guildId: string): GuildPermissionView[] { return RANKS.map((rank) => ({ rank, ...this.permission(state, guildId, rank) })) }
  private permission(state: SocialState, guildId: string, rank: GuildRank) { return rank === 'LEADER' ? DEFAULT_PERMISSIONS.LEADER : state.guildPermissions.get(`${guildId}:${rank}`) ?? DEFAULT_PERMISSIONS[rank] }
  private requireStoragePermission(state: SocialState, playerId: string, key: 'canDeposit' | 'canWithdraw') { const membership = this.requireMembership(state, playerId); if (!this.permission(state, membership.guildId, membership.rank)[key]) throw new EconomyError('GUILD_STORAGE_PERMISSION_DENIED', 'Guild rank does not allow this storage action.'); return membership }
  private requireRank(state: SocialState, playerId: string, ranks: GuildRank[]) { const membership = this.requireMembership(state, playerId); if (!ranks.includes(membership.rank)) throw new EconomyError('GUILD_PERMISSION_DENIED', 'Guild rank does not allow this action.'); return membership }
  private requireMembership(state: SocialState, playerId: string) { const membership = state.guildMembers.get(playerId); if (!membership) throw new EconomyError('NOT_IN_GUILD', 'Player is not in a guild.'); return membership }
  private ensureCapacity(state: SocialState, guildId: string) { if ([...state.guildMembers.values()].filter((value) => value.guildId === guildId).length >= GUILD_MAX_MEMBERS) throw new EconomyError('GUILD_FULL', 'Guild member limit reached.') }
  private closeOtherJoinRequests(state: SocialState, playerId: string, joinedGuildId: string) { for (const value of state.guildApplications.values()) if (value.playerId === playerId && value.status === 'PENDING') value.status = value.guildId === joinedGuildId ? 'ACCEPTED' : 'CANCELLED'; for (const value of state.guildInvites.values()) if (value.playerId === playerId && value.status === 'PENDING') value.status = value.guildId === joinedGuildId ? 'ACCEPTED' : 'CANCELLED' }
  private deleteGuild(state: SocialState, guildId: string) { state.guilds.delete(guildId); for (const [id, value] of state.guildMembers) if (value.guildId === guildId) state.guildMembers.delete(id); for (const [id, value] of state.guildApplications) if (value.guildId === guildId) state.guildApplications.delete(id); for (const [id, value] of state.guildInvites) if (value.guildId === guildId) state.guildInvites.delete(id); for (const [id, value] of state.guildPermissions) if (value.guildId === guildId) state.guildPermissions.delete(id); state.guildStorageLogs = state.guildStorageLogs.filter((value) => value.guildId !== guildId); state.chatMessages = state.chatMessages.filter((value) => value.guildId !== guildId) }
  private quantity(available: number, requested: number | undefined, stackable: boolean): number { const quantity = Math.floor(requested ?? available); if (quantity < 1 || quantity > available || (!stackable && quantity !== 1)) throw new EconomyError('INVALID_QUANTITY', 'Invalid item quantity.'); return quantity }
  private player(state: SocialState, playerId: string) { const player = state.players.get(playerId); if (!player) throw new EconomyError('PLAYER_NOT_FOUND', 'Player not found.'); return player }
  private exactPlayer(state: SocialState, name: string) { const normalized = name.trim().toLocaleLowerCase(); const players = [...state.players.values()].filter((value) => value.name.toLocaleLowerCase() === normalized); if (players.length !== 1) throw new EconomyError(players.length ? 'AMBIGUOUS_PLAYER_NAME' : 'PLAYER_NOT_FOUND', 'Exact player name was not found.'); return players[0] }
  private guild(state: SocialState, guildId: string) { const guild = state.guilds.get(guildId); if (!guild) throw new EconomyError('GUILD_NOT_FOUND', 'Guild not found.'); return guild }
  private listItem(state: SocialState, guildId: string): GuildListItem { const guild = this.guild(state, guildId); return { id: guild.id, name: guild.name, tag: guild.tag, description: guild.description, memberCount: [...state.guildMembers.values()].filter((value) => value.guildId === guildId).length, maxMembers: GUILD_MAX_MEMBERS } }
}
