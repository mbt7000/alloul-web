import Constants from "expo-constants";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithCredential, signOut } from "firebase/auth";

type FirebaseExtra = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
};

function getFirebaseExtra(): FirebaseExtra {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  return (extra.firebase as FirebaseExtra | undefined) ?? {};
}

function getFirebaseApp(): FirebaseApp {
  const firebase = getFirebaseExtra();
  if (!firebase.apiKey || !firebase.projectId || !firebase.appId) {
    throw new Error("FIREBASE_NOT_CONFIGURED");
  }

  if (getApps().length > 0) return getApp();

  return initializeApp({
    apiKey: firebase.apiKey,
    authDomain: firebase.authDomain,
    projectId: firebase.projectId,
    storageBucket: firebase.storageBucket,
    messagingSenderId: firebase.messagingSenderId,
    appId: firebase.appId,
  });
}

export async function exchangeGoogleIdTokenForFirebaseIdToken(googleIdToken: string): Promise<string> {
  const app = getFirebaseApp();
  const auth = getAuth(app);
  const credential = GoogleAuthProvider.credential(googleIdToken);
  const userCredential = await signInWithCredential(auth, credential);
  const idToken = await userCredential.user.getIdToken(true);

  // Keep backend token as the app session authority.
  await signOut(auth).catch(() => {});
  return idToken;
}
