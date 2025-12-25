# API Documentation

## Overview

**Note**: This is a frontend-only repository. The backend API server runs separately. This documentation describes the API endpoints that the frontend communicates with for reference.

NetView provides RESTful APIs with role-based access control. The frontend communicates with the backend API via HTTP requests, with API proxy configured in `vite.config.ts`.

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

#### POST /api/auth/send-verification-code
Send a 6-digit verification code to an email address for account sign-up.

**Auth**: None (public endpoint)
**Request Body**:
```json
{
  "email": "string"
}
```
**Response**: Success message
**Notes**: 
- Only business email addresses are allowed (public email domains are blocked)
- Code is valid for 10 minutes
- Code is 6 digits numeric
- This endpoint should be called before account creation to verify email ownership

#### POST /api/auth/verify-code
Verify the 6-digit code sent to an email address.

**Auth**: None (public endpoint)
**Request Body**:
```json
{
  "email": "string",
  "code": "string"
}
```
**Response**: Success message
**Notes**: 
- Code must match the one sent via `/api/auth/send-verification-code`
- Code must be verified within 10 minutes of being sent
- After successful verification, user can proceed with Firebase account creation and registration

#### GET /api/auth/me
Get current authenticated user's profile and tenant information.

**Auth**: Firebase JWT Token required
**Request Body**: None
**Response**: User object with tenant information
**Notes**: 
- Email and UID extracted from Firebase token
- Auto-creates user if not found
- Returns user status including email verification, tenant info, role, etc.

#### POST /api/auth/me
Register or update current authenticated user's details.

**Auth**: Firebase JWT Token required
**Request Body** (optional):
```json
{
  "firstName": "string",
  "lastName": "string",
  "company": "string (optional)",
  "region": "string (optional)"
}
```
**Response**: User object with tenant information
**Notes**: 
- Email and UID extracted from Firebase token
- If user exists, updates missing details
- If user doesn't exist, creates user with provided details
- For password sign-in, email verification required before registration
- Returns same format as GET /api/auth/me

### Pricing

#### GET /api/pricing-plans
Get available pricing plans.

**Auth**: None
**Response**: Array of pricing plans from Stripe configuration

### Dashboard

#### GET /api/dashboard
Get tenant dashboard statistics including billing information.

**Auth**: User session
**Response**:
```json
{
  "success": boolean,
  "timestamp": string,
  "data": {
    "total_probes": number,
    "active_probes": number,
    "total_alerts": number,
    "unresolved_alerts": number,
    "total_gateways": number,
    "online_gateways": number,
    "success_rate": number,
    "recent_activity": number,
    "credits_limit": number,
    "credits_used": number,
    "credits_remaining": number,
    "monthly_spending": number,
    "billing_tier": string
  }
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

### Collaborators

#### GET /api/collaborators
List all collaborators for the authenticated tenant.

**Auth**: User session
**Roles**: Owner
**Headers**:
- `X-Tenant-ID`: Tenant ID (integer)
- `X-User-Email`: User email address
**Response**: Array of Collaborator objects

#### GET /api/collaborators/:id
Get a specific collaborator by ID.

**Auth**: User session
**Roles**: Owner
**Headers**:
- `X-Tenant-ID`: Tenant ID (integer)
- `X-User-Email`: User email address
**Response**: Collaborator object

#### POST /api/collaborators
Create a new collaborator (send invite).

**Auth**: User session
**Roles**: Owner
**Headers**:
- `X-Tenant-ID`: Tenant ID (integer)
- `X-User-Email`: User email address
**Request Body**:
```json
{
  "email": "string",
  "role": "Admin | Editor | Helpdesk | Viewer",
  "tenantId": "string (optional)"
}
```
**Response**: Created Collaborator object

#### PUT /api/collaborators/:id
Update an existing collaborator.

**Auth**: User session
**Roles**: Owner
**Headers**:
- `X-Tenant-ID`: Tenant ID (integer)
- `X-User-Email`: User email address
**Request Body**: Partial collaborator configuration
**Response**: Updated Collaborator object

#### DELETE /api/collaborators/:id
Delete a collaborator (soft delete).

**Auth**: User session
**Roles**: Owner
**Headers**:
- `X-Tenant-ID`: Tenant ID (integer)
- `X-User-Email`: User email address
**Response**: Success message

#### POST /api/collaborators/:id/accept
Accept a collaborator invite.

**Auth**: User session (email must match collaborator email)
**Headers**:
- `X-Tenant-ID`: Tenant ID (integer)
- `X-User-Email`: User email address
**Response**: Updated Collaborator object

#### POST /api/collaborators/:id/reject
Reject a collaborator invite.

**Auth**: User session (email must match collaborator email)
**Headers**:
- `X-Tenant-ID`: Tenant ID (integer)
- `X-User-Email`: User email address
**Response**: Updated Collaborator object

### Tenants

#### POST /api/tenants
Create a new tenant.

**Auth**: User session
**Request Body**:
```json
{
  "name": "string",
  "tenantId": "string (optional)"
}
```
**Response**: Created Tenant object
**Notes**: 
- `tenantId` is optional and will be auto-generated from `name` if not provided
- Tenant ID is generated by converting name to lowercase, removing special characters, and replacing spaces with hyphens

#### GET /api/tenants/validate/:tenantId
Validate tenant ID availability.

**Auth**: User session
**Response**:
```json
{
  "available": boolean,
  "message": "string (optional)"
}
```

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
