import { pgTable, text, serial, integer, jsonb, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles for RBAC
export type UserRole = 'admin' | 'user' | 'readonly';

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: varchar("email", { length: 255 }).unique(),
  password: text("password"), // Legacy field for backward compatibility
  passwordHash: text("password_hash"), // New secure field, nullable for migration safety
  apiKey: text("api_key"), // Keep existing field for compatibility
  role: varchar("role", { length: 20 }).notNull().default('user'),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 128 }).primaryKey(), // Session ID
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }), // IPv6 compatible
  userAgent: text("user_agent"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastAccessAt: timestamp("last_access_at").notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'set null' }),
  sessionId: varchar("session_id", { length: 128 }).references(() => sessions.id, { onDelete: 'set null' }),
  action: varchar("action", { length: 100 }).notNull(), // login, logout, api_call, data_access, etc.
  resource: varchar("resource", { length: 100 }), // users, api_endpoints, saved_requests, etc.
  resourceId: varchar("resource_id", { length: 50 }), // ID of the affected resource
  details: jsonb("details").default({}), // Additional context
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const apiUsageEvents = pgTable("api_usage_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'set null' }),
  sessionId: varchar("session_id", { length: 128 }).references(() => sessions.id, { onDelete: 'set null' }),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  statusCode: integer("status_code").notNull(),
  responseTime: integer("response_time"), // in milliseconds
  requestSize: integer("request_size"), // in bytes
  responseSize: integer("response_size"), // in bytes
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  errorMessage: text("error_message"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const endpointCategories = pgTable("endpoint_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
});

export const apiEndpoints = pgTable("api_endpoints", {
  id: serial("id").primaryKey(),
  path: text("path").notNull(),
  method: text("method").notNull(),
  summary: text("summary"),
  description: text("description"),
  parameters: jsonb("parameters"),
  responses: jsonb("responses"),
  categoryId: integer("category_id").references(() => endpointCategories.id),
});

export const savedRequests = pgTable("saved_requests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  endpointId: integer("endpoint_id").references(() => apiEndpoints.id),
  parameters: jsonb("parameters"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas for secure validation
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email().optional(),
  role: z.enum(['admin', 'user', 'readonly']).default('user'),
  passwordHash: z.string().min(1).optional(), // Optional for migration safety
}).pick({
  username: true,
  email: true,
  passwordHash: true,
  role: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  email: z.string().email("Valid email is required").optional(),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain uppercase, lowercase, and number"),
});

export const insertSessionSchema = createInsertSchema(sessions).pick({
  id: true,
  userId: true,
  expiresAt: true,
  ipAddress: true,
  userAgent: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).pick({
  userId: true,
  sessionId: true,
  action: true,
  resource: true,
  resourceId: true,
  details: true,
  ipAddress: true,
  userAgent: true,
});

export const insertApiUsageEventSchema = createInsertSchema(apiUsageEvents).pick({
  userId: true,
  sessionId: true,
  endpoint: true,
  method: true,
  statusCode: true,
  responseTime: true,
  requestSize: true,
  responseSize: true,
  ipAddress: true,
  userAgent: true,
  errorMessage: true,
});

export const insertEndpointCategorySchema = createInsertSchema(endpointCategories).pick({
  name: true,
  description: true,
});

export const insertApiEndpointSchema = createInsertSchema(apiEndpoints).pick({
  path: true,
  method: true,
  summary: true,
  description: true,
  parameters: true,
  responses: true,
  categoryId: true,
});

export const insertSavedRequestSchema = createInsertSchema(savedRequests).pick({
  name: true,
  endpointId: true,
  parameters: true,
  userId: true,
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  savedRequests: many(savedRequests),
  sessions: many(sessions),
  auditLogs: many(auditLogs),
  apiUsageEvents: many(apiUsageEvents),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  }),
  auditLogs: many(auditLogs),
  apiUsageEvents: many(apiUsageEvents),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id]
  }),
  session: one(sessions, {
    fields: [auditLogs.sessionId],
    references: [sessions.id]
  }),
}));

export const apiUsageEventsRelations = relations(apiUsageEvents, ({ one }) => ({
  user: one(users, {
    fields: [apiUsageEvents.userId],
    references: [users.id]
  }),
  session: one(sessions, {
    fields: [apiUsageEvents.sessionId],
    references: [sessions.id]
  }),
}));

