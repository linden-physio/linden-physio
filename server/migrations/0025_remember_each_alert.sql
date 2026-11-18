CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"key" text NOT NULL,
	"subject" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alerts_business_id_key_unique" UNIQUE("business_id","key")
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "own_business" ON "alerts" TO clinic_app
	USING ("business_id" = current_setting('app.business', true));
