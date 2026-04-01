import AsyncStorage from "@react-native-async-storage/async-storage";
import { SEARCH_LIMITS, STORAGE_KEYS } from "../config/constants";

const KEY = STORAGE_KEYS.recentSearches;
const MAX = SEARCH_LIMITS.recentSearchesMax;

export async function getRecentSearches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, MAX);
  } catch {
    return [];
  }
}

export async function addRecentSearch(query: string): Promise<void> {
  const q = query.trim();
  if (!q) return;
  try {
    const prev = await getRecentSearches();
    const next = [q, ...prev.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export async function clearRecentSearches(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