export const endpointCategoriesRelations = relations(endpointCategories, ({ many }) => ({
  endpoints: many(apiEndpoints)
}));

export const apiEndpointsRelations = relations(apiEndpoints, ({ one, many }) => ({
  category: one(endpointCategories, {
    fields: [apiEndpoints.categoryId],
    references: [endpointCategories.id]
  }),
  savedRequests: many(savedRequests)
}));

export const savedRequestsRelations = relations(savedRequests, ({ one }) => ({
  user: one(users, {
    fields: [savedRequests.userId],
    references: [users.id]
  }),
  endpoint: one(apiEndpoints, {
    fields: [savedRequests.endpointId],
    references: [apiEndpoints.id]
  })
}));

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export type InsertApiUsageEvent = z.infer<typeof insertApiUsageEventSchema>;
export type ApiUsageEvent = typeof apiUsageEvents.$inferSelect;

export type InsertEndpointCategory = z.infer<typeof insertEndpointCategorySchema>;
export type EndpointCategory = typeof endpointCategories.$inferSelect;

export type InsertApiEndpoint = z.infer<typeof insertApiEndpointSchema>;
export type ApiEndpoint = typeof apiEndpoints.$inferSelect;

export type InsertSavedRequest = z.infer<typeof insertSavedRequestSchema>;
export type SavedRequest = typeof savedRequests.$inferSelect;

