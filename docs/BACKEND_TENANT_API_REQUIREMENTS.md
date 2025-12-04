# Backend API Requirements for Tenant/Organization Management

## Overview

This document outlines the backend API endpoints required for tenant/organization creation and validation in NetView. The frontend has been implemented with the following features:

1. **Organization Name Input**: User provides organization name
2. **Auto-generated Tenant ID**: Tenant ID is automatically generated from organization name (lowercase, alphanumeric + hyphens)
3. **Manual Tenant ID Editing**: User can customize the auto-generated tenant ID
4. **Real-time Validation**: Tenant ID availability is validated as user types (with debouncing)
5. **Pre-submission Validation**: Final validation before organization creation

---

## Required API Endpoints

### 1. Validate Tenant ID Availability

#### GET /api/tenants/validate/:tenantId

**Purpose**: Check if a tenant ID is available (not already taken)

**Authentication**: ✅ **REQUIRED** (Firebase JWT Token in Authorization header)

**Headers**:
```
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
X-User-Email: <user-email> (optional, if required by middleware)
```

**URL Parameters**:
- `tenantId` (string, required): The tenant ID to validate (URL-encoded)

**Response (200 OK - Available)**:
```json
{
  "available": true,
  "message": "Tenant ID is available"
}
```

**Response (200 OK - Not Available)**:
```json
{
  "available": false,
  "message": "This tenant ID is already taken"
}
```

**Error Responses**:
- `400`: Invalid tenant ID format (e.g., empty, too short, invalid characters)
- `401`: Invalid or expired Firebase token
- `500`: Internal server error

**Requirements**:
- Verify Firebase token using Firebase Admin SDK
- Extract `email` and `uid` from Firebase token
- Validate tenant ID format:
  - Minimum 3 characters
  - Maximum 50 characters
  - Only lowercase letters (a-z), numbers (0-9), and hyphens (-)
  - Cannot start or end with hyphen
  - Cannot contain consecutive hyphens
- Check database for existing tenant with the same tenant ID
- Return availability status immediately (no rate limiting needed for validation)

**Database Query**:
```sql
SELECT id FROM tenants WHERE tenant_id = :tenantId LIMIT 1;
```

**Example Requests**:
```
GET /api/tenants/validate/acme-inc
GET /api/tenants/validate/my-org-123
```

---

### 2. Create Tenant/Organization

#### POST /api/tenants

**Purpose**: Create a new tenant/organization

**Authentication**: ✅ **REQUIRED** (Firebase JWT Token in Authorization header)

**Headers**:
```
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
X-User-Email: <user-email> (optional, if required by middleware)
```

**Request Body**:
```json
{
  "name": "Acme Inc.",
  "tenantId": "acme-inc"
}
```

**Request Body Schema**:
- `name` (string, required): Organization name (min 3 characters)
- `tenantId` (string, required): Tenant ID (min 3, max 50 characters, lowercase alphanumeric + hyphens)

**Response (201 Created)**:
```json
{
  "data": {
    "id": "uuid-here",
    "tenantId": "acme-inc",
    "name": "Acme Inc.",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "message": "Tenant created successfully"
}
```

**Error Responses**:
- `400`: Invalid request body (missing fields, invalid format)
- `401`: Invalid or expired Firebase token
- `409`: Tenant ID already exists (conflict)
- `500`: Internal server error

**Requirements**:
- Verify Firebase token using Firebase Admin SDK
- Extract `email` and `uid` from Firebase token
- Validate request body:
  - `name` must be at least 3 characters
  - `tenantId` must match format requirements (same as validation endpoint)
- Check if tenant ID already exists (return 409 if exists)
- Create tenant record in database
- Associate authenticated user with the tenant:
  - Update user's `tenant_id` field
  - Set user's role (typically "Owner" for the creator)
- Return created tenant object

**Database Operations**:
1. Check if tenant ID exists:
   ```sql
   SELECT id FROM tenants WHERE tenant_id = :tenantId LIMIT 1;
   ```

2. Create tenant:
   ```sql
   INSERT INTO tenants (id, tenant_id, name, created_at, updated_at)
   VALUES (:id, :tenantId, :name, NOW(), NOW())
   RETURNING *;
   ```

3. Update user:
   ```sql
   UPDATE users 
   SET tenant_id = :tenantId, 
       role = 'Owner',
       updated_at = NOW()
   WHERE firebase_uid = :firebaseUid;
   ```

**Example Request**:
```json
POST /api/tenants
{
  "name": "Acme Corporation",
  "tenantId": "acme-corp"
}
```

---

## Tenant ID Format Rules

The frontend generates tenant IDs using the following rules (backend should validate these):

1. **Convert to lowercase**: "Acme Inc" → "acme inc"
2. **Replace spaces/underscores with hyphens**: "acme inc" → "acme-inc"
3. **Remove special characters**: Only keep a-z, 0-9, and hyphens
4. **Collapse multiple hyphens**: "acme---inc" → "acme-inc"
5. **Trim leading/trailing hyphens**: "-acme-inc-" → "acme-inc"

**Validation Rules**:
- Minimum length: 3 characters
- Maximum length: 50 characters
- Pattern: `^[a-z0-9][a-z0-9-]*[a-z0-9]$` (starts and ends with alphanumeric, can contain hyphens in between)
- Cannot be empty
- Cannot contain consecutive hyphens (enforced by pattern)

**Valid Examples**:
- `acme-inc`
- `my-org-123`
- `company-name`
- `test123`

