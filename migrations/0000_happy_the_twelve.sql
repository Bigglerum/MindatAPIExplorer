-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "saved_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"endpoint_id" integer,
	"parameters" jsonb,
	"user_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "endpoint_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "api_endpoints" (
	"id" serial PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"method" text NOT NULL,
	"summary" text,
	"description" text,
	"parameters" jsonb,
	"responses" jsonb,
	"category_id" integer
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"api_key" text,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "rruff_api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"last_used" timestamp,
	"usage_count" integer DEFAULT 0,
	"rate_limit" integer DEFAULT 100,
	CONSTRAINT "rruff_api_keys_key_key" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "rruff_data_import_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"start_time" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"end_time" timestamp,
	"status" varchar(50) NOT NULL,
	"minerals_imported" integer DEFAULT 0,
	"spectra_imported" integer DEFAULT 0,
	"errors" jsonb DEFAULT '[]'::jsonb,
	"details" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "rruff_minerals" (
	"id" serial PRIMARY KEY NOT NULL,
	"rruff_id" varchar(50),
	"ima_status" varchar(50),
	"mineral_name" varchar(255) NOT NULL,
	"chemical_formula" text,
	"crystal_system" varchar(50),
	"crystal_class" varchar(100),
	"space_group" varchar(50),
	"unit_cell" jsonb DEFAULT '{}'::jsonb,
	"color" text,
	"density" varchar(50),
	"hardness" varchar(50),
	"optical_properties" jsonb DEFAULT '{}'::jsonb,
	"element_composition" jsonb DEFAULT '{}'::jsonb,
	"year_first_published" integer,
	"ideal_chemistry" text,
	"comments" text,
	"url" text,
	"structure_refs" jsonb DEFAULT '[]'::jsonb,
	"last_updated" timestamp DEFAULT CURRENT_TIMESTAMP,
	"data_version" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "rruff_minerals_rruff_id_key" UNIQUE("rruff_id")
);
--> statement-breakpoint
CREATE TABLE "rruff_spectra" (
	"id" serial PRIMARY KEY NOT NULL,
	"mineral_id" integer NOT NULL,
	"spectra_type" varchar(50) NOT NULL,
	"sample_id" varchar(100),
	"orientation" varchar(50),
	"wavelength" varchar(50),
	"temperature" varchar(50),
	"pressure" varchar(50),
	"data_url" text,
	"data_points" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "saved_requests" ADD CONSTRAINT "saved_requests_endpoint_id_api_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."api_endpoints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_requests" ADD CONSTRAINT "saved_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_endpoints" ADD CONSTRAINT "api_endpoints_category_id_endpoint_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."endpoint_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rruff_spectra" ADD CONSTRAINT "rruff_spectra_mineral_id_fkey" FOREIGN KEY ("mineral_id") REFERENCES "public"."rruff_minerals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_rruff_minerals_name" ON "rruff_minerals" USING btree ("mineral_name" text_ops);--> statement-breakpoint
CREATE INDEX "idx_rruff_minerals_system" ON "rruff_minerals" USING btree ("crystal_system" text_ops);--> statement-breakpoint
CREATE INDEX "idx_rruff_spectra_mineral_id" ON "rruff_spectra" USING btree ("mineral_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_rruff_spectra_type" ON "rruff_spectra" USING btree ("spectra_type" text_ops);
*/