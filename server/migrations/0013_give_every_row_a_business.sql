-- Written by drizzle-kit, then fixed by hand: it can't name opening_hours' old primary key, and it adds
-- the business_id columns as NOT NULL with nothing in them, which fails on a table that has rows. So
-- every row there already becomes Linden Physio's first, and only then must have a business.
CREATE TABLE "businesses" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"hosts" text[] NOT NULL
);
--> statement-breakpoint
INSERT INTO "businesses" ("id", "name", "email", "hosts") VALUES
	('linden', 'Linden Physio', 'hello@lindenphysio.com', ARRAY['lindenphysio.com', 'www.lindenphysio.com', 'v6.lindenphysio.com', 'localhost', 'linden.localhost']),
	('birch', 'Birch Hair Studio', 'hello@thebirchhairstudio.com', ARRAY['thebirchhairstudio.com', 'www.thebirchhairstudio.com', 'birch.localhost']);--> statement-breakpoint
ALTER TABLE "opening_hours" DROP CONSTRAINT "opening_hours_pkey";--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "business_id" text NOT NULL DEFAULT 'linden';--> statement-breakpoint
ALTER TABLE "opening_hours" ADD COLUMN "business_id" text NOT NULL DEFAULT 'linden';--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "business_id" text NOT NULL DEFAULT 'linden';--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "business_id" text NOT NULL DEFAULT 'linden';--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "business_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "opening_hours" ALTER COLUMN "business_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "business_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "staff" ALTER COLUMN "business_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "opening_hours" ADD CONSTRAINT "opening_hours_business_id_weekday_pk" PRIMARY KEY("business_id","weekday");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_hours" ADD CONSTRAINT "opening_hours_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;
