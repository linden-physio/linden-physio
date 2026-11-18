CREATE TABLE "deposits" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"booking_id" integer,
	"payment_intent" text NOT NULL,
	"amount_ore" integer NOT NULL,
	"received_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "deposit_sek" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Karin's deposit: 200 kr for every visit at Linden. Birch takes none.
UPDATE "services" SET "deposit_sek" = 200 WHERE "business_id" = 'linden';--> statement-breakpoint
-- Kept to its business by Postgres, like the other tables (0015).
GRANT SELECT, INSERT, UPDATE, DELETE ON "deposits" TO clinic_app;--> statement-breakpoint
GRANT USAGE ON SEQUENCE "deposits_id_seq" TO clinic_app;--> statement-breakpoint
ALTER TABLE "deposits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "own_business" ON "deposits" TO clinic_app
	USING ("business_id" = current_setting('app.business', true))
	WITH CHECK ("business_id" = current_setting('app.business', true));
