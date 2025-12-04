import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { getCurrentUser, registerUser } from '@/services/authApi';
import { ApiError } from '@/lib/queryClient';

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
  selectedTenant: Tenant | null;
  tenants: Tenant[];
  loading: boolean;
  error: Error | null;
  emailVerification: EmailVerificationState | null;
  signOut: () => Promise<void>;
  setSelectedTenant: (tenant: Tenant | null) => void;
  createTenant: (name: string, tenantId?: string) => Promise<Tenant>;
  loadTenants: (email: string) => Promise<Tenant[]>;
  clearError: () => void;
  setError: (error: Error | null) => void;
  retryRegistration: () => Promise<User>;
  clearEmailVerification: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [emailVerification, setEmailVerification] = useState<EmailVerificationState | null>(null);

  // List of public routes that don't need auth initialization
  const publicRoutes = ['/', '/features', '/pricing', '/docs'];
  const isPublicRoute = publicRoutes.includes(location);

  useEffect(() => {
    // Skip auth initialization for public pages
    if (isPublicRoute) {
      setLoading(false);
      return;
    }

    // Initialize auth for non-public pages (signup, protected routes, etc.)
    setLoading(true);
    
    // Check authentication status with backend
    const checkAuth = async () => {
      try {
        // Try to fetch existing user from backend
        const backendUser = await getCurrentUser();
        
        // Validate user data - must have at least id or email
        if (!backendUser || (!backendUser.id && !backendUser.email)) {
          console.warn('⚠️ Invalid user data received, treating as user not found');
          throw new Error('Invalid user data');
        }
        
        console.log('👤 Existing user found in backend:', { 
          id: backendUser.id, 
          email: backendUser.email, 
          role: backendUser.role,
          tenantId: backendUser.tenantId 
        });
        setUser(backendUser);
        
        // Set selected tenant if user has one
        if (backendUser.tenantId && backendUser.tenantName) {
          setSelectedTenant({
            id: backendUser.tenantId,
            name: backendUser.tenantName,
            email: backendUser.email,
            createdAt: backendUser.createdAt || new Date().toISOString(),
          });
        }
        setTenants([]);
      } catch (error: any) {
        // Check if error is 403 EMAIL_NOT_VERIFIED - user exists but email not verified
        const errorMessageLower = error.message?.toLowerCase() || '';
        const isEmailNotVerified = error instanceof ApiError && 
            error.status === 403 && 
            (error.code === 'EMAIL_NOT_VERIFIED' ||
             (errorMessageLower.includes('email') && errorMessageLower.includes('verification')));
        
        if (isEmailNotVerified) {
          console.log('📧 Email verification required for existing user');
          
          // Extract email from error details
          const email = error.details?.email;
          
          if (email) {
            console.log('📧 Setting email verification state for:', email);
            // Store verification state
            const firstName = error.details?.firstName || 'User';
            const lastName = error.details?.lastName || '';
            const company = error.details?.company;
            
            setEmailVerification({
              email,
              firstName,
              lastName,
              company,
            });
            setError(null);
            setUser(null);
            setSelectedTenant(null);
            setTenants([]);
            setLoading(false);
            return;
          }
        }
        
        // Check if error is 404 (user not found) or 401 (unauthorized)
        const isNotFound = error.message?.includes('404') || 
                          error.message?.includes('Not Found') ||
                          error.message?.includes('not found');
        const isUnauthorized = error instanceof ApiError && error.status === 401;
        
        if (isNotFound || isUnauthorized) {
          // Check if sign-up data is stored in sessionStorage (from sign-up flow)
          const signUpDataStr = sessionStorage.getItem('signUpData');
          
          if (signUpDataStr) {
            // User is in sign-up flow, don't set error
            console.log('📝 User not found, but sign-up data exists - waiting for registration');
            setLoading(false);
            return;
          }
          
          // No sign-up in progress, user is not authenticated
          console.log('🚪 User not authenticated');
          setUser(null);
          setSelectedTenant(null);
          setTenants([]);
        } else {
          // Other error (network, server error, etc.)
          console.error('❌ Error fetching user from backend:', error);
          const authError = error instanceof Error ? error : new Error(String(error));
          setError(authError);
          setUser(null);
          setSelectedTenant(null);
          setTenants([]);
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [isPublicRoute, location]);

  const signOut = async () => {
    // Call backend signout endpoint if needed
    // For now, just clear local state
    setUser(null);
    setSelectedTenant(null);
    setTenants([]);
    setError(null);
    setEmailVerification(null);
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
      selectedTenant,
      tenants,
      loading,
      error,
      emailVerification,
      signOut,
      setSelectedTenant: handleSetSelectedTenant,
      createTenant,
      loadTenants,
      clearError,
      setError,
      retryRegistration,
      clearEmailVerification,
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
