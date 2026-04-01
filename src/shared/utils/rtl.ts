import { I18nManager } from "react-native";

/** BCP-47 primary tags treated as RTL for layout. */
const RTL_TAGS = new Set(["ar", "he", "fa", "ur"]);

export function applyRtlForLanguage(lang: string): void {
  const primary = (lang || "en").split("-")[0].toLowerCase();
  const rtl = RTL_TAGS.has(primary);
  if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(rtl);
  }
}
