import { initializeApp } from "firebase/app";
import { getAuth, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";

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
    storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
} else {
  console.warn('Firebase configuration not found. Authentication will be disabled in development mode.');
  // Create mock auth object for development
  auth = {
    currentUser: null,
    signOut: () => Promise.resolve(),
    onAuthStateChanged: (callback: any) => {
      // Immediately call callback with null user
      callback(null);
      return () => {}; // Unsubscribe function
    },
  };
}

export { auth };

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => {
  if (!hasFirebaseConfig) {
    console.warn('Firebase not configured, Google sign-in disabled in development mode');
    return Promise.reject(new Error('Firebase not configured'));
  }
  signInWithRedirect(auth, googleProvider);
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
  return getRedirectResult(auth);
};
