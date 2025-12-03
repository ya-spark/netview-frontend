import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
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
  firebaseUser: FirebaseUser | null;
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
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [emailVerification, setEmailVerification] = useState<EmailVerificationState | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔥 Firebase auth state changed:', {
        uid: firebaseUser?.uid,
        email: firebaseUser?.email,
        displayName: firebaseUser?.displayName,
        isSignedIn: !!firebaseUser
      });
      
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          console.log('🔑 Getting Firebase ID token...');
          const idToken = await firebaseUser.getIdToken();
          console.log('✅ Got Firebase ID token, length:', idToken.length);
          
          // Try to fetch existing user from backend
          try {
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
            // Check if error is 404 (user not found) or contains 404/Not Found
            const isNotFound = error.message?.includes('404') || 
                              error.message?.includes('Not Found') ||
                              error.message?.includes('not found');
            
            if (isNotFound) {
              console.log('📝 User not found in backend, registering new user...');
              
              // Check if sign-up data is stored in sessionStorage (from sign-up flow)
              const signUpDataStr = sessionStorage.getItem('signUpData');
              console.log('📦 Sign-up data from sessionStorage:', signUpDataStr);
              
              let firstName = 'User';
              let lastName = '';
              let company: string | undefined;
              
              // Priority 1: Use sessionStorage data (from initial sign-up)
              if (signUpDataStr) {
                try {
                  const signUpData = JSON.parse(signUpDataStr);
                  console.log('📦 Parsed sign-up data:', signUpData);
                  firstName = signUpData.firstName || firstName;
                  lastName = signUpData.lastName || lastName;
                  company = signUpData.company;
                  // Clear sign-up data after use
                  sessionStorage.removeItem('signUpData');
                } catch (e) {
                  console.warn('Failed to parse sign-up data:', e);
                }
              }
              
              // Priority 2: Use emailVerification state (if available, e.g., after email verification)
              if ((!firstName || firstName === 'User' || !lastName || lastName.trim() === '') && emailVerification) {
                console.log('📦 Using emailVerification state for registration data:', emailVerification);
                firstName = emailVerification.firstName || firstName;
                lastName = emailVerification.lastName || lastName;
                company = emailVerification.company || company;
              }
              
              // Priority 3: Fallback to displayName if no other data available
              if ((!firstName || firstName === 'User' || !lastName || lastName.trim() === '') && !signUpDataStr && !emailVerification) {
                console.log('⚠️ No sign-up data found, using displayName fallback');
                const displayName = firebaseUser.displayName || '';
                const nameParts = displayName.split(' ');
                firstName = nameParts[0] || firstName;
                lastName = nameParts.slice(1).join(' ') || '';
              }
              
              // Validate required fields before registration
              if (!firstName || !lastName || firstName.trim() === '' || lastName.trim() === '') {
                const errorMessage = !lastName || lastName.trim() === '' 
                  ? 'Last name is required for registration. Please sign up again with your full name.'
                  : 'First name is required for registration. Please sign up again with your full name.';
                console.error('❌ Missing required registration data:', { firstName, lastName });
                const registrationError = new Error(errorMessage);
                setError(registrationError);
                setUser(null);
                setSelectedTenant(null);
                setTenants([]);
                return;
              }
              
              console.log('📝 Registering with data:', { firstName, lastName, company: company || 'none' });
              
              try {
                // Register user with backend
                const newUser = await registerUser(firstName, lastName, company);
                console.log('✅ New user registered in backend:', { 
                  id: newUser.id, 
                  email: newUser.email, 
                  role: newUser.role 
                });
                setUser(newUser);
                setEmailVerification(null); // Clear verification state on success
                
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
              } catch (registerError: any) {
                console.error('❌ Error registering user with backend:', registerError);
                console.log('Error details:', {
                  isApiError: registerError instanceof ApiError,
                  status: registerError.status,
                  code: registerError.code,
                  message: registerError.message,
                  details: registerError.details,
                });
                
                // Check if error is EMAIL_NOT_VERIFIED (403 with code EMAIL_NOT_VERIFIED)
                // Also check error message as fallback in case code format differs
                const errorMessageLower = registerError.message?.toLowerCase() || '';
                const isEmailNotVerified = registerError instanceof ApiError && 
                    registerError.status === 403 && 
                    (registerError.code === 'EMAIL_NOT_VERIFIED' ||
                     (errorMessageLower.includes('email') && errorMessageLower.includes('verification')));
                
                if (isEmailNotVerified) {
                  console.log('📧 Email verification required');
                  
                  // Extract email from error details or use Firebase user email
                  const email = registerError.details?.email || firebaseUser.email;
                  
                  if (email) {
                    console.log('📧 Setting email verification state for:', email);
                    // Store verification state
                    setEmailVerification({
                      email,
                      firstName,
                      lastName,
                      company,
                    });
                    // Clear any error state so EmailVerification page shows instead of ErrorDisplay
                    setError(null);
                    // Don't throw error, let the verification page handle it
                    return;
                  } else {
                    console.error('❌ No email found for verification:', {
                      errorDetails: registerError.details,
                      firebaseEmail: firebaseUser.email,
                    });
                  }
                }
                
                throw registerError;
              }
            } else {
              // Other error (network, server error, etc.)
              console.error('❌ Error fetching user from backend:', error);
              const authError = error instanceof Error ? error : new Error(String(error));
              setError(authError);
              throw error;
            }
          }
        } catch (error) {
          console.error('❌ Authentication error:', error);
          const authError = error instanceof Error ? error : new Error(String(error));
          setError(authError);
          setUser(null);
          setSelectedTenant(null);
          setTenants([]);
        }
      } else {
        console.log('🚪 User signed out');
        setUser(null);
        setSelectedTenant(null);
        setTenants([]);
      }
      
      console.log('⏱️ Setting loading to false');
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    await auth.signOut();
    setUser(null);
    setFirebaseUser(null);
    setSelectedTenant(null);
    setTenants([]);
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  const clearEmailVerification = () => {
    setEmailVerification(null);
  };

  const retryRegistration = async (): Promise<User> => {
    if (!emailVerification || !firebaseUser) {
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
    if (!user || !firebaseUser) {
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
      firebaseUser, 
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
