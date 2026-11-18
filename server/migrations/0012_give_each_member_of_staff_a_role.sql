ALTER TABLE "staff" ADD COLUMN "role" text DEFAULT 'physio' NOT NULL;--> statement-breakpoint
-- The role of the clinic's owner, Karin Holm (id 1, as the seed makes her).
UPDATE "staff" SET "role" = 'owner' WHERE "id" = 1;