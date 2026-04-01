import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import en from "./locales/en.json";
import ar from "./locales/ar.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
import hi from "./locales/hi.json";
import { applyRtlForLanguage } from "../shared/utils/rtl";

export const SUPPORTED_LANGUAGES = ["en", "ar", "fr", "es", "hi"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = "alloul_language";

const resources = {
  en: { translation: en },
  ar: { translation: ar },
  fr: { translation: fr },
  es: { translation: es },
  hi: { translation: hi },
} as const;

function isSupported(code: string | undefined): code is AppLanguage {
  return !!code && (SUPPORTED_LANGUAGES as readonly string[]).includes(code);
}

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "ar",
    fallbackLng: "ar",
    supportedLngs: [...SUPPORTED_LANGUAGES],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    compatibilityJSON: "v4",
  });

void (async function hydrateLanguage() {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    const devicePrimary = Localization.getLocales()[0]?.languageCode ?? undefined;
    let lng: AppLanguage = "ar";
    if (saved && isSupported(saved)) lng = saved;
    else if (devicePrimary && isSupported(devicePrimary)) lng = devicePrimary;
    await i18n.changeLanguage(lng);
    applyRtlForLanguage(lng);
  } catch {
    await i18n.changeLanguage("ar");
    applyRtlForLanguage("ar");
  }
})();

i18n.on("languageChanged", (lng) => {
  applyRtlForLanguage(lng);
});

export async function setAppLanguage(lng: AppLanguage): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  await i18n.changeLanguage(lng);
}

export default i18n;
