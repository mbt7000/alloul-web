import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearRecentSearches } from "./recentSearches";
import { STORAGE_KEYS } from "../config/constants";

const ONBOARDING_COMPLETED_KEY = STORAGE_KEYS.onboardingCompleted;
const HOME_MODE_KEY = STORAGE_KEYS.homeMode;
const STORAGE_TIMEOUT_MS = 2500;

export async function getOnboardingCompleted(): Promise<boolean> {
  try {
    const timeout = new Promise<string | null>((resolve) => {
      setTimeout(() => resolve(null), STORAGE_TIMEOUT_MS);
    });
    const v = await Promise.race([AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY), timeout]);
    return v === "1";
  } catch {
    return false;
  }
}

export async function setOnboardingCompleted(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, "1");
  } catch {
    // ignore
  }
}

/** Clears user-scoped AsyncStorage (not SecureStore — token cleared separately). */
export async function clearSessionLocalStores(): Promise<void> {
  await clearRecentSearches();
  try {
    await AsyncStorage.removeItem(HOME_MODE_KEY);
  } catch {
    /* ignore */
  }
}
