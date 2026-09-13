import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with specific databaseId if provided
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Automatically sign in anonymously if not signed in
export function initAuth(onUserReady?: (user: User | null) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (onUserReady) onUserReady(user);
    } else {
      try {
        const cred = await signInAnonymously(auth);
        if (onUserReady) onUserReady(cred.user);
      } catch (err) {
        console.warn('Anonymous sign-in unavailable or disabled:', err);
        if (onUserReady) onUserReady(null);
      }
    }
  });
}

// Sign in with Google Popup
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

// Sign out
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

// Test connection helper
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
