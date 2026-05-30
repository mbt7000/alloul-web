import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const TOKEN_STORAGE_TIMEOUT_MS = 2500;
const TOKEN_KEY = "access_token";

function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), TOKEN_STORAGE_TIMEOUT_MS);
    }),
  ]);
}

export async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }
  try {
    return await withTimeout(SecureStore.getItemAsync(TOKEN_KEY), null);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // ignore
    }
    return;
  }
  try {
    await withTimeout(SecureStore.setItemAsync(TOKEN_KEY, token), undefined);
  } catch {
    // ignore
  }
}

export async function removeToken(): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
    return;
  }
  try {
    await withTimeout(SecureStore.deleteItemAsync(TOKEN_KEY), undefined);
  } catch {
    // ignore
  }
}
