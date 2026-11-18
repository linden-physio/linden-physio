ALTER TABLE "businesses" ADD COLUMN "staff_sign_in" text DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "line" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- What the booking page said about each of Linden's services, and their order, from src/services.ts.
UPDATE "services" SET "line" = 'A full assessment and a plan for your treatment.', "position" = 1 WHERE "id" = 'first-visit';--> statement-breakpoint
UPDATE "services" SET "line" = 'We check your progress and adjust your exercises.', "position" = 2 WHERE "id" = 'follow-up';--> statement-breakpoint
UPDATE "services" SET "line" = 'Deep work on tight or overworked muscles.', "position" = 3 WHERE "id" = 'sports-massage';--> statement-breakpoint
UPDATE "businesses" SET "staff_sign_in" = 'microsoft' WHERE "id" = 'linden';
