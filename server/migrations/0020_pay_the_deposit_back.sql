CREATE TABLE "refunds" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"deposit_id" integer NOT NULL,
	"provider_refund" text NOT NULL,
	"amount_ore" integer NOT NULL,
	"refunded_at" timestamp with time zone NOT NULL,
	CONSTRAINT "refunds_provider_refund_unique" UNIQUE("provider_refund")
);
--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_deposit_id_deposits_id_fk" FOREIGN KEY ("deposit_id") REFERENCES "public"."deposits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
GRANT SELECT, INSERT ON "refunds" TO clinic_app;--> statement-breakpoint
GRANT USAGE ON SEQUENCE "refunds_id_seq" TO clinic_app;--> statement-breakpoint
ALTER TABLE "refunds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "own_business" ON "refunds" TO clinic_app
	USING ("business_id" = current_setting('app.business', true))
	WITH CHECK ("business_id" = current_setting('app.business', true));
