import * as SecureStore from "expo-secure-store";

const TOKEN_STORAGE_TIMEOUT_MS = 2500;

function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), TOKEN_STORAGE_TIMEOUT_MS);
    }),
  ]);
}

export async function getToken(): Promise<string | null> {
  try {
    return await withTimeout(SecureStore.getItemAsync("access_token"), null);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  try {
    await withTimeout(SecureStore.setItemAsync("access_token", token), undefined);
  } catch {
    // ignore
  }
}

export async function removeToken(): Promise<void> {
  try {
    await withTimeout(SecureStore.deleteItemAsync("access_token"), undefined);
  } catch {
    // ignore
  }
}
