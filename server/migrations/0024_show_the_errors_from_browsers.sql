CREATE TABLE "browser_errors" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"release" text NOT NULL,
	"page" text NOT NULL,
	"message" text NOT NULL,
	"stack" text NOT NULL,
	"source" text,
	"fingerprint" text NOT NULL,
	"browser" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "browser_errors" ADD CONSTRAINT "browser_errors_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "browser_errors_fingerprint_idx" ON "browser_errors" USING btree ("business_id","fingerprint");--> statement-breakpoint
GRANT SELECT, INSERT ON "browser_errors" TO clinic_app;--> statement-breakpoint
GRANT USAGE ON SEQUENCE "browser_errors_id_seq" TO clinic_app;--> statement-breakpoint
ALTER TABLE "browser_errors" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "own_business" ON "browser_errors" TO clinic_app
	USING ("business_id" = current_setting('app.business', true))
	WITH CHECK ("business_id" = current_setting('app.business', true));
