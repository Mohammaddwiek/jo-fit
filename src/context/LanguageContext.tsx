'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ar } from '../locales/ar';
import { en, type TranslationKey } from '../locales/en';

export type Language = 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';

/** localStorage key; also read by the inline script in layout.tsx before first paint. */
export const LANGUAGE_STORAGE_KEY = 'jofit:lang';

const DICTIONARIES: Record<Language, Record<TranslationKey, string>> = { en, ar };

interface LanguageContextValue {
  lang: Language;
  dir: Direction;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  /** Looks up a string; `{name}` placeholders are filled from `vars`. Falls back to English. */
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const directionFor = (lang: Language): Direction => (lang === 'ar' ? 'rtl' : 'ltr');

function translate(lang: Language, key: TranslationKey, vars?: Record<string, string | number>): string {
  const template = DICTIONARIES[lang][key] ?? en[key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  dir: 'ltr',
  setLang: () => {},
  toggleLang: () => {},
  t: (key, vars) => translate('en', key, vars),
});

function applyToDocument(lang: Language) {
  document.documentElement.lang = lang;
  document.documentElement.dir = directionFor(lang);
}

/**
 * The first render is always English, so server and client markup match. The saved choice is
 * applied after mount; the inline script in layout.tsx has already set `dir` to avoid a flash.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored === 'ar' || stored === 'en') setLangState(stored);
    } catch {
      // Blocked storage: stay in English.
    }
  }, []);

  useEffect(() => {
    applyToDocument(lang);
  }, [lang]);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // The choice still applies for this visit.
    }
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      dir: directionFor(lang),
      setLang,
      toggleLang: () => setLang(lang === 'en' ? 'ar' : 'en'),
      t: (key, vars) => translate(lang, key, vars),
    }),
    [lang, setLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
