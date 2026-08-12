import type { ClientMessage } from '../../shared/protocol'

const TYPES = new Set<ClientMessage['type']>([
  'HELLO','LIST_PARTIES','CREATE_PARTY','APPLY_TO_PARTY','CANCEL_APPLICATION','ACCEPT_APPLICATION','REJECT_APPLICATION','LEAVE_PARTY','SET_READY','START_EXPEDITION','SELECT_RIFT_FLOOR','SUBMIT_ACTION','SET_AUTO_BATTLE','POST_ENCOUNTER_VOTE','PARTY_CHAT_MESSAGE','GET_CHARACTER_STATE','EQUIP_ITEM','UNEQUIP_ITEM','MOVE_TO_STORAGE','MOVE_FROM_STORAGE','LEARN_RECIPE','CRAFT_ITEM','GET_MARKET','GET_MY_ORDERS','CREATE_SELL_ORDER','CREATE_BUY_ORDER','CANCEL_MARKET_ORDER','BUY_NOW','SELL_NOW','REQUEST_TRADE','ACCEPT_TRADE','DECLINE_TRADE','UPDATE_TRADE_OFFER','CONFIRM_TRADE','CANCEL_TRADE','GET_GUILD_STATE','SEARCH_GUILDS','CREATE_GUILD','APPLY_TO_GUILD','CANCEL_GUILD_APPLICATION','ACCEPT_GUILD_APPLICATION','REJECT_GUILD_APPLICATION','INVITE_TO_GUILD','ACCEPT_GUILD_INVITE','DECLINE_GUILD_INVITE','LEAVE_GUILD','KICK_GUILD_MEMBER','SET_GUILD_RANK','TRANSFER_GUILD_LEADERSHIP','UPDATE_GUILD','UPDATE_GUILD_PERMISSIONS','DISBAND_GUILD','GET_GUILD_STORAGE','DEPOSIT_GUILD_STORAGE','WITHDRAW_GUILD_STORAGE','GET_GUILD_STORAGE_HISTORY','SEARCH_PLAYER','GET_FRIENDS_STATE','SEND_FRIEND_REQUEST','ACCEPT_FRIEND_REQUEST','DECLINE_FRIEND_REQUEST','REMOVE_FRIEND','BLOCK_PLAYER','UNBLOCK_PLAYER','SEND_CHAT_MESSAGE','GET_CHAT_HISTORY','GET_PRIVATE_CONVERSATIONS','INVITE_TO_PARTY',
])
const NO_PAYLOAD = new Set(['LIST_PARTIES','CREATE_PARTY','LEAVE_PARTY','START_EXPEDITION','GET_CHARACTER_STATE','GET_MY_ORDERS','GET_GUILD_STATE','GET_GUILD_STORAGE','GET_FRIENDS_STATE','GET_PRIVATE_CONVERSATIONS'])
const STRING_FIELDS: Record<string, string[]> = {
  APPLY_TO_PARTY:['partyId','operationId'], CANCEL_APPLICATION:['partyId'], ACCEPT_APPLICATION:['applicantId'], REJECT_APPLICATION:['applicantId'],
  EQUIP_ITEM:['entryId','operationId'], UNEQUIP_ITEM:['slot','operationId'], MOVE_TO_STORAGE:['entryId','operationId'], MOVE_FROM_STORAGE:['entryId','operationId'], LEARN_RECIPE:['entryId','operationId'], CRAFT_ITEM:['recipeId','operationId'],
  CREATE_SELL_ORDER:['entryId','operationId'], CREATE_BUY_ORDER:['itemId','operationId'], CANCEL_MARKET_ORDER:['orderId','operationId'], BUY_NOW:['itemId','operationId'], SELL_NOW:['entryId','operationId'],
  REQUEST_TRADE:['receiverName','operationId'], ACCEPT_TRADE:['tradeId','operationId'], DECLINE_TRADE:['tradeId','operationId'], UPDATE_TRADE_OFFER:['tradeId','operationId'], CONFIRM_TRADE:['tradeId','operationId'], CANCEL_TRADE:['tradeId','operationId'],
  CREATE_GUILD:['name','tag','operationId'], APPLY_TO_GUILD:['guildId','operationId'], CANCEL_GUILD_APPLICATION:['applicationId','operationId'], ACCEPT_GUILD_APPLICATION:['applicationId','operationId'], REJECT_GUILD_APPLICATION:['applicationId','operationId'], INVITE_TO_GUILD:['playerName','operationId'], ACCEPT_GUILD_INVITE:['inviteId','operationId'], DECLINE_GUILD_INVITE:['inviteId','operationId'], LEAVE_GUILD:['operationId'], KICK_GUILD_MEMBER:['playerId','operationId'], SET_GUILD_RANK:['playerId','rank','operationId'], TRANSFER_GUILD_LEADERSHIP:['playerId','operationId'], UPDATE_GUILD:['operationId'], UPDATE_GUILD_PERMISSIONS:['rank','operationId'], DISBAND_GUILD:['operationId'], DEPOSIT_GUILD_STORAGE:['entryId','operationId'], WITHDRAW_GUILD_STORAGE:['storageItemId','operationId'],
  SEARCH_PLAYER:['name'], SEND_FRIEND_REQUEST:['playerName','operationId'], ACCEPT_FRIEND_REQUEST:['requestId','operationId'], DECLINE_FRIEND_REQUEST:['requestId','operationId'], REMOVE_FRIEND:['playerId','operationId'], BLOCK_PLAYER:['playerName','operationId'], UNBLOCK_PLAYER:['playerId','operationId'], SEND_CHAT_MESSAGE:['channel','text','operationId'], GET_CHAT_HISTORY:['channel'], INVITE_TO_PARTY:['playerId'], PARTY_CHAT_MESSAGE:['message'],
  SELECT_RIFT_FLOOR:['riftId'],
}
const POSITIVE_INT_FIELDS: Record<string, string[]> = { CREATE_SELL_ORDER:['quantity','pricePerUnit'], CREATE_BUY_ORDER:['quantity','pricePerUnit'], BUY_NOW:['quantity'], SELL_NOW:['quantity'], SELECT_RIFT_FLOOR:['floorNumber'], SUBMIT_ACTION:['round'] }

