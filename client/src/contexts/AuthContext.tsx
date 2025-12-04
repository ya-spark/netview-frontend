import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { getCurrentUser, registerUser } from '@/services/authApi';
import { ApiError, setCurrentUserInfo } from '@/lib/queryClient';
import { 
  onAuthStateChange, 
  getCurrentUser as getFirebaseUser,
  signOut as firebaseSignOut,
  signInWithGoogle as firebaseSignInWithGoogle,
  signInWithEmailPassword as firebaseSignInWithEmailPassword,
  User as FirebaseUser
} from '@/lib/firebase';

// Define User type locally since shared schema is not available
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  tenantName?: string;
  company?: string;
  createdAt: string;
  updatedAt: string;
}

interface Tenant {
  id: string;
  name: string;
  email: string; // User email associated with tenant
  createdAt: string;
}

interface EmailVerificationState {
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  selectedTenant: Tenant | null;
  tenants: Tenant[];
  loading: boolean;
  error: Error | null;
  emailVerification: EmailVerificationState | null;
  signOut: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithEmailPassword: (email: string, password: string) => Promise<void>;
  setSelectedTenant: (tenant: Tenant | null) => void;
  createTenant: (name: string, tenantId?: string) => Promise<Tenant>;
  loadTenants: (email: string) => Promise<Tenant[]>;
  clearError: () => void;
  setError: (error: Error | null) => void;
  retryRegistration: () => Promise<User>;
  clearEmailVerification: () => void;
  syncBackendUser: (firebaseUser: FirebaseUser | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [emailVerification, setEmailVerification] = useState<EmailVerificationState | null>(null);

  // List of public routes that don't need auth initialization
  const publicRoutes = ['/', '/features', '/pricing', '/docs', '/login'];
  const isPublicRoute = publicRoutes.includes(location);

  // Sync backend user state when Firebase auth state changes
  const syncBackendUser = async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      setUser(null);
      setSelectedTenant(null);
      setTenants([]);
      setEmailVerification(null);
      return;
    }

