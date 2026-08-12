CREATE TYPE "Profession" AS ENUM ('blacksmith', 'alchemist', 'jeweler');
CREATE TYPE "ProfessionJobStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'COLLECTED');

CREATE TABLE "profession_progress" (
  "player_id" UUID NOT NULL,
  "profession" "Profession" NOT NULL,
  "level" INTEGER NOT NULL DEFAULT 1,
  "xp" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "profession_progress_pkey" PRIMARY KEY ("player_id"),
  CONSTRAINT "profession_progress_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "profession_jobs" (
  "id" UUID NOT NULL,
  "player_id" UUID NOT NULL,
  "active_player_key" UUID,
  "profession" "Profession" NOT NULL,
  "activity_id" VARCHAR(100) NOT NULL,
  "resource_id" VARCHAR(100) NOT NULL,
  "tier" INTEGER NOT NULL,
  "duration_minutes" INTEGER NOT NULL,
  "started_at" TIMESTAMP(3) NOT NULL,
  "completes_at" TIMESTAMP(3) NOT NULL,
  "status" "ProfessionJobStatus" NOT NULL DEFAULT 'ACTIVE',
  "planned_quantity" INTEGER NOT NULL,
  "planned_xp" INTEGER NOT NULL,
  "cancelled_at" TIMESTAMP(3),
  "collected_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "profession_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "profession_jobs_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "profession_jobs_active_player_key_key" ON "profession_jobs"("active_player_key");
CREATE INDEX "profession_jobs_player_id_created_at_idx" ON "profession_jobs"("player_id", "created_at");
CREATE INDEX "profession_jobs_status_completes_at_idx" ON "profession_jobs"("status", "completes_at");
