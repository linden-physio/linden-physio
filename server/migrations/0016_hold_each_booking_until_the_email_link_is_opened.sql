ALTER TABLE "bookings" ADD COLUMN "confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "held_until" timestamp with time zone;--> statement-breakpoint
-- The bookings made before holds were real bookings: they count as confirmed.
UPDATE "bookings" SET "confirmed_at" = now();