// Minerals database table for storing comprehensive mineral data from Mindat API
export const minerals = pgTable("minerals", {
  // Core identification
  id: integer("id").primaryKey(), // Mindat ID
  longid: text("longid"),
  guid: text("guid"),
  name: text("name").notNull(),
  updttime: timestamp("updttime"),
  
  // Chemical formulas and composition
  mindatFormula: text("mindat_formula"),
  mindatFormulaNOte: text("mindat_formula_note"),
  imaFormula: text("ima_formula"),
  imaStatus: jsonb("ima_status").default([]), // Array of status strings
  imaNotes: jsonb("ima_notes").default([]), // Array of note strings
  elements: text("elements").array().default([]), // Array of element symbols
  sigelements: text("sigelements").array().default([]), // Significant elements
  impurities: text("impurities"),
  
  // Classification
  varietyof: integer("varietyof").default(0),
  synid: integer("synid").default(0),
  polytypeof: integer("polytypeof").default(0),
  groupid: integer("groupid").default(0),
  entrytype: integer("entrytype").default(0),
  entrytypeText: text("entrytype_text"),
  
  // Physical properties
  colour: text("colour"),
  streak: text("streak"),
  lustre: text("lustre"),
  lustretype: text("lustretype"),
  diapheny: text("diapheny"), // Transparency
  hmin: integer("hmin"), // Minimum hardness
  hmax: integer("hmax"), // Maximum hardness
  hardtype: integer("hardtype").default(0),
  vhnmin: text("vhnmin"), // Vickers hardness min
  vhnmax: text("vhnmax"), // Vickers hardness max
  vhnerror: integer("vhnerror").default(0),
  vhng: integer("vhng").default(0),
  vhns: integer("vhns").default(0),
  
  // Density
  dmeas: text("dmeas"), // Measured density
  dmeas2: text("dmeas2"), // Second measured density
  dcalc: text("dcalc"), // Calculated density
  dmeaserror: integer("dmeaserror").default(0),
  dcalcerror: integer("dcalcerror").default(0),
  
  // Crystal structure
  csystem: text("csystem"), // Crystal system
  cclass: integer("cclass"),
  spacegroup: integer("spacegroup"),
  a: text("a"), // Unit cell parameter a
  b: text("b"), // Unit cell parameter b
  c: text("c"), // Unit cell parameter c
  alpha: text("alpha"), // Unit cell angle alpha
  beta: text("beta"), // Unit cell angle beta
  gamma: text("gamma"), // Unit cell angle gamma
  aerror: integer("aerror").default(0),
  berror: integer("berror").default(0),
  cerror: integer("cerror").default(0),
  alphaerror: integer("alphaerror").default(0),
  betaerror: integer("betaerror").default(0),
  gammaerror: integer("gammaerror").default(0),
  va3: integer("va3").default(0), // Volume
  z: integer("z").default(0), // Atoms per unit cell
  
  // Cleavage and fracture
  cleavage: text("cleavage"),
  cleavagetype: text("cleavagetype"),
  parting: text("parting"),
  fracturetype: text("fracturetype"),
  tenacity: text("tenacity"),
  
  // Optical properties
  opticaltype: text("opticaltype"),
  opticalsign: text("opticalsign"),
  opticalextinction: text("opticalextinction"),
  opticalalpha: text("opticalalpha"),
  opticalbeta: text("opticalbeta"),
  opticalgamma: text("opticalgamma"),
  opticalomega: text("opticalomega"),
  opticalepsilon: text("opticalepsilon"),
  opticalalpha2: text("opticalalpha2"),
  opticalbeta2: text("opticalbeta2"),
  opticalgamma2: text("opticalgamma2"),
  opticalepsilon2: text("opticalepsilon2"),
  opticalomega2: text("opticalomega2"),
  
  // Morphology and twinning
  morphology: text("morphology"),
  twinning: text("twinning"),
  epitaxidescription: text("epitaxidescription"),
  tlform: text("tlform"), // Type locality form
  
  // Descriptions and occurrence
  descriptionShort: text("description_short"),
  occurrence: text("occurrence"),
  otheroccurrence: text("otheroccurrence"),
  industrial: text("industrial"),
  
  // Discovery and naming
  discoveryYear: text("discovery_year"),
  aboutname: text("aboutname"),
  other: text("other"),
  
  // Special properties
  luminescence: text("luminescence"),
  csmetamict: integer("csmetamict").default(0),
  cim: text("cim"), // Crystallographic index
  
  // Sync metadata
  lastSyncAt: timestamp("last_sync_at").defaultNow(),
  syncVersion: integer("sync_version").default(1),
  isActive: boolean("is_active").default(true),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// API keys table for secure access to our minerals API
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  keyHash: text("key_hash").notNull().unique(), // Hashed API key
  name: text("name").notNull(), // Human readable name
  userId: integer("user_id").references(() => users.id),
  isActive: boolean("is_active").default(true),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  permissions: jsonb("permissions").default(['read']), // ['read', 'write', 'admin']
  rateLimit: integer("rate_limit").default(1000), // Requests per hour
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sync logs to track mineral data updates
export const syncLogs = pgTable("sync_logs", {
  id: serial("id").primaryKey(),
  syncType: text("sync_type").notNull(), // 'full', 'incremental', 'single'
  status: text("status").notNull(), // 'running', 'completed', 'failed'
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  mineralsProcessed: integer("minerals_processed").default(0),
  mineralsAdded: integer("minerals_added").default(0),
  mineralsUpdated: integer("minerals_updated").default(0),
  mineralsErrors: integer("minerals_errors").default(0),
  errorMessage: text("error_message"),
  details: jsonb("details").default({}),
});

// Mineral search schemas
export const insertMineralSchema = createInsertSchema(minerals).pick({
  id: true,
  longid: true,
  guid: true,
  name: true,
  updttime: true,
  mindatFormula: true,
  mindatFormulaNOte: true,
  imaFormula: true,
  imaStatus: true,
  imaNotes: true,
  elements: true,
  sigelements: true,
  impurities: true,
  varietyof: true,
  synid: true,
  polytypeof: true,
  groupid: true,
  entrytype: true,
  entrytypeText: true,
  colour: true,
  streak: true,
  lustre: true,
  lustretype: true,
  diapheny: true,
  hmin: true,
  hmax: true,
  csystem: true,
  a: true,
  b: true,
  c: true,
  alpha: true,
  beta: true,
  gamma: true,
  z: true,
  occurrence: true,
  discoveryYear: true,
  descriptionShort: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).pick({
  keyHash: true,
  name: true,
  userId: true,
  permissions: true,
  expiresAt: true,
  rateLimit: true,
});

export const insertSyncLogSchema = createInsertSchema(syncLogs).pick({
  syncType: true,
  status: true,
  mineralsProcessed: true,
  mineralsAdded: true,
  mineralsUpdated: true,
  mineralsErrors: true,
  errorMessage: true,
  details: true,
});

// Relations
export const mineralsRelations = relations(minerals, ({ many }) => ({
  // Future: mineral localities, images, references
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id]
  }),
}));

// Types
export type Mineral = typeof minerals.$inferSelect;
export type InsertMineral = z.infer<typeof insertMineralSchema>;

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

export type SyncLog = typeof syncLogs.$inferSelect;
export type InsertSyncLog = z.infer<typeof insertSyncLogSchema>;
