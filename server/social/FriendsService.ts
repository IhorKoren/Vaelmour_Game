import { randomUUID } from 'node:crypto'
import type { FriendsSnapshot, SocialPlayer } from '../../shared/social-types'
import { EconomyError } from '../players/PlayerStateService'
import type { SocialRepository, SocialState } from '../repositories/types'
import type { PresenceService } from './PresenceService'
import { canonicalPair, exactPlayer, isBlocked, publicPlayer } from './social-utils'

export class FriendsService {
  constructor(private readonly repository: SocialRepository, private readonly presence: PresenceService, private readonly now: () => number = Date.now) {}

  async searchExact(viewerId: string, name: string): Promise<SocialPlayer> {
    return this.repository.socialRead((state) => {
      this.player(state, viewerId); const target = exactPlayer(state, name)
      return publicPlayer(state, target.playerId, this.presence)
    })
  }

  async state(playerId: string): Promise<FriendsSnapshot> { return this.repository.socialRead((state) => this.snapshot(state, playerId)) }

  async sendRequest(playerId: string, targetName: string, operationId: string): Promise<FriendsSnapshot> {
    await this.repository.socialTransact(playerId, `friend-request:${playerId}:${operationId}`, 'SEND_FRIEND_REQUEST', (state) => {
      this.player(state, playerId); const target = exactPlayer(state, targetName)
      if (target.playerId === playerId) throw new EconomyError('CANNOT_FRIEND_SELF', 'You cannot friend yourself.')
      if (isBlocked(state, playerId, target.playerId)) throw new EconomyError('PLAYER_BLOCKED', 'Friend request is blocked.')
      if (this.friendship(state, playerId, target.playerId)) throw new EconomyError('ALREADY_FRIENDS', 'Players are already friends.')
      if ([...state.friendRequests.values()].some((value) => value.status === 'PENDING' && ((value.requesterId === playerId && value.receiverId === target.playerId) || (value.requesterId === target.playerId && value.receiverId === playerId)))) throw new EconomyError('FRIEND_REQUEST_EXISTS', 'A friend request is already pending.')
      const id = randomUUID(); state.friendRequests.set(id, { id, requesterId: playerId, receiverId: target.playerId, status: 'PENDING', createdAt: this.now() })
    })
    return this.state(playerId)
  }

  async respond(playerId: string, requestId: string, accept: boolean, operationId: string): Promise<FriendsSnapshot> {
    await this.repository.socialTransact(playerId, `friend-response:${playerId}:${operationId}`, accept ? 'ACCEPT_FRIEND_REQUEST' : 'DECLINE_FRIEND_REQUEST', (state) => {
      const request = state.friendRequests.get(requestId)
      if (!request || request.receiverId !== playerId || request.status !== 'PENDING') throw new EconomyError('FRIEND_REQUEST_NOT_FOUND', 'Pending friend request not found.')
      if (!accept) { request.status = 'DECLINED'; return }
      if (isBlocked(state, request.requesterId, playerId)) throw new EconomyError('PLAYER_BLOCKED', 'Friend request is blocked.')
      request.status = 'ACCEPTED'
      const [low, high] = canonicalPair(request.requesterId, request.receiverId)
      if (!this.friendship(state, low, high)) { const id = randomUUID(); state.friendships.set(id, { id, playerLowId: low, playerHighId: high, createdAt: this.now() }) }
    })
    return this.state(playerId)
  }

  async remove(playerId: string, friendId: string, operationId: string): Promise<FriendsSnapshot> {
    await this.repository.socialTransact(playerId, `friend-remove:${playerId}:${operationId}`, 'REMOVE_FRIEND', (state) => {
      const relationship = this.friendship(state, playerId, friendId)
      if (!relationship) throw new EconomyError('FRIENDSHIP_NOT_FOUND', 'Friendship not found.')
      state.friendships.delete(relationship.id)
    })
    return this.state(playerId)
  }

  async block(playerId: string, targetName: string, operationId: string): Promise<FriendsSnapshot> {
    await this.repository.socialTransact(playerId, `player-block:${playerId}:${operationId}`, 'BLOCK_PLAYER', (state) => {
      const target = exactPlayer(state, targetName)
      if (target.playerId === playerId) throw new EconomyError('CANNOT_BLOCK_SELF', 'You cannot block yourself.')
      state.blocks.set(`${playerId}:${target.playerId}`, { blockerId: playerId, blockedId: target.playerId, createdAt: this.now() })
      const friendship = this.friendship(state, playerId, target.playerId); if (friendship) state.friendships.delete(friendship.id)
      for (const request of state.friendRequests.values()) if (request.status === 'PENDING' && ((request.requesterId === playerId && request.receiverId === target.playerId) || (request.requesterId === target.playerId && request.receiverId === playerId))) request.status = 'CANCELLED'
    })
    return this.state(playerId)
  }

  async unblock(playerId: string, targetId: string, operationId: string): Promise<FriendsSnapshot> {
    await this.repository.socialTransact(playerId, `player-unblock:${playerId}:${operationId}`, 'UNBLOCK_PLAYER', (state) => { state.blocks.delete(`${playerId}:${targetId}`) })
    return this.state(playerId)
  }

  async friendIds(playerId: string): Promise<string[]> { return this.repository.socialRead((state) => [...state.friendships.values()].flatMap((value) => value.playerLowId === playerId ? [value.playerHighId] : value.playerHighId === playerId ? [value.playerLowId] : [])) }

  private snapshot(state: SocialState, playerId: string): FriendsSnapshot {
    this.player(state, playerId)
    const friendIds = [...state.friendships.values()].flatMap((value) => value.playerLowId === playerId ? [value.playerHighId] : value.playerHighId === playerId ? [value.playerLowId] : [])
    const mapRequest = (request: { id: string; requesterId: string; receiverId: string; createdAt: number }, otherId: string) => ({ id: request.id, player: publicPlayer(state, otherId, this.presence), createdAt: request.createdAt })
    return {
      friends: friendIds.map((id) => publicPlayer(state, id, this.presence)).sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name)),
      incoming: [...state.friendRequests.values()].filter((value) => value.receiverId === playerId && value.status === 'PENDING').map((value) => mapRequest(value, value.requesterId)),
      outgoing: [...state.friendRequests.values()].filter((value) => value.requesterId === playerId && value.status === 'PENDING').map((value) => mapRequest(value, value.receiverId)),
      blocked: [...state.blocks.values()].filter((value) => value.blockerId === playerId).map((value) => publicPlayer(state, value.blockedId, this.presence)),
    }
  }

  private friendship(state: SocialState, a: string, b: string) { const [low, high] = canonicalPair(a, b); return [...state.friendships.values()].find((value) => value.playerLowId === low && value.playerHighId === high) }
  private player(state: SocialState, id: string) { const value = state.players.get(id); if (!value) throw new EconomyError('PLAYER_NOT_FOUND', 'Player not found.'); return value }
}
