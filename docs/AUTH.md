# Authentication & Authorization Documentation

## Repository Note

**This is a frontend-only repository.** This documentation focuses on the frontend authentication implementation. Backend authentication details are included for reference only.

## Authentication Architecture

NetView uses Firebase Authentication for user sessions. The frontend handles authentication flow and communicates with the backend API for user management.

## Firebase Authentication

### Frontend Flow

**Location**: `client/src/contexts/AuthContext.tsx`

#### 1. Google Sign-In

**Location**: `client/src/lib/firebase.ts`

```typescript
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { signInWithGoogle } from '@/lib/firebase';

// Initiate sign-in (uses popup, not redirect)
await signInWithGoogle();
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

**Note**: Backend authentication implementation is in a separate repository. The frontend sends Firebase ID tokens in the `Authorization` header, and the backend verifies them.

**Frontend Implementation**:
- Token is automatically injected by `queryClient.ts` in API requests
- See `client/src/lib/queryClient.ts` for token injection logic

## Authorization

### Role-Based Access Control (RBAC)

**Roles** (in order of hierarchy):
1. **SuperAdmin** - Full system access, all tenants
2. **Owner** - Full tenant access, billing
3. **Admin** - Manage resources, no billing
4. **Editor** - Create/edit probes
5. **Helpdesk** - Read-only + ticket management
6. **Viewer** - Read-only access

**Frontend Usage**:
- User role is available via `useAuth()` hook: `const { user } = useAuth();`
- Role is included in the user object returned from `/api/auth/me`
- Frontend can conditionally render UI based on user role

### Multi-Tenancy

**Frontend Implementation**:
- User's `tenantId` is available via `useAuth()` hook
- API requests automatically include user context
- Backend handles tenant isolation on the server side

## Security Best Practices

1. **Token expiry**: Firebase tokens auto-refresh
2. **HTTPS only**: All authentication over TLS (enforced in production)
3. **Environment variables**: Never commit Firebase credentials to version control
4. **Token storage**: Firebase handles token storage securely
5. **Sign out**: Always call `signOut()` from AuthContext when logging out
6. **Protected routes**: Use `ProtectedRoute` component to guard authenticated pages
