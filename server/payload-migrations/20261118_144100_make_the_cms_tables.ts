import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE SCHEMA IF NOT EXISTS "payload";
   CREATE TYPE "payload"."enum_welcome_business" AS ENUM('linden', 'birch');
  CREATE TYPE "payload"."enum_welcome_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum__welcome_v_version_business" AS ENUM('linden', 'birch');
  CREATE TYPE "payload"."enum__welcome_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum_service_texts_business" AS ENUM('linden', 'birch');
  CREATE TYPE "payload"."enum_service_texts_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum__service_texts_v_version_business" AS ENUM('linden', 'birch');
  CREATE TYPE "payload"."enum__service_texts_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "payload"."welcome" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"business" "payload"."enum_welcome_business",
  	"line" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "payload"."enum_welcome_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "payload"."_welcome_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_business" "payload"."enum__welcome_v_version_business",
  	"version_line" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "payload"."enum__welcome_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "payload"."service_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"business" "payload"."enum_service_texts_business",
  	"service" varchar,
  	"line" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "payload"."enum_service_texts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "payload"."_service_texts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_business" "payload"."enum__service_texts_v_version_business",
  	"version_service" varchar,
  	"version_line" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "payload"."enum__service_texts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "payload"."users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"business" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload"."payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"welcome_id" integer,
  	"service_texts_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload"."payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload"."payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload"."_welcome_v" ADD CONSTRAINT "_welcome_v_parent_id_welcome_id_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."welcome"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_service_texts_v" ADD CONSTRAINT "_service_texts_v_parent_id_service_texts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."service_texts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_welcome_fk" FOREIGN KEY ("welcome_id") REFERENCES "payload"."welcome"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_service_texts_fk" FOREIGN KEY ("service_texts_id") REFERENCES "payload"."service_texts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "welcome_updated_at_idx" ON "payload"."welcome" USING btree ("updated_at");
  CREATE INDEX "welcome_created_at_idx" ON "payload"."welcome" USING btree ("created_at");
  CREATE INDEX "welcome__status_idx" ON "payload"."welcome" USING btree ("_status");
  CREATE INDEX "_welcome_v_parent_idx" ON "payload"."_welcome_v" USING btree ("parent_id");
  CREATE INDEX "_welcome_v_version_version_updated_at_idx" ON "payload"."_welcome_v" USING btree ("version_updated_at");
  CREATE INDEX "_welcome_v_version_version_created_at_idx" ON "payload"."_welcome_v" USING btree ("version_created_at");
  CREATE INDEX "_welcome_v_version_version__status_idx" ON "payload"."_welcome_v" USING btree ("version__status");
  CREATE INDEX "_welcome_v_created_at_idx" ON "payload"."_welcome_v" USING btree ("created_at");
  CREATE INDEX "_welcome_v_updated_at_idx" ON "payload"."_welcome_v" USING btree ("updated_at");
  CREATE INDEX "_welcome_v_latest_idx" ON "payload"."_welcome_v" USING btree ("latest");
  CREATE UNIQUE INDEX "service_texts_service_idx" ON "payload"."service_texts" USING btree ("service");
  CREATE INDEX "service_texts_updated_at_idx" ON "payload"."service_texts" USING btree ("updated_at");
  CREATE INDEX "service_texts_created_at_idx" ON "payload"."service_texts" USING btree ("created_at");
  CREATE INDEX "service_texts__status_idx" ON "payload"."service_texts" USING btree ("_status");
  CREATE INDEX "_service_texts_v_parent_idx" ON "payload"."_service_texts_v" USING btree ("parent_id");
  CREATE INDEX "_service_texts_v_version_version_service_idx" ON "payload"."_service_texts_v" USING btree ("version_service");
  CREATE INDEX "_service_texts_v_version_version_updated_at_idx" ON "payload"."_service_texts_v" USING btree ("version_updated_at");
  CREATE INDEX "_service_texts_v_version_version_created_at_idx" ON "payload"."_service_texts_v" USING btree ("version_created_at");
  CREATE INDEX "_service_texts_v_version_version__status_idx" ON "payload"."_service_texts_v" USING btree ("version__status");
  CREATE INDEX "_service_texts_v_created_at_idx" ON "payload"."_service_texts_v" USING btree ("created_at");
  CREATE INDEX "_service_texts_v_updated_at_idx" ON "payload"."_service_texts_v" USING btree ("updated_at");
  CREATE INDEX "_service_texts_v_latest_idx" ON "payload"."_service_texts_v" USING btree ("latest");
  CREATE UNIQUE INDEX "users_email_idx" ON "payload"."users" USING btree ("email");
  CREATE INDEX "users_updated_at_idx" ON "payload"."users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "payload"."users" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload"."payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload"."payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload"."payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload"."payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload"."payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload"."payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload"."payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_welcome_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("welcome_id");
  CREATE INDEX "payload_locked_documents_rels_service_texts_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("service_texts_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload"."payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload"."payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload"."payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload"."payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload"."payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload"."payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload"."payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload"."payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload"."payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."welcome" CASCADE;
  DROP TABLE "payload"."_welcome_v" CASCADE;
  DROP TABLE "payload"."service_texts" CASCADE;
  DROP TABLE "payload"."_service_texts_v" CASCADE;
  DROP TABLE "payload"."users" CASCADE;
  DROP TABLE "payload"."payload_kv" CASCADE;
  DROP TABLE "payload"."payload_locked_documents" CASCADE;
  DROP TABLE "payload"."payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload"."payload_preferences" CASCADE;
  DROP TABLE "payload"."payload_preferences_rels" CASCADE;
  DROP TABLE "payload"."payload_migrations" CASCADE;
  DROP TYPE "payload"."enum_welcome_business";
  DROP TYPE "payload"."enum_welcome_status";
  DROP TYPE "payload"."enum__welcome_v_version_business";
  DROP TYPE "payload"."enum__welcome_v_version_status";
  DROP TYPE "payload"."enum_service_texts_business";
  DROP TYPE "payload"."enum_service_texts_status";
  DROP TYPE "payload"."enum__service_texts_v_version_business";
  DROP TYPE "payload"."enum__service_texts_v_version_status";`)
}