    try {
      console.log('🔄 Syncing backend user state for Firebase user:', firebaseUser.email);
      const backendUser = await getCurrentUser();
      
      // Validate user data
      if (!backendUser || (!backendUser.id && !backendUser.email)) {
        console.warn('⚠️ Invalid user data received, treating as user not found');
        setUser(null);
        setSelectedTenant(null);
        setTenants([]);
        return;
      }
      
      console.log('👤 Backend user synced:', { 
        id: backendUser.id, 
        email: backendUser.email, 
        role: backendUser.role,
        tenantId: backendUser.tenantId 
      });
      setUser(backendUser);
      
      // Update global user info for API headers (dev mode requires X-User-Email and X-Tenant-ID)
      setCurrentUserInfo(backendUser.email, backendUser.tenantId);
      
      // Set selected tenant if user has one
      if (backendUser.tenantId && backendUser.tenantName) {
        setSelectedTenant({
          id: backendUser.tenantId,
          name: backendUser.tenantName,
          email: backendUser.email,
          createdAt: backendUser.createdAt || new Date().toISOString(),
        });
      } else {
        setSelectedTenant(null);
      }
      setTenants([]);
    } catch (error: any) {
      // Check if error is 403 EMAIL_NOT_VERIFIED
      const errorMessageLower = error.message?.toLowerCase() || '';
      const isEmailNotVerified = error instanceof ApiError && 
          error.status === 403 && 
          (error.code === 'EMAIL_NOT_VERIFIED' ||
           (errorMessageLower.includes('email') && errorMessageLower.includes('verification')));
      
      if (isEmailNotVerified) {
        console.log('📧 Email verification required');
        const email = error.details?.email || firebaseUser.email;
        if (email) {
          setEmailVerification({
            email,
            firstName: error.details?.firstName || 'User',
            lastName: error.details?.lastName || '',
            company: error.details?.company,
          });
        }
        setUser(null);
        setSelectedTenant(null);
        setTenants([]);
        return;
      }
      
      // 404 or 401 - user doesn't exist in backend yet
      const isNotFound = error instanceof ApiError && error.status === 404;
      const isUnauthorized = error instanceof ApiError && error.status === 401;
      
      if (isNotFound || isUnauthorized) {
        console.log('🚪 User not found in backend, will be created during onboarding');
        setUser(null);
        setSelectedTenant(null);
        setTenants([]);
      } else {
        console.error('❌ Error syncing backend user:', error);
        // Don't set error state here - let individual pages handle it
      }
    }
  };

  // Listen to Firebase auth state changes
  useEffect(() => {
    console.log('🔐 Setting up Firebase auth state listener');
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      console.log('🔐 Firebase auth state changed:', firebaseUser?.email || 'signed out');
      setFirebaseUser(firebaseUser);
      
      // Skip backend sync for public routes
      if (isPublicRoute) {
        return;
      }
      
      // Sync backend user state
      await syncBackendUser(firebaseUser);
    });

    return () => {
      console.log('🔐 Cleaning up Firebase auth state listener');
      unsubscribe();
    };
  }, [isPublicRoute]);

  useEffect(() => {
    // Skip auth initialization for public pages
    if (isPublicRoute) {
      setLoading(false);
      return;
    }

    // Initialize auth for non-public pages
    setLoading(true);
    
    // Check authentication status with backend
    const checkAuth = async () => {
      try {
        // First check Firebase auth state
        const currentFirebaseUser = getFirebaseUser();
        if (!currentFirebaseUser) {
          console.log('🚪 No Firebase user, user not authenticated');
          setUser(null);
          setSelectedTenant(null);
          setTenants([]);
          setLoading(false);
          return;
        }

        // Sync backend user state
        await syncBackendUser(currentFirebaseUser);
      } finally {
        // Always set loading to false after sync completes
        setLoading(false);
      }
    };

    checkAuth();
  }, [isPublicRoute, location]);

  const signOut = async () => {
    try {
      // Sign out from Firebase
      await firebaseSignOut();
      console.log('✅ Signed out from Firebase');
    } catch (error: any) {
      console.error('❌ Error signing out from Firebase:', error);
      // Continue with local state cleanup even if Firebase signout fails
    }
    
    // Clear local state
    setUser(null);
    setFirebaseUser(null);
    setSelectedTenant(null);
    setTenants([]);
    setError(null);
    // Clear global user info for API headers
    setCurrentUserInfo();
    setEmailVerification(null);
  };

  const loginWithGoogle = async () => {
    try {
      console.log('🔐 Login: Starting Google sign-in...');
      const firebaseUser = await firebaseSignInWithGoogle();
      console.log('✅ Login: Google sign-in successful');
      setFirebaseUser(firebaseUser);
      
      // Sync backend user state
      await syncBackendUser(firebaseUser);
    } catch (error: any) {
      console.error('❌ Login: Google sign-in failed:', error);
      throw error;
    }
  };

  const loginWithEmailPassword = async (email: string, password: string) => {
    try {
      console.log('🔐 Login: Starting email/password sign-in...');
      const firebaseUser = await firebaseSignInWithEmailPassword(email, password);
      console.log('✅ Login: Email/password sign-in successful');
      setFirebaseUser(firebaseUser);
      
      // Sync backend user state
      await syncBackendUser(firebaseUser);
    } catch (error: any) {
      console.error('❌ Login: Email/password sign-in failed:', error);
      throw error;
    }
  };

  const clearError = () => {
    setError(null);
  };

  const clearEmailVerification = () => {
    setEmailVerification(null);
  };

  const retryRegistration = async (): Promise<User> => {
    if (!emailVerification) {
      throw new Error('No pending registration to retry');
    }

    try {
      console.log('🔄 Retrying registration after email verification...');
      const newUser = await registerUser(
        emailVerification.firstName,
        emailVerification.lastName,
        emailVerification.company
      );
      
      // Validate user data
      if (!newUser || !newUser.id) {
        console.error('❌ Invalid user data received:', newUser);
        throw new Error('Registration succeeded but user data is invalid. Please try again.');
      }
      
      console.log('✅ User registered successfully after verification:', { 
        id: newUser.id, 
        email: newUser.email, 
        role: newUser.role 
      });
      
      setUser(newUser);
      setEmailVerification(null);
      setError(null); // Clear any error state
      
      // Set selected tenant if user has one (auto-created during registration)
      if (newUser.tenantId && newUser.tenantName) {
        setSelectedTenant({
          id: newUser.tenantId,
          name: newUser.tenantName,
          email: newUser.email,
          createdAt: newUser.createdAt || new Date().toISOString(),
        });
      }
      setTenants([]);
      
      // Return the user for navigation purposes
      return newUser;
    } catch (error: any) {
      console.error('❌ Error retrying registration:', error);
      
      // If still EMAIL_NOT_VERIFIED, keep verification state
      if (error instanceof ApiError && 
          error.status === 403 && 
          error.code === 'EMAIL_NOT_VERIFIED') {
        // Keep verification state, user can try again
        throw error;
      }
      
      // For other errors, set error state but keep verification state so user can retry
      const errorMessage = error.message || 'Failed to complete registration. Please try again.';
      setError(new Error(errorMessage));
      throw error;
    }
  };

  const createTenant = async (name: string, tenantId?: string): Promise<Tenant> => {
    if (!user) {
      throw new Error('User must be authenticated to create a tenant');
    }
    
    console.log('🏢 Creating tenant:', { name, tenantId });
    
    // Import tenant API service
    const { createTenant: createTenantApi } = await import('@/services/tenantApi');
    
    try {
      const newTenant = await createTenantApi(name, tenantId);
      
      // Convert API response to Tenant type
      const tenant: Tenant = {
        id: newTenant.id || newTenant.tenantId,
        name: newTenant.name,
        email: user.email,
        createdAt: newTenant.createdAt || new Date().toISOString(),
      };
      
      // Update user state with new tenant
      if (user) {
        const updatedUser = {
          ...user,
          tenantId: tenant.id,
          tenantName: tenant.name,
          updatedAt: new Date().toISOString(),
        };
        setUser(updatedUser);
        setSelectedTenant(tenant);
        
        // Update tenants list
        const updatedTenants = [...tenants, tenant];
        setTenants(updatedTenants);
      }
      
      console.log('✅ Tenant created successfully:', tenant);
      return tenant;
    } catch (error: any) {
      console.error('❌ Error creating tenant:', error);
      throw error;
    }
  };

  const loadTenants = async (email: string): Promise<Tenant[]> => {
    if (!user) {
      throw new Error('User must be authenticated to load tenants');
    }
    
    console.log('📋 Loading tenants for:', email);
    
    // For regular users, tenant is included in user object
    // For SuperAdmins, use /api/admin/tenants endpoint
    // For now, return empty array as tenant info is in user object
    const tenantList: Tenant[] = [];
    
    if (user.tenantId && user.tenantName) {
      tenantList.push({
        id: user.tenantId,
        name: user.tenantName,
        email: user.email,
        createdAt: user.createdAt,
      });
    }
    
    setTenants(tenantList);
    return tenantList;
  };

  const handleSetSelectedTenant = (tenant: Tenant | null) => {
    if (!user) {
      throw new Error('User must be authenticated to select a tenant');
    }
    
    setSelectedTenant(tenant);
    
    // Update user state with selected tenant
    // Note: Actual tenant selection should be handled by backend API
    if (tenant) {
      const updatedUser = {
        ...user,
        tenantId: tenant.id,
        tenantName: tenant.name,
        updatedAt: new Date().toISOString(),
      };
      setUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user,
      firebaseUser,
      selectedTenant,
      tenants,
      loading,
      error,
      emailVerification,
      signOut,
      loginWithGoogle,
      loginWithEmailPassword,
      setSelectedTenant: handleSetSelectedTenant,
      createTenant,
      loadTenants,
      clearError,
      setError,
      retryRegistration,
      clearEmailVerification,
      syncBackendUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
