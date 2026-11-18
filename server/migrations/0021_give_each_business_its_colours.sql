ALTER TABLE "businesses" ADD COLUMN "colours" text[] DEFAULT '{"#23614a","#2f7d5b","#eaf4ef"}' NOT NULL;--> statement-breakpoint
-- Birch has worn Linden's green since film 42. Its own: the brown of birch bark.
UPDATE "businesses" SET "colours" = '{"#7a4a2a","#9a5f36","#f6eee7"}' WHERE "id" = 'birch';
