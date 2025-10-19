# NetView Backend API Implementation Guide

## Overview
This guide provides essential information for implementing the NetView backend APIs as specified in `api-specification.yaml`.

## Technology Stack
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Firebase Admin SDK for JWT verification
- **Payments**: Stripe
- **AI**: Anthropic Claude for probe generation
- **Session Management**: Express sessions with PostgreSQL store

## Database Schema
The complete database schema is defined in `shared/schema.ts` using Drizzle ORM. Key tables include:

### Core Tables
1. **users** - User accounts with Firebase authentication
2. **tenants** - Multi-tenant organizations
3. **probes** - Monitoring probe configurations
4. **gateways** - Distributed monitoring gateways (Core and Custom)
5. **probeResults** - Probe execution results
6. **notificationGroups** - Notification configurations
7. **alerts** - Alert records
8. **apiKeys** - API key management for programmatic access
9. **probeGateways** - Many-to-many relationship between probes and gateways

### Database Management
- Use `npm run db:push` to sync schema changes
- If data-loss warning appears, use `npm run db:push --force`
- Never write manual SQL migrations
- All IDs use UUID format with `gen_random_uuid()`

## Authentication & Authorization

### Firebase JWT Authentication
**Header**: `Authorization: Bearer <firebase-id-token>`

**Verification Process**:
```typescript
import { getAuth } from 'firebase-admin/auth';

const token = authHeader.substring(7); // Remove 'Bearer '
const decodedToken = await getAuth().verifyIdToken(token);
// decodedToken contains: { uid, email, ... }
```

**Middleware**: `authenticateUser` middleware adds `req.user` to request

### API Key Authentication
**Header**: `Authorization: Bearer <api-key>` OR `X-API-Key: <api-key>`

**Format**: `nv_<64-char-hex-string>`

**Verification**: Hash the provided key with SHA-256 and compare with stored `keyHash`

**Scopes**: API keys have scope-based permissions:
- `probes:read`, `probes:write`
- `results:read`, `results:write`
- `notifications:read`, `notifications:write`
- `gateways:read`, `gateways:write`
- `admin:read`, `admin:write`

### Role-Based Access Control (RBAC)

**Role Hierarchy** (highest to lowest):
1. **SuperAdmin** - Full system access across all tenants
2. **Owner** - Full access within their tenant
3. **Admin** - Manage resources within tenant (cannot manage billing)
4. **Editor** - Create/edit probes and configurations
5. **Helpdesk** - Read-only access with ticket management
6. **Viewer** - Read-only access

**Default SuperAdmins**:
- Yaseen.gem@gmail.com
- Asia.Yaseentech@gmail.com
- contact@yaseenmd.com

**Middleware**: `requireRole(['Owner', 'Admin'])` restricts endpoints to specific roles

## Multi-Tenancy Architecture

### Tenant Isolation
- All tenant-specific data includes `tenantId` foreign key
- SuperAdmins can access all tenants
- Regular users only access their own tenant's data
- New users auto-create a tenant (except SuperAdmins)

### Tenant Data Access Pattern
```typescript
// Non-SuperAdmin users
const probes = await storage.getProbesByTenant(req.user.tenantId);

// SuperAdmin users
const allProbes = await storage.getAllProbes();
```

## Probe Configuration

Probes are monitoring configurations with type-specific requirements:

### 1. ICMP/Ping Probe
**Required fields in configuration**:
```json
{
  "host": "example.com",
  "timeout": 5,
  "packet_count": 4
}
```

### 2. HTTP/HTTPS Probe
**Required fields in configuration**:
```json
{
  "url": "https://example.com/api",
  "method": "GET",
  "expected_status_codes": [200, 201],
  "headers": { "Authorization": "Bearer token" },
  "body": "optional request body",
  "timeout": 10
}
```

### 3. DNS Resolution Probe
**Required fields in configuration**:
```json
{
  "domain": "example.com",
  "record_type": "A",
  "expected_records": ["192.168.1.1"]
}
```

