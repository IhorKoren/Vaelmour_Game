CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "CharacterClass" AS ENUM ('warrior', 'ranger', 'blacksmith', 'alchemist', 'jeweler');
CREATE TYPE "ItemLocation" AS ENUM ('INVENTORY', 'STORAGE', 'EQUIPPED');
CREATE TYPE "EquipmentSlot" AS ENUM ('weapon', 'head', 'chest', 'hands', 'legs', 'feet', 'ring1', 'ring2', 'amulet');
CREATE TYPE "CoinLedgerReason" AS ENUM ('RIFT_REWARD', 'CRAFT_FEE', 'AUCTION_BUY', 'AUCTION_SELL', 'TRADE', 'PARTY_SLOT', 'ADMIN');

CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "dev_token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "players" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "name" VARCHAR(18) NOT NULL,
    "class_id" "CharacterClass" NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "current_xp" INTEGER NOT NULL DEFAULT 0,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "players_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "players_level_check" CHECK ("level" >= 1),
    CONSTRAINT "players_xp_check" CHECK ("current_xp" >= 0),
    CONSTRAINT "players_coins_check" CHECK ("coins" >= 0)
);

CREATE TABLE "item_entries" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "item_id" VARCHAR(100) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "location" "ItemLocation" NOT NULL,
    "equipment_slot" "EquipmentSlot",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "item_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "item_entries_quantity_check" CHECK ("quantity" > 0),
    CONSTRAINT "item_entries_equipment_state_check" CHECK (("location" = 'EQUIPPED' AND "equipment_slot" IS NOT NULL) OR ("location" <> 'EQUIPPED' AND "equipment_slot" IS NULL))
);

CREATE TABLE "learned_recipes" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "recipe_id" VARCHAR(100) NOT NULL,
    "learned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "learned_recipes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "coin_ledger" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "resulting_balance" INTEGER NOT NULL,
    "reason" "CoinLedgerReason" NOT NULL,
    "reference_id" VARCHAR(150),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "coin_ledger_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "coin_ledger_balance_check" CHECK ("resulting_balance" >= 0)
);

CREATE TABLE "economy_operations" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "operation_key" VARCHAR(200) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "reference_id" VARCHAR(150),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "economy_operations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "accounts_dev_token_hash_key" ON "accounts"("dev_token_hash");
CREATE UNIQUE INDEX "players_account_id_key" ON "players"("account_id");
CREATE INDEX "players_account_id_idx" ON "players"("account_id");
CREATE INDEX "item_entries_player_id_location_idx" ON "item_entries"("player_id", "location");
CREATE INDEX "item_entries_player_id_item_id_idx" ON "item_entries"("player_id", "item_id");
CREATE UNIQUE INDEX "item_entries_player_id_equipment_slot_key" ON "item_entries"("player_id", "equipment_slot");
CREATE INDEX "learned_recipes_player_id_idx" ON "learned_recipes"("player_id");
CREATE UNIQUE INDEX "learned_recipes_player_id_recipe_id_key" ON "learned_recipes"("player_id", "recipe_id");
CREATE INDEX "coin_ledger_player_id_created_at_idx" ON "coin_ledger"("player_id", "created_at");
CREATE UNIQUE INDEX "coin_ledger_player_id_reason_reference_id_key" ON "coin_ledger"("player_id", "reason", "reference_id");
CREATE UNIQUE INDEX "economy_operations_operation_key_key" ON "economy_operations"("operation_key");
CREATE INDEX "economy_operations_player_id_type_idx" ON "economy_operations"("player_id", "type");

ALTER TABLE "players" ADD CONSTRAINT "players_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "item_entries" ADD CONSTRAINT "item_entries_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "learned_recipes" ADD CONSTRAINT "learned_recipes_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "coin_ledger" ADD CONSTRAINT "coin_ledger_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "economy_operations" ADD CONSTRAINT "economy_operations_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
