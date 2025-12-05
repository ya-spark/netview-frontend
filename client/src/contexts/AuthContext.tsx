import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { getCurrentUser, registerUser } from '@/services/authApi';
import { ApiError, setCurrentUserInfo } from '@/lib/queryClient';
import { logger } from '@/lib/logger';
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
      logger.debug('Syncing backend user state for Firebase user', {
        component: 'AuthContext',
        action: 'sync_backend_user',
        firebaseEmail: firebaseUser.email,
      });
      const backendUser = await getCurrentUser();
      
      // Validate user data
      if (!backendUser || (!backendUser.id && !backendUser.email)) {
        logger.warn('Invalid user data received, treating as user not found', {
          component: 'AuthContext',
          action: 'sync_backend_user',
        });
        setUser(null);
        setSelectedTenant(null);
        setTenants([]);
        return;
      }
      
      logger.info('Backend user synced', {
        component: 'AuthContext',
        action: 'sync_backend_user',
        userId: backendUser.id,
        userEmail: backendUser.email,
        userRole: backendUser.role,
        tenantId: backendUser.tenantId,
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
        logger.info('Email verification required', {
          component: 'AuthContext',
          action: 'sync_backend_user',
          firebaseEmail: firebaseUser.email,
        });
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
        logger.debug('User not found in backend, will be created during onboarding', {
          component: 'AuthContext',
          action: 'sync_backend_user',
          firebaseEmail: firebaseUser.email,
        });
        setUser(null);
        setSelectedTenant(null);
        setTenants([]);
      } else {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Error syncing backend user', err, {
          component: 'AuthContext',
          action: 'sync_backend_user',
          firebaseEmail: firebaseUser.email,
        });
        // Don't set error state here - let individual pages handle it
      }
    }
  };

  // Listen to Firebase auth state changes
  useEffect(() => {
    logger.debug('Setting up Firebase auth state listener', {
      component: 'AuthContext',
      action: 'setup_auth_listener',
    });
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      logger.debug('Firebase auth state changed', {
        component: 'AuthContext',
        action: 'auth_state_changed',
        firebaseEmail: firebaseUser?.email || 'signed out',
      });
      setFirebaseUser(firebaseUser);
      
      // Skip backend sync for public routes
      if (isPublicRoute) {
        return;
      }
      
      // Sync backend user state
      await syncBackendUser(firebaseUser);
    });

    return () => {
      logger.debug('Cleaning up Firebase auth state listener', {
        component: 'AuthContext',
        action: 'cleanup_auth_listener',
      });
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
          logger.debug('No Firebase user, user not authenticated', {
            component: 'AuthContext',
            action: 'check_auth',
          });
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
      logger.info('Signed out from Firebase', {
        component: 'AuthContext',
        action: 'sign_out',
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error signing out from Firebase', err, {
        component: 'AuthContext',
        action: 'sign_out',
      });
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
      logger.info('Starting Google sign-in', {
        component: 'AuthContext',
        action: 'login_google',
      });
      const firebaseUser = await firebaseSignInWithGoogle();
      logger.info('Google sign-in successful', {
        component: 'AuthContext',
        action: 'login_google',
        firebaseEmail: firebaseUser.email,
      });
      setFirebaseUser(firebaseUser);
      
      // Sync backend user state
      await syncBackendUser(firebaseUser);
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Google sign-in failed', err, {
        component: 'AuthContext',
        action: 'login_google',
      });
      throw error;
    }
  };

  const loginWithEmailPassword = async (email: string, password: string) => {
    try {
      logger.info('Starting email/password sign-in', {
        component: 'AuthContext',
        action: 'login_email_password',
        email,
      });
      const firebaseUser = await firebaseSignInWithEmailPassword(email, password);
      logger.info('Email/password sign-in successful', {
        component: 'AuthContext',
        action: 'login_email_password',
        firebaseEmail: firebaseUser.email,
      });
      setFirebaseUser(firebaseUser);
      
      // Sync backend user state
      await syncBackendUser(firebaseUser);
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Email/password sign-in failed', err, {
        component: 'AuthContext',
        action: 'login_email_password',
        email,
      });
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
      logger.info('Retrying registration after email verification', {
        component: 'AuthContext',
        action: 'retry_registration',
        email: emailVerification.email,
      });
      const newUser = await registerUser(
        emailVerification.firstName,
        emailVerification.lastName,
        emailVerification.company
      );
      
      // Validate user data
      if (!newUser || !newUser.id) {
        logger.error('Invalid user data received after registration', new Error('User data is invalid'), {
          component: 'AuthContext',
          action: 'retry_registration',
        }, newUser);
        throw new Error('Registration succeeded but user data is invalid. Please try again.');
      }
      
      logger.info('User registered successfully after verification', {
        component: 'AuthContext',
        action: 'retry_registration',
        userId: newUser.id,
        userEmail: newUser.email,
        userRole: newUser.role,
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
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error retrying registration', err, {
        component: 'AuthContext',
        action: 'retry_registration',
        email: emailVerification.email,
      });
      
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
    
    logger.info('Creating tenant', {
      component: 'AuthContext',
      action: 'create_tenant',
      tenantName: name,
      tenantId,
      userId: user.id,
    });
    
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
      
      logger.info('Tenant created successfully', {
        component: 'AuthContext',
        action: 'create_tenant',
        tenantId: tenant.id,
        tenantName: tenant.name,
        userId: user.id,
      });
      return tenant;
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error creating tenant', err, {
        component: 'AuthContext',
        action: 'create_tenant',
        tenantName: name,
        userId: user.id,
      });
      throw error;
    }
  };

  const loadTenants = async (email: string): Promise<Tenant[]> => {
    if (!user) {
      throw new Error('User must be authenticated to load tenants');
    }
    
    logger.debug('Loading tenants', {
      component: 'AuthContext',
      action: 'load_tenants',
      email,
      userId: user.id,
    });
    
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
    
    logger.info('Tenants loaded', {
      component: 'AuthContext',
      action: 'load_tenants',
      tenantCount: tenantList.length,
      userId: user.id,
    });
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
