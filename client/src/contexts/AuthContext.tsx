import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getCurrentUser, registerUser } from '@/services/authApi';

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

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  selectedTenant: Tenant | null;
  tenants: Tenant[];
  loading: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
  setSelectedTenant: (tenant: Tenant | null) => void;
  createTenant: (name: string) => Promise<Tenant>;
  loadTenants: (email: string) => Promise<Tenant[]>;
  clearError: () => void;
  setError: (error: Error | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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
              let firstName = 'User';
              let lastName = '';
              let company: string | undefined;
              
              if (signUpDataStr) {
                try {
                  const signUpData = JSON.parse(signUpDataStr);
                  firstName = signUpData.firstName || firstName;
                  lastName = signUpData.lastName || lastName;
                  company = signUpData.company;
                  // Clear sign-up data after use
                  sessionStorage.removeItem('signUpData');
                } catch (e) {
                  console.warn('Failed to parse sign-up data:', e);
                }
              }
              
              // Fallback to displayName if no sign-up data
              if (!signUpDataStr) {
                const displayName = firebaseUser.displayName || '';
                const nameParts = displayName.split(' ');
                firstName = nameParts[0] || firstName;
                lastName = nameParts.slice(1).join(' ') || '';
              }
              
              try {
                // Register user with backend
                const newUser = await registerUser(firstName, lastName, company);
                console.log('✅ New user registered in backend:', { 
                  id: newUser.id, 
                  email: newUser.email, 
                  role: newUser.role 
                });
                setUser(newUser);
                
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
              } catch (registerError) {
                console.error('❌ Error registering user with backend:', registerError);
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

  const createTenant = async (name: string): Promise<Tenant> => {
    if (!user || !firebaseUser) {
      throw new Error('User must be authenticated to create a tenant');
    }
    
    console.log('🏢 Creating tenant:', name);
    
    // Note: Tenant creation is handled by backend during user registration
    // For existing users, tenant should already exist
    // This function is kept for compatibility but tenant creation should happen via backend API
    throw new Error('Tenant creation should be handled through backend API. Please contact support.');
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
      signOut,
      setSelectedTenant: handleSetSelectedTenant,
      createTenant,
      loadTenants,
      clearError,
      setError,
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
