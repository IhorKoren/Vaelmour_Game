ALTER TABLE "accounts" ALTER COLUMN "dev_token_hash" DROP NOT NULL;

CREATE TABLE "telegram_identities" (
  "telegram_user_id" VARCHAR(32) PRIMARY KEY,
  "account_id" UUID NOT NULL UNIQUE REFERENCES "accounts"("id") ON DELETE CASCADE,
  "username" VARCHAR(64),
  "first_name" VARCHAR(128),
  "last_name" VARCHAR(128),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "auth_sessions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_hash" CHAR(64) NOT NULL UNIQUE,
  "account_id" UUID NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "auth_sessions_account_id_expires_at_idx" ON "auth_sessions"("account_id", "expires_at");
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");

CREATE TABLE "playtest_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_key" VARCHAR(180) UNIQUE,
  "type" VARCHAR(50) NOT NULL,
  "play_session_id" UUID,
  "expedition_id" UUID,
  "player_id" UUID REFERENCES "players"("id") ON DELETE SET NULL,
  "rift_id" VARCHAR(60),
  "floor" INTEGER,
  "encounter" INTEGER,
  "round" INTEGER,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "playtest_events_type_created_at_idx" ON "playtest_events"("type", "created_at");
CREATE INDEX "playtest_events_expedition_id_created_at_idx" ON "playtest_events"("expedition_id", "created_at");
CREATE INDEX "playtest_events_player_id_created_at_idx" ON "playtest_events"("player_id", "created_at");
CREATE INDEX "playtest_events_rift_id_floor_created_at_idx" ON "playtest_events"("rift_id", "floor", "created_at");

CREATE TABLE "active_expeditions" (
  "expedition_id" UUID PRIMARY KEY,
  "play_session_id" UUID NOT NULL,
  "room_id" VARCHAR(100) NOT NULL UNIQUE,
  "rift_id" VARCHAR(60) NOT NULL,
  "floor" INTEGER NOT NULL,
  "player_ids" JSONB NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at" TIMESTAMP(3)
);
CREATE INDEX "active_expeditions_status_started_at_idx" ON "active_expeditions"("status", "started_at");

CREATE TABLE "interrupted_expedition_notices" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" UUID NOT NULL REFERENCES "players"("id") ON DELETE CASCADE,
  "expedition_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledged_at" TIMESTAMP(3),
  CONSTRAINT "interrupted_expedition_notices_player_id_expedition_id_key" UNIQUE ("player_id", "expedition_id")
);
CREATE INDEX "interrupted_expedition_notices_player_id_acknowledged_at_idx" ON "interrupted_expedition_notices"("player_id", "acknowledged_at");

CREATE TABLE "admin_audit_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "admin_telegram_user_id" VARCHAR(32) NOT NULL,
  "action" VARCHAR(50) NOT NULL,
  "target_player_id" UUID,
  "reason" VARCHAR(100) NOT NULL DEFAULT 'ADMIN',
  "details" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "admin_audit_logs_admin_telegram_user_id_created_at_idx" ON "admin_audit_logs"("admin_telegram_user_id", "created_at");
CREATE INDEX "admin_audit_logs_target_player_id_created_at_idx" ON "admin_audit_logs"("target_player_id", "created_at");
