import type { InventoryEntry, ItemCategory } from './game-data/types'

export type MarketSide = 'BUY' | 'SELL'
export type MarketOrderStatus = 'OPEN' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED'
export type DirectTradeStatus = 'REQUESTED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'DECLINED'
export type PartySlotReservationStatus = 'PRE_START' | 'ACCEPTED' | 'SETTLED' | 'REFUNDED'
export type EscrowLocation = 'MARKET_ESCROW' | 'TRADE_ESCROW'

export interface ReservedItemEntry extends InventoryEntry {
  location: EscrowLocation
}

export interface MarketOrder {
  id: string
  playerId: string
  itemId: string
  escrowItemId?: string
  side: MarketSide
  pricePerUnit: number
  originalQuantity: number
  remainingQuantity: number
  reservedCoins: number
  status: MarketOrderStatus
  createdAt: number
  updatedAt: number
}

export interface MarketFill {
  id: string
  itemId: string
  buyOrderId: string
  sellOrderId: string
  buyerId: string
  sellerId: string
  unitPrice: number
  quantity: number
  createdAt: number
}

export interface TradeOfferItem {
  id: string
  tradeId: string
  playerId: string
  itemEntryId: string
  itemId: string
  quantity: number
}

export interface DirectTrade {
  id: string
  requesterId: string
  receiverId: string
  status: DirectTradeStatus
  revision: number
  requesterConfirmedRevision: number | null
  receiverConfirmedRevision: number | null
  items: TradeOfferItem[]
  coins: Record<string, number>
  createdAt: number
  updatedAt: number
}

export interface PartySlotReservation {
  id: string
  roomId: string
  applicantId: string
  leaderId: string | null
  amount: number
  status: PartySlotReservationStatus
  expiresAt: number
  createdAt: number
  updatedAt: number
}

export interface MarketBookOrder extends MarketOrder {
  playerName: string
}

export interface MarketItemSummary {
  itemId: string
  name: string
  category: ItemCategory
  icon: string
  lowestSell: number | null
  highestBuy: number | null
  sellQuantity: number
  buyQuantity: number
}

export interface MarketSnapshot {
  items: MarketItemSummary[]
  selectedItemId: string | null
  sellOrders: MarketBookOrder[]
  buyOrders: MarketBookOrder[]
  recentFills: MarketFill[]
  myOrders: MarketOrder[]
}

export interface TradeSnapshot {
  id: string
  requesterId: string
  receiverId: string
  requesterName: string
  receiverName: string
  status: DirectTradeStatus
  revision: number
  requesterConfirmed: boolean
  receiverConfirmed: boolean
  offers: Record<string, { items: InventoryEntry[]; coins: number }>
  updatedAt: number
}
