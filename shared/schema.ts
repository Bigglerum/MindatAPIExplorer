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