### 4. SSL/TLS Probe
**Required fields in configuration**:
```json
{
  "host": "example.com",
  "port": 443,
  "check_expiry": true,
  "days_before_expiry_warning": 30
}
```

### 5. Authentication Probe
**Required fields in configuration**:
```json
{
  "url": "https://api.example.com/login",
  "method": "POST",
  "credentials": {
    "username": "user",
    "password": "pass"
  },
  "auth_type": "basic"
}
```

## Gateway System

### Gateway Types
1. **Core Gateways** - Managed by platform, execute probes for all tenants
2. **Custom Gateways** - User-deployed, execute probes for specific tenant only

### Gateway Authentication
- Each gateway receives a unique API key on creation
- Gateways use API key to authenticate when:
  - Fetching assigned probes: `GET /api/gateway/probes`
  - Submitting results: `POST /api/gateway/results`
  - Sending heartbeat: `PUT /api/gateways/:id/heartbeat`

### Gateway Workflow
1. Gateway starts and authenticates with API key
2. Fetches probes: `GET /api/gateway/probes` (header: `X-API-Key: <key>`)
3. Executes probes locally
4. Submits results: `POST /api/gateway/results` (body includes apiKey and results array)
5. Updates heartbeat periodically

## Stripe Billing Integration

### Pricing Plans
Defined in `server/services/stripe.ts`:
```typescript
const PRICING_PLANS = {
  free: { id: 'free', name: 'Free', price: 0, credits: 1000 },
  starter: { id: 'starter', name: 'Starter', price: 29, stripePriceId: 'price_xxx', credits: 10000 },
  // ... more plans
};
```

### Subscription Flow
1. User selects plan: Frontend calls `POST /api/billing/create-subscription`
2. Backend creates/retrieves Stripe customer
3. Creates subscription with payment intent
4. Returns `clientSecret` for frontend payment confirmation
5. User's `stripeCustomerId` and `stripeSubscriptionId` are stored in database

### Customer Portal
- `POST /api/billing/create-portal` creates session for managing subscriptions
- Returns portal URL for redirect

## AI-Powered Probe Generation

**Endpoint**: `POST /api/probes/generate`

**Service**: Uses Anthropic Claude model to generate probe configurations

**Input**:
```json
{
  "url": "https://api.example.com",
  "code": "optional code snippet",
  "description": "Monitor this API endpoint"
}
```

**Output**: Array of suggested probe configurations

**Implementation**: See `server/services/anthropic.ts`

## Notification System

### Notification Types
- **Email** - via SMTP or email service
- **SMS** - via Twilio or SMS provider
- **Webhook** - HTTP POST to specified URL

### Notification Groups
- Group email addresses, phone numbers, and webhooks
- Alert threshold: Number of consecutive failures before notification
- Used by alert system to notify on probe failures

### Sending Notifications
```typescript
// Single notification
await sendNotification({
  id: uuid(),
  type: 'email',
  recipient: 'user@example.com',
  subject: 'Alert',
  message: 'Probe failed',
  metadata: { tenantId, priority: 'high' }
});

// Group notification
await sendToGroup(notificationGroup, subject, message, metadata);
```

## API Key Management

### Creating API Keys
1. User calls `POST /api/api-keys` with name and scopes
2. Backend generates random 64-char hex string
3. Key is prefixed with `nv_` for identification
4. SHA-256 hash is stored in database
5. Full key is returned ONCE (user must save it)
6. Only prefix is shown in subsequent listings

### Key Validation
```typescript
const providedHash = crypto.createHash('sha256').update(apiKey).digest('hex');
const storedKey = await storage.getApiKeyByHash(providedHash);
if (storedKey && storedKey.isActive && !isExpired(storedKey.expiresAt)) {
  // Valid key
}
```

## Logging System

### Rotating File Logger
- Logs stored in `logs/` directory
- Auto-rotates when file reaches max size
- Enforces total storage limit
- Captures all console.log, console.error, etc.

