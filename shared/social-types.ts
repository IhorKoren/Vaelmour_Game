import type { CharacterClass } from '../src/types/game'
import type { ItemCategory } from './game-data/types'

export type GuildRank = 'LEADER' | 'OFFICER' | 'MEMBER' | 'RECRUIT'
export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED'
export type GuildStorageAction = 'DEPOSIT' | 'WITHDRAW'
export type PresenceStatus = 'OFFLINE' | 'CITY' | 'PARTY_LOBBY' | 'RIFT'
export type ChatChannel = 'GLOBAL' | 'GUILD' | 'GROUP' | 'PRIVATE'

export interface SocialPlayer {
  playerId: string
  name: string
  classId: CharacterClass
  level: number
  attack: number
  maxHP: number
  guildId: string | null
  status: PresenceStatus
  online: boolean
}

export interface GuildRecord {
  id: string
  name: string
  nameKey: string
  tag: string
  tagKey: string
  description: string
  messageOfTheDay: string
  leaderPlayerId: string
  createdAt: number
  updatedAt: number
}

export interface GuildMemberRecord { guildId: string; playerId: string; rank: GuildRank; joinedAt: number }
export interface GuildApplicationRecord { id: string; guildId: string; playerId: string; message?: string; status: RequestStatus; createdAt: number }
export interface GuildInviteRecord { id: string; guildId: string; playerId: string; invitedByPlayerId: string; status: RequestStatus; createdAt: number; expiresAt?: number }
export interface GuildPermissionRecord { guildId: string; rank: GuildRank; canDeposit: boolean; canWithdraw: boolean }

export interface GuildStorageItem {
  id: string
  guildId: string
  itemId: string
  quantity: number
  createdAt: number
  updatedAt: number
}

export interface GuildStorageLogRecord {
  id: string
  guildId: string
  playerId: string
  action: GuildStorageAction
  itemId: string
  itemEntryId?: string
  quantity: number
  createdAt: number
}

export interface FriendRequestRecord { id: string; requesterId: string; receiverId: string; status: RequestStatus; createdAt: number }
export interface FriendshipRecord { id: string; playerLowId: string; playerHighId: string; createdAt: number }
export interface PlayerBlockRecord { blockerId: string; blockedId: string; createdAt: number }
export interface PrivateConversationRecord { id: string; playerLowId: string; playerHighId: string; createdAt: number; updatedAt: number }

export interface PersistentChatMessage {
  id: string
  channel: ChatChannel
  senderId: string
  senderName: string
  text: string
  guildId?: string
  roomId?: string
  conversationId?: string
  createdAt: number
}

export interface ChatReadRecord { playerId: string; channelKey: string; lastReadAt: number }

export interface GuildListItem { id: string; name: string; tag: string; description: string; memberCount: number; maxMembers: number }
export interface GuildMemberView extends SocialPlayer { rank: GuildRank; joinedAt: number }
export interface GuildApplicationView { id: string; message?: string; createdAt: number; player: SocialPlayer }
export interface GuildInviteView { id: string; guild: GuildListItem; invitedByName: string; createdAt: number; expiresAt?: number }
export interface GuildPermissionView { rank: GuildRank; canDeposit: boolean; canWithdraw: boolean }

export interface GuildSnapshot {
  guild: { id: string; name: string; tag: string; description: string; messageOfTheDay: string; leaderPlayerId: string; memberCount: number; maxMembers: number; onlineCount: number } | null
  selfRank: GuildRank | null
  members: GuildMemberView[]
  applications: GuildApplicationView[]
  invites: GuildInviteView[]
  permissions: GuildPermissionView[]
}

export interface GuildStorageItemView extends GuildStorageItem { name: string; icon: string; category: ItemCategory; attack?: number; hp?: number }
export interface GuildStorageLogView extends GuildStorageLogRecord { playerName: string; itemName: string }
export interface GuildStorageSnapshot { items: GuildStorageItemView[]; canDeposit: boolean; canWithdraw: boolean }

export interface FriendsSnapshot {
  friends: SocialPlayer[]
  incoming: Array<{ id: string; player: SocialPlayer; createdAt: number }>
  outgoing: Array<{ id: string; player: SocialPlayer; createdAt: number }>
  blocked: SocialPlayer[]
}

export interface ChatHistorySnapshot {
  channel: ChatChannel
  key: string
  messages: PersistentChatMessage[]
  nextCursor: string | null
}

export interface PrivateConversationView {
  id: string
  other: SocialPlayer
  lastMessage: PersistentChatMessage | null
  unread: number
}

export interface UnreadSnapshot { guild: number; private: number }
