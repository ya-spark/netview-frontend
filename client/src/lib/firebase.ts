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
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signOut as firebaseSignOut,
  User,
  onAuthStateChanged,
  Unsubscribe
} from 'firebase/auth';
import { logger } from './logger';

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
    logger.info('Signing in with Google', {
      component: 'firebase',
      action: 'sign_in_google',
    });
    const result = await signInWithPopup(auth, googleProvider);
    logger.info('Google sign-in successful', {
      component: 'firebase',
      action: 'sign_in_google',
      email: result.user.email,
    });
    return result.user;
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Google sign-in error', err, {
      component: 'firebase',
      action: 'sign_in_google',
    });
    
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
 * Create a new user account with email and password
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise that resolves with Firebase User
 */
export async function createUserWithEmailAndPassword(
  email: string,
  password: string
): Promise<User> {
  try {
    logger.info('Creating Firebase account with email/password', {
      component: 'firebase',
      action: 'create_user',
      email,
    });
    const result = await firebaseCreateUserWithEmailAndPassword(auth, email, password);
    logger.info('Firebase account created successfully', {
      component: 'firebase',
      action: 'create_user',
      email: result.user.email,
    });
    return result.user;
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Firebase account creation error', err, {
      component: 'firebase',
      action: 'create_user',
      email,
    });
    
    // Handle specific Firebase errors
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('An account with this email already exists. Please login instead.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address format.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak. Please use a stronger password.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    throw new Error(error.message || 'Failed to create account');
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
    logger.info('Signing in with email/password', {
      component: 'firebase',
      action: 'sign_in_email_password',
      email,
    });
    const result = await signInWithEmailAndPassword(auth, email, password);
    logger.info('Email/password sign-in successful', {
      component: 'firebase',
      action: 'sign_in_email_password',
      email: result.user.email,
    });
    return result.user;
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Email/password sign-in error', err, {
      component: 'firebase',
      action: 'sign_in_email_password',
      email,
    });
    
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
    logger.info('Signing out', {
      component: 'firebase',
      action: 'sign_out',
    });
    await firebaseSignOut(auth);
    logger.info('Sign-out successful', {
      component: 'firebase',
      action: 'sign_out',
    });
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Sign-out error', err, {
      component: 'firebase',
      action: 'sign_out',
    });
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
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Error getting ID token', err, {
      component: 'firebase',
      action: 'get_id_token',
      userId: user.uid,
    });
    return null;
  }
}

/**
 * Send password reset email
 * @param email - Email address to send reset link to
 * @returns Promise that resolves when email is sent
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  try {
    logger.info('Sending password reset email', {
      component: 'firebase',
      action: 'send_password_reset',
      email,
    });
    await firebaseSendPasswordResetEmail(auth, email);
    logger.info('Password reset email sent successfully', {
      component: 'firebase',
      action: 'send_password_reset',
      email,
    });
  } catch (error: any) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Password reset email error', err, {
      component: 'firebase',
      action: 'send_password_reset',
      email,
    });
    
    // Handle specific Firebase errors
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email address.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    throw new Error(error.message || 'Failed to send password reset email');
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

