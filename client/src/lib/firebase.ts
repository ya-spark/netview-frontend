import { initializeApp, getApp } from "firebase/app";
import { getAuth, signInWithRedirect, getRedirectResult, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";

// Create mock auth object for development/error cases
function createMockAuth() {
  return {
    currentUser: null,
    signOut: () => Promise.resolve(),
    onAuthStateChanged: (callback: any) => {
      // Immediately call callback with null user
      callback(null);
      return () => {}; // Unsubscribe function
    },
  };
}

// Check if Firebase credentials are available
const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_API_KEY && 
                          import.meta.env.VITE_FIREBASE_PROJECT_ID && 
                          import.meta.env.VITE_FIREBASE_APP_ID;

let app: any;
let auth: any;

if (hasFirebaseConfig) {
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  } catch (error: any) {
    // If it's a duplicate app error, get the existing app
    if (error.code === 'app/duplicate-app') {
      try {
        app = getApp();
        auth = getAuth(app);
      } catch (getAppError) {
        console.error('Failed to get existing Firebase app:', getAppError);
        auth = createMockAuth();
      }
    } else {
      console.error('Firebase initialization failed:', error);
      auth = createMockAuth();
    }
  }
} else {
  console.warn('Firebase configuration not found. Authentication will be disabled in development mode.');
  auth = createMockAuth();
}

export { auth };

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  if (!hasFirebaseConfig) {
    console.warn('Firebase not configured, Google sign-in disabled in development mode');
    return Promise.reject(new Error('Firebase not configured'));
  }
  
  console.log('🚀 Starting Google sign-in with popup...');
  console.log('🌐 Current domain:', window.location.origin);
  console.log('🔧 Firebase auth domain:', auth.config?.authDomain);
  
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log('✅ Google sign-in successful:', {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName
    });
    return result;
  } catch (error) {
    console.error('❌ Error during signInWithPopup:', error);
    throw error;
  }
};

export const signInWithEmail = (email: string, password: string) => {
  if (!hasFirebaseConfig) {
    console.warn('Firebase not configured, email sign-in disabled in development mode');
    return Promise.reject(new Error('Firebase not configured'));
  }
  return signInWithEmailAndPassword(auth, email, password);
};

export const signUpWithEmail = (email: string, password: string) => {
  if (!hasFirebaseConfig) {
    console.warn('Firebase not configured, email sign-up disabled in development mode');
    return Promise.reject(new Error('Firebase not configured'));
  }
  return createUserWithEmailAndPassword(auth, email, password);
};

export const signOutUser = () => {
  if (!hasFirebaseConfig) {
    return Promise.resolve();
  }
  return signOut(auth);
};

export const handleRedirectResult = () => {
  if (!hasFirebaseConfig) {
    return Promise.resolve(null);
  }
  // Since we're using popup instead of redirect, this always returns null
  console.log('📱 Using popup authentication - no redirect result to handle');
  return Promise.resolve(null);
};
