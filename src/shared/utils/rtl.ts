import { I18nManager } from "react-native";

/** BCP-47 primary tags treated as RTL for layout. */
const RTL_TAGS = new Set(["ar", "he", "fa", "ur"]);

/**
 * Apply RTL direction for the given language.
 * Returns true if the direction changed (app reload required).
 */
export function applyRtlForLanguage(lang: string): boolean {
  const primary = (lang || "en").split("-")[0].toLowerCase();
  const rtl = RTL_TAGS.has(primary);
  if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(rtl);
    return true; // direction changed — caller should reload
  }
  return false;
}
