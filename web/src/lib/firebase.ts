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

// ─── Providers ──────────────────────────────────────────────────────────────

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

// ─── Helper: try popup, fall back to redirect ────────────────────────────────
async function signInWithProvider(provider: GoogleAuthProvider | OAuthProvider): Promise<string> {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user.getIdToken();
  } catch (err: any) {
    // Popup blocked by browser — use redirect instead
    if (
      err?.code === 'auth/popup-blocked' ||
      err?.code === 'auth/popup-closed-by-user'
    ) {
      await signInWithRedirect(auth, provider);
      return ''; // page will reload
    }
    throw err;
  }
}

export async function signInWithGoogle(): Promise<string> {
  return signInWithProvider(googleProvider);
}

export async function signInWithApple(): Promise<string> {
  return signInWithProvider(appleProvider);
}

// Call this on page load to handle redirect result
export async function getOAuthRedirectResult(): Promise<{ idToken: string; isNew: boolean } | null> {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;
    const idToken = await result.user.getIdToken();
    const isNew = (result as any)._tokenResponse?.isNewUser ?? false;
    return { idToken, isNew };
  } catch {
    return null;
  }
}

export type { FirebaseUser };
