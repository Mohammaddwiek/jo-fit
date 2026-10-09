'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, ChevronDown, ClipboardList, Leaf, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import Card from './ui/Card';
import { useToast } from './ui/Toast';
import { cn } from '../lib/cn';
import { nextSessionText, workingLoad } from '../lib/overloadText';
import {
  isTrainingDay,
  type Difficulty,
  type PlanExercise,
  type RecoveryDay,
  type SurveyInput,
  type WorkoutPlan,
} from '../lib/planGenerator';
import { DELOAD_FACTOR, FORM_SCORE_THRESHOLD, WEIGHT_INCREMENT_KG, type UserProfile } from '../lib/progressiveOverload';
import { DEPTH_ANGLE, KNEE_SAFE_VALID_ANGLE } from '../lib/squatThresholds';
import type { SessionSummary } from '../lib/useJoFitState';

interface WorkoutPlanTabProps {
  plan: WorkoutPlan | null;
  survey: SurveyInput | null;
  profile: UserProfile;
  lastSession: SessionSummary | null;
  hydrated: boolean;
  /** 0-based index of today's day in the week (Sunday = 0), or null before mount. */
  todayIndex: number | null;
  onOpenSurvey: () => void;
  onSelectExercise: (exercise: PlanExercise) => void;
}

const DIFFICULTY_BADGE: Record<Difficulty, string> = {
  Low: 'border-cyber-emerald/50 bg-cyber-emerald/10 text-cyber-emerald',
  Moderate: 'border-amber-400/50 bg-amber-400/10 text-amber-400',
  High: 'border-rose-500/50 bg-rose-500/10 text-rose-400',
};

const DEMO_TOAST = 'Computer vision model currently trained for Squats. Next update adds Upper Body tracking.';

