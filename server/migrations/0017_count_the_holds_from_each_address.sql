CREATE TABLE "holds_made" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"made_from" text NOT NULL,
	"made_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "holds_made" ADD CONSTRAINT "holds_made_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "holds_made_from_idx" ON "holds_made" USING btree ("made_from","made_at");--> statement-breakpoint
-- Like the other tables (see 0015): the app's role sees and adds only its business's rows.
GRANT SELECT, INSERT, DELETE ON "holds_made" TO clinic_app;--> statement-breakpoint
GRANT USAGE ON SEQUENCE "holds_made_id_seq" TO clinic_app;--> statement-breakpoint
ALTER TABLE "holds_made" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "own_business" ON "holds_made" TO clinic_app
  USING ("business_id" = current_setting('app.business', true))
  WITH CHECK ("business_id" = current_setting('app.business', true));
