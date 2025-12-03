import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

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
  signOut: () => Promise<void>;
  setSelectedTenant: (tenant: Tenant | null) => void;
  createTenant: (name: string) => Promise<Tenant>;
  loadTenants: (email: string) => Promise<Tenant[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock data storage (in a real app, this would be in localStorage or backend)
const mockUsers: Record<string, User> = {};
const mockTenants: Tenant[] = [];

// Mock function to get user by email
function getMockUser(email: string): User | null {
  return mockUsers[email] || null;
}

// Mock function to create user
function createMockUser(firebaseUser: FirebaseUser, firstName: string, lastName: string, company?: string): User {
  const user: User = {
    id: `user_${Date.now()}`,
    email: firebaseUser.email!,
    firstName,
    lastName,
    role: 'Owner',
    tenantId: '',
    tenantName: '',
    company: company || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockUsers[user.email] = user;
  return user;
}

// Mock function to get tenants by email
function getMockTenants(email: string): Tenant[] {
  return mockTenants.filter(t => t.email === email);
}

// Mock function to create tenant
function createMockTenant(name: string, email: string): Tenant {
  const tenant: Tenant = {
    id: `tenant_${Date.now()}`,
    name,
    email,
    createdAt: new Date().toISOString(),
  };
  mockTenants.push(tenant);
  return tenant;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

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
          
          // Check for existing user in mock data
          const existingUser = getMockUser(firebaseUser.email!);
          
          if (existingUser) {
            console.log('👤 Existing user found:', { id: existingUser.id, email: existingUser.email, role: existingUser.role });
            setUser(existingUser);
            
            // Load tenants for this user
            const userTenants = getMockTenants(firebaseUser.email!);
            setTenants(userTenants);
            
            // If user has a tenantId, find and set selected tenant
            if (existingUser.tenantId) {
              const tenant = userTenants.find(t => t.id === existingUser.tenantId);
              if (tenant) {
                setSelectedTenant(tenant);
              }
            }
          } else {
            // Create new user from Firebase user
            console.log('📝 Creating new user from Firebase...');
            
            // Check if sign-up data is stored in sessionStorage (from sign-up flow)
            const signUpDataStr = sessionStorage.getItem('signUpData');
            let firstName = 'User';
            let lastName = '';
            
            if (signUpDataStr) {
              try {
                const signUpData = JSON.parse(signUpDataStr);
                firstName = signUpData.firstName || firstName;
                lastName = signUpData.lastName || lastName;
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
            
            const newUser = createMockUser(firebaseUser, firstName, lastName);
            console.log('✅ New user created:', { id: newUser.id, email: newUser.email, role: newUser.role });
            setUser(newUser);
            setTenants([]);
          }
        } catch (error) {
          console.error('❌ Authentication error:', error);
          setUser(null);
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
  };

  const createTenant = async (name: string): Promise<Tenant> => {
    if (!user) {
      throw new Error('User must be authenticated to create a tenant');
    }
    
    console.log('🏢 Creating tenant:', name);
    const tenant = createMockTenant(name, user.email);
    
    // Update user with tenant info
    const updatedUser = {
      ...user,
      tenantId: tenant.id,
      tenantName: tenant.name,
      updatedAt: new Date().toISOString(),
    };
    mockUsers[user.email] = updatedUser;
    setUser(updatedUser);
    
    // Update tenants list
    const updatedTenants = [...tenants, tenant];
    setTenants(updatedTenants);
    setSelectedTenant(tenant);
    
    console.log('✅ Tenant created:', tenant);
    return tenant;
  };

  const loadTenants = async (email: string): Promise<Tenant[]> => {
    console.log('📋 Loading tenants for:', email);
    const userTenants = getMockTenants(email);
    setTenants(userTenants);
    return userTenants;
  };

  const handleSetSelectedTenant = (tenant: Tenant | null) => {
    if (!user) {
      throw new Error('User must be authenticated to select a tenant');
    }
    
    setSelectedTenant(tenant);
    
    // Update user with selected tenant
    if (tenant) {
      const updatedUser = {
        ...user,
        tenantId: tenant.id,
        tenantName: tenant.name,
        updatedAt: new Date().toISOString(),
      };
      mockUsers[user.email] = updatedUser;
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
      signOut,
      setSelectedTenant: handleSetSelectedTenant,
      createTenant,
      loadTenants,
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
