import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { loadLanguagePack } from "./init";

export function useLanguageSync(
  preferredLang: string | undefined | null,
  translations?: Record<string, Record<string, unknown>> | null,
) {
  const { i18n } = useTranslation();

  useEffect(() => {
    if (translations) {
      for (const [code, pack] of Object.entries(translations)) {
        if (code !== "ru") loadLanguagePack(code, pack);
      }
    }
  }, [translations]);

  useEffect(() => {
    const lang = preferredLang || "ru";
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [preferredLang, i18n]);
}

export function useAdminLanguageSync() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const stored = localStorage.getItem("admin_preferred_lang");
    if (stored && i18n.language !== stored) {
      i18n.changeLanguage(stored);
    }
  }, [i18n]);
}

export function setAdminLanguage(lang: string) {
  localStorage.setItem("admin_preferred_lang", lang);
}
