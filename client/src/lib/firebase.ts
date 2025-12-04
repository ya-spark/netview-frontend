/**
 * Firebase Configuration and Authentication Utilities
 * 
 * Provides Firebase app initialization and authentication functions
 * for Google and email/password login.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  Auth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
  onAuthStateChanged,
  Unsubscribe
} from 'firebase/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
};

// Validate required environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
];

const missingVars = requiredEnvVars.filter(
  (varName) => !import.meta.env[varName]
);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required Firebase environment variables: ${missingVars.join(', ')}. ` +
    `Please configure them in your .env file.`
  );
}

// Initialize Firebase app (only if not already initialized)
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase Auth
export const auth: Auth = getAuth(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google using popup
 * @returns Promise that resolves with Firebase User
 */
export async function signInWithGoogle(): Promise<User> {
  try {
    console.log('🔐 Signing in with Google...');
    const result = await signInWithPopup(auth, googleProvider);
    console.log('✅ Google sign-in successful:', result.user.email);
    return result.user;
  } catch (error: any) {
    console.error('❌ Google sign-in error:', error);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in popup was closed. Please try again.');
    } else if (error.code === 'auth/popup-blocked') {
      throw new Error('Popup was blocked by browser. Please allow popups and try again.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    throw new Error(error.message || 'Failed to sign in with Google');
  }
}

/**
 * Sign in with email and password
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise that resolves with Firebase User
 */
export async function signInWithEmailPassword(
  email: string,
  password: string
): Promise<User> {
  try {
    console.log('🔐 Signing in with email/password...');
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Email/password sign-in successful:', result.user.email);
    return result.user;
  } catch (error: any) {
    console.error('❌ Email/password sign-in error:', error);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email address.');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Incorrect password. Please try again.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address format.');
    } else if (error.code === 'auth/user-disabled') {
      throw new Error('This account has been disabled.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your connection and try again.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed attempts. Please try again later.');
    }
    
    throw new Error(error.message || 'Failed to sign in');
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  try {
    console.log('🔐 Signing out...');
    await firebaseSignOut(auth);
    console.log('✅ Sign-out successful');
  } catch (error: any) {
    console.error('❌ Sign-out error:', error);
    throw new Error(error.message || 'Failed to sign out');
  }
}

/**
 * Get current Firebase user
 * @returns Current Firebase User or null if not authenticated
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Get Firebase ID token for API calls
 * @param forceRefresh - Force token refresh (default: false)
 * @returns Promise that resolves with ID token or null if not authenticated
 */
export async function getIdToken(forceRefresh: boolean = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }
  
  try {
    const token = await user.getIdToken(forceRefresh);
    return token;
  } catch (error: any) {
    console.error('❌ Error getting ID token:', error);
    return null;
  }
}

/**
 * Set up Firebase auth state listener
 * @param callback - Callback function called when auth state changes
 * @returns Unsubscribe function
 */
export function onAuthStateChange(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

