import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { getCurrentUser, registerUser, logout as logoutApi } from '@/services/authApi';
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
  firstName: string; // Can be empty string initially, should be set from frontend
  lastName: string | null; // Can be null
  role: string;
  tenantId: string | null; // Can be null
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
  setEmailVerification: (state: EmailVerificationState | null) => void;
  syncBackendUser: (firebaseUser: FirebaseUser | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
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

  // Refs to prevent infinite loops and track sync state
  const isSyncingRef = useRef(false);
  const lastSyncedEmailRef = useRef<string | null>(null);
  const selectedTenantRef = useRef<Tenant | null>(null);
  const userRef = useRef<User | null>(null);

  // Update refs when state changes
  useEffect(() => {
    selectedTenantRef.current = selectedTenant;
  }, [selectedTenant]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Sync backend user state when Firebase auth state changes
  const syncBackendUser = useCallback(async (firebaseUser: FirebaseUser | null) => {
    // Prevent concurrent syncs
    if (isSyncingRef.current) {
      logger.debug('Sync already in progress, skipping', {
        component: 'AuthContext',
        action: 'sync_backend_user',
        firebaseEmail: firebaseUser?.email || 'null',
      });
      return;
    }

    // Prevent syncing the same user repeatedly
    const currentEmail = firebaseUser?.email || null;
    if (currentEmail === lastSyncedEmailRef.current && userRef.current && firebaseUser) {
      logger.debug('User already synced, skipping duplicate sync', {
        component: 'AuthContext',
        action: 'sync_backend_user',
        firebaseEmail: currentEmail,
        userId: userRef.current.id,
      });
      return;
    }

    if (!firebaseUser) {
      logger.debug('No Firebase user, clearing state', {
        component: 'AuthContext',
        action: 'sync_backend_user',
      });
      setUser(null);
      setSelectedTenant(null);
      setTenants([]);
      setEmailVerification(null);
      lastSyncedEmailRef.current = null;
      userRef.current = null;
      selectedTenantRef.current = null;
      return;
    }

    isSyncingRef.current = true;
    lastSyncedEmailRef.current = firebaseUser.email;

    try {
      logger.info('Starting backend user sync', {
        component: 'AuthContext',
        action: 'sync_backend_user_start',
        firebaseEmail: firebaseUser.email,
        currentUserId: userRef.current?.id,
        hasSelectedTenant: !!selectedTenantRef.current,
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
        userRef.current = null;
        selectedTenantRef.current = null;
        return;
      }
      
      logger.info('Backend user synced', {
        component: 'AuthContext',
        action: 'sync_backend_user',
        userId: backendUser.id,
        userEmail: backendUser.email,
        userRole: backendUser.role,
        tenantId: backendUser.tenantId,
        previousUserId: userRef.current?.id,
      });
      
      setUser(backendUser);
      userRef.current = backendUser;
      
      // Set selected tenant if user has one from backend
      if (backendUser.tenantId && backendUser.tenantName) {
        logger.debug('Setting selected tenant from backend user', {
          component: 'AuthContext',
          action: 'sync_backend_user',
          tenantId: backendUser.tenantId,
          tenantName: backendUser.tenantName,
        });
        const tenant = {
          id: backendUser.tenantId,
          name: backendUser.tenantName,
          email: backendUser.email,
          createdAt: backendUser.createdAt || new Date().toISOString(),
        };
        setSelectedTenant(tenant);
        selectedTenantRef.current = tenant;
        setCurrentUserInfo(backendUser.email, backendUser.tenantId);
      } else if (selectedTenantRef.current) {
        // Preserve existing selectedTenant if backend user doesn't have one
        logger.debug('Backend user has no tenantId, preserving existing selectedTenant', {
          component: 'AuthContext',
          action: 'sync_backend_user',
          hasSelectedTenant: !!selectedTenantRef.current,
          preservedTenantId: selectedTenantRef.current.id,
        });
        setCurrentUserInfo(backendUser.email, selectedTenantRef.current.id);
      } else {
        logger.debug('No tenant to preserve, clearing tenant info', {
          component: 'AuthContext',
          action: 'sync_backend_user',
        });
        setCurrentUserInfo(backendUser.email, '');
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
        userRef.current = null;
        selectedTenantRef.current = null;
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
        userRef.current = null;
        selectedTenantRef.current = null;
      } else {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Error syncing backend user', err, {
          component: 'AuthContext',
          action: 'sync_backend_user',
          firebaseEmail: firebaseUser.email,
        });
        // Don't set error state here - let individual pages handle it
        // Also don't check for email verification for existing users
      }
    } finally {
      isSyncingRef.current = false;
      logger.debug('Backend user sync completed', {
        component: 'AuthContext',
        action: 'sync_backend_user_complete',
        firebaseEmail: firebaseUser.email,
      });
    }
  }, []); // No dependencies - use refs instead

  // Listen to Firebase auth state changes
  useEffect(() => {
    logger.debug('Setting up Firebase auth state listener', {
      component: 'AuthContext',
      action: 'setup_auth_listener',
      isPublicRoute,
    });
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      logger.info('Firebase auth state changed', {
        component: 'AuthContext',
        action: 'auth_state_changed',
        firebaseEmail: firebaseUser?.email || 'signed out',
        previousEmail: lastSyncedEmailRef.current,
      });
      setFirebaseUser(firebaseUser);
      
      // Skip backend sync for public routes
      if (isPublicRoute) {
        logger.debug('Skipping backend sync for public route', {
          component: 'AuthContext',
          action: 'auth_state_changed',
        });
        return;
      }
      
      // Only sync if Firebase user exists
      if (firebaseUser) {
        logger.debug('Triggering backend user sync from auth state change', {
          component: 'AuthContext',
          action: 'auth_state_changed',
          firebaseEmail: firebaseUser.email,
        });
        await syncBackendUser(firebaseUser);
      } else {
        logger.debug('No Firebase user, clearing state', {
          component: 'AuthContext',
          action: 'auth_state_changed',
        });
        setUser(null);
        setSelectedTenant(null);
        setTenants([]);
        lastSyncedEmailRef.current = null;
        userRef.current = null;
        selectedTenantRef.current = null;
      }
    });

    return () => {
      logger.debug('Cleaning up Firebase auth state listener', {
        component: 'AuthContext',
        action: 'cleanup_auth_listener',
      });
      unsubscribe();
    };
  }, [isPublicRoute, syncBackendUser]);

  // Restore selected tenant from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('selectedTenant');
      if (stored) {
        const tenant = JSON.parse(stored);
        setSelectedTenant(tenant);
        
        // Update API headers with restored tenant info
        // Use tenant email if available, otherwise try to get from firebaseUser
        const email = tenant.email || firebaseUser?.email || '';
        if (email && tenant.id) {
          setCurrentUserInfo(email, tenant.id);
        }
        
        logger.debug('Restored selected tenant from localStorage', {
          component: 'AuthContext',
          tenantId: tenant.id,
          email,
        });
      }
    } catch (error) {
      logger.warn('Failed to restore selected tenant from localStorage', { component: 'AuthContext' });
    }
  }, [firebaseUser]);

  useEffect(() => {
    logger.debug('Auth initialization effect triggered', {
      component: 'AuthContext',
      action: 'auth_init_effect',
      isPublicRoute,
      location,
      hasFirebaseUser: !!firebaseUser,
      hasUser: !!user,
      userEmail: user?.email,
      firebaseEmail: firebaseUser?.email,
    });

    // Skip auth initialization for public pages
    if (isPublicRoute) {
      logger.debug('Skipping auth initialization for public route', {
        component: 'AuthContext',
        action: 'auth_init_effect',
      });
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

        // Only sync if we don't already have a user or if Firebase user email changed
        // Also check if we're not already syncing
        if (!isSyncingRef.current && (!user || user.email !== currentFirebaseUser.email)) {
          logger.debug('Syncing backend user - user missing or email changed', {
            component: 'AuthContext',
            action: 'check_auth',
            hasUser: !!user,
            currentEmail: currentFirebaseUser.email,
            userEmail: user?.email,
            isSyncing: isSyncingRef.current,
          });
          await syncBackendUser(currentFirebaseUser);
        } else {
          logger.debug('User already synced or sync in progress, skipping', {
            component: 'AuthContext',
            action: 'check_auth',
            userId: user?.id,
            userEmail: user?.email,
            isSyncing: isSyncingRef.current,
          });
        }
      } finally {
        // Always set loading to false after sync completes
        setLoading(false);
      }
    };

    checkAuth();
  }, [isPublicRoute, firebaseUser?.email, user?.id, syncBackendUser, location]);

  const signOut = async () => {
    try {
      // First, call backend logout endpoint to clear server-side state
      // This should be done before Firebase signout to ensure we have a valid token
      try {
        await logoutApi();
        logger.info('Backend logout successful', {
          component: 'AuthContext',
          action: 'sign_out',
        });
      } catch (error: any) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Error during backend logout', err, {
          component: 'AuthContext',
          action: 'sign_out',
        });
        // Continue with Firebase signout even if backend logout fails
      }
      
      // Sign out from Firebase (this clears Firebase's persisted auth state)
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
    
    // Explicitly clear all local state (this ensures state is cleared even if Firebase signout had issues)
    setUser(null);
    setFirebaseUser(null);
    setSelectedTenant(null);
    setTenants([]);
    setError(null);
    setEmailVerification(null);
    
    // Clear global user info for API headers (this persists across page loads, so must be cleared)
    setCurrentUserInfo();
    
    logger.info('All auth state cleared', {
      component: 'AuthContext',
      action: 'sign_out',
    });
    
    // Redirect to logged-out page
    setLocation('/logged-out');
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

  const loadTenants = useCallback(async (email: string): Promise<Tenant[]> => {
    if (!firebaseUser) {
      throw new Error('User must be authenticated to load tenants');
    }
    
    logger.debug('Loading tenants', {
      component: 'AuthContext',
      action: 'load_tenants',
      email,
    });
    
    // Import getUserTenants function
    const { getUserTenants } = await import('@/services/authApi');
    const tenantList = await getUserTenants();
    
    // Convert to Tenant format
    const tenants: Tenant[] = tenantList.map((t: any) => ({
      id: String(t.id),
      name: t.name,
      email: email,
      createdAt: t.createdAt || new Date().toISOString(),
    }));
    
    logger.info('Tenants loaded', {
      component: 'AuthContext',
      action: 'load_tenants',
      tenantCount: tenants.length,
    });
    setTenants(tenants);
    return tenants;
  }, [firebaseUser]);

  const handleSetSelectedTenant = (tenant: Tenant | null) => {
    setSelectedTenant(tenant);
    
    // Update API headers with selected tenant
    if (tenant && user) {
      setCurrentUserInfo(user.email, tenant.id);
      
      // Persist in localStorage for session continuity
      if (tenant) {
        localStorage.setItem('selectedTenant', JSON.stringify({
          id: tenant.id,
          name: tenant.name,
          email: tenant.email,
        }));
      } else {
        localStorage.removeItem('selectedTenant');
      }
      
      // Update user state with selected tenant
      if (user) {
        const updatedUser = {
          ...user,
          tenantId: tenant.id,
          tenantName: tenant.name,
          updatedAt: new Date().toISOString(),
        };
        setUser(updatedUser);
      }
    } else {
      localStorage.removeItem('selectedTenant');
      setCurrentUserInfo(user?.email || '', '');
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
      setEmailVerification,
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
