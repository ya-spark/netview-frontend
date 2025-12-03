# Database Schema Documentation

## Repository Note

**This is a frontend-only repository.** The backend code (including database connections, schema definitions, and storage implementations) is located in a separate repository. This documentation describes the full system architecture for reference.

## Overview

NetView uses **PostgreSQL** with Drizzle ORM for type-safe database operations. The database implements a multi-tenant architecture with tenant-based data isolation.

**Database System**: PostgreSQL (Version 16)

## Database Management

- **Schema Definition**: All schemas are defined in `shared/schema.ts`
- **Storage Interface**: Database operations are abstracted in `server/storage.ts`
- **Migrations**: Use `npm run db:push` to sync schema changes (use `--force` flag if data-loss warning appears)
- **ORM**: Drizzle ORM with type-safe queries and relations
- **Connection**: PostgreSQL (Neon-backed) accessible via `DATABASE_URL` environment variable

## Core Tables

### Users Table
Primary user entity for authentication and authorization.

```typescript
{
  id: uuid (PK, auto-generated),
  firebaseUid: varchar(128) UNIQUE NOT NULL,
  email: varchar(255) UNIQUE NOT NULL,
  firstName: varchar(100) NOT NULL,
  lastName: varchar(100) NOT NULL,
  company: varchar(255),
  region: varchar(100),
  role: varchar(50) DEFAULT "Viewer", // SuperAdmin, Owner, Admin, Editor, Helpdesk, Viewer
  tenantId: uuid (FK -> tenants.id),
  isActive: boolean DEFAULT true,
  isRestrictedCountryUser: boolean DEFAULT false,
  stripeCustomerId: varchar(255),
  stripeSubscriptionId: varchar(255),
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Relations**: 
- Belongs to one Tenant
- Has many Probes (as creator)
- Has many API Keys

### Tenants Table
Multi-tenant organization entity.

```typescript
{
  id: uuid (PK, auto-generated),
  name: varchar(255) NOT NULL,
  subdomain: varchar(100) UNIQUE,
  billingTier: varchar(50) DEFAULT "Free", // Free, Paid, Enterprise
  creditsLimit: integer DEFAULT 1000,
  creditsUsed: integer DEFAULT 0,
  isActive: boolean DEFAULT true,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Relations**: 
- Has many Users
- Has many Probes
- Has many Gateways (custom)
- Has many Notification Groups
- Has many Alerts

### Probes Table
Monitoring probe configurations.

```typescript
{
  id: uuid (PK, auto-generated),
  tenantId: uuid (FK -> tenants.id) NOT NULL,
  name: varchar(255) NOT NULL,
  description: text,
  type: varchar(50) NOT NULL, // Uptime, API, Security, Browser
  protocol: varchar(50), // HTTP, HTTPS, TCP, SMTP, DNS
  url: text,
  method: varchar(10) DEFAULT "GET",
  headers: jsonb,
  body: text,
  expectedStatusCode: integer DEFAULT 200,
  expectedResponseTime: integer DEFAULT 5000, // milliseconds
  checkInterval: integer DEFAULT 300, // seconds
  isActive: boolean DEFAULT true,
  createdBy: uuid (FK -> users.id),
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Relations**: 
- Belongs to one Tenant
- Created by one User
- Has many Probe Gateway assignments
- Has many Probe Results
- Has many Alerts

### Gateways Table
Distributed monitoring gateway nodes.

```typescript
{
  id: uuid (PK, auto-generated),
  name: varchar(255) NOT NULL,
  type: varchar(50) NOT NULL, // Core, Custom
  tenantId: uuid (FK -> tenants.id), // null for Core gateways
  ipAddress: varchar(45),
  location: varchar(255),
  isOnline: boolean DEFAULT false,
  lastHeartbeat: timestamp,
  apiKey: varchar(255) UNIQUE,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Relations**: 
- Belongs to one Tenant (null for Core gateways)
- Has many Probe Gateway assignments
- Has many Probe Results

### Probe Gateways Table
Junction table for probe-gateway assignments.

```typescript
{
  id: uuid (PK, auto-generated),
  probeId: uuid (FK -> probes.id) NOT NULL,
  gatewayId: uuid (FK -> gateways.id) NOT NULL,
  createdAt: timestamp
}
```

### Notification Groups Table
Alert notification configurations.

```typescript
{
  id: uuid (PK, auto-generated),
  tenantId: uuid (FK -> tenants.id) NOT NULL,
  name: varchar(255) NOT NULL,
  emails: text[], // Array of email addresses
  smsNumbers: text[], // Array of phone numbers
  webhookUrl: text,
  alertThreshold: integer DEFAULT 1, // Number of failures before alert
  isActive: boolean DEFAULT true,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Relations**: 
- Belongs to one Tenant

### Probe Results Table
Monitoring execution results.

```typescript
{
  id: uuid (PK, auto-generated),
  probeId: uuid (FK -> probes.id) NOT NULL,
  gatewayId: uuid (FK -> gateways.id) NOT NULL,
  status: varchar(50) NOT NULL, // Up, Down, Warning
  responseTime: integer, // milliseconds
  statusCode: integer,
  errorMessage: text,
  responseBody: text,
  checkedAt: timestamp
}
```

**Relations**: 
- Belongs to one Probe
- Belongs to one Gateway

### Alerts Table
Active and resolved alerts.

```typescript
{
  id: uuid (PK, auto-generated),
  probeId: uuid (FK -> probes.id) NOT NULL,
  tenantId: uuid (FK -> tenants.id) NOT NULL,
  type: varchar(50) NOT NULL, // Down, Slow, Error
  message: text NOT NULL,
  isResolved: boolean DEFAULT false,
  resolvedAt: timestamp,
  createdAt: timestamp
}
```

**Relations**: 
- Belongs to one Probe
- Belongs to one Tenant

### API Keys Table
User API access keys for programmatic access.

```typescript
{
  id: uuid (PK, auto-generated),
  userId: uuid (FK -> users.id) NOT NULL,
  tenantId: uuid (FK -> tenants.id) NOT NULL,
  name: varchar(255) NOT NULL, // User-friendly name
  keyPrefix: varchar(20) NOT NULL, // First 8 chars for display
  keyHash: varchar(255) UNIQUE NOT NULL, // SHA-256 hash of full key
  scopes: text[] DEFAULT [], // Array of permission scopes
  lastUsed: timestamp,
  usageCount: integer DEFAULT 0,
  isActive: boolean DEFAULT true,
  expiresAt: timestamp, // Optional expiration
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Relations**: 
- Belongs to one User
- Belongs to one Tenant

## Insert Schemas and Types

For each table, the schema exports:
- **Insert Schema**: `createInsertSchema()` from `drizzle-zod` (excludes auto-generated fields)
- **Insert Type**: `z.infer<typeof insertSchema>`
- **Select Type**: `typeof table.$inferSelect`

Example:
```typescript
export const insertProbeSchema = createInsertSchema(probes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Probe = typeof probes.$inferSelect;
export type InsertProbe = z.infer<typeof insertProbeSchema>;
```

## Storage Interface

All database operations go through the `IStorage` interface in `server/storage.ts`:

```typescript
interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  
  // Probes
  getProbe(id: string): Promise<Probe | undefined>;
  getProbesByTenant(tenantId: string): Promise<Probe[]>;
  createProbe(probe: InsertProbe): Promise<Probe>;
  updateProbe(id: string, updates: Partial<InsertProbe>): Promise<Probe>;
  deleteProbe(id: string): Promise<void>;
  
  // ... and more
}
```

## Key Patterns

1. **Array Columns**: Use `.array()` method, not wrapper function
   ```typescript
   // Correct
   emails: text("emails").array()
   
   // Incorrect
   emails: array(text("emails"))
   ```

2. **Relations**: Defined using Drizzle's `relations()` function for type-safe joins

3. **Multi-tenancy**: All tenant-specific data includes `tenantId` for isolation

4. **Timestamps**: `createdAt` and `updatedAt` managed automatically via `defaultNow()`

5. **UUIDs**: Use `gen_random_uuid()` for primary keys with `uuid` type