### Configuration (Environment Variables)
```
LOG_MAX_TOTAL_SIZE_MB=1    # Total size limit (default: 1 MB)
LOG_MAX_FILE_SIZE_MB=0.5   # Per-file size limit (default: 0.5 MB)
LOG_DIRECTORY=logs         # Directory for log files (default: logs)
```

### Log Format
```
[TIMESTAMP] [LEVEL] [SOURCE] MESSAGE
[2025-10-12T06:20:29.400Z] [INFO] [server] Server started on port 5000
```

### Access Logs
- `GET /api/admin/logs/stats` - Get log file statistics (Admin+ only)

## Storage Interface

All database operations go through `server/storage.ts` interface:

```typescript
interface IStorage {
  // User operations
  createUser(data: InsertUser): Promise<User>;
  getUserByFirebaseUid(uid: string): Promise<User | null>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User>;
  
  // Tenant operations
  createTenant(data: InsertTenant): Promise<Tenant>;
  getTenant(id: string): Promise<Tenant | null>;
  
  // Probe operations
  createProbe(data: InsertProbe): Promise<Probe>;
  getProbe(id: string): Promise<Probe | null>;
  getProbesByTenant(tenantId: string): Promise<Probe[]>;
  updateProbe(id: string, data: Partial<InsertProbe>): Promise<Probe>;
  deleteProbe(id: string): Promise<void>;
  
  // Gateway operations
  createGateway(data: InsertGateway): Promise<Gateway>;
  getGateway(id: string): Promise<Gateway | null>;
  getCoreGateways(): Promise<Gateway[]>;
  getCustomGateways(tenantId: string): Promise<Gateway[]>;
  getGatewayByApiKey(apiKey: string): Promise<Gateway | null>;
  updateGatewayHeartbeat(id: string): Promise<void>;
  
  // Probe Result operations
  createProbeResult(data: InsertProbeResult): Promise<ProbeResult>;
  getProbeResults(probeId: string, filters?: any): Promise<ProbeResult[]>;
  
  // Notification Group operations
  createNotificationGroup(data: InsertNotificationGroup): Promise<NotificationGroup>;
  getNotificationGroupsByTenant(tenantId: string): Promise<NotificationGroup[]>;
  
  // Alert operations
  createAlert(data: InsertAlert): Promise<Alert>;
  getAlerts(tenantId: string, filters?: any): Promise<Alert[]>;
  resolveAlert(id: string): Promise<Alert>;
  
  // Dashboard
  getDashboardStats(tenantId: string): Promise<DashboardStats>;
}
```

## Error Handling

### Standard Error Response
```json
{
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": { /* optional */ }
}
```

### HTTP Status Codes
- **200** - Success
- **201** - Created
- **400** - Bad Request (validation errors)
- **401** - Unauthorized (invalid/missing token)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found
- **500** - Internal Server Error

### Common Error Patterns
```typescript
// Validation error
if (!data.name) {
  return res.status(400).json({ message: 'Name is required' });
}

// Permission check
if (req.user.role !== 'SuperAdmin' && resource.tenantId !== req.user.tenantId) {
  return res.status(403).json({ message: 'Insufficient permissions' });
}

// Not found
if (!resource) {
  return res.status(404).json({ message: 'Resource not found' });
}

// Server error
try {
  // ... operation
} catch (error) {
  console.error('Operation error:', error);
  res.status(500).json({ message: 'Failed to perform operation' });
}
```

## Environment Variables Required

### Firebase Configuration
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY=your-private-key
```

### Stripe Configuration
```
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Anthropic Configuration
```
ANTHROPIC_API_KEY=sk-ant-xxx
```

### Database Configuration
```
DATABASE_URL=postgresql://user:password@host:port/database
```

### Logging Configuration (Optional)
```
LOG_MAX_TOTAL_SIZE_MB=1
LOG_MAX_FILE_SIZE_MB=0.5
LOG_DIRECTORY=logs
```

## API Response Patterns

### Standard Success Response
```json
{
  "success": true,
  "data": { /* resource or array */ },
  "timestamp": "2025-10-19T12:00:00.000Z"
}
```

