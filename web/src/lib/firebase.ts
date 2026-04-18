// ALLOUL&Q — Firebase Web SDK init

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, OAuthProvider,
  signInWithPopup, signInWithRedirect, getRedirectResult,
  type User as FirebaseUser,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDJ3ekWJLQXVZuTfqOFxNqFSIlKyIe5CiU',
  authDomain: 'alloul.firebaseapp.com',
  projectId: 'alloul',
  storageBucket: 'alloul.appspot.com',
  messagingSenderId: '458917264125',
  appId: '1:458917264125:web:12e01e5c281f9ef5411c94',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

// Popup-based flow (primary). Falls back to redirect if popups are blocked.
export async function signInWithGoogle(): Promise<string> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user.getIdToken();
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    // If popup was blocked, fall back to redirect
    if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
      await signInWithRedirect(auth, googleProvider);
      return ''; // page navigates away
    }
    throw err;
  }
}

export async function signInWithApple(): Promise<string> {
  try {
    const result = await signInWithPopup(auth, appleProvider);
    return result.user.getIdToken();
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
      await signInWithRedirect(auth, appleProvider);
      return '';
    }
    throw err;
  }
}

// Called on page mount to pick up redirect result (fallback path only)
export async function getOAuthRedirectResult(): Promise<string | null> {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;
    return result.user.getIdToken();
  } catch {
    return null;
  }
}

export type { FirebaseUser };
