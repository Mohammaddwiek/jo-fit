'use client';

import { useState } from 'react';
import { AlertTriangle, ChevronDown, ClipboardList, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import OverloadStatusCard from './OverloadStatusCard';
import WorkoutSurveyModal from './WorkoutSurveyModal';
import type { Difficulty, PlanExercise, SurveyInput, WorkoutPlan } from '../lib/planGenerator';
import type { UserProfile } from '../lib/progressiveOverload';
import type { SessionSummary } from '../lib/useJoFitState';

interface WorkoutPlanTabProps {
  plan: WorkoutPlan | null;
  survey: SurveyInput | null;
  profile: UserProfile;
  lastSession: SessionSummary | null;
  hydrated: boolean;
  onPlanGenerated: (plan: WorkoutPlan, survey: SurveyInput) => void;
  onSelectExercise: (exercise: PlanExercise) => void;
}

const DIFFICULTY_BADGE: Record<Difficulty, string> = {
  Low: 'border-cyber-emerald/50 bg-cyber-emerald/10 text-cyber-emerald',
  Moderate: 'border-amber-400/50 bg-amber-400/10 text-amber-400',
  High: 'border-rose-500/50 bg-rose-500/10 text-rose-400',
};

export default function WorkoutPlanTab({
  plan,
  survey,
  profile,
  lastSession,
  hydrated,
  onPlanGenerated,
  onSelectExercise,
}: WorkoutPlanTabProps) {
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [openDays, setOpenDays] = useState<Set<number>>(() => new Set([0]));
  const kneeSafe = survey?.injuries.includes('Knee') ?? false;

  const toggleDay = (index: number) =>
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <div className="flex flex-col gap-5">
      <OverloadStatusCard profile={profile} lastSession={lastSession} kneeSafe={kneeSafe} hydrated={hydrated} />

      {!hydrated ? (
        <div className="h-40 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900" aria-hidden />
      ) : !plan ? (
        <section className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-cyber-cyan/40 bg-zinc-900 px-6 py-10 text-center">
          <ClipboardList className="h-10 w-10 text-cyber-cyan" aria-hidden />
          <div>
            <h2 className="text-lg font-bold text-zinc-100">No training plan yet</h2>
            <p className="mt-1 max-w-md text-sm text-zinc-400">
              Answer 3 quick questions about your body, schedule and injuries. Jo-Fit builds a safe, progressive plan
              and links squats to live AI camera tracking.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSurveyOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-cyber-cyan px-5 py-3 text-sm font-extrabold text-zinc-950 shadow-glow-cyan transition hover:brightness-110"
          >
            <Sparkles className="h-4 w-4" aria-hidden /> Take a Quick Survey to Generate AI Plan
          </button>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Your Plan</p>
                <h2 className="mt-1 text-xl font-bold text-zinc-100">{plan.planSummary.splitName}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-mono text-zinc-300">{plan.planSummary.daysPerWeek} days / week</span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${DIFFICULTY_BADGE[plan.planSummary.overallDifficulty]}`}>
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
                onClick={() => setSurveyOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:border-cyber-cyan hover:text-cyber-cyan"
              >
                <RefreshCw className="h-4 w-4" aria-hidden /> Retake Survey / Regenerate Plan
              </button>
            </div>

            {plan.warnings.length > 0 && (
              <ul className="mt-4 flex flex-col gap-2">
                {plan.warnings.map((warning) => (
                  <li
                    key={warning.kind}
                    className={`flex gap-3 rounded-xl border p-3 text-sm ${
                      warning.kind === 'age'
                        ? 'border-cyber-cyan/30 bg-cyber-cyan/5 text-zinc-200'
                        : 'border-amber-400/40 bg-amber-400/10 text-amber-100'
                    }`}
                  >
                    <AlertTriangle
                      className={`mt-0.5 h-4 w-4 shrink-0 ${warning.kind === 'age' ? 'text-cyber-cyan' : 'text-amber-400'}`}
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
          </section>

          <div className="flex flex-col gap-3">
            {plan.schedule.map((day, index) => {
              const open = openDays.has(index);
              const panelId = `plan-day-${index}`;
              return (
                <section key={day.dayTitle} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                  <h3>
                    <button
                      type="button"
                      onClick={() => toggleDay(index)}
                      aria-expanded={open}
                      aria-controls={panelId}
                      className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left font-semibold text-zinc-100 hover:bg-zinc-800/50"
                    >
                      <span>{day.dayTitle}</span>
                      <span className="flex items-center gap-3 text-xs font-normal text-zinc-500">
                        {day.exercises.length} exercises
                        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
                      </span>
                    </button>
                  </h3>
                  {open && (
                    <div id={panelId} className="grid gap-3 border-t border-zinc-800 p-4 sm:grid-cols-2">
                      {day.exercises.map((exercise) => (
                        <ExerciseCard key={exercise.id} exercise={exercise} onSelect={onSelectExercise} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}

      <WorkoutSurveyModal
        open={surveyOpen}
        onClose={() => setSurveyOpen(false)}
        initial={survey}
        onPlanGenerated={(newPlan, newSurvey) => {
          onPlanGenerated(newPlan, newSurvey);
          setOpenDays(new Set([0]));
        }}
      />
    </div>
  );
}

function ExerciseCard({ exercise, onSelect }: { exercise: PlanExercise; onSelect: (exercise: PlanExercise) => void }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold leading-snug text-zinc-100">{exercise.name}</p>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${DIFFICULTY_BADGE[exercise.difficulty]}`}>
          {exercise.difficulty}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 font-mono text-xs tabular-nums">
        <Spec label="Sets" value={String(exercise.sets)} />
        <Spec label="Reps" value={exercise.reps} />
        <Spec label="Rest" value={exercise.rest} />
      </dl>
      {exercise.targetMetric && <p className="mt-2 text-xs text-zinc-400">Target: {exercise.targetMetric}</p>}
      {exercise.aiSupported && (
        <span className="mt-3 inline-flex items-center gap-1 self-start rounded-full border border-cyber-cyan bg-cyber-cyan/10 px-3 py-1 text-xs font-bold text-cyber-cyan shadow-glow-cyan">
          ⚡ Launch AI Camera Tracking
        </span>
      )}
    </>
  );

  if (!exercise.aiSupported) {
    return <div className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(exercise)}
      className="flex flex-col rounded-xl border border-cyber-cyan/50 bg-zinc-950/60 p-4 text-left transition hover:border-cyber-cyan hover:bg-cyber-cyan/5 hover:shadow-glow-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan"
    >
      {body}
    </button>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-900 px-2 py-1.5">
      <dt className="font-sans text-[10px] uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="font-semibold text-zinc-200">{value}</dd>
    </div>
  );
}
