// ALLOUL&Q — Firebase Web SDK init

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, OAuthProvider,
  signInWithRedirect, getRedirectResult,
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

// Redirect-based flow: navigates to provider, returns on completion
export async function signInWithGoogle(): Promise<string> {
  await signInWithRedirect(auth, googleProvider);
  return ''; // page redirects away — never reached
}

export async function signInWithApple(): Promise<string> {
  await signInWithRedirect(auth, appleProvider);
  return ''; // page redirects away — never reached
}

// Called on page mount to pick up the result after redirect returns
export async function getOAuthRedirectResult(): Promise<string | null> {
  const result = await getRedirectResult(auth);
  if (!result) return null;
  return result.user.getIdToken();
}

export type { FirebaseUser };
