# Backend API Requirements for Complete Login Architecture

## Overview

This document outlines all backend API endpoints required for a complete authentication and user management system in NetView. The frontend uses Firebase Authentication for client-side auth, but requires backend APIs for user registration, profile management, and session handling.

## Authentication Flow

1. **Client-side**: Firebase handles authentication (Google OAuth or Email/Password)
2. **Token Exchange**: Frontend sends Firebase ID token to backend
3. **Backend Verification**: Backend verifies token using Firebase Admin SDK
4. **User Management**: Backend manages user profiles, tenants, and roles

---

## Required API Endpoints

### 1. Email Verification (Sign-Up Flow)

#### POST /api/auth/send-verification-code
**Purpose**: Send a 6-digit verification code to email address during sign-up

**Authentication**: ❌ **PUBLIC** (No authentication required)

**Request Body**:
```json
{
  "email": "user@company.com"
}
```

**Response**: 
```json
{
  "message": "Verification code sent successfully",
  "expiresIn": 600
}
```

**Requirements**:
- Validate email format
- Check if email is a business email (block public domains like gmail.com, yahoo.com)
- Generate 6-digit numeric code
- Store code with expiration (10 minutes)
- Send email with verification code
- Rate limiting: Prevent abuse (e.g., max 3 requests per email per hour)

**Error Responses**:
- `400`: Invalid email format
- `400`: Public email domains not allowed
- `429`: Too many requests (rate limited)
- `500`: Email sending failed

---

#### POST /api/auth/verify-code
**Purpose**: Verify the 6-digit code sent to email address

**Authentication**: ❌ **PUBLIC** (No authentication required)

**Request Body**:
```json
{
  "email": "user@company.com",
  "code": "123456"
}
```

**Response**:
```json
{
  "message": "Code verified successfully",
  "verified": true
}
```

**Requirements**:
- Verify code matches stored code for email
- Check code expiration (10 minutes)
- Mark email as verified (store verification status)
- Allow user to proceed with Firebase account creation after verification

**Error Responses**:
- `400`: Invalid code format (must be 6 digits)
- `400`: Code expired
- `400`: Invalid code
- `404`: No verification code found for email

---

### 2. User Registration

#### POST /api/auth/register
**Purpose**: Register a new user in backend after Firebase account creation

**Authentication**: ✅ **REQUIRED** (Firebase JWT Token in Authorization header)

**Headers**:
```
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "company": "Acme Corp" // optional
}
```

