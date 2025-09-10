import { pgTable, foreignKey, serial, text, integer, jsonb, timestamp, unique, varchar, boolean, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const savedRequests = pgTable("saved_requests", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	endpointId: integer("endpoint_id"),
	parameters: jsonb(),
	userId: integer("user_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.endpointId],
			foreignColumns: [apiEndpoints.id],
			name: "saved_requests_endpoint_id_api_endpoints_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "saved_requests_user_id_users_id_fk"
		}),
]);

export const endpointCategories = pgTable("endpoint_categories", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
});

export const apiEndpoints = pgTable("api_endpoints", {
	id: serial().primaryKey().notNull(),
	path: text().notNull(),
	method: text().notNull(),
	summary: text(),
	description: text(),
	parameters: jsonb(),
	responses: jsonb(),
	categoryId: integer("category_id"),
}, (table) => [
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [endpointCategories.id],
			name: "api_endpoints_category_id_endpoint_categories_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: text().notNull(),
	password: text().notNull(),
	apiKey: text("api_key"),
}, (table) => [
	unique("users_username_unique").on(table.username),
]);

export const rruffApiKeys = pgTable("rruff_api_keys", {
	id: serial().primaryKey().notNull(),
	key: varchar({ length: 100 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	isActive: boolean("is_active").default(true),
	lastUsed: timestamp("last_used", { mode: 'string' }),
	usageCount: integer("usage_count").default(0),
	rateLimit: integer("rate_limit").default(100),
}, (table) => [
	unique("rruff_api_keys_key_key").on(table.key),
]);

export const rruffDataImportLogs = pgTable("rruff_data_import_logs", {
	id: serial().primaryKey().notNull(),
	startTime: timestamp("start_time", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	endTime: timestamp("end_time", { mode: 'string' }),
	status: varchar({ length: 50 }).notNull(),
	mineralsImported: integer("minerals_imported").default(0),
	spectraImported: integer("spectra_imported").default(0),
	errors: jsonb().default([]),
	details: jsonb().default({}),
});

export const rruffMinerals = pgTable("rruff_minerals", {
	id: serial().primaryKey().notNull(),
	rruffId: varchar("rruff_id", { length: 50 }),
	imaStatus: varchar("ima_status", { length: 50 }),
	mineralName: varchar("mineral_name", { length: 255 }).notNull(),
	chemicalFormula: text("chemical_formula"),
	crystalSystem: varchar("crystal_system", { length: 50 }),
	crystalClass: varchar("crystal_class", { length: 100 }),
	spaceGroup: varchar("space_group", { length: 50 }),
	unitCell: jsonb("unit_cell").default({}),
	color: text(),
	density: varchar({ length: 50 }),
	hardness: varchar({ length: 50 }),
	opticalProperties: jsonb("optical_properties").default({}),
	elementComposition: jsonb("element_composition").default({}),
	yearFirstPublished: integer("year_first_published"),
	idealChemistry: text("ideal_chemistry"),
	comments: text(),
	url: text(),
	structureRefs: jsonb("structure_refs").default([]),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	dataVersion: integer("data_version").default(1),
	isActive: boolean("is_active").default(true),
}, (table) => [
	index("idx_rruff_minerals_name").using("btree", table.mineralName.asc().nullsLast().op("text_ops")),
	index("idx_rruff_minerals_system").using("btree", table.crystalSystem.asc().nullsLast().op("text_ops")),
	unique("rruff_minerals_rruff_id_key").on(table.rruffId),
]);

export const rruffSpectra = pgTable("rruff_spectra", {
	id: serial().primaryKey().notNull(),
	mineralId: integer("mineral_id").notNull(),
	spectraType: varchar("spectra_type", { length: 50 }).notNull(),
	sampleId: varchar("sample_id", { length: 100 }),
	orientation: varchar({ length: 50 }),
	wavelength: varchar({ length: 50 }),
	temperature: varchar({ length: 50 }),
	pressure: varchar({ length: 50 }),
	dataUrl: text("data_url"),
	dataPoints: jsonb("data_points").default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_rruff_spectra_mineral_id").using("btree", table.mineralId.asc().nullsLast().op("int4_ops")),
	index("idx_rruff_spectra_type").using("btree", table.spectraType.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.mineralId],
			foreignColumns: [rruffMinerals.id],
			name: "rruff_spectra_mineral_id_fkey"
		}),
]);
