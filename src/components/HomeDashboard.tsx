'use client';

import { ChevronRight, Dumbbell, Gem, Leaf, Siren, Sparkles, Target, Trophy } from 'lucide-react';
import ArabBankLogo from './ArabBankLogo';
import Card from './ui/Card';
import { heroesGymLeaderboard } from '../data/mockData';
import { cn } from '../lib/cn';
import { rankLeaderboard } from '../lib/leaderboard';
import { nextSessionText } from '../lib/overloadText';
import { isTrainingDay, type PlanExercise } from '../lib/planGenerator';
import type { JoFitData } from '../lib/useJoFitState';

interface HomeDashboardProps {
  data: JoFitData;
  hydrated: boolean;
  /** 0-based index of today in the plan week (Sunday = 0), or null before mount. */
  todayIndex: number | null;
  onStartExercise: (exercise: PlanExercise) => void;
  onStartFreeSet: () => void;
  onOpenSurvey: () => void;
  onOpenSos: () => void;
  onViewLeaderboard: () => void;
}

const fmt = (n: number) => n.toLocaleString('en-US');

export default function HomeDashboard({
  data,
  hydrated,
  todayIndex,
  onStartExercise,
  onStartFreeSet,
  onOpenSurvey,
  onOpenSos,
  onViewLeaderboard,
}: HomeDashboardProps) {
  const ranked = rankLeaderboard(heroesGymLeaderboard.athletes, {
    name: 'You',
    weight: data.profile.currentWeight,
    formAccuracy: data.lastFormAccuracy ?? 0,
    points: data.monthlyPoints,
  });
  const me = ranked.find((entry) => entry.isCurrentUser)!;
  const preview = [...ranked.slice(0, 3), ...(me.rank > 3 ? [me] : [])];

  const today = data.plan && todayIndex !== null ? data.plan.schedule[todayIndex] : null;
  // Today's first camera-tracked exercise: squats on lower days, curls on upper days.
  const todaySquat = today && isTrainingDay(today) ? today.exercises.find((e) => e.aiSupported) ?? null : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Welcome back! 👋</h1>
          <p className="text-xs font-medium text-zinc-400">Verified movement. Real rewards.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-3 pr-1">
          <span className="text-[11px] font-medium text-zinc-400">Official Health Sponsor</span>
          <ArabBankLogo size="sm" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat icon={<Gem className="h-4 w-4 text-cyber-gold" aria-hidden />} label="Fit Points" value={hydrated ? fmt(data.profile.fitPoints) : null} tone="text-cyber-gold" />
        <Stat icon={<Trophy className="h-4 w-4 text-cyber-gold" aria-hidden />} label="Gym Rank" value={hydrated ? `#${me.rank}` : null} tone="text-zinc-100" />
        <Stat
          icon={<Target className="h-4 w-4 text-cyber-emerald" aria-hidden />}
          label="Last Form"
          value={hydrated ? (data.lastSession && data.lastSession.status !== 'Set Discarded' ? `${data.lastSession.formAccuracy}%` : '—') : null}
          tone="text-cyber-emerald"
        />
      </div>

      <Card className="border-cyber-emerald/30 bg-gradient-to-br from-cyber-emerald/10 to-surface">
        {!hydrated || todayIndex === null ? (
          <div className="h-28 animate-pulse rounded-xl bg-white/5" aria-hidden />
        ) : !data.plan ? (
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 font-bold text-zinc-100">
              <Sparkles className="h-4 w-4 text-cyber-emerald" aria-hidden /> Get your AI training plan
            </p>
            <p className="text-sm font-medium text-zinc-400">3 quick questions → a safe 7-day plan with AI-tracked squats.</p>
            <div className="flex flex-wrap gap-2">
              <PrimaryButton onClick={onOpenSurvey}>Take the Survey</PrimaryButton>
              <SecondaryButton onClick={onStartFreeSet}>Quick free squat set</SecondaryButton>
            </div>
          </div>
        ) : today && !isTrainingDay(today) ? (
          <div className="flex flex-col gap-2">
            <span className="inline-flex w-fit items-center gap-1 rounded-full border border-cyber-emerald/50 bg-cyber-emerald/10 px-2 py-0.5 text-[10px] font-bold uppercase text-cyber-emerald">
              <Leaf className="h-3 w-3" aria-hidden /> Recovery Day
            </span>
            <p className="font-bold text-zinc-100">{today.recovery.title}</p>
            <p className="text-sm font-medium text-zinc-400">{today.recovery.items[0]}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <SecondaryButton onClick={onStartFreeSet}>Optional free squat set</SecondaryButton>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 font-bold text-zinc-100">
              <Dumbbell className="h-4 w-4 text-cyber-emerald" aria-hidden /> Start AI Workout
            </p>
            <p className="text-sm font-medium text-zinc-400">
              Today&apos;s routine: <span className="text-zinc-200">{today?.dayTitle.replace(/^Day \d+: /, '')}</span>
            </p>
            {todaySquat && (
              <p className="font-mono text-xs text-zinc-400">
                {todaySquat.name} · {todaySquat.sets} × {todaySquat.reps}
              </p>
            )}
            <p className="text-xs text-zinc-500">{nextSessionText(data.profile, data.lastSession)}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {todaySquat ? (
                <PrimaryButton onClick={() => onStartExercise(todaySquat)}>Start Now</PrimaryButton>
              ) : (
                <PrimaryButton onClick={onStartFreeSet}>Start free squat set</PrimaryButton>
              )}
            </div>
          </div>
        )}
      </Card>

      <button
        type="button"
        onClick={onOpenSos}
        className="flex items-center justify-between gap-3 rounded-2xl border border-alert/60 bg-alert/10 p-4 text-left shadow-[0_0_18px_rgba(239,68,68,0.2)] transition hover:bg-alert/15"
      >
        <div>
          <p className="flex items-center gap-2 font-bold text-zinc-100">
            <Siren className="h-4 w-4 text-alert" aria-hidden /> Emergency Assist
          </p>
          <p className="text-xs font-medium text-zinc-400">Call 911 and your saved emergency contact</p>
        </div>
        <span className="rounded-xl bg-alert px-3 py-2 text-sm font-black text-white">SOS</span>
      </button>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-zinc-100">Leaderboard Preview</h2>
          <button type="button" onClick={onViewLeaderboard} className="inline-flex items-center gap-0.5 text-xs font-semibold text-cyber-emerald hover:underline">
            View all <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
        <ol className="space-y-1.5">
          {preview.map((entry) => (
            <li
              key={entry.name}
              className={cn(
                'flex items-center justify-between rounded-xl px-3 py-2 text-sm',
                entry.isCurrentUser ? 'border border-cyber-emerald/50 bg-cyber-emerald/10 text-cyber-emerald' : 'bg-surface-2 text-zinc-200',
              )}
            >
              <span className="flex items-center gap-2.5 font-semibold">
                <span className={cn('w-7 font-mono font-black', entry.rank <= 3 && !entry.isCurrentUser && 'text-cyber-gold')}>#{entry.rank}</span>
                {entry.isCurrentUser ? 'You' : entry.name}
              </span>
              <span className="font-mono font-black tabular-nums">{hydrated || !entry.isCurrentUser ? fmt(entry.points) : '—'}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string | null; tone: string }) {
  return (
    <Card className="flex flex-col gap-1 p-3">
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
        {icon}
        {label}
      </span>
      {value === null ? (
        <span className="h-6 w-14 animate-pulse rounded bg-white/5" aria-hidden />
      ) : (
        <span className={cn('font-mono text-lg font-black tabular-nums', tone)}>{value}</span>
      )}
    </Card>
  );
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl bg-cyber-emerald px-5 py-2.5 text-sm font-extrabold text-zinc-950 shadow-glow-emerald transition hover:brightness-110"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-cyber-emerald hover:text-cyber-emerald"
    >
      {children}
    </button>
  );
}
