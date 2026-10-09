'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ClipboardList, Gem, Siren, UserRound, X } from 'lucide-react';
import ArabBankLogo from './ArabBankLogo';
import { TABS, type TabId } from './BottomNav';
import { cn } from '../lib/cn';

const FOCUSABLE = 'a[href], button:not([disabled])';

interface SideDrawerProps {
  open: boolean;
  onClose: () => void;
  activeTab: TabId;
  points: number;
  experience: string;
  hydrated: boolean;
  onNavigate: (tab: TabId) => void;
  onOpenSurvey: () => void;
  onOpenSos: () => void;
}

const DRAWER_LABELS: Record<TabId, string> = {
  home: 'Home',
  plan: 'Workout Plan & AI Studio',
  leaderboard: 'Gym Leaderboard',
  wallet: 'Rewards & Redemptions',
};

export default function SideDrawer({
  open,
  onClose,
  activeTab,
  points,
  experience,
  hydrated,
  onNavigate,
  onOpenSurvey,
  onOpenSos,
}: SideDrawerProps) {
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      const panel = panelRef.current;
      if (event.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  const go = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col border-r border-line bg-surface-2 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-line p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full border border-cyber-emerald/50 bg-cyber-emerald/10">
                  <UserRound className="h-5 w-5 text-cyber-emerald" aria-hidden />
                </span>
                <div>
                  <p className="font-bold text-zinc-100">Jo-Fit Athlete</p>
                  <p className="text-xs font-medium text-zinc-400">{hydrated ? `${experience} member` : ' '}</p>
                  <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-cyber-emerald/15 px-2.5 py-0.5 font-mono text-xs font-black tabular-nums text-cyber-emerald">
                    <Gem className="h-3 w-3 text-cyber-gold" aria-hidden />
                    {hydrated ? points.toLocaleString('en-US') : '—'} Fit Pts
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-surface hover:text-zinc-100"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3">
              <ul className="space-y-1">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = tab.id === activeTab;
                  return (
                    <li key={tab.id}>
                      <button
                        type="button"
                        onClick={() => go(() => onNavigate(tab.id))}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                          active ? 'bg-cyber-emerald/10 text-cyber-emerald' : 'text-zinc-300 hover:bg-surface hover:text-zinc-100',
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                        {DRAWER_LABELS[tab.id]}
                      </button>
                    </li>
                  );
                })}
                <li>
                  <button
                    type="button"
                    onClick={() => go(onOpenSurvey)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-surface hover:text-zinc-100"
                  >
                    <ClipboardList className="h-4 w-4" aria-hidden />
                    Retake Plan Survey
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => go(onOpenSos)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-alert hover:bg-alert/10"
                  >
                    <Siren className="h-4 w-4" aria-hidden />
                    Emergency Assist (SOS)
                  </button>
                </li>
              </ul>
            </nav>

            <div className="m-3 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">Official Health Partner</p>
                <p className="text-sm font-bold text-zinc-100">Arab Bank</p>
              </div>
              <ArabBankLogo size="md" />
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
