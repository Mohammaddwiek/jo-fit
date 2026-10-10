'use client';

import { ChevronRight, Dumbbell, Gem, Leaf, Siren, Sparkles, Target, Trophy } from 'lucide-react';
import ArabBankLogo from './ArabBankLogo';
import Card from './ui/Card';
import { useLanguage } from '../context/LanguageContext';
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

// Explicit light/dark text pairs for the main screen (theme tokens elsewhere resolve to the same values).
const HEADING = 'text-slate-900 dark:text-zinc-100';
const META = 'text-slate-500 dark:text-zinc-400';

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
  const { t } = useLanguage();
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
  const todayTracked = today && isTrainingDay(today) ? today.exercises.find((e) => e.aiSupported) ?? null : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={cn('text-2xl font-bold', HEADING)}>{t('home.greeting')}</h1>
          <p className={cn('text-xs font-medium', META)}>{t('home.tagline')}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pe-1 ps-3 shadow-sm dark:border-[#262630] dark:bg-[#16161C]">
          <span className={cn('text-[11px] font-medium', META)}>{t('home.sponsor')}</span>
          <ArabBankLogo size="sm" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat icon={<Gem className="h-4 w-4 text-accent-gold" aria-hidden />} label={t('home.fitPoints')} value={hydrated ? fmt(data.profile.fitPoints) : null} tone="text-accent-gold" />
        <Stat icon={<Trophy className="h-4 w-4 text-accent-gold" aria-hidden />} label={t('home.gymRank')} value={hydrated ? `#${me.rank}` : null} tone={HEADING} />
        <Stat
          icon={<Target className="h-4 w-4 text-accent-emerald" aria-hidden />}
          label={t('home.lastForm')}
          value={hydrated ? (data.lastSession && data.lastSession.status !== 'Set Discarded' ? `${data.lastSession.formAccuracy}%` : '—') : null}
          tone="text-accent-emerald"
        />
      </div>

      <Card className="border-cyber-emerald/30 bg-gradient-to-br from-cyber-emerald/10 to-white dark:to-[#16161C]">
        {!hydrated || todayIndex === null ? (
          <div className="h-28 animate-pulse rounded-xl bg-slate-200/70 dark:bg-[#262630]/60" aria-hidden />
        ) : !data.plan ? (
          <div className="flex flex-col gap-3">
            <p className={cn('flex items-center gap-2 font-bold', HEADING)}>
              <Sparkles className="h-4 w-4 text-accent-emerald" aria-hidden /> {t('home.getPlan')}
            </p>
            <p className={cn('text-sm font-medium', META)}>{t('home.getPlanBody')}</p>
            <div className="flex flex-wrap gap-2">
              <PrimaryButton onClick={onOpenSurvey}>{t('home.takeSurvey')}</PrimaryButton>
              <SecondaryButton onClick={onStartFreeSet}>{t('home.quickFreeSet')}</SecondaryButton>
            </div>
          </div>
        ) : today && !isTrainingDay(today) ? (
          <div className="flex flex-col gap-2">
            <span className="inline-flex w-fit items-center gap-1 rounded-full border border-cyber-emerald/50 bg-cyber-emerald/10 px-2 py-0.5 text-[10px] font-bold uppercase text-accent-emerald">
              <Leaf className="h-3 w-3" aria-hidden /> {t('home.recoveryDay')}
            </span>
            <p className={cn('font-bold', HEADING)}>{today.recovery.title}</p>
            <p className={cn('text-sm font-medium', META)}>{today.recovery.items[0]}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <SecondaryButton onClick={onStartFreeSet}>{t('home.optionalFreeSet')}</SecondaryButton>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className={cn('flex items-center gap-2 font-bold', HEADING)}>
              <Dumbbell className="h-4 w-4 text-accent-emerald" aria-hidden /> {t('home.startWorkout')}
            </p>
            <p className={cn('text-sm font-medium', META)}>
              {t('home.todayRoutine')}{' '}
              <span className="text-slate-700 dark:text-zinc-300">{today?.dayTitle.replace(/^Day \d+: /, '')}</span>
            </p>
            {todayTracked && (
              <p className={cn('font-mono text-xs', META)}>
                {todayTracked.name} · {todayTracked.sets} × {todayTracked.reps}
              </p>
            )}
            <p className={cn('text-xs', META)}>{nextSessionText(data.profile, data.lastSession)}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {todayTracked ? (
                <PrimaryButton onClick={() => onStartExercise(todayTracked)}>{t('button.startNow')}</PrimaryButton>
              ) : (
                <PrimaryButton onClick={onStartFreeSet}>{t('home.startFreeSet')}</PrimaryButton>
              )}
            </div>
          </div>
        )}
      </Card>

      <button
        type="button"
        onClick={onOpenSos}
        className="flex items-center justify-between gap-3 rounded-2xl border border-alert/60 bg-alert/10 p-4 text-start shadow-[0_0_18px_rgba(239,68,68,0.2)] transition hover:bg-alert/15"
      >
        <div>
          <p className={cn('flex items-center gap-2 font-bold', HEADING)}>
            <Siren className="h-4 w-4 text-alert" aria-hidden /> {t('home.emergency')}
          </p>
          <p className={cn('text-xs font-medium', META)}>{t('home.emergencyBody')}</p>
        </div>
        <span className="rounded-xl bg-alert px-3 py-2 text-sm font-black text-white">{t('nav.sos')}</span>
      </button>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className={cn('font-bold', HEADING)}>{t('home.leaderboardPreview')}</h2>
          <button type="button" onClick={onViewLeaderboard} className="inline-flex items-center gap-0.5 text-xs font-semibold text-accent-emerald hover:underline">
            {t('button.viewAll')} <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
          </button>
        </div>
        <ol className="space-y-1.5">
          {preview.map((entry) => (
            <li
              key={entry.name}
              className={cn(
                'flex items-center justify-between rounded-xl px-3 py-2 text-sm',
                entry.isCurrentUser
                  ? 'border border-cyber-emerald/50 bg-cyber-emerald/10 text-accent-emerald'
                  : 'bg-slate-100 text-slate-700 dark:bg-[#111116] dark:text-zinc-300',
              )}
            >
              <span className="flex items-center gap-2.5 font-semibold">
                <span className={cn('w-7 font-mono font-black', entry.rank <= 3 && !entry.isCurrentUser && 'text-accent-gold')}>#{entry.rank}</span>
                {entry.isCurrentUser ? t('home.you') : entry.name}
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
      <span className={cn('flex items-center gap-1.5 text-[11px] font-medium', META)}>
        {icon}
        {label}
      </span>
      {value === null ? (
        <span className="h-6 w-14 animate-pulse rounded bg-slate-200/70 dark:bg-[#262630]/60" aria-hidden />
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
      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-cyber-emerald hover:text-accent-emerald dark:border-[#262630] dark:text-zinc-300"
    >
      {children}
    </button>
  );
}
