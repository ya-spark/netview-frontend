# Authentication & Authorization Documentation

## Repository Note

**This is a frontend-only repository.** This documentation focuses on the frontend authentication implementation. Backend authentication details are included for reference only.

## Authentication Architecture

NetView uses Firebase Authentication for user sessions. The frontend handles authentication flow and communicates with the backend API for user management.

## Firebase Authentication

### Setup Instructions

#### 1. Firebase Project Configuration

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication in Firebase Console:
   - Go to **Authentication** > **Sign-in method**
   - Enable **Email/Password** provider
   - Enable **Google** provider and configure OAuth consent screen
3. Register your web app in Firebase Console
4. Copy your Firebase configuration values

#### 2. Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
```

**Note**: These values are prefixed with `VITE_` to be accessible in the browser via `import.meta.env.*`

#### 3. Firebase Console Settings

**Authorized Domains**:
- Add your development domain (e.g., `localhost:5173`)
- Add your production domain
- This is required for Google OAuth to work

**OAuth Redirect URLs**:
- For Google sign-in, ensure your domain is authorized
- No redirect URLs needed (we use popup authentication)

### Frontend Flow

**Location**: `client/src/contexts/AuthContext.tsx`

#### 1. Google Sign-In

**Location**: `client/src/lib/firebase.ts`

```typescript
import { signInWithGoogle } from '@/lib/firebase';

// Initiate sign-in (uses popup, not redirect)
try {
  await signInWithGoogle();
  // User will be automatically authenticated via AuthContext
} catch (error) {
  // Error handling with user-friendly messages
  console.error('Sign-in failed:', error.message);
}
```

**Features**:
- Uses popup authentication (no page redirect)
- Automatically handles account selection
- Includes profile and email scopes
- Provides user-friendly error messages

#### 2. Email/Password Sign-In

**Location**: `client/src/lib/firebase.ts`

```typescript
import { signInWithEmail } from '@/lib/firebase';

try {
  await signInWithEmail(email, password);
  // User will be automatically authenticated via AuthContext
} catch (error) {
  // Error handling with user-friendly messages
  console.error('Sign-in failed:', error.message);
}
```

**Error Handling**:
- `auth/user-not-found`: User-friendly message suggesting sign-up
- `auth/wrong-password`: Clear password error message
- `auth/invalid-email`: Email format validation error
- `auth/invalid-credential`: Generic credential error
- All errors include user-friendly messages

#### 3. Email/Password Sign-Up

**Location**: `client/src/lib/firebase.ts`

```typescript
import { signUpWithEmail } from '@/lib/firebase';

try {
  await signUpWithEmail(email, password);
  // User will be automatically authenticated via AuthContext
} catch (error) {
  // Error handling with user-friendly messages
  console.error('Sign-up failed:', error.message);
}
```

**Validation**:
- Password must be at least 6 characters (Firebase requirement)
- Email format validation
- Duplicate account detection

#### 4. Auth State Listener

The `AuthContext` automatically listens for Firebase authentication state changes:

```typescript
onAuthStateChanged(auth, async (firebaseUser) => {
  if (firebaseUser) {
    // Get Firebase ID token
    const idToken = await firebaseUser.getIdToken();
    
    // User state is managed automatically by AuthContext
    // Mock user data is created for frontend-only development
  } else {
    // User signed out - state is cleared automatically
  }
});
```

**Automatic Features**:
- Token refresh handling
- User state synchronization
- Automatic redirects based on tenant status
- Error logging and handling

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

## Error Handling

The Firebase integration includes comprehensive error handling with user-friendly error messages:

### Common Firebase Errors

| Error Code | User-Friendly Message |
|------------|----------------------|
| `auth/user-not-found` | "No account found with this email address. Please sign up first." |
| `auth/wrong-password` | "Incorrect password. Please try again." |
| `auth/invalid-email` | "Invalid email address format." |
| `auth/email-already-in-use` | "An account with this email already exists. Please sign in instead." |
| `auth/weak-password` | "Password is too weak. Please use at least 6 characters." |
| `auth/popup-closed-by-user` | "Sign-in popup was closed. Please try again." |
| `auth/popup-blocked` | "Popup was blocked by your browser. Please allow popups and try again." |
| `auth/network-request-failed` | "Network error. Please check your internet connection and try again." |

All errors are automatically converted to user-friendly messages in the UI.

## Security Best Practices

1. **Token expiry**: Firebase tokens auto-refresh automatically
2. **HTTPS only**: All authentication over TLS (enforced in production)
3. **Environment variables**: Never commit Firebase credentials to version control
   - Use `.env` file (already in `.gitignore`)
   - Keep `.env.example` updated with placeholder values
4. **Token storage**: Firebase handles token storage securely in browser
5. **Sign out**: Always call `signOut()` from AuthContext when logging out
6. **Protected routes**: Use `ProtectedRoute` component to guard authenticated pages
7. **Input validation**: Client-side validation before Firebase calls
8. **Error messages**: User-friendly error messages without exposing system details

## Troubleshooting

### Google Sign-In Not Working

1. **Check authorized domains**: Ensure your domain is added in Firebase Console > Authentication > Settings > Authorized domains
2. **Check popup blockers**: Ensure browser allows popups for your domain
3. **Check OAuth consent screen**: Ensure Google OAuth is properly configured in Firebase Console
4. **Check environment variables**: Verify all Firebase config variables are set correctly

### Email/Password Sign-In Not Working

1. **Check Email/Password provider**: Ensure it's enabled in Firebase Console > Authentication > Sign-in method
2. **Check environment variables**: Verify all Firebase config variables are set correctly
3. **Check user exists**: Ensure the user account exists in Firebase Authentication
4. **Check password**: Verify password meets Firebase requirements (minimum 6 characters)

### Common Issues

- **"Firebase not configured"**: Check `.env` file has all required variables
- **"Popup blocked"**: Allow popups in browser settings
- **"Network error"**: Check internet connection and Firebase service status
- **"Invalid API key"**: Verify Firebase API key is correct in `.env` file
