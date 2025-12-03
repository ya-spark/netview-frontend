# Authentication & Authorization Documentation

## Authentication Architecture

NetView uses a dual authentication system:
1. **Firebase Authentication** - For user sessions
2. **API Keys** - For programmatic access (users and gateways)

## Firebase Authentication

### Frontend Flow

**Location**: `client/src/contexts/AuthContext.tsx`

#### 1. Google Sign-In

```typescript
import { signInWithRedirect, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// Initiate sign-in
const provider = new GoogleAuthProvider();
await signInWithRedirect(auth, provider);
```

#### 2. Auth State Listener

```typescript
onAuthStateChanged(auth, async (firebaseUser) => {
  if (firebaseUser) {
    // Get Firebase ID token
    const idToken = await firebaseUser.getIdToken();
    
    // Check if user exists in backend
    const response = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${idToken}` }
    });
    
    if (response.ok) {
      const user = await response.json();
      setUser(user);
    } else {
      // Register new user
      await registerUser(firebaseUser, idToken);
    }
  }
});
```

#### 3. Token Injection

**Query Client** automatically injects Firebase token:
```typescript
// client/src/lib/queryClient.ts
const defaultFetchFn = async ({ queryKey }) => {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
  
  const response = await fetch(queryKey[0], {
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    }
  });
  
  return response.json();
};
```

#### 4. Protected Routes

```typescript
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <Redirect to="/login" />;
  
  return <>{children}</>;
}
```

### Backend Verification

**Location**: `server/services/auth.ts`

#### Firebase Admin SDK

```typescript
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize with service account
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});
```

#### Token Verification

```typescript
async function verifyToken(idToken: string) {
  const auth = getAuth();
  const decodedToken = await auth.verifyIdToken(idToken);
  
  return {
    uid: decodedToken.uid,
    email: decodedToken.email
  };
}
```

#### Authentication Middleware

```typescript
async function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  const token = authHeader.substring(7);
  const decodedToken = await verifyToken(token);
  
  const user = await storage.getUserByFirebaseUid(decodedToken.uid);
  if (!user) {
    return res.status(401).json({ message: 'User not found' });
  }
  
  req.user = user;
  next();
}
```

### User Registration

**Endpoint**: `POST /api/auth/register`

```typescript
app.post("/api/auth/register", async (req, res) => {
  // Extract Firebase token
  const token = req.headers.authorization.substring(7);
  const { uid, email } = await verifyToken(token);
  
  // Check if user exists
  const existingUser = await storage.getUserByFirebaseUid(uid);
  if (existingUser) return res.json(existingUser);
  
  // Check if SuperAdmin
  const superAdmins = [
    'Yaseen.gem@gmail.com',
    'Asia.Yaseentech@gmail.com', 
    'contact@yaseenmd.com'
  ];
  
  let role = 'Viewer';
  let tenantId = null;
  
  if (superAdmins.includes(email)) {
    role = 'SuperAdmin';
  } else {
    // Create tenant
    const tenant = await storage.createTenant({
      name: req.body.company || `${req.body.firstName}'s Organization`
    });
    tenantId = tenant.id;
    role = 'Owner';
  }
  
  // Create user
  const user = await storage.createUser({
    firebaseUid: uid,
    email,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    role,
    tenantId
  });
  
  res.json(user);
});
```

## API Key Authentication

### API Key Structure

**Format**: `nv_<64-character-hex-string>`

**Storage**:
- Full key: Never stored (shown once at creation)
- Key prefix: First 8 characters (for display)
- Key hash: SHA-256 hash (for validation)

### API Key Creation

**Endpoint**: `POST /api/api-keys`

```typescript
app.post("/api/api-keys", authenticateUser, async (req, res) => {
  const { fullKey, keyPrefix, keyHash } = ApiKeyManager.generateApiKey();
  
  const apiKey = await storage.createApiKey({
    userId: req.user.id,
    tenantId: req.user.tenantId,
    name: req.body.name,
    keyPrefix,
    keyHash,
    scopes: req.body.scopes || [],
    expiresAt: req.body.expiresAt
  });
  
  // Return full key only once
  res.json({
    ...apiKey,
    fullKey  // Only included in creation response
  });
});
```

### API Key Validation

**Location**: `server/services/api-key-manager.ts`

```typescript
async function validateApiKey(providedKey: string) {
  // Validate format
  if (!providedKey.startsWith('nv_')) {
    return { valid: false, error: 'Invalid format' };
  }
  
  // Hash the provided key
  const keyHash = createHash('sha256')
    .update(providedKey)
    .digest('hex');
  
  // Look up in database
  const apiKey = await storage.getApiKeyByHash(keyHash);
  if (!apiKey) {
    return { valid: false, error: 'Invalid key' };
  }
  
  // Check if active
  if (!apiKey.isActive) {
    return { valid: false, error: 'Key deactivated' };
  }
  
  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt <= new Date()) {
    return { valid: false, error: 'Key expired' };
  }
  
  // Get user
  const user = await storage.getUser(apiKey.userId);
  
  // Update usage stats
  await ApiKeyManager.updateLastUsed(apiKey.id);
  
  return { valid: true, apiKey, user };
}
```

### Dual Authentication Middleware

**Location**: `server/middleware/api-auth.ts`

Accepts either session OR API key:

```typescript
async function authenticateUserOrApiKey(req, res, next) {
  // Try session authentication first
  if (req.headers.authorization?.startsWith('Bearer ')) {
    const token = req.headers.authorization.substring(7);
    
    // Check if it's a Firebase token or API key
    if (token.startsWith('nv_')) {
      // API Key authentication
      const result = await ApiKeyManager.validateApiKey(token);
      if (result.valid) {
        req.apiKeyPrincipal = {
          user: result.user,
          apiKey: result.apiKey,
          scopes: result.apiKey.scopes
        };
        return next();
      }
    } else {
      // Firebase token authentication
      const decodedToken = await verifyToken(token);
      const user = await storage.getUserByFirebaseUid(decodedToken.uid);
      if (user) {
        req.user = user;
        return next();
      }
    }
  }
  
  // Try X-API-Key header
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    const result = await ApiKeyManager.validateApiKey(apiKey);
    if (result.valid) {
      req.apiKeyPrincipal = {
        user: result.user,
        apiKey: result.apiKey,
        scopes: result.apiKey.scopes
      };
      return next();
    }
  }
  
  return res.status(401).json({ message: 'Authentication required' });
}
```

## Authorization

### Role-Based Access Control (RBAC)

**Roles** (in order of hierarchy):
1. **SuperAdmin** - Full system access, all tenants
2. **Owner** - Full tenant access, billing
3. **Admin** - Manage resources, no billing
4. **Editor** - Create/edit probes
5. **Helpdesk** - Read-only + ticket management
6. **Viewer** - Read-only access

### Role Middleware

```typescript
function requireRole(allowedRoles: string[]) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    next();
  };
}