### List Response with Count
```json
{
  "success": true,
  "data": [ /* items */ ],
  "count": 42,
  "timestamp": "2025-10-19T12:00:00.000Z"
}
```

### Resource Creation (with sensitive data)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "key": "nv_xxx", // Only shown once
    "keyPrefix": "nv_abc123"
  },
  "timestamp": "2025-10-19T12:00:00.000Z"
}
```

## Testing the API

### Authentication Headers
```bash
# Firebase JWT
curl -H "Authorization: Bearer <firebase-token>" \
  https://api.netview.com/api/auth/me

# API Key
curl -H "X-API-Key: nv_xxxx" \
  https://api.netview.com/api/probes
```

### Example Requests

#### Register User
```bash
POST /api/auth/register
Authorization: Bearer <firebase-token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "company": "Acme Inc",
  "region": "US"
}
```

#### Create Probe
```bash
POST /api/probes
Authorization: Bearer <firebase-token>
Content-Type: application/json

{
  "name": "API Health Check",
  "description": "Monitor main API endpoint",
  "category": "API",
  "type": "HTTP/HTTPS",
  "configuration": {
    "url": "https://api.example.com/health",
    "method": "GET",
    "expected_status_codes": [200],
    "timeout": 10
  },
  "checkInterval": 300,
  "isActive": true
}
```

#### Submit Probe Results (Gateway)
```bash
POST /api/gateway/results
Content-Type: application/json

{
  "apiKey": "nv_gateway_key_here",
  "results": [
    {
      "probeId": "probe-uuid",
      "status": "Success",
      "resultData": {
        "latency_ms": 142,
        "http_status": 200,
        "response_time": 142
      },
      "checkedAt": "2025-10-19T12:00:00.000Z"
    }
  ]
}
```

## Implementation Checklist

- [ ] Set up Express.js server with TypeScript
- [ ] Configure PostgreSQL database connection
- [ ] Implement Drizzle ORM schema from `shared/schema.ts`
- [ ] Set up Firebase Admin SDK authentication
- [ ] Implement storage interface in `server/storage.ts`
- [ ] Create authentication middleware (Firebase + API Key)
- [ ] Create authorization middleware (role-based + scope-based)
- [ ] Implement all API routes from specification
- [ ] Set up Stripe integration for billing
- [ ] Implement Anthropic AI integration for probe generation
- [ ] Create notification service (email, SMS, webhook)
- [ ] Implement API key management system
- [ ] Set up rotating file logger
- [ ] Add request/response validation with Zod
- [ ] Implement error handling middleware
- [ ] Test all endpoints with different roles/permissions
- [ ] Set up API statistics tracking
- [ ] Configure CORS and security headers
- [ ] Add rate limiting (optional)
- [ ] Document any deviations from specification

## Additional Resources

- **Swagger Spec**: `api-specification.yaml` - Complete OpenAPI 3.0 specification
- **Database Schema**: `shared/schema.ts` - Drizzle ORM schema definitions
- **Existing Docs**:
  - `API.md` - Detailed API endpoint documentation
  - `AUTH.md` - Authentication and authorization flows
  - `DATABASE.md` - Database schema and management
  - `SERVICES.md` - Backend services documentation
  - `GATEWAY.md` - Gateway system documentation
  - `LOGGING.md` - Logging system documentation

## Notes for AI Coder

1. **Security First**: Always validate user permissions before operations
2. **Multi-Tenancy**: Never forget to filter by tenantId (except for SuperAdmins)
3. **Validation**: Use Zod schemas for all request body validation
4. **Error Handling**: Wrap all async operations in try-catch blocks
5. **Logging**: Log all errors and important operations
6. **API Keys**: Never return full API keys except on creation
7. **Probe Configs**: Validate probe-specific configuration based on type
8. **Gateways**: Separate logic for Core vs Custom gateways
9. **Timestamps**: Use ISO 8601 format for all timestamps
10. **Credits**: Track tenant credit usage for billing purposes

Good luck with the implementation! 🚀
