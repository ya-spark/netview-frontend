import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, uuid, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  firebaseUid: varchar("firebase_uid", { length: 128 }).unique().notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  company: varchar("company", { length: 255 }),
  region: varchar("region", { length: 100 }),
  role: varchar("role", { length: 50 }).notNull().default("Viewer"), // SuperAdmin, Owner, Admin, Editor, Helpdesk, Viewer
  tenantId: uuid("tenant_id").references(() => tenants.id),
  isActive: boolean("is_active").default(true),
  isRestrictedCountryUser: boolean("is_restricted_country_user").default(false),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tenants table
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  subdomain: varchar("subdomain", { length: 100 }).unique(),
  billingTier: varchar("billing_tier", { length: 50 }).default("Free"), // Free, Paid, Enterprise
  creditsLimit: integer("credits_limit").default(1000),
  creditsUsed: integer("credits_used").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Probes table
export const probes = pgTable("probes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull(), // Uptime, API, Security, Browser
  protocol: varchar("protocol", { length: 50 }), // HTTP, HTTPS, TCP, SMTP, DNS
  url: text("url"),
  method: varchar("method", { length: 10 }).default("GET"),
  headers: jsonb("headers"),
  body: text("body"),
  expectedStatusCode: integer("expected_status_code").default(200),
  expectedResponseTime: integer("expected_response_time").default(5000), // milliseconds
  checkInterval: integer("check_interval").default(300), // seconds
  isActive: boolean("is_active").default(true),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Gateways table
export const gateways = pgTable("gateways", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // Core, Custom
  tenantId: uuid("tenant_id").references(() => tenants.id), // null for Core gateways
  ipAddress: varchar("ip_address", { length: 45 }),
  location: varchar("location", { length: 255 }),
  isOnline: boolean("is_online").default(false),
  lastHeartbeat: timestamp("last_heartbeat"),
  apiKey: varchar("api_key", { length: 255 }).unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Probe Gateway assignments
export const probeGateways = pgTable("probe_gateways", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  probeId: uuid("probe_id").references(() => probes.id).notNull(),
  gatewayId: uuid("gateway_id").references(() => gateways.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notification Groups table
export const notificationGroups = pgTable("notification_groups", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  emails: text("emails").array(), // Array of email addresses
  smsNumbers: text("sms_numbers").array(), // Array of phone numbers
  webhookUrl: text("webhook_url"),
  alertThreshold: integer("alert_threshold").default(1), // Number of failures before alert
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Probe Results table
export const probeResults = pgTable("probe_results", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  probeId: uuid("probe_id").references(() => probes.id).notNull(),
  gatewayId: uuid("gateway_id").references(() => gateways.id).notNull(),
  status: varchar("status", { length: 50 }).notNull(), // Up, Down, Warning
  responseTime: integer("response_time"), // milliseconds
  statusCode: integer("status_code"),
  errorMessage: text("error_message"),
  responseBody: text("response_body"),
  checkedAt: timestamp("checked_at").defaultNow(),
});

// Alerts table
export const alerts = pgTable("alerts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  probeId: uuid("probe_id").references(() => probes.id).notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // Down, Slow, Error
  message: text("message").notNull(),
  isResolved: boolean("is_resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// API Keys table (for user API access)
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(), // User-friendly name
  keyPrefix: varchar("key_prefix", { length: 20 }).notNull(), // First 8 chars for display
  keyHash: varchar("key_hash", { length: 255 }).notNull().unique(), // SHA-256 hash of full key
  scopes: text("scopes").array().default([]), // Array of permission scopes
  lastUsed: timestamp("last_used"),
  usageCount: integer("usage_count").default(0),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"), // Optional expiration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  createdProbes: many(probes),
}));

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  probes: many(probes),
  gateways: many(gateways),
  notificationGroups: many(notificationGroups),
  alerts: many(alerts),
}));

export const probesRelations = relations(probes, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [probes.tenantId],
    references: [tenants.id],
  }),
  creator: one(users, {
    fields: [probes.createdBy],
    references: [users.id],
  }),
  probeGateways: many(probeGateways),
  results: many(probeResults),
  alerts: many(alerts),
}));

export const gatewaysRelations = relations(gateways, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [gateways.tenantId],
    references: [tenants.id],
  }),
  probeGateways: many(probeGateways),
  results: many(probeResults),
}));

export const probeGatewaysRelations = relations(probeGateways, ({ one }) => ({
  probe: one(probes, {
    fields: [probeGateways.probeId],
    references: [probes.id],
  }),
  gateway: one(gateways, {
    fields: [probeGateways.gatewayId],
    references: [gateways.id],
  }),
}));

export const notificationGroupsRelations = relations(notificationGroups, ({ one }) => ({
  tenant: one(tenants, {
    fields: [notificationGroups.tenantId],
    references: [tenants.id],
  }),
}));

export const probeResultsRelations = relations(probeResults, ({ one }) => ({
  probe: one(probes, {
    fields: [probeResults.probeId],
    references: [probes.id],
  }),
  gateway: one(gateways, {
    fields: [probeResults.gatewayId],
    references: [gateways.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  probe: one(probes, {
    fields: [alerts.probeId],
    references: [probes.id],
  }),
  tenant: one(tenants, {
    fields: [alerts.tenantId],
    references: [tenants.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [apiKeys.tenantId],
    references: [tenants.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProbeSchema = createInsertSchema(probes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGatewaySchema = createInsertSchema(gateways).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationGroupSchema = createInsertSchema(notificationGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProbeResultSchema = createInsertSchema(probeResults).omit({
  id: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  keyHash: true,
  lastUsed: true,
  usageCount: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Probe = typeof probes.$inferSelect;
export type InsertProbe = z.infer<typeof insertProbeSchema>;
export type Gateway = typeof gateways.$inferSelect;
export type InsertGateway = z.infer<typeof insertGatewaySchema>;
export type NotificationGroup = typeof notificationGroups.$inferSelect;
export type InsertNotificationGroup = z.infer<typeof insertNotificationGroupSchema>;
export type ProbeResult = typeof probeResults.$inferSelect;
export type InsertProbeResult = z.infer<typeof insertProbeResultSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
