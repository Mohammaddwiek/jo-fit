'use client';

import { Activity, Gem, Menu, Siren } from 'lucide-react';

interface AppHeaderProps {
  points: number;
  hydrated: boolean;
  onOpenMenu: () => void;
  onOpenSos: () => void;
}

export default function AppHeader({ points, hydrated, onOpenMenu, onOpenSos }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-obsidian/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open menu"
          className="-ml-1 rounded-lg p-1.5 text-zinc-300 hover:bg-surface hover:text-zinc-100"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-cyber-emerald/50 bg-cyber-emerald/10 shadow-glow-emerald">
            <Activity className="h-4 w-4 text-cyber-emerald" aria-hidden />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-zinc-50">
            Jo-<span className="text-cyber-emerald">Fit</span>
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 rounded-full border border-cyber-gold/50 bg-cyber-gold/10 px-3 py-1.5"
            aria-label={hydrated ? `${points.toLocaleString('en-US')} Arabi Fit Points` : 'Loading points'}
          >
            <Gem className="h-4 w-4 text-cyber-gold" aria-hidden />
            {hydrated ? (
              <span className="font-mono text-sm font-black tabular-nums text-cyber-gold">{points.toLocaleString('en-US')}</span>
            ) : (
              <span className="h-4 w-12 animate-pulse rounded bg-cyber-gold/20" aria-hidden />
            )}
            <span className="hidden text-xs font-medium text-cyber-gold/80 sm:inline">Pts</span>
          </div>
          <button
            type="button"
            onClick={onOpenSos}
            aria-label="Emergency SOS"
            className="grid h-9 w-9 place-items-center rounded-full border-2 border-alert text-alert transition hover:bg-alert/15 hover:shadow-glow-red"
          >
            <Siren className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}
