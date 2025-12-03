# API Documentation

## Overview

NetView provides RESTful APIs with role-based access control. All API routes are defined in `server/routes.ts`.

## Authentication Methods

### 1. Firebase JWT Token
- Header: `Authorization: Bearer <firebase-id-token>`
- Used for user session authentication
- Verified via Firebase Admin SDK

### 2. API Keys
- Header: `Authorization: Bearer <api-key>` or `X-API-Key: <api-key>`
- Format: `nv_<64-char-hex-string>`
- Scope-based permissions
- Managed through API Key endpoints

## API Endpoints

### Authentication

#### POST /api/auth/register
Register a new user with Firebase token.

**Auth**: Firebase JWT Token required
**Request Body**:
```json
{
  "firstName": "string",
  "lastName": "string",
  "company": "string (optional)",
  "region": "string (optional)"
}
```
**Response**: User object
**Notes**: 
- Email and UID extracted from Firebase token
- Auto-creates tenant for non-SuperAdmin users
- Default SuperAdmins: Yaseen.gem@gmail.com, Asia.Yaseentech@gmail.com, contact@yaseenmd.com

#### GET /api/auth/me
Get current authenticated user.

**Auth**: Firebase JWT Token
**Response**: User object

### Pricing

#### GET /api/pricing-plans
Get available pricing plans.

**Auth**: None
**Response**: Array of pricing plans from Stripe configuration

### Dashboard

#### GET /api/dashboard/stats
Get tenant dashboard statistics.

**Auth**: User session
**Response**:
```json
{
  "totalProbes": number,
  "activeProbes": number,
  "totalAlerts": number,
  "unresolvedAlerts": number,
  "totalGateways": number,
  "onlineGateways": number
}
```

### Probes

#### GET /api/probes
List probes for current tenant.

**Auth**: User session OR API Key with `probes:read` scope
**Response**: Array of Probe objects
**Notes**: SuperAdmins see all probes across tenants

#### POST /api/probes
Create a new probe.

**Auth**: User session
**Roles**: SuperAdmin, Owner, Admin, Editor
**Request Body**: Probe configuration (matches `insertProbeSchema`)
```json
{
  "name": "string",
  "description": "string (optional)",
  "type": "Uptime | API | Security | Browser",
  "protocol": "HTTP | HTTPS | TCP | SMTP | DNS (optional)",
  "url": "string",
  "method": "GET | POST | PUT | DELETE (optional)",
  "headers": "object (optional)",
  "body": "string (optional)",
  "expectedStatusCode": number,
  "expectedResponseTime": number,
  "checkInterval": number,
  "isActive": boolean
}
```
**Response**: Created Probe object

#### PUT /api/probes/:id
Update an existing probe.

**Auth**: User session
**Roles**: SuperAdmin, Owner, Admin, Editor
**Request Body**: Partial probe configuration
**Response**: Updated Probe object

#### DELETE /api/probes/:id
Delete a probe.

**Auth**: User session
**Roles**: SuperAdmin, Owner, Admin, Editor
**Response**: Success message

#### POST /api/probes/generate
AI-powered probe generation.

**Auth**: User session
**Roles**: SuperAdmin, Owner, Admin, Editor
**Request Body**:
```json
{
  "url": "string (optional)",
  "code": "string (optional)",
  "description": "string (optional)"
}
```
**Response**: Array of generated probe configurations
**Notes**: Requires Anthropic API key; uses Claude model

### Gateways

#### GET /api/gateways
List gateways.

**Auth**: User session
**Response**: Array of Gateway objects
**Notes**: 
- SuperAdmins see core gateways only
- Tenants see core + their custom gateways

#### POST /api/gateways
Create a custom gateway.

**Auth**: User session
**Roles**: SuperAdmin, Owner, Admin
**Request Body**:
```json
{
  "name": "string",
  "type": "Custom",
  "location": "string",
  "ipAddress": "string (optional)"
}
```
**Response**: Created Gateway object with API key

#### PUT /api/gateways/:id/heartbeat
Update gateway heartbeat.

**Auth**: Gateway API Key
**Response**: Success message

#### GET /api/gateways/:id/probes
Get probes assigned to a gateway.

