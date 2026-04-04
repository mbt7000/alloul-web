import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  type Auth,
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signOut,
} from "firebase/auth";

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

let cachedAuth: Auth | null = null;

/** على iOS/Android لازم persistence مع AsyncStorage وإلا signInWithCredential يفشل أو يتصرف بشكل غير متوقع. */
function getFirebaseAuth(): Auth {
  if (cachedAuth) return cachedAuth;
  const app = getFirebaseApp();

  if (Platform.OS === "web") {
    cachedAuth = getAuth(app);
    return cachedAuth;
  }

  try {
    // تصديرات RN (initializeAuth + getReactNativePersistence) غير مذكورة في أنواع firebase/auth للمتصفح
    const {
      initializeAuth: initAuth,
      getReactNativePersistence: rnPersistence,
    } = require("firebase/auth") as {
      initializeAuth: (a: FirebaseApp, d: { persistence: unknown }) => Auth;
      getReactNativePersistence: (s: typeof AsyncStorage) => unknown;
    };
    cachedAuth = initAuth(app, {
      persistence: rnPersistence(AsyncStorage),
    });
  } catch {
    // مثلاً بعد hot reload أو تهيئة مسبقة
    cachedAuth = getAuth(app);
  }
  return cachedAuth;
}

/**
 * يحوّل Google id_token (ومفضّلًا access_token) إلى Firebase id_token للـ backend.
 * تمرير access_token يقلّل أخطاء auth/invalid-credential عند بعض إعدادات OAuth.
 */
export async function exchangeGoogleIdTokenForFirebaseIdToken(
  googleIdToken: string,
  googleAccessToken?: string | null
): Promise<string> {
  const auth = getFirebaseAuth();
  const credential = GoogleAuthProvider.credential(
    googleIdToken,
    googleAccessToken && googleAccessToken.length > 0 ? googleAccessToken : undefined
  );
  const userCredential = await signInWithCredential(auth, credential);
  const idToken = await userCredential.user.getIdToken(true);

  await signOut(auth).catch(() => {});
  return idToken;
}

/** Apple identityToken + نفس rawNonce (غير المُجزأ) المستخدم لاشتقاق SHA256 المرسل لـ Apple. */
export async function exchangeAppleIdTokenForFirebaseIdToken(
  appleIdentityToken: string,
  rawNonce: string
): Promise<string> {
  const auth = getFirebaseAuth();
  const provider = new OAuthProvider("apple.com");
  const credential = provider.credential({
    idToken: appleIdentityToken,
    rawNonce,
  });
  const userCredential = await signInWithCredential(auth, credential);
  const idToken = await userCredential.user.getIdToken(true);
  await signOut(auth).catch(() => {});
  return idToken;
}
