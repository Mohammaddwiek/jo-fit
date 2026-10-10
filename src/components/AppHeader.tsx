'use client';

import { Activity, Gem, Menu, Siren } from 'lucide-react';
import { LanguageToggle, ThemeToggle } from './SettingsToggles';
import { useLanguage } from '../context/LanguageContext';

interface AppHeaderProps {
  points: number;
  hydrated: boolean;
  onOpenMenu: () => void;
  onOpenSos: () => void;
}

export default function AppHeader({ points, hydrated, onOpenMenu, onOpenSos }: AppHeaderProps) {
  const { t } = useLanguage();
  const formatted = points.toLocaleString('en-US');

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur dark:border-[#262630] dark:bg-[#0B0B0E]/90">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3 sm:gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label={t('header.openMenu')}
          className="-ms-1 rounded-lg p-1.5 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-[#16161C] dark:hover:text-zinc-100"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-cyber-emerald/50 bg-cyber-emerald/10 shadow-glow-emerald">
            <Activity className="h-4 w-4 text-accent-emerald" aria-hidden />
          </span>
          <span dir="ltr" className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">
            Jo-<span className="text-accent-emerald">Fit</span>
          </span>
        </div>

        <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
          <div
            className="flex items-center gap-1.5 rounded-full border border-cyber-gold/50 bg-cyber-gold/10 px-2.5 py-1.5"
            aria-label={hydrated ? t('header.pointsAria', { points: formatted }) : t('header.loadingPoints')}
          >
            <Gem className="h-4 w-4 text-accent-gold" aria-hidden />
            {hydrated ? (
              <span className="font-mono text-sm font-black tabular-nums text-accent-gold">{formatted}</span>
            ) : (
              <span className="h-4 w-12 animate-pulse rounded bg-cyber-gold/20" aria-hidden />
            )}
            <span className="hidden text-xs font-medium text-accent-gold/80 sm:inline">{t('header.points')}</span>
          </div>
          <ThemeToggle />
          <LanguageToggle />
          <button
            type="button"
            onClick={onOpenSos}
            aria-label={t('header.sos')}
            className="grid h-9 w-9 place-items-center rounded-full border-2 border-alert text-alert transition hover:bg-alert/15 hover:shadow-glow-red"
          >
            <Siren className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}
