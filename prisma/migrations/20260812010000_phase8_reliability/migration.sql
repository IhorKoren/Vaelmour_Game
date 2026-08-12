ALTER TABLE "players" ADD COLUMN "name_key" VARCHAR(64);
UPDATE "players" SET "name_key" = lower(normalize(btrim("name"), NFKC));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "players" GROUP BY "name_key" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate normalized player names must be resolved before this migration';
  END IF;
END $$;

ALTER TABLE "players" ALTER COLUMN "name_key" SET NOT NULL;
CREATE UNIQUE INDEX "players_name_key_key" ON "players"("name_key");
