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
  region?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // Commented out Firebase authentication
  // useEffect(() => {
  //   const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
  //     console.log('🔥 Firebase auth state changed:', {
  //       uid: firebaseUser?.uid,
  //       email: firebaseUser?.email,
  //       displayName: firebaseUser?.displayName,
  //       isSignedIn: !!firebaseUser
  //     });
      
  //     setFirebaseUser(firebaseUser);
      
  //     if (firebaseUser) {
  //       try {
  //         console.log('🔑 Getting Firebase ID token...');
  //         // Get ID token and register/login user
  //         const idToken = await firebaseUser.getIdToken();
  //         console.log('✅ Got Firebase ID token, length:', idToken.length);
          
  //         // Try to get existing user first
  //         console.log('📞 Calling /api/auth/me...');
  //         const response = await fetch('/api/auth/me', {
  //           headers: {
  //             'Authorization': `Bearer ${idToken}`,
  //           },
  //         });

  //         console.log('📞 /api/auth/me response:', response.status, response.statusText);

  //         if (response.ok) {
  //           const userData = await response.json();
  //           console.log('👤 Existing user found:', { id: userData.id, email: userData.email, role: userData.role });
  //           setUser(userData);
  //         } else {
  //           // Register new user
  //           console.log('📝 Registering new user...');
  //           const registrationData = {
  //             firebaseUid: firebaseUser.uid,
  //             email: firebaseUser.email!,
  //             firstName: firebaseUser.displayName?.split(' ')[0] || 'User',
  //             lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
  //           };

  //           console.log('📝 Registration data:', registrationData);

  //           // Make registration request with Authorization header
  //           const registerResponse = await fetch('/api/auth/register', {
  //             method: 'POST',
  //             headers: {
  //               'Content-Type': 'application/json',
  //               'Authorization': `Bearer ${idToken}`,
  //             },
  //             body: JSON.stringify(registrationData),
  //           });

  //           console.log('📝 Registration response:', registerResponse.status, registerResponse.statusText);

  //           if (!registerResponse.ok) {
  //             const errorText = await registerResponse.text();
  //             console.error('❌ Registration failed:', errorText);
  //             throw new Error('Registration failed');
  //           }

  //           const userData = await registerResponse.json();
  //           console.log('✅ New user registered:', { id: userData.id, email: userData.email, role: userData.role });
  //           setUser(userData);
  //         }
  //       } catch (error) {
  //         console.error('❌ Authentication error:', error);
  //         setUser(null);
  //       }
  //     } else {
  //       console.log('🚪 User signed out');
  //       setUser(null);
  //     }
      
  //     console.log('⏱️ Setting loading to false');
  //     setLoading(false);
  //   });

  //   return unsubscribe;
  // }, []);

  const signOut = async () => {
    // Temporarily disabled - just clear local state
    // await auth.signOut();
    setUser(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, user, loading, signOut }}>
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
