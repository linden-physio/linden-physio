CREATE TABLE "provider_events" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"type" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "provider_events" ADD CONSTRAINT "provider_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- A deposit recorded twice, because we heard about its payment twice, was one payment: keep the first.
DELETE FROM "deposits" a USING "deposits" b WHERE a."payment_intent" = b."payment_intent" AND a."id" > b."id";--> statement-breakpoint
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_payment_intent_unique" UNIQUE("payment_intent");--> statement-breakpoint
GRANT SELECT, INSERT ON "provider_events" TO clinic_app;--> statement-breakpoint
ALTER TABLE "provider_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "own_business" ON "provider_events" TO clinic_app
	USING ("business_id" = current_setting('app.business', true))
	WITH CHECK ("business_id" = current_setting('app.business', true));
