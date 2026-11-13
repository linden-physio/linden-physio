ALTER TABLE "staff" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_email_unique" UNIQUE("email");