// Usage
app.post("/api/probes", 
  authenticateUser,
  requireRole(['SuperAdmin', 'Owner', 'Admin', 'Editor']),
  handler
);
```

### Scope-Based Authorization

For API keys:

```typescript
function requireScopes(requiredScopes: string[]) {
  return (req, res, next) => {
    const principal = req.apiKeyPrincipal;
    if (!principal) {
      return res.status(401).json({ message: 'API key required' });
    }
    
    const hasAllScopes = requiredScopes.every(scope => 
      principal.scopes.includes(scope)
    );
    
    if (!hasAllScopes) {
      return res.status(403).json({ 
        message: 'Insufficient API key permissions',
        required: requiredScopes,
        granted: principal.scopes
      });
    }
    
    next();
  };
}

// Usage
app.get("/api/probes",
  authenticateUserOrApiKey,
  requireScopes(['probes:read']),
  handler
);
```

### Combined Authorization

Role OR Scope based:

```typescript
function requireRoleOrScopes(roles: string[], scopes: string[]) {
  return (req, res, next) => {
    // Check user role
    if (req.user && roles.includes(req.user.role)) {
      return next();
    }
    
    // Check API key scopes
    if (req.apiKeyPrincipal) {
      const hasAllScopes = scopes.every(scope => 
        req.apiKeyPrincipal.scopes.includes(scope)
      );
      if (hasAllScopes) return next();
    }
    
    return res.status(403).json({ message: 'Insufficient permissions' });
  };
}
```

## Multi-Tenancy

### Tenant Isolation

**Data access pattern**:
```typescript
app.get("/api/probes", authenticateUser, async (req, res) => {
  // SuperAdmin sees all
  if (req.user.role === 'SuperAdmin') {
    const allProbes = await storage.getAllProbes();
    return res.json(allProbes);
  }
  
  // Others see only their tenant's data
  const probes = await storage.getProbesByTenant(req.user.tenantId);
  res.json(probes);
});
```

### Gateway Authentication

Gateways use API keys with specific scopes:
- `gateways:read` - Fetch assigned probes
- `results:write` - Submit results

```typescript
// Gateway fetches probes
GET /api/gateways/:id/probes
Authorization: Bearer nv_gateway_api_key

// Gateway submits results
POST /api/gateways/:id/results
Authorization: Bearer nv_gateway_api_key
```

## Security Best Practices

1. **Token expiry**: Firebase tokens auto-refresh
2. **API key rotation**: Revoke old, create new
3. **Scope limitation**: Grant minimal required scopes
4. **HTTPS only**: All authentication over TLS
5. **Rate limiting**: Prevent brute force attacks
6. **Audit logs**: Track authentication events
7. **Session timeout**: Frontend auto sign-out
8. **Key hashing**: Never store plaintext keys
