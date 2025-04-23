import { relations, sql } from 'drizzle-orm';
import { boolean, integer, json, pgTable, text, timestamp, varchar, serial } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

/**
 * Schema for RRUFF IMA mineral data
 * Contains comprehensive mineral information from the RRUFF database
 */

export const rruffMinerals = pgTable('rruff_minerals', {
  id: serial('id').primaryKey().notNull(),
  rruffId: varchar('rruff_id', { length: 50 }).unique(),
  imaStatus: varchar('ima_status', { length: 50 }),
  mineralName: varchar('mineral_name', { length: 255 }).notNull(),
  chemicalFormula: text('chemical_formula'),
  crystalSystem: varchar('crystal_system', { length: 50 }),
  crystalClass: varchar('crystal_class', { length: 100 }),
  spaceGroup: varchar('space_group', { length: 50 }),
  unitCell: json('unit_cell').$type<{
    a?: number;
    b?: number;
    c?: number;
    alpha?: number;
    beta?: number;
    gamma?: number;
    z?: number;
    volume?: number;
  }>().default({}),
  color: text('color'),
  density: varchar('density', { length: 50 }),
  hardness: varchar('hardness', { length: 50 }),
  opticalProperties: json('optical_properties').$type<{
    type?: string;
    sign?: string;
    indices?: string[];
    birefringence?: string;
  }>().default({}),
  elementComposition: json('element_composition').$type<Record<string, number>>().default({}),
  yearFirstPublished: integer('year_first_published'),
  idealChemistry: text('ideal_chemistry'),
  comments: text('comments'),
  url: text('url'),
  structureRefs: json('structure_refs').$type<string[]>().default([]),
  // Tracking fields
  lastUpdated: timestamp('last_updated').defaultNow(),
  dataVersion: integer('data_version').default(1),
  isActive: boolean('is_active').default(true),
});

export const rruffSpectra = pgTable('rruff_spectra', {
  id: serial('id').primaryKey().notNull(),
  mineralId: integer('mineral_id').notNull().references(() => rruffMinerals.id),
  spectraType: varchar('spectra_type', { length: 50 }).notNull(), // Raman, FTIR, XRD
  sampleId: varchar('sample_id', { length: 100 }),
  orientation: varchar('orientation', { length: 50 }),
  wavelength: varchar('wavelength', { length: 50 }),
  temperature: varchar('temperature', { length: 50 }),
  pressure: varchar('pressure', { length: 50 }),
  dataUrl: text('data_url'),
  dataPoints: json('data_points').$type<Array<[number, number]>>().default([]), // [[x1,y1], [x2,y2], etc.]
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const rruffApiKeys = pgTable('rruff_api_keys', {
  id: serial('id').primaryKey().notNull(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true),
  lastUsed: timestamp('last_used'),
  usageCount: integer('usage_count').default(0),
  rateLimit: integer('rate_limit').default(100), // Requests per hour
});

export const rruffDataImportLogs = pgTable('rruff_data_import_logs', {
  id: serial('id').primaryKey().notNull(),
  startTime: timestamp('start_time').defaultNow().notNull(),
  endTime: timestamp('end_time'),
  status: varchar('status', { length: 50 }).notNull(), // 'running', 'completed', 'failed'
  mineralsImported: integer('minerals_imported').default(0),
  spectraImported: integer('spectra_imported').default(0),
  errors: json('errors').$type<string[]>().default([]),
  details: json('details').$type<Record<string, any>>().default({}),
});

// Relation definitions
export const rruffMineralsRelations = relations(rruffMinerals, ({ many }) => ({
  spectra: many(rruffSpectra),
}));

export const rruffSpectraRelations = relations(rruffSpectra, ({ one }) => ({
  mineral: one(rruffMinerals, {
    fields: [rruffSpectra.mineralId],
    references: [rruffMinerals.id],
  }),
}));

// Zod schemas for validation
export const insertRruffMineralSchema = createInsertSchema(rruffMinerals, {
  // Custom validation rules
  elementComposition: z.record(z.string(), z.number()).optional(),
  unitCell: z.object({
    a: z.number().optional(),
    b: z.number().optional(),
    c: z.number().optional(),
    alpha: z.number().optional(),
    beta: z.number().optional(),
    gamma: z.number().optional(),
    z: z.number().optional(),
    volume: z.number().optional(),
  }).optional(),
  opticalProperties: z.object({
    type: z.string().optional(),
    sign: z.string().optional(),
    indices: z.array(z.string()).optional(),
    birefringence: z.string().optional(),
  }).optional(),
  structureRefs: z.array(z.string()).optional(),
});

export const insertRruffSpectraSchema = createInsertSchema(rruffSpectra, {
  dataPoints: z.array(z.tuple([z.number(), z.number()])).optional(),
});

export const insertRruffApiKeySchema = createInsertSchema(rruffApiKeys).omit({
  id: true,
  createdAt: true,
  lastUsed: true,
  usageCount: true,
});

// Types
export type RruffMineral = typeof rruffMinerals.$inferSelect;
export type InsertRruffMineral = z.infer<typeof insertRruffMineralSchema>;
export type RruffSpectra = typeof rruffSpectra.$inferSelect;
export type InsertRruffSpectra = z.infer<typeof insertRruffSpectraSchema>;
export type RruffApiKey = typeof rruffApiKeys.$inferSelect;
export type InsertRruffApiKey = z.infer<typeof insertRruffApiKeySchema>;
export type RruffDataImportLog = typeof rruffDataImportLogs.$inferSelect;