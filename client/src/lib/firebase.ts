import { initializeApp, getApp, FirebaseApp } from "firebase/app";
import { 
  getAuth, 
  Auth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  UserCredential
} from "firebase/auth";
import { FirebaseError } from "firebase/app";

// Helper function to get user-friendly error messages
function getFirebaseErrorMessage(error: FirebaseError | Error): string {
  const firebaseError = error as FirebaseError;
  
  if (!firebaseError.code) {
    return error.message || 'An unexpected error occurred';
  }

  switch (firebaseError.code) {
    // Email/Password authentication errors
    case 'auth/user-not-found':
      return 'No account found with this email address. Please sign up first.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-email':
      return 'Invalid email address format.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled. Please contact support.';
    
    // Google OAuth errors
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed. Please try again.';
    case 'auth/popup-blocked':
      return 'Popup was blocked by your browser. Please allow popups and try again.';
    case 'auth/cancelled-popup-request':
      return 'Only one popup request is allowed at a time. Please wait and try again.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with the same email but different sign-in method.';
    
    // Network errors
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again.';
    
    // Configuration errors
    case 'auth/configuration-not-found':
      return 'Firebase configuration error. Please contact support.';
    case 'auth/invalid-api-key':
      return 'Firebase configuration error. Please contact support.';
    
    // Default
    default:
      return firebaseError.message || 'An error occurred during authentication. Please try again.';
  }
}

// Check if Firebase credentials are available
const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_API_KEY && 
                          import.meta.env.VITE_FIREBASE_PROJECT_ID && 
                          import.meta.env.VITE_FIREBASE_APP_ID;

if (!hasFirebaseConfig) {
  const errorMessage = 'Firebase configuration is missing. Please set VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID in your .env file.';
  console.error('❌', errorMessage);
  throw new Error(errorMessage);
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let auth: Auth;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  console.log('✅ Firebase initialized successfully');
} catch (error: any) {
  // If it's a duplicate app error, get the existing app
  if (error.code === 'app/duplicate-app') {
    try {
      app = getApp();
      auth = getAuth(app);
      console.log('✅ Firebase app retrieved (duplicate app detected)');
    } catch (getAppError) {
      console.error('❌ Failed to get existing Firebase app:', getAppError);
      throw new Error('Failed to initialize Firebase. Please check your configuration.');
    }
  } else {
    console.error('❌ Firebase initialization failed:', error);
    throw new Error(`Firebase initialization failed: ${error.message || 'Unknown error'}`);
  }
}

export { auth };

const googleProvider = new GoogleAuthProvider();
// Add scopes if needed
googleProvider.addScope('profile');
googleProvider.addScope('email');
// Set custom parameters
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signInWithGoogle = async (): Promise<UserCredential> => {
  console.log('🚀 Starting Google sign-in with popup...');
  console.log('🌐 Current domain:', window.location.origin);
  
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log('✅ Google sign-in successful:', {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName
    });
    return result;
  } catch (error: any) {
    console.error('❌ Error during Google sign-in:', error);
    const friendlyError = new Error(getFirebaseErrorMessage(error));
    (friendlyError as any).code = error.code;
    throw friendlyError;
  }
};

export const signInWithEmail = async (email: string, password: string): Promise<UserCredential> => {
  if (!email || !password) {
    const error = new Error('Email and password are required.');
    throw error;
  }

  console.log('🔐 Attempting email/password sign-in for:', email);
  
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Email/password sign-in successful:', {
      uid: result.user.uid,
      email: result.user.email
    });
    return result;
  } catch (error: any) {
    console.error('❌ Error during email/password sign-in:', error);
    const friendlyError = new Error(getFirebaseErrorMessage(error));
    (friendlyError as any).code = error.code;
    throw friendlyError;
  }
};

export const signUpWithEmail = async (email: string, password: string): Promise<UserCredential> => {
  if (!email || !password) {
    const error = new Error('Email and password are required.');
    throw error;
  }

  if (password.length < 6) {
    const error = new Error('Password must be at least 6 characters long.');
    throw error;
  }

  console.log('📝 Attempting email/password sign-up for:', email);
  
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    console.log('✅ Email/password sign-up successful:', {
      uid: result.user.uid,
      email: result.user.email
    });
    return result;
  } catch (error: any) {
    console.error('❌ Error during email/password sign-up:', error);
    const friendlyError = new Error(getFirebaseErrorMessage(error));
    (friendlyError as any).code = error.code;
    throw friendlyError;
  }
};

export const signOutUser = async (): Promise<void> => {
  try {
    console.log('🚪 Signing out user...');
    await signOut(auth);
    console.log('✅ User signed out successfully');
  } catch (error: any) {
    console.error('❌ Error during sign-out:', error);
    throw error;
  }
};

export const handleRedirectResult = async (): Promise<UserCredential | null> => {
  // Since we're using popup instead of redirect, this always returns null
  console.log('📱 Using popup authentication - no redirect result to handle');
  return Promise.resolve(null);
};
