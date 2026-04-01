import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { applyRtlForLanguage } from "./utils/rtl";

/** Keeps native RTL in sync when language changes (e.g. from Settings). */
export default function LanguageSync() {
  const { i18n } = useTranslation();
  useEffect(() => {
    applyRtlForLanguage(i18n.language);
  }, [i18n.language]);
  return null;
}
