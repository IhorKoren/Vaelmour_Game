ALTER TYPE "ItemLocation" ADD VALUE IF NOT EXISTS 'MARKET_ESCROW';
ALTER TYPE "ItemLocation" ADD VALUE IF NOT EXISTS 'TRADE_ESCROW';
ALTER TYPE "CoinLedgerReason" ADD VALUE IF NOT EXISTS 'MARKET_BUY_RESERVE';
ALTER TYPE "CoinLedgerReason" ADD VALUE IF NOT EXISTS 'MARKET_BUY_RELEASE';
ALTER TYPE "CoinLedgerReason" ADD VALUE IF NOT EXISTS 'MARKET_BUY';
ALTER TYPE "CoinLedgerReason" ADD VALUE IF NOT EXISTS 'MARKET_SELL';
ALTER TYPE "CoinLedgerReason" ADD VALUE IF NOT EXISTS 'MARKET_BUY_ORDER_FEE';
ALTER TYPE "CoinLedgerReason" ADD VALUE IF NOT EXISTS 'MARKET_TRANSACTION_FEE';
ALTER TYPE "CoinLedgerReason" ADD VALUE IF NOT EXISTS 'DIRECT_TRADE';
ALTER TYPE "CoinLedgerReason" ADD VALUE IF NOT EXISTS 'PARTY_SLOT_RESERVE';
ALTER TYPE "CoinLedgerReason" ADD VALUE IF NOT EXISTS 'PARTY_SLOT_REFUND';
ALTER TYPE "CoinLedgerReason" ADD VALUE IF NOT EXISTS 'PARTY_SLOT_PAYMENT';

