import { Crown, Medal } from 'lucide-react';
import { heroesGymLeaderboard, type LeaderboardAthlete } from '../data/mockData';
import { rankLeaderboard, type RankedEntry } from '../lib/leaderboard';

interface GymLeaderboardProps {
  currentUser: LeaderboardAthlete;
  hydrated: boolean;
}

const fmt = (n: number) => n.toLocaleString('en-US');
const TABLE_RANKS = { from: 4, to: 6 };

const PODIUM_STYLES = {
  1: { order: 'order-2', height: 'h-36 sm:h-44', ring: 'border-cyber-gold shadow-glow-gold', label: 'text-cyber-gold' },
  2: { order: 'order-1', height: 'h-24 sm:h-32', ring: 'border-zinc-300/70', label: 'text-zinc-300' },
  3: { order: 'order-3', height: 'h-20 sm:h-24', ring: 'border-[#CD7F32]/80', label: 'text-[#CD7F32]' },
} as const;

export default function GymLeaderboard({ currentUser, hydrated }: GymLeaderboardProps) {
  const ranked = rankLeaderboard(heroesGymLeaderboard.athletes, currentUser);
  const podium = ranked.slice(0, 3);
  const tableRows = ranked.filter((entry) => entry.rank >= TABLE_RANKS.from && entry.rank <= TABLE_RANKS.to);
  const me = ranked.find((entry) => entry.isCurrentUser)!;
  const meBelowTable = me.rank > TABLE_RANKS.to;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-zinc-100 sm:text-xl">
          Amman Community Leaderboard - {heroesGymLeaderboard.hub}
        </h2>
        <span className="rounded-full border border-cyber-cyan/40 bg-cyber-cyan/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-cyber-cyan">
          {heroesGymLeaderboard.period}
        </span>
      </header>

      <section aria-label="Top 3" className="grid grid-cols-3 items-end gap-2 sm:gap-4">
        {podium.map((entry) => (
          <PodiumSpot key={entry.name} entry={entry} />
        ))}
      </section>

      <section aria-label="Rankings" className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900">
        <table className="w-full min-w-[440px] text-left text-sm">
          <thead className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">
            <tr className="border-b border-zinc-800">
              <th scope="col" className="px-4 py-3 font-medium">Rank</th>
              <th scope="col" className="px-4 py-3 font-medium">Athlete</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Squat</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Form</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Pts</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {tableRows.map((entry) => (
              <Row key={entry.name} entry={entry} hydrated={hydrated} />
            ))}
            {meBelowTable && (
              <>
                <tr aria-hidden>
                  <td colSpan={5} className="py-1 text-center text-zinc-600">⋯</td>
                </tr>
                <Row entry={me} hydrated={hydrated} />
              </>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function PodiumSpot({ entry }: { entry: RankedEntry }) {
  const style = PODIUM_STYLES[entry.rank as 1 | 2 | 3];
  const Icon = entry.rank === 1 ? Crown : Medal;
  return (
    <div className={`flex min-w-0 flex-col items-center gap-2 ${style.order}`}>
      <Icon className={`h-7 w-7 ${style.label} ${entry.rank === 1 ? 'drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]' : ''}`} aria-hidden />
      <div className="w-full min-w-0 text-center">
        <p className={`truncate text-sm font-bold ${entry.isCurrentUser ? 'text-cyber-cyan' : 'text-zinc-100'}`}>
          {entry.name}
          {entry.isCurrentUser && <YouTag />}
        </p>
        <p className="truncate font-mono text-[11px] tabular-nums text-zinc-400 sm:text-xs">
          {entry.weight} kg @ {entry.formAccuracy}% Form
        </p>
        <p className={`font-mono text-sm font-bold tabular-nums ${style.label}`}>{fmt(entry.points)} Pts</p>
      </div>
      <div
        className={`flex w-full items-start justify-center rounded-t-xl border-x border-t bg-gradient-to-b from-zinc-800 to-zinc-900 pt-2 ${style.height} ${
          entry.isCurrentUser ? 'border-cyber-cyan shadow-glow-cyan' : style.ring
        }`}
      >
        <span className={`font-mono text-2xl font-extrabold ${style.label}`}>#{entry.rank}</span>
      </div>
    </div>
  );
}

function Row({ entry, hydrated }: { entry: RankedEntry; hydrated: boolean }) {
  const highlight = entry.isCurrentUser;
  const cell = 'px-4 py-3';
  const value = (text: string) => (highlight && !hydrated ? <span className="inline-block h-4 w-10 animate-pulse rounded bg-zinc-700" /> : text);
  return (
    <tr
      className={
        highlight
          ? 'bg-cyber-cyan/10 text-cyber-cyan shadow-[inset_0_0_0_1px_#00E5FF,0_0_18px_rgba(0,229,255,0.35)]'
          : 'border-b border-zinc-800/70 text-zinc-200 last:border-b-0'
      }
    >
      <td className={`${cell} font-bold`}>#{entry.rank}</td>
      <td className={`${cell} font-sans font-semibold`}>
        {entry.name}
        {highlight && <YouTag />}
      </td>
      <td className={`${cell} text-right`}>{value(`${entry.weight} kg`)}</td>
      <td className={`${cell} text-right`}>{value(`${entry.formAccuracy}%`)}</td>
      <td className={`${cell} text-right font-bold`}>{value(fmt(entry.points))}</td>
    </tr>
  );
}

function YouTag() {
  return (
    <span className="ml-2 rounded bg-cyber-cyan px-1.5 py-0.5 align-middle font-mono text-[10px] font-extrabold text-zinc-950">
      YOU
    </span>
  );
}
