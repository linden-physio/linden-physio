-- Row-level security: a net under the code's own check for the business. The app's queries for a
-- business run as the role clinic_app, in a transaction that sets app.business. For that role, these
-- tables show only the rows of that business, and accept only rows for it. A query that forgets to
-- ask for the business gets nothing from another one.
-- (The table owner, which runs migrations and Better Auth's queries, isn't limited: Postgres doesn't
-- apply a table's policies to its owner, or to a superuser.)
DO $$ BEGIN
	IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'clinic_app') THEN
		CREATE ROLE clinic_app NOLOGIN;
	END IF;
END $$;--> statement-breakpoint
-- So the app's own login can take the role, with SET ROLE.
GRANT clinic_app TO CURRENT_USER;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO clinic_app;--> statement-breakpoint
GRANT SELECT ON "businesses" TO clinic_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "bookings", "staff", "services", "opening_hours" TO clinic_app;--> statement-breakpoint
GRANT USAGE ON SEQUENCE "bookings_id_seq", "staff_id_seq" TO clinic_app;--> statement-breakpoint
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "staff" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "opening_hours" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- current_setting(..., true) is null when app.business isn't set, and then no row matches.
CREATE POLICY "own_business" ON "bookings" TO clinic_app
	USING ("business_id" = current_setting('app.business', true))
	WITH CHECK ("business_id" = current_setting('app.business', true));--> statement-breakpoint
CREATE POLICY "own_business" ON "staff" TO clinic_app
	USING ("business_id" = current_setting('app.business', true))
	WITH CHECK ("business_id" = current_setting('app.business', true));--> statement-breakpoint
CREATE POLICY "own_business" ON "services" TO clinic_app
	USING ("business_id" = current_setting('app.business', true))
	WITH CHECK ("business_id" = current_setting('app.business', true));--> statement-breakpoint
CREATE POLICY "own_business" ON "opening_hours" TO clinic_app
	USING ("business_id" = current_setting('app.business', true))
	WITH CHECK ("business_id" = current_setting('app.business', true));