CREATE TYPE "MarketSide" AS ENUM ('BUY', 'SELL');
CREATE TYPE "MarketOrderStatus" AS ENUM ('OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED');
CREATE TYPE "DirectTradeStatus" AS ENUM ('REQUESTED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'DECLINED');
CREATE TYPE "PartySlotReservationStatus" AS ENUM ('PRE_START', 'ACCEPTED', 'SETTLED', 'REFUNDED');

ALTER TABLE "players" ADD COLUMN "reserved_coins" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "players" ADD CONSTRAINT "players_reserved_coins_check" CHECK ("reserved_coins" >= 0);

CREATE TABLE "market_orders" (
  "id" UUID NOT NULL,
  "player_id" UUID NOT NULL,
  "item_id" VARCHAR(100) NOT NULL,
  "escrow_item_id" UUID,
  "side" "MarketSide" NOT NULL,
  "price_per_unit" INTEGER NOT NULL,
  "original_quantity" INTEGER NOT NULL,
  "remaining_quantity" INTEGER NOT NULL,
  "reserved_coins" INTEGER NOT NULL DEFAULT 0,
  "status" "MarketOrderStatus" NOT NULL DEFAULT 'OPEN',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "market_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "market_orders_price_check" CHECK ("price_per_unit" > 0),
  CONSTRAINT "market_orders_quantity_check" CHECK ("original_quantity" > 0 AND "remaining_quantity" >= 0 AND "remaining_quantity" <= "original_quantity"),
  CONSTRAINT "market_orders_reserve_check" CHECK ("reserved_coins" >= 0)
);

CREATE TABLE "market_fills" (
  "id" UUID NOT NULL,
  "item_id" VARCHAR(100) NOT NULL,
  "buy_order_id" UUID NOT NULL,
  "sell_order_id" UUID NOT NULL,
  "buyer_id" UUID NOT NULL,
  "seller_id" UUID NOT NULL,
  "unit_price" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "market_fills_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "market_fills_value_check" CHECK ("unit_price" > 0 AND "quantity" > 0)
);

CREATE TABLE "direct_trades" (
  "id" UUID NOT NULL,
  "requester_id" UUID NOT NULL,
  "receiver_id" UUID NOT NULL,
  "status" "DirectTradeStatus" NOT NULL DEFAULT 'REQUESTED',
  "revision" INTEGER NOT NULL DEFAULT 0,
  "requester_confirmed_revision" INTEGER,
  "receiver_confirmed_revision" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "direct_trades_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "direct_trades_participants_check" CHECK ("requester_id" <> "receiver_id"),
  CONSTRAINT "direct_trades_revision_check" CHECK ("revision" >= 0)
);

CREATE TABLE "trade_offer_items" (
  "id" UUID NOT NULL,
  "trade_id" UUID NOT NULL,
  "player_id" UUID NOT NULL,
  "item_entry_id" UUID NOT NULL,
  "item_id" VARCHAR(100) NOT NULL,
  "quantity" INTEGER NOT NULL,
  CONSTRAINT "trade_offer_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trade_offer_items_quantity_check" CHECK ("quantity" > 0)
);

CREATE TABLE "trade_offer_coins" (
  "id" UUID NOT NULL,
  "trade_id" UUID NOT NULL,
  "player_id" UUID NOT NULL,
  "amount" INTEGER NOT NULL,
  CONSTRAINT "trade_offer_coins_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trade_offer_coins_amount_check" CHECK ("amount" >= 0)
);

CREATE TABLE "party_slot_reservations" (
  "id" UUID NOT NULL,
  "room_id" VARCHAR(100) NOT NULL,
  "applicant_id" UUID NOT NULL,
  "leader_id" UUID,
  "amount" INTEGER NOT NULL,
  "status" "PartySlotReservationStatus" NOT NULL DEFAULT 'PRE_START',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "party_slot_reservations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "party_slot_reservations_amount_check" CHECK ("amount" > 0)
);

CREATE UNIQUE INDEX "market_orders_escrow_item_id_key" ON "market_orders"("escrow_item_id");
CREATE INDEX "market_orders_item_id_side_status_price_per_unit_created_at_idx" ON "market_orders"("item_id", "side", "status", "price_per_unit", "created_at");
CREATE INDEX "market_orders_player_id_created_at_idx" ON "market_orders"("player_id", "created_at");
CREATE INDEX "market_fills_item_id_created_at_idx" ON "market_fills"("item_id", "created_at");
CREATE INDEX "market_fills_buyer_id_idx" ON "market_fills"("buyer_id");
CREATE INDEX "market_fills_seller_id_idx" ON "market_fills"("seller_id");
CREATE INDEX "direct_trades_requester_id_status_idx" ON "direct_trades"("requester_id", "status");
CREATE INDEX "direct_trades_receiver_id_status_idx" ON "direct_trades"("receiver_id", "status");
CREATE UNIQUE INDEX "trade_offer_items_item_entry_id_key" ON "trade_offer_items"("item_entry_id");
CREATE INDEX "trade_offer_items_trade_id_player_id_idx" ON "trade_offer_items"("trade_id", "player_id");
CREATE UNIQUE INDEX "trade_offer_coins_trade_id_player_id_key" ON "trade_offer_coins"("trade_id", "player_id");
CREATE UNIQUE INDEX "party_slot_reservations_room_id_applicant_id_key" ON "party_slot_reservations"("room_id", "applicant_id");
CREATE INDEX "party_slot_reservations_applicant_id_status_idx" ON "party_slot_reservations"("applicant_id", "status");
CREATE INDEX "party_slot_reservations_room_id_status_idx" ON "party_slot_reservations"("room_id", "status");
CREATE INDEX "party_slot_reservations_status_expires_at_idx" ON "party_slot_reservations"("status", "expires_at");

ALTER TABLE "market_orders" ADD CONSTRAINT "market_orders_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "market_orders" ADD CONSTRAINT "market_orders_escrow_item_id_fkey" FOREIGN KEY ("escrow_item_id") REFERENCES "item_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "market_fills" ADD CONSTRAINT "market_fills_buy_order_id_fkey" FOREIGN KEY ("buy_order_id") REFERENCES "market_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "market_fills" ADD CONSTRAINT "market_fills_sell_order_id_fkey" FOREIGN KEY ("sell_order_id") REFERENCES "market_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "direct_trades" ADD CONSTRAINT "direct_trades_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "direct_trades" ADD CONSTRAINT "direct_trades_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trade_offer_items" ADD CONSTRAINT "trade_offer_items_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "direct_trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trade_offer_items" ADD CONSTRAINT "trade_offer_items_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trade_offer_items" ADD CONSTRAINT "trade_offer_items_item_entry_id_fkey" FOREIGN KEY ("item_entry_id") REFERENCES "item_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trade_offer_coins" ADD CONSTRAINT "trade_offer_coins_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "direct_trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trade_offer_coins" ADD CONSTRAINT "trade_offer_coins_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "party_slot_reservations" ADD CONSTRAINT "party_slot_reservations_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "party_slot_reservations" ADD CONSTRAINT "party_slot_reservations_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
