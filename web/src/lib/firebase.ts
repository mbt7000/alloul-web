// ALLOUL&Q — Firebase Web SDK init

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, OAuthProvider,
  signInWithPopup,
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

export async function signInWithGoogle(): Promise<string> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user.getIdToken();
}

export async function signInWithApple(): Promise<string> {
  const result = await signInWithPopup(auth, appleProvider);
  return result.user.getIdToken();
}

export type { FirebaseUser };
