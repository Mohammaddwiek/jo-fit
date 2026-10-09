'use client';

import { useRef, type KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Gem, Home, Trophy, type LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';

export const TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'plan', label: 'Plan & AI Studio', icon: Dumbbell },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'wallet', label: 'Rewards', icon: Gem },
] as const satisfies ReadonlyArray<{ id: string; label: string; icon: LucideIcon }>;

export type TabId = (typeof TABS)[number]['id'];

interface BottomNavProps {
  active: TabId;
  onSelect: (tab: TabId) => void;
}

export default function BottomNav({ active, onSelect }: BottomNavProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = TABS.length - 1;
    const target =
      event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null;
    if (target === null) return;
    event.preventDefault();
    onSelect(TABS[target].id);
    refs.current[target]?.focus();
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-2/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div role="tablist" aria-label="Jo-Fit sections" className="mx-auto grid max-w-3xl grid-cols-4">
        {TABS.map((tab, index) => {
          const selected = tab.id === active;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[index] = el;
              }}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                'relative flex flex-col items-center gap-1 px-1 pb-2.5 pt-3 text-[11px] font-semibold transition',
                selected ? 'text-cyber-emerald' : 'text-zinc-500 hover:text-zinc-300',
              )}
            >
              {selected && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-cyber-emerald shadow-glow-emerald"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <Icon className={cn('h-5 w-5', selected && 'drop-shadow-[0_0_8px_rgba(0,230,118,0.7)]')} aria-hidden />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