function object(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value) }
function validString(value: unknown, max = 100): value is string { return typeof value === 'string' && value.length > 0 && value.length <= max }
function optionalString(payload: Record<string, unknown>, key: string, max: number): boolean { return payload[key] === undefined || (typeof payload[key] === 'string' && (payload[key] as string).length <= max) }

export function validateClientMessage(value: unknown): ClientMessage | null {
  if (!object(value) || !validString(value.type, 60) || !TYPES.has(value.type as ClientMessage['type'])) return null
  const type = value.type
  if (NO_PAYLOAD.has(type)) return value.payload === undefined ? value as ClientMessage : null
  if ((type === 'GET_MARKET' || type === 'SEARCH_GUILDS' || type === 'GET_GUILD_STORAGE_HISTORY') && value.payload === undefined) return value as ClientMessage
  if (!object(value.payload)) return null
  const payload = value.payload
  if ((STRING_FIELDS[type] ?? []).some((field) => !validString(payload[field], field === 'text' || field === 'message' ? 300 : 100))) return null
  if ((POSITIVE_INT_FIELDS[type] ?? []).some((field) => !Number.isSafeInteger(payload[field]) || Number(payload[field]) <= 0)) return null
  if (payload.operationId !== undefined && !validString(payload.operationId, 100)) return null
  if (payload.quantity !== undefined && (!Number.isSafeInteger(payload.quantity) || Number(payload.quantity) <= 0 || Number(payload.quantity) > 1_000_000)) return null
  if (payload.pricePerUnit !== undefined && (!Number.isSafeInteger(payload.pricePerUnit) || Number(payload.pricePerUnit) <= 0 || Number(payload.pricePerUnit) > 1_000_000_000)) return null
  if (payload.slotOfferCoins !== undefined && (!Number.isSafeInteger(payload.slotOfferCoins) || Number(payload.slotOfferCoins) < 0 || Number(payload.slotOfferCoins) > 1_000_000_000)) return null
  if (payload.floorNumber !== undefined && (!Number.isSafeInteger(payload.floorNumber) || Number(payload.floorNumber) < 1 || Number(payload.floorNumber) > 3)) return null
  if (payload.limit !== undefined && (!Number.isSafeInteger(payload.limit) || Number(payload.limit) < 1 || Number(payload.limit) > 100)) return null
  if (type === 'HELLO') {
    const session = payload.sessionToken
    const dev = payload.playerId
    if (!(validString(session, 500) || validString(dev, 100))) return null
  }
  if (type === 'SET_READY' && typeof payload.ready !== 'boolean') return null
  if (type === 'SET_AUTO_BATTLE' && typeof payload.enabled !== 'boolean') return null
  if (type === 'DISBAND_GUILD' && typeof payload.confirmed !== 'boolean') return null
  if (type === 'POST_ENCOUNTER_VOTE' && payload.vote !== 'CONTINUE' && payload.vote !== 'EXIT') return null
  if (type === 'SUBMIT_ACTION') {
    if (!['head','body','legs'].includes(String(payload.defendZone)) || (payload.attackZone !== undefined && !['head','body','legs'].includes(String(payload.attackZone))) || typeof payload.usePotion !== 'boolean' || !optionalString(payload, 'potionItemId', 100)) return null
  }
  if (type === 'UPDATE_TRADE_OFFER') {
    if (!Array.isArray(payload.items) || payload.items.length > 20 || !Number.isSafeInteger(payload.coins) || Number(payload.coins) < 0) return null
    if (payload.items.some((item) => !object(item) || !validString(item.entryId, 100) || !Number.isSafeInteger(item.quantity) || Number(item.quantity) <= 0)) return null
  }
  if (type === 'CONFIRM_TRADE' && (!Number.isSafeInteger(payload.revision) || Number(payload.revision) < 0)) return null
  if (type === 'SEND_CHAT_MESSAGE' && !['GLOBAL','GUILD','PRIVATE'].includes(String(payload.channel))) return null
  if (type === 'GET_CHAT_HISTORY' && !['GLOBAL','GUILD','PRIVATE'].includes(String(payload.channel))) return null
  if ((type === 'EQUIP_ITEM' || type === 'UNEQUIP_ITEM') && payload.slot !== undefined && !['weapon','head','chest','hands','legs','feet','ring1','ring2','amulet'].includes(String(payload.slot))) return null
  if (type === 'SET_GUILD_RANK' && !['OFFICER','MEMBER','RECRUIT'].includes(String(payload.rank))) return null
  if (type === 'UPDATE_GUILD_PERMISSIONS' && (!['OFFICER','MEMBER','RECRUIT'].includes(String(payload.rank)) || typeof payload.canDeposit !== 'boolean' || typeof payload.canWithdraw !== 'boolean')) return null
  if (!optionalString(payload, 'targetName', 18) || !optionalString(payload, 'conversationId', 100) || !optionalString(payload, 'beforeMessageId', 100) || !optionalString(payload, 'description', 500) || !optionalString(payload, 'messageOfTheDay', 300) || !optionalString(payload, 'message', 300) || !optionalString(payload, 'itemId', 100)) return null
  return value as ClientMessage
}
