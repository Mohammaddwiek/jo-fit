import { Crown, Medal, MapPin } from 'lucide-react';
import { heroesGymLeaderboard, type LeaderboardAthlete } from '../data/mockData';
import { cn } from '../lib/cn';
import { rankLeaderboard, type RankedEntry } from '../lib/leaderboard';

interface GymLeaderboardProps {
  currentUser: LeaderboardAthlete;
  hydrated: boolean;
}

const fmt = (n: number) => n.toLocaleString('en-US');
const LIST_RANKS = { from: 4, to: 6 };

const PODIUM_STYLES = {
  1: {
    order: 'order-2',
    height: 'h-32 sm:h-40',
    pedestal: 'from-amber-500/35 to-amber-900/20 border-cyber-gold shadow-glow-gold',
    label: 'text-cyber-gold',
    place: '1st',
  },
  2: {
    order: 'order-1',
    height: 'h-24 sm:h-28',
    pedestal: 'from-zinc-300/25 to-zinc-700/10 border-zinc-300/60',
    label: 'text-zinc-200',
    place: '2nd',
  },
  3: {
    order: 'order-3',
    height: 'h-20 sm:h-24',
    pedestal: 'from-[#CD7F32]/30 to-[#CD7F32]/5 border-[#CD7F32]/70',
    label: 'text-[#E39A55]',
    place: '3rd',
  },
} as const;

const initials = (name: string) =>
  name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');

export default function GymLeaderboard({ currentUser, hydrated }: GymLeaderboardProps) {
  const ranked = rankLeaderboard(heroesGymLeaderboard.athletes, currentUser);
  const podium = ranked.slice(0, 3);
  const listRows = ranked.filter((entry) => entry.rank >= LIST_RANKS.from && entry.rank <= LIST_RANKS.to);
  const me = ranked.find((entry) => entry.isCurrentUser)!;
  const meBelowList = me.rank > LIST_RANKS.to;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-bold text-zinc-100">Gym Leaderboard</h1>
        <p className="flex items-center gap-1 text-sm font-medium text-zinc-400">
          Amman Community · {heroesGymLeaderboard.hub}
          <MapPin className="h-3.5 w-3.5 text-alert" aria-hidden />
        </p>
        <span className="mt-1 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-cyber-emerald">
          {heroesGymLeaderboard.period}
        </span>
      </header>

      <section aria-label="Top 3" className="grid grid-cols-3 items-end gap-2 sm:gap-3">
        {podium.map((entry) => (
          <PodiumSpot key={entry.name} entry={entry} />
        ))}
      </section>

      <section aria-label="Rankings">
        <ol className="flex flex-col gap-2">
          {listRows.map((entry) => (
            <Row key={entry.name} entry={entry} hydrated={hydrated} />
          ))}
          {meBelowList && (
            <>
              <li aria-hidden className="text-center text-zinc-600">
                ⋯
              </li>
              <Row entry={me} hydrated={hydrated} />
            </>
          )}
        </ol>
      </section>
    </div>
  );
}

function PodiumSpot({ entry }: { entry: RankedEntry }) {
  const style = PODIUM_STYLES[entry.rank as 1 | 2 | 3];
  const Icon = entry.rank === 1 ? Crown : Medal;
  return (
    <div className={cn('flex min-w-0 flex-col items-center gap-2', style.order)}>
      <Icon
        className={cn('h-8 w-8', style.label, entry.rank === 1 && 'drop-shadow-[0_0_12px_rgba(245,158,11,0.9)]')}
        aria-hidden
      />
      <div
        className={cn(
          'flex w-full flex-col items-center justify-start gap-0.5 rounded-t-2xl border-x border-t bg-gradient-to-b px-1 pt-3 text-center',
          style.height,
          entry.isCurrentUser ? 'border-cyber-emerald from-cyber-emerald/30 to-cyber-emerald/5 shadow-glow-emerald' : style.pedestal,
        )}
      >
        <span className={cn('font-mono text-xl font-black', style.label)}>{style.place}</span>
        <span className={cn('w-full truncate text-xs font-bold', entry.isCurrentUser ? 'text-cyber-emerald' : 'text-zinc-100')}>
          {entry.isCurrentUser ? 'You' : entry.name.split(' ')[0]}
        </span>
        <span className="font-mono text-[11px] font-bold tabular-nums text-zinc-300">({fmt(entry.points)} Pts)</span>
        <span className="hidden truncate font-mono text-[10px] text-zinc-400 sm:block">
          {entry.weight} kg @ {entry.formAccuracy}%
        </span>
      </div>
    </div>
  );
}

function Row({ entry, hydrated }: { entry: RankedEntry; hydrated: boolean }) {
  const highlight = entry.isCurrentUser;
  const pending = highlight && !hydrated;
  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-2xl border p-3',
        highlight
          ? 'border-cyber-emerald bg-cyber-emerald/15 shadow-[0_0_20px_rgba(0,230,118,0.3)]'
          : 'border-line bg-surface',
      )}
    >
      <span className={cn('w-8 font-mono text-sm font-black', highlight ? 'text-cyber-emerald' : 'text-zinc-400')}>#{entry.rank}</span>
      <span
        aria-hidden
        className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-black',
          highlight ? 'bg-cyber-emerald text-zinc-950' : 'border border-line bg-surface-2 text-zinc-200',
        )}
      >
        {highlight ? 'YOU' : initials(entry.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-bold', highlight ? 'text-cyber-emerald' : 'text-zinc-100')}>
          {highlight ? 'You' : entry.name}
        </p>
        <p className="truncate font-mono text-xs text-zinc-400">
          {pending ? '—' : `${entry.weight} kg squat · ${entry.formAccuracy}% accuracy`}
        </p>
      </div>
      <span className={cn('shrink-0 font-mono text-sm font-black tabular-nums', highlight ? 'text-cyber-emerald' : 'text-cyber-gold')}>
        {pending ? '—' : `${fmt(entry.points)} Pts`}
      </span>
    </li>
  );
}
