CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"key" text,
	"run_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"done_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "jobs_due_idx" ON "jobs" USING btree ("run_at");--> statement-breakpoint
-- A business's actions can add jobs, in their own transaction. The worker runs as the owner, for every
-- business.
GRANT SELECT, INSERT ON "jobs" TO clinic_app;--> statement-breakpoint
GRANT USAGE ON SEQUENCE "jobs_id_seq" TO clinic_app;--> statement-breakpoint
ALTER TABLE "jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "own_business" ON "jobs" TO clinic_app
	USING ("business_id" = current_setting('app.business', true))
	WITH CHECK ("business_id" = current_setting('app.business', true));