export default function WorkoutPlanTab({
  plan,
  survey,
  profile,
  lastSession,
  hydrated,
  todayIndex,
  onOpenSurvey,
  onSelectExercise,
}: WorkoutPlanTabProps) {
  const [openDays, setOpenDays] = useState<Set<number>>(() => new Set([0]));
  const kneeSafe = survey?.injuries.includes('Knee') ?? false;

  // Open today's day once it's known (after mount, so server and client markup match).
  useEffect(() => {
    if (todayIndex !== null) setOpenDays(new Set([todayIndex]));
  }, [todayIndex, plan]);

  const toggleDay = (index: number) =>
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  if (!hydrated) return <div className="h-64 animate-pulse rounded-2xl border border-line bg-surface" aria-hidden />;

  if (!plan) {
    return (
      <Card className="flex flex-col items-center gap-4 border-dashed border-cyber-emerald/40 px-6 py-10 text-center">
        <ClipboardList className="h-10 w-10 text-cyber-emerald" aria-hidden />
        <div>
          <h2 className="text-lg font-bold text-zinc-100">No training plan yet</h2>
          <p className="mt-1 max-w-md text-sm font-medium text-zinc-400">
            Answer 3 quick questions about your body, schedule and injuries. Jo-Fit builds a safe 7-day plan and links
            squats to live AI camera tracking.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenSurvey}
          className="inline-flex items-center gap-2 rounded-xl bg-cyber-emerald px-5 py-3 text-sm font-extrabold text-zinc-950 shadow-glow-emerald transition hover:brightness-110"
        >
          <Sparkles className="h-4 w-4" aria-hidden /> Take a Quick Survey to Generate AI Plan
        </button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">My AI Plan</p>
            <h2 className="mt-1 text-xl font-bold text-zinc-100">{plan.planSummary.splitName}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-mono font-bold text-zinc-200">{plan.planSummary.daysPerWeek} training days / wk</span>
              <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-bold', DIFFICULTY_BADGE[plan.planSummary.overallDifficulty])}>
                {plan.planSummary.overallDifficulty} difficulty
              </span>
              <span className="font-mono text-xs text-zinc-400">
                {plan.intensity} · RPE {plan.rpe}
              </span>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-zinc-300">
              <ShieldCheck className="h-4 w-4 text-cyber-emerald" aria-hidden /> {plan.planSummary.injuryProtocol}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSurvey}
            className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:border-cyber-emerald hover:text-cyber-emerald"
          >
            <RefreshCw className="h-4 w-4" aria-hidden /> Retake Survey / Regenerate Plan
          </button>
        </div>

        {plan.warnings.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {plan.warnings.map((warning) => (
              <li
                key={warning.kind}
                className={cn(
                  'flex gap-3 rounded-xl border p-3 text-sm',
                  warning.kind === 'age'
                    ? 'border-cyber-cyan/30 bg-cyber-cyan/5 text-zinc-200'
                    : 'border-amber-400/40 bg-amber-400/10 text-amber-100',
                )}
              >
                <AlertTriangle
                  className={cn('mt-0.5 h-4 w-4 shrink-0', warning.kind === 'age' ? 'text-cyber-cyan' : 'text-amber-400')}
                  aria-hidden
                />
                <div>
                  <p className="font-semibold">{warning.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed opacity-90">{warning.message}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="flex flex-col gap-3">
        {plan.schedule.map((day, index) => {
          const open = openDays.has(index);
          const panelId = `plan-day-${index}`;
          const isToday = index === todayIndex;
          const training = isTrainingDay(day);
          return (
            <section key={day.dayTitle} className={cn('overflow-hidden rounded-2xl border bg-surface', isToday ? 'border-cyber-emerald/50' : 'border-line')}>
              <h3>
                <button
                  type="button"
                  onClick={() => toggleDay(index)}
                  aria-expanded={open}
                  aria-controls={panelId}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-white/[0.02]"
                >
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="font-bold text-zinc-100">{day.dayTitle}</span>
                    {isToday && (
                      <span className="rounded-full bg-cyber-emerald px-2 py-0.5 text-[10px] font-extrabold uppercase text-zinc-950">Today</span>
                    )}
                    {!training && <RecoveryPill />}
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-xs font-medium text-zinc-400">
                    {training ? `${day.exercises.length} exercises` : 'Rest'}
                    <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden />
                  </span>
                </button>
              </h3>
              {open && (
                <div id={panelId} className="border-t border-line p-3 sm:p-4">
                  {training ? (
                    <div className="grid items-start gap-3 md:grid-cols-2">
                      {day.exercises.map((exercise) => (
                        <ExerciseCard
                          key={exercise.id}
                          exercise={exercise}
                          plan={plan}
                          profile={profile}
                          lastSession={lastSession}
                          kneeSafe={kneeSafe}
                          onSelect={onSelectExercise}
                        />
                      ))}
                    </div>
                  ) : (
                    <RecoveryCard day={day} />
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function RecoveryPill() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-cyber-emerald/50 bg-cyber-emerald/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyber-emerald">
      <Leaf className="h-3 w-3" aria-hidden /> Recovery Day
    </span>
  );
}

function RecoveryCard({ day }: { day: RecoveryDay }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-zinc-100">{day.recovery.title}</p>
        <RecoveryPill />
      </div>
      <ul className="mt-3 space-y-2">
        {day.recovery.items.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-zinc-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyber-emerald" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ExerciseCardProps {
  exercise: PlanExercise;
  plan: WorkoutPlan;
  profile: UserProfile;
  lastSession: SessionSummary | null;
  kneeSafe: boolean;
  onSelect: (exercise: PlanExercise) => void;
}

function ExerciseCard({ exercise, plan, profile, lastSession, kneeSafe, onSelect }: ExerciseCardProps) {
  const [metricsOpen, setMetricsOpen] = useState(false);
  const showToast = useToast();
  const isSquat = exercise.kind === 'squat';
  const metricsId = `${exercise.id}-overload`;

  const metrics = [
    {
      label: 'Current Working Set',
      value: isSquat
        ? `${workingLoad(profile)} × ${exercise.reps} reps · ${exercise.sets} sets`
        : `${exercise.sets} × ${exercise.reps} @ RPE ${plan.rpe}`,
      note: isSquat ? nextSessionText(profile, lastSession) : 'Load tracking arrives with upper-body vision.',
    },
    { label: 'Overload Rule', value: `+${WEIGHT_INCREMENT_KG} kg`, note: `When every set hits target reps with form ≥ ${FORM_SCORE_THRESHOLD}%.` },
    { label: 'Form Gate', value: `≥ ${FORM_SCORE_THRESHOLD}%`, note: 'Below it, the load is held until form improves.' },
    {
      label: 'Deload Safety Threshold',
      value: `−${Math.round((1 - DELOAD_FACTOR) * 100)}%`,
      note: 'When the target is missed. Sets with too few reps are discarded, not deloaded.',
    },
  ];
  if (isSquat) {
    metrics.push({
      label: 'Depth Target',
      value: kneeSafe ? `${DEPTH_ANGLE}–${KNEE_SAFE_VALID_ANGLE}°` : `≤ ${DEPTH_ANGLE}°`,
      note: kneeSafe ? 'Knee-safe box depth.' : 'Thigh parallel to the floor.',
    });
  }

  return (
    <article className={cn('flex flex-col rounded-xl border bg-surface-2 p-4', isSquat ? 'border-cyber-emerald/40' : 'border-line')}>
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-bold leading-snug text-zinc-100">{exercise.name}</h4>
        <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase', DIFFICULTY_BADGE[exercise.difficulty])}>
          {exercise.difficulty}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <Spec label="Sets" value={String(exercise.sets)} />
        <Spec label="Reps" value={exercise.reps} />
        <Spec label="Rest" value={exercise.rest} />
      </dl>
      {exercise.targetMetric && <p className="mt-2 text-xs font-medium text-zinc-400">Target: {exercise.targetMetric}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMetricsOpen((v) => !v)}
          aria-expanded={metricsOpen}
          aria-controls={metricsId}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition',
            metricsOpen
              ? 'border-cyber-gold bg-cyber-gold/15 text-cyber-gold'
              : 'border-cyber-gold/40 text-cyber-gold/90 hover:bg-cyber-gold/10',
          )}
        >
          ⚡ Overload Metrics
          <ChevronDown className={cn('h-3 w-3 transition-transform', metricsOpen && 'rotate-180')} aria-hidden />
        </button>

        {isSquat ? (
          <button
            type="button"
            onClick={() => onSelect(exercise)}
            className="inline-flex items-center gap-1 rounded-full bg-cyber-emerald px-3 py-1.5 text-xs font-extrabold text-zinc-950 shadow-glow-emerald transition hover:brightness-110"
          >
            ⚡ Launch AI Camera Tracker
          </button>
        ) : (
          <button
            type="button"
            aria-disabled="true"
            onClick={() => showToast(DEMO_TOAST)}
            className="inline-flex cursor-not-allowed items-center gap-1 rounded-full border border-line px-3 py-1.5 text-left text-xs font-semibold text-zinc-400 opacity-50"
          >
            ⚡ AI Pose Tracking (Vision Model In Training / Demo)
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {metricsOpen && (
          <motion.div
            id={metricsId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <dl className="mt-3 space-y-2 rounded-xl border border-cyber-gold/25 bg-cyber-gold/5 p-3">
              {metrics.map((metric) => (
                <div key={metric.label}>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-xs font-medium text-zinc-400">{metric.label}</dt>
                    <dd className="text-right font-mono text-sm font-black tabular-nums text-cyber-gold">{metric.value}</dd>
                  </div>
                  <p className="text-[11px] text-zinc-500">{metric.note}</p>
                </div>
              ))}
            </dl>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface px-2 py-1.5">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="font-mono font-bold tabular-nums text-zinc-100">{value}</dd>
    </div>
  );
}