**Invalid Examples**:
- `Acme-Inc` (uppercase)
- `acme_inc` (underscore)
- `acme inc` (space)
- `-acme-inc` (starts with hyphen)
- `acme-inc-` (ends with hyphen)
- `acme--inc` (consecutive hyphens)
- `ac` (too short, less than 3 characters)

---

## Database Schema Requirements

### Tenants Table

The tenants table should have the following structure:

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tenants_tenant_id ON tenants(tenant_id);
```

**Fields**:
- `id`: UUID primary key
- `tenant_id`: Unique identifier (slug) for the tenant (indexed for fast lookups)
- `name`: Display name of the organization
- `created_at`: Timestamp when tenant was created
- `updated_at`: Timestamp when tenant was last updated

### Users Table Update

Ensure the users table has:
- `tenant_id`: Foreign key to tenants table (nullable for SuperAdmin)
- `role`: User role within the tenant

---

## Security Considerations

### 1. Authentication
- All endpoints require Firebase JWT token authentication
- Verify token using Firebase Admin SDK on every request
- Extract user identity from verified token only

### 2. Authorization
- Users can only create tenants for themselves
- Users cannot create multiple tenants (unless business logic allows it)
- Consider rate limiting for tenant creation (e.g., max 1 tenant per user per day)

### 3. Input Validation
- Always validate tenant ID format server-side (never trust client)
- Sanitize organization name (prevent XSS, SQL injection)
- Enforce length limits on all inputs

### 4. Database
- Use parameterized queries to prevent SQL injection
- Ensure `tenant_id` has unique constraint in database
- Use transactions for tenant creation + user update operations

---

## Error Response Format

All endpoints should return consistent error responses:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional additional details
  }
}
```

**Standard HTTP Status Codes**:
- `200`: Success (for validation endpoint)
- `201`: Created (for tenant creation)
- `400`: Bad Request (validation errors, invalid input)
- `401`: Unauthorized (invalid/expired token, missing auth)
- `409`: Conflict (tenant ID already exists)
- `500`: Internal Server Error

**Error Code Examples**:
- `INVALID_TENANT_ID_FORMAT`: Tenant ID doesn't match required format
- `TENANT_ID_TAKEN`: Tenant ID is already in use
- `MISSING_REQUIRED_FIELD`: Required field is missing from request
- `UNAUTHORIZED`: Authentication failed

---

## Implementation Priority

### Phase 1: Core Functionality (Required)
1. ✅ `GET /api/tenants/validate/:tenantId` - Validate tenant ID availability
2. ✅ `POST /api/tenants` - Create tenant/organization

### Phase 2: Enhanced Features (Optional)
3. `GET /api/tenants` - List user's tenants (if multi-tenant support)
4. `PUT /api/tenants/:id` - Update tenant information
5. `DELETE /api/tenants/:id` - Delete tenant (with proper cleanup)

---

## Testing Requirements

Each endpoint should be tested for:

1. **Happy Path**: Valid requests return expected responses
2. **Authentication**: Unauthenticated requests return 401
3. **Validation**: Invalid inputs return 400 with appropriate error messages
4. **Conflict**: Duplicate tenant IDs return 409
5. **Database**: Tenant is properly created and user is associated
6. **Edge Cases**: 
   - Empty tenant ID
   - Tenant ID with special characters
   - Very long tenant ID (> 50 chars)
   - Tenant ID with only hyphens
   - Concurrent creation attempts with same tenant ID

---

## Frontend Integration Notes

The frontend implementation is ready and will work once these endpoints are implemented:

1. **Tenant ID Validation**: Frontend calls `GET /api/tenants/validate/:tenantId` with debouncing (500ms) as user types
2. **Tenant Creation**: Frontend calls `POST /api/tenants` with `name` and `tenantId` when form is submitted
3. **Error Handling**: Frontend handles 400, 401, 409, and 500 errors appropriately
4. **Success Flow**: On successful creation, frontend updates user context and redirects to dashboard

**Frontend Code Location**:
- Service: `client/src/services/tenantApi.ts`
- Component: `client/src/pages/TenantSelection.tsx`
- Context: `client/src/contexts/AuthContext.tsx`

---

## Example Implementation Flow

### 1. User Types Organization Name
- Frontend auto-generates tenant ID: "Acme Inc" → "acme-inc"
- Frontend displays tenant ID field with generated value

### 2. User Edits Tenant ID (Optional)
- User changes "acme-inc" to "acme-corp"
- Frontend validates format (client-side)
- Frontend calls `GET /api/tenants/validate/acme-corp` (debounced)
- Backend checks database and returns availability

### 3. User Submits Form
- Frontend validates all fields (client-side)
- Frontend calls `GET /api/tenants/validate/acme-corp` one more time (pre-submission check)
- If available, frontend calls `POST /api/tenants` with:
  ```json
  {
    "name": "Acme Inc",
    "tenantId": "acme-corp"
  }
  ```
- Backend creates tenant and associates user
- Frontend receives tenant object and updates UI

---

## Questions for Backend Team

1. Should users be able to create multiple tenants, or is it one tenant per user?
2. What role should the tenant creator have? (Currently assumed "Owner")
3. Should there be any restrictions on tenant ID generation? (e.g., reserved words)
4. Do we need tenant deletion functionality? If yes, what happens to associated data?
5. Should tenant creation be rate-limited? If yes, what limits?

---

## Additional Notes

- The frontend uses console.log for logging (no custom logger found in codebase)
- All API requests use the `apiRequest` helper from `client/src/lib/queryClient.ts`
- Firebase token is automatically included in Authorization header
- The frontend expects tenant object to have: `id`, `tenantId`, `name`, `createdAt`, `updatedAt`