**Response**: User object
```json
{
  "id": "user-uuid",
  "email": "user@company.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "Owner",
  "tenantId": "tenant-uuid",
  "tenantName": "Acme Corp",
  "company": "Acme Corp",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Requirements**:
- Verify Firebase token using Firebase Admin SDK
- Extract `uid` and `email` from Firebase token
- Check if user already exists (by Firebase UID or email)
- If user exists, return existing user data
- If new user:
  - Create user record in database
  - Determine role based on business logic (default: Owner)
  - Create tenant automatically for non-SuperAdmin users:
    - Tenant name = company name or email domain
    - Associate user with tenant
  - Return complete user object with tenant info

**Error Responses**:
- `401`: Invalid or expired Firebase token
- `400`: Missing required fields (firstName, lastName)
- `409`: User already exists (should return existing user instead)
- `500`: Database error

**Notes**:
- Email verification should be completed before calling this endpoint
- Email and UID are extracted from Firebase token (not from request body)

---

### 3. Get Current User

#### GET /api/auth/me
**Purpose**: Get current authenticated user's profile and tenant information

**Authentication**: ✅ **REQUIRED** (Firebase JWT Token in Authorization header)

**Headers**:
```
Authorization: Bearer <firebase-id-token>
```

**Response**: User object
```json
{
  "id": "user-uuid",
  "email": "user@company.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "Owner",
  "tenantId": "tenant-uuid",
  "tenantName": "Acme Corp",
  "company": "Acme Corp",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Requirements**:
- Verify Firebase token using Firebase Admin SDK
- Extract `uid` from Firebase token
- Lookup user by Firebase UID
- Return complete user object with tenant information
- Include user role and permissions

**Error Responses**:
- `401`: Invalid or expired Firebase token
- `404`: User not found (should trigger registration flow in frontend)
- `500`: Database error

**Notes**:
- This endpoint is called automatically after Firebase authentication
- If user not found (404), frontend will trigger registration flow
- Used to refresh user state on page reload

---

### 4. Password Reset (Optional - Future Enhancement)

#### POST /api/auth/forgot-password
**Purpose**: Request password reset link/code

**Authentication**: ❌ **PUBLIC** (No authentication required)

**Request Body**:
```json
{
  "email": "user@company.com"
}
```

**Response**:
```json
{
  "message": "Password reset instructions sent to email"
}
```

**Requirements**:
- Validate email exists in system
- Generate reset token (expires in 1 hour)
- Send password reset email with link/token
- Rate limiting: Prevent abuse

**Error Responses**:
- `400`: Invalid email format
- `404`: Email not found (for security, return success message anyway)
- `429`: Too many requests

---

#### POST /api/auth/reset-password
**Purpose**: Reset password using reset token

**Authentication**: ❌ **PUBLIC** (No authentication required, but requires reset token)

**Request Body**:
```json
{
  "token": "reset-token-from-email",
  "newPassword": "newSecurePassword123"
}
```

**Response**:
```json
{
  "message": "Password reset successfully"
}
```

**Requirements**:
- Verify reset token is valid and not expired
- Update password in Firebase (using Admin SDK)
- Invalidate reset token
- Optionally invalidate all user sessions

**Error Responses**:
- `400`: Invalid or expired token
- `400`: Password doesn't meet requirements
- `500`: Firebase update failed

---

### 5. User Profile Management (Optional - Future Enhancement)

#### PUT /api/auth/profile
**Purpose**: Update user profile information

**Authentication**: ✅ **REQUIRED** (Firebase JWT Token)

**Headers**:
```
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "company": "New Company Name"
}
```

**Response**: Updated user object

**Requirements**:
- Verify Firebase token
- Update user profile fields
- Return updated user object

**Error Responses**:
- `401`: Invalid or expired token
- `400`: Invalid input data
- `500`: Database error

---

#### GET /api/auth/profile
**Purpose**: Get user profile (same as /api/auth/me, but more detailed)

**Authentication**: ✅ **REQUIRED** (Firebase JWT Token)

**Response**: Detailed user profile object

---

## Authentication Header Format

All authenticated endpoints require the Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase-id-token>
```

**Token Verification Process**:
1. Extract token from `Authorization` header
2. Verify token using Firebase Admin SDK: `admin.auth().verifyIdToken(token)`
3. Extract user information from decoded token:
   - `uid`: Firebase user ID
   - `email`: User email
   - `email_verified`: Email verification status
4. Use `uid` to lookup user in database
5. Attach user context to request for authorization checks

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
- `200`: Success
- `201`: Created (for POST endpoints that create resources)
- `400`: Bad Request (validation errors, invalid input)
- `401`: Unauthorized (invalid/expired token, missing auth)
- `403`: Forbidden (valid token but insufficient permissions)
- `404`: Not Found (resource doesn't exist)
- `409`: Conflict (resource already exists)
- `429`: Too Many Requests (rate limiting)
- `500`: Internal Server Error

---

## Security Considerations

### 1. Token Verification
- Always verify Firebase tokens server-side
- Never trust client-provided user information
- Extract user identity from verified token only

### 2. Rate Limiting
- Implement rate limiting on public endpoints:
  - `/api/auth/send-verification-code`: Max 3 requests per email per hour
  - `/api/auth/verify-code`: Max 5 attempts per email per hour
  - `/api/auth/forgot-password`: Max 3 requests per email per hour

### 3. Email Validation
- Validate email format server-side
- Enforce business email requirement (block public domains)
- Maintain allowlist/blocklist for email domains

### 4. Code Security
- Use cryptographically secure random number generation for verification codes
- Store codes securely (hashed or encrypted)
- Enforce expiration times (10 minutes for verification codes)
- One-time use codes (invalidate after successful verification)

### 5. Password Security
- Enforce password requirements (min 8 characters, complexity)
- Use Firebase for password storage (never store passwords directly)
- Implement password reset token expiration

---

## Database Schema Requirements

### Users Table
- `id`: UUID (primary key)
- `firebase_uid`: String (unique, indexed) - Firebase user ID
- `email`: String (unique, indexed)
- `first_name`: String
- `last_name`: String
- `role`: Enum (SuperAdmin, Owner, Admin, Editor, Helpdesk, Viewer)
- `tenant_id`: UUID (foreign key to tenants table, nullable for SuperAdmin)
- `company`: String (optional)
- `created_at`: Timestamp
- `updated_at`: Timestamp

### Tenants Table
- `id`: UUID (primary key)
- `name`: String
- `created_at`: Timestamp
- `updated_at`: Timestamp

### Email Verification Codes Table (for sign-up flow)
- `id`: UUID (primary key)
- `email`: String (indexed)
- `code`: String (hashed)
- `expires_at`: Timestamp (indexed)
- `verified`: Boolean
- `created_at`: Timestamp

---

## Implementation Priority

### Phase 1: Core Authentication (Required)
1. ✅ `POST /api/auth/send-verification-code` - Public
2. ✅ `POST /api/auth/verify-code` - Public
3. ✅ `POST /api/auth/register` - Authenticated
4. ✅ `GET /api/auth/me` - Authenticated

### Phase 2: Enhanced Features (Optional)
5. `POST /api/auth/forgot-password` - Public
6. `POST /api/auth/reset-password` - Public
7. `PUT /api/auth/profile` - Authenticated
8. `GET /api/auth/profile` - Authenticated

---

## Testing Requirements

Each endpoint should be tested for:

1. **Happy Path**: Valid requests return expected responses
2. **Authentication**: Unauthenticated requests to protected endpoints return 401
3. **Validation**: Invalid input returns 400 with clear error messages
4. **Error Handling**: Server errors return 500 with appropriate logging
5. **Rate Limiting**: Rate limit enforcement works correctly
6. **Security**: Token verification prevents unauthorized access
7. **Edge Cases**: 
   - Expired tokens
   - Invalid token format
   - Missing required fields
   - Duplicate registrations
   - Expired verification codes

---

## Integration Notes

### Frontend Integration Points

1. **Sign-Up Flow** (`SignUp.tsx`):
   - Step 1: Call `POST /api/auth/send-verification-code` (currently skipped in code)
   - Step 3: Call `POST /api/auth/verify-code` (currently skipped in code)
   - After Firebase account creation: `POST /api/auth/register` (handled by AuthContext)

2. **Login Flow** (`Login.tsx`):
   - After Firebase authentication: `GET /api/auth/me` (handled by AuthContext)

3. **Auth Context** (`AuthContext.tsx`):
   - On Firebase auth state change: `GET /api/auth/me`
   - If 404 (user not found): `POST /api/auth/register`
   - Token automatically included in all requests via `queryClient.ts`

4. **API Client** (`queryClient.ts`):
   - Automatically injects Firebase token: `Authorization: Bearer <token>`
   - Handles 401 errors (triggers sign-out)

---

## Summary

### Public Endpoints (No Authentication)
- `POST /api/auth/send-verification-code`
- `POST /api/auth/verify-code`
- `POST /api/auth/forgot-password` (optional)
- `POST /api/auth/reset-password` (optional)

### Authenticated Endpoints (Firebase JWT Token Required)
- `POST /api/auth/register`
- `GET /api/auth/me`
- `PUT /api/auth/profile` (optional)
- `GET /api/auth/profile` (optional)

### Minimum Required for Current Implementation
1. `POST /api/auth/send-verification-code` (Public)
2. `POST /api/auth/verify-code` (Public)
3. `POST /api/auth/register` (Authenticated)
4. `GET /api/auth/me` (Authenticated)

All authenticated endpoints must verify the Firebase JWT token using Firebase Admin SDK and extract user identity from the verified token.

