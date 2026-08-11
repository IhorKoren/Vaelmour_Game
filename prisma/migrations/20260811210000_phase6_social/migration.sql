ALTER TYPE "CoinLedgerReason" ADD VALUE IF NOT EXISTS 'GUILD_CREATION';

CREATE TYPE "GuildRank" AS ENUM ('LEADER', 'OFFICER', 'MEMBER', 'RECRUIT');
CREATE TYPE "SocialRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');
CREATE TYPE "GuildStorageAction" AS ENUM ('DEPOSIT', 'WITHDRAW');
CREATE TYPE "ChatChannel" AS ENUM ('GLOBAL', 'GUILD', 'GROUP', 'PRIVATE');

CREATE TABLE "guilds" (
  "id" UUID NOT NULL,
  "name" VARCHAR(40) NOT NULL,
  "name_key" VARCHAR(40) NOT NULL,
  "tag" VARCHAR(8) NOT NULL,
  "tag_key" VARCHAR(8) NOT NULL,
  "description" VARCHAR(500) NOT NULL DEFAULT '',
  "message_of_the_day" VARCHAR(300) NOT NULL DEFAULT '',
  "leader_player_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "guilds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "guild_members" (
  "guild_id" UUID NOT NULL,
  "player_id" UUID NOT NULL,
  "rank" "GuildRank" NOT NULL DEFAULT 'RECRUIT',
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "guild_members_pkey" PRIMARY KEY ("guild_id", "player_id")
);

CREATE TABLE "guild_applications" (
  "id" UUID NOT NULL,
  "guild_id" UUID NOT NULL,
  "player_id" UUID NOT NULL,
  "message" VARCHAR(200),
  "status" "SocialRequestStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "guild_applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "guild_invites" (
  "id" UUID NOT NULL,
  "guild_id" UUID NOT NULL,
  "player_id" UUID NOT NULL,
  "invited_by_player_id" UUID NOT NULL,
  "status" "SocialRequestStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3),
  CONSTRAINT "guild_invites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "guild_rank_permissions" (
  "guild_id" UUID NOT NULL,
  "rank" "GuildRank" NOT NULL,
  "can_deposit" BOOLEAN NOT NULL DEFAULT true,
  "can_withdraw" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "guild_rank_permissions_pkey" PRIMARY KEY ("guild_id", "rank")
);

CREATE TABLE "guild_storage_items" (
  "id" UUID NOT NULL,
  "guild_id" UUID NOT NULL,
  "item_id" VARCHAR(100) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "guild_storage_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "guild_storage_items_quantity_check" CHECK ("quantity" > 0)
);

CREATE TABLE "guild_storage_logs" (
  "id" UUID NOT NULL,
  "guild_id" UUID NOT NULL,
  "player_id" UUID NOT NULL,
  "action" "GuildStorageAction" NOT NULL,
  "item_id" VARCHAR(100) NOT NULL,
  "item_entry_id" UUID,
  "quantity" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "guild_storage_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "guild_storage_logs_quantity_check" CHECK ("quantity" > 0)
);

CREATE TABLE "friend_requests" (
  "id" UUID NOT NULL,
  "requester_id" UUID NOT NULL,
  "receiver_id" UUID NOT NULL,
  "status" "SocialRequestStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "friend_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "friend_requests_distinct_players_check" CHECK ("requester_id" <> "receiver_id")
);

CREATE TABLE "friendships" (
  "id" UUID NOT NULL,
  "player_low_id" UUID NOT NULL,
  "player_high_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "friendships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "friendships_canonical_order_check" CHECK ("player_low_id" < "player_high_id")
);

CREATE TABLE "player_blocks" (
  "blocker_id" UUID NOT NULL,
  "blocked_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "player_blocks_pkey" PRIMARY KEY ("blocker_id", "blocked_id"),
  CONSTRAINT "player_blocks_distinct_players_check" CHECK ("blocker_id" <> "blocked_id")
);

CREATE TABLE "private_conversations" (
  "id" UUID NOT NULL,
  "player_low_id" UUID NOT NULL,
  "player_high_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "private_conversations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "private_conversations_canonical_order_check" CHECK ("player_low_id" < "player_high_id")
);

CREATE TABLE "social_chat_messages" (
  "id" UUID NOT NULL,
  "channel" "ChatChannel" NOT NULL,
  "sender_id" UUID NOT NULL,
  "sender_name" VARCHAR(18) NOT NULL,
  "text" VARCHAR(300) NOT NULL,
  "guild_id" UUID,
  "room_id" VARCHAR(100),
  "conversation_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "social_chat_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "social_chat_messages_text_check" CHECK (length(btrim("text")) BETWEEN 1 AND 300),
  CONSTRAINT "social_chat_messages_scope_check" CHECK (
    ("channel" = 'GLOBAL' AND "guild_id" IS NULL AND "room_id" IS NULL AND "conversation_id" IS NULL) OR
    ("channel" = 'GUILD' AND "guild_id" IS NOT NULL AND "room_id" IS NULL AND "conversation_id" IS NULL) OR
    ("channel" = 'GROUP' AND "guild_id" IS NULL AND "room_id" IS NOT NULL AND "conversation_id" IS NULL) OR
    ("channel" = 'PRIVATE' AND "guild_id" IS NULL AND "room_id" IS NULL AND "conversation_id" IS NOT NULL)
  )
);

CREATE TABLE "chat_read_states" (
  "player_id" UUID NOT NULL,
  "channel_key" VARCHAR(120) NOT NULL,
  "last_read_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "chat_read_states_pkey" PRIMARY KEY ("player_id", "channel_key")
);

CREATE UNIQUE INDEX "guilds_name_key_key" ON "guilds"("name_key");
CREATE UNIQUE INDEX "guilds_tag_key_key" ON "guilds"("tag_key");
CREATE UNIQUE INDEX "guilds_leader_player_id_key" ON "guilds"("leader_player_id");
CREATE INDEX "guilds_created_at_idx" ON "guilds"("created_at");
CREATE UNIQUE INDEX "guild_members_player_id_key" ON "guild_members"("player_id");
CREATE INDEX "guild_members_guild_id_rank_idx" ON "guild_members"("guild_id", "rank");
CREATE UNIQUE INDEX "guild_applications_guild_id_player_id_key" ON "guild_applications"("guild_id", "player_id");
CREATE INDEX "guild_applications_guild_id_status_created_at_idx" ON "guild_applications"("guild_id", "status", "created_at");
CREATE INDEX "guild_applications_player_id_status_idx" ON "guild_applications"("player_id", "status");
CREATE INDEX "guild_invites_guild_id_status_created_at_idx" ON "guild_invites"("guild_id", "status", "created_at");
CREATE INDEX "guild_invites_player_id_status_created_at_idx" ON "guild_invites"("player_id", "status", "created_at");
CREATE INDEX "guild_storage_items_guild_id_item_id_idx" ON "guild_storage_items"("guild_id", "item_id");
CREATE INDEX "guild_storage_logs_guild_id_created_at_idx" ON "guild_storage_logs"("guild_id", "created_at");
CREATE INDEX "guild_storage_logs_player_id_created_at_idx" ON "guild_storage_logs"("player_id", "created_at");
CREATE INDEX "friend_requests_requester_id_status_idx" ON "friend_requests"("requester_id", "status");
CREATE INDEX "friend_requests_receiver_id_status_created_at_idx" ON "friend_requests"("receiver_id", "status", "created_at");
CREATE UNIQUE INDEX "friendships_player_low_id_player_high_id_key" ON "friendships"("player_low_id", "player_high_id");
CREATE INDEX "friendships_player_low_id_idx" ON "friendships"("player_low_id");
CREATE INDEX "friendships_player_high_id_idx" ON "friendships"("player_high_id");
CREATE INDEX "player_blocks_blocked_id_idx" ON "player_blocks"("blocked_id");
CREATE UNIQUE INDEX "private_conversations_player_low_id_player_high_id_key" ON "private_conversations"("player_low_id", "player_high_id");
CREATE INDEX "private_conversations_player_low_id_updated_at_idx" ON "private_conversations"("player_low_id", "updated_at");
CREATE INDEX "private_conversations_player_high_id_updated_at_idx" ON "private_conversations"("player_high_id", "updated_at");
CREATE INDEX "social_chat_messages_channel_created_at_idx" ON "social_chat_messages"("channel", "created_at");
CREATE INDEX "social_chat_messages_guild_id_created_at_idx" ON "social_chat_messages"("guild_id", "created_at");
CREATE INDEX "social_chat_messages_room_id_created_at_idx" ON "social_chat_messages"("room_id", "created_at");
CREATE INDEX "social_chat_messages_conversation_id_created_at_idx" ON "social_chat_messages"("conversation_id", "created_at");

ALTER TABLE "guilds" ADD CONSTRAINT "guilds_leader_player_id_fkey" FOREIGN KEY ("leader_player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guild_applications" ADD CONSTRAINT "guild_applications_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guild_applications" ADD CONSTRAINT "guild_applications_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guild_invites" ADD CONSTRAINT "guild_invites_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guild_invites" ADD CONSTRAINT "guild_invites_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guild_invites" ADD CONSTRAINT "guild_invites_invited_by_player_id_fkey" FOREIGN KEY ("invited_by_player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guild_rank_permissions" ADD CONSTRAINT "guild_rank_permissions_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guild_storage_items" ADD CONSTRAINT "guild_storage_items_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guild_storage_logs" ADD CONSTRAINT "guild_storage_logs_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guild_storage_logs" ADD CONSTRAINT "guild_storage_logs_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_player_low_id_fkey" FOREIGN KEY ("player_low_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_player_high_id_fkey" FOREIGN KEY ("player_high_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "player_blocks" ADD CONSTRAINT "player_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "player_blocks" ADD CONSTRAINT "player_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "private_conversations" ADD CONSTRAINT "private_conversations_player_low_id_fkey" FOREIGN KEY ("player_low_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "private_conversations" ADD CONSTRAINT "private_conversations_player_high_id_fkey" FOREIGN KEY ("player_high_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "social_chat_messages" ADD CONSTRAINT "social_chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "social_chat_messages" ADD CONSTRAINT "social_chat_messages_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "social_chat_messages" ADD CONSTRAINT "social_chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "private_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_read_states" ADD CONSTRAINT "chat_read_states_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
