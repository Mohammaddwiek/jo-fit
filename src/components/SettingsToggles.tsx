'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/cn';

const BUTTON = 'grid h-9 place-items-center rounded-full border border-line bg-surface text-soft transition hover:border-cyber-emerald hover:text-accent-emerald';

/** Sun/Moon theme switch. Renders a neutral placeholder until mounted (the theme is unknown on the server). */
export function ThemeToggle({ className, withLabel = false }: { className?: string; withLabel?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = !mounted || resolvedTheme !== 'light';
  const label = isDark ? t('header.toLight') : t('header.toDark');
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={label}
      title={label}
      className={cn(BUTTON, withLabel ? 'flex gap-2 px-3 text-xs font-semibold' : 'w-9', className)}
    >
      {mounted ? isDark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden /> : <span className="h-4 w-4" />}
      {withLabel && <span>{isDark ? t('theme.light') : t('theme.dark')}</span>}
    </button>
  );
}

/** EN/AR switch; shows the language you'll switch to. */
export function LanguageToggle({ className, withLabel = false }: { className?: string; withLabel?: boolean }) {
  const { lang, toggleLang, t } = useLanguage();
  return (
    <button
      type="button"
      onClick={toggleLang}
      aria-label={t('header.switchLanguage')}
      title={t('header.switchLanguage')}
      className={cn(BUTTON, 'px-3 font-mono text-xs font-black', withLabel && 'gap-2 font-sans font-semibold', className)}
    >
      {withLabel ? (lang === 'en' ? t('language.ar') : t('language.en')) : t('header.languageButton')}
    </button>
  );
}