**Auth**: Gateway API Key
**Response**: Array of Probe objects

#### POST /api/gateways/:id/results
Submit probe results from gateway.

**Auth**: Gateway API Key
**Request Body**: Array of probe results
**Response**: Success message

### Probe Results

#### GET /api/probes/:probeId/results
Get results for a specific probe.

**Auth**: User session
**Query Params**:
- `limit`: Number (default: 100)
- `startDate`: ISO timestamp
- `endDate`: ISO timestamp
**Response**: Array of ProbeResult objects

### Notification Groups

#### GET /api/notification-groups
List notification groups for tenant.

**Auth**: User session
**Response**: Array of NotificationGroup objects

#### POST /api/notification-groups
Create a notification group.

**Auth**: User session
**Roles**: SuperAdmin, Owner, Admin
**Request Body**:
```json
{
  "name": "string",
  "emails": ["string[]"],
  "smsNumbers": ["string[] (optional)"],
  "webhookUrl": "string (optional)",
  "alertThreshold": number
}
```
**Response**: Created NotificationGroup object

#### PUT /api/notification-groups/:id
Update notification group.

**Auth**: User session
**Roles**: SuperAdmin, Owner, Admin
**Response**: Updated NotificationGroup object

#### DELETE /api/notification-groups/:id
Delete notification group.

**Auth**: User session
**Roles**: SuperAdmin, Owner, Admin
**Response**: Success message

### Alerts

#### GET /api/alerts
List alerts for tenant.

**Auth**: User session
**Query Params**:
- `resolved`: boolean (filter by resolved status)
**Response**: Array of Alert objects

#### PUT /api/alerts/:id/resolve
Resolve an alert.

**Auth**: User session
**Response**: Updated Alert object

### Billing (Stripe)

#### POST /api/billing/create-checkout
Create Stripe checkout session.

**Auth**: User session
**Request Body**:
```json
{
  "priceId": "string"
}
```
**Response**: Checkout session URL

#### POST /api/billing/create-portal
Create Stripe customer portal session.

**Auth**: User session
**Response**: Portal session URL

#### GET /api/billing/subscription
Get current subscription details.

**Auth**: User session
**Response**: Subscription object

### API Keys

#### GET /api/api-keys
List API keys for current user.

**Auth**: User session
**Response**: Array of API Key objects (without full key)

#### POST /api/api-keys
Create a new API key.

**Auth**: User session
**Request Body**:
```json
{
  "name": "string",
  "scopes": ["string[] (optional)"],
  "expiresAt": "ISO timestamp (optional)"
}
```
**Response**: Created API Key with full key (only shown once)

#### DELETE /api/api-keys/:id
Revoke an API key.

**Auth**: User session
**Response**: Success message

#### GET /api/api-keys/scopes
List available API key scopes.

**Auth**: User session
**Response**: Array of available scopes with descriptions

### Admin

#### GET /api/admin/tenants
List all tenants (SuperAdmin only).

**Auth**: User session
**Roles**: SuperAdmin
**Response**: Array of Tenant objects

#### GET /api/admin/api-stats
Get API usage statistics.

**Auth**: User session
**Roles**: SuperAdmin, Owner, Admin
**Response**: API analytics data

#### GET /api/admin/logs/stats
Get logging system statistics.

**Auth**: User session
**Roles**: SuperAdmin, Owner, Admin
**Response**: Log file statistics and configuration

## API Key Scopes

Available scopes for API key permissions:
- `probes:read` - Read probe configurations
- `probes:write` - Create/update probes
- `results:read` - Read probe results
- `results:write` - Submit probe results
- `notifications:read` - Read notification configurations
- `notifications:write` - Manage notifications
- `gateways:read` - Read gateway information
- `gateways:write` - Manage custom gateways
- `admin:read` - Read tenant administration data
- `admin:write` - Manage tenant settings

## Role Hierarchy

**SuperAdmin**: Full system access across all tenants
**Owner**: Full access within their tenant
**Admin**: Manage resources within tenant (cannot manage billing)
**Editor**: Create/edit probes and configurations
**Helpdesk**: Read-only access with ticket management
**Viewer**: Read-only access
