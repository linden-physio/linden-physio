CREATE TABLE "exports" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"day" date NOT NULL,
	"name" text NOT NULL,
	"sent_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"receipt" text,
	CONSTRAINT "exports_business_id_day_unique" UNIQUE("business_id","day")
);
--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
GRANT SELECT ON "exports" TO clinic_app;--> statement-breakpoint
ALTER TABLE "exports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "own_business" ON "exports" TO clinic_app
	USING ("business_id" = current_setting('app.business', true));
