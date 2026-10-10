'use client';

import { CheckCircle2, Info, RotateCcw, XCircle } from 'lucide-react';
import { cn } from '../lib/cn';
import { CURL_ERROR_PRIORITY, type CurlError, type CurlRep } from '../lib/curlLogic';
import { FORM_SCORE_THRESHOLD } from '../lib/progressiveOverload';
import type { SessionSummary } from '../lib/useJoFitState';

interface BicepSetResultsProps {
  reps: CurlRep[];
  targetReps: number;
  exerciseName: string;
  /** What saving will do, computed without saving. */
  outcome: SessionSummary;
  onSave: () => void;
  onRetry: () => void;
}

const ERROR_NAMES: Record<CurlError, string> = {
  elbow_flare: 'Elbow Flare',
  partial_rep_top: 'Partial Range (Top)',
  partial_rep_bottom: 'Partial Range (Bottom)',
};

const CORRECTIONS: Record<CurlError, string> = {
  elbow_flare:
    '⚠️ Elbow Flare: You let your elbows drift outward. Next set, keep your elbows strictly pinned to your ribs to isolate the biceps.',
  partial_rep_bottom:
    "⚠️ Partial Range (Bottom): You didn't straighten your arms fully at the bottom. Full extension builds more muscle.",
  partial_rep_top: "⚠️ Partial Range (Top): You didn't squeeze at the top. Curl the weight all the way up to your shoulders.",
};

function outcomeText(o: SessionSummary): string {
  switch (o.status) {
    case 'Overload Achieved':
      return `Overload achieved — next curl weight ${o.previousWeight} → ${o.nextWeight} kg.`;
    case 'Form Gate Active':
      return `Form below ${FORM_SCORE_THRESHOLD}% — hold ${o.previousWeight} kg next time. No points this set.`;
    case 'Deload Triggered':
      return `Target missed — deload to ${o.nextWeight} kg to recover. No points this set.`;
    case 'Set Discarded':
      return 'Too few valid reps to count — progression unchanged, no points.';
  }
}

export default function BicepSetResults({ reps, targetReps, exerciseName, outcome, onSave, onRetry }: BicepSetResultsProps) {
  const validReps = reps.filter((rep) => rep.isValid).length;
  const errorsSeen = CURL_ERROR_PRIORITY.filter((error) => reps.some((rep) => rep.errorType === error));
  const flareNeverChecked = reps.length > 0 && !reps.some((rep) => rep.flareChecked);

  return (
    <section className="mx-auto w-full max-w-[640px] rounded-2xl border border-[#262630] bg-[#16161C] p-6 text-zinc-100">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">{exerciseName}</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-bold">Set Complete - Form Analysis</h2>
        <p className="font-mono font-black tabular-nums">
          <span className="text-4xl text-cyber-emerald">{validReps}</span>
          <span className="text-lg text-zinc-400"> / {targetReps} valid reps</span>
        </p>
      </div>

      <h3 className="mt-5 text-sm font-bold">Rep Breakdown</h3>
      {reps.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-400">No reps were logged in this set.</p>
      ) : (
        <ol className="mt-2 max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {reps.map((rep) => (
            <li
              key={rep.repNumber}
              className={cn(
                'flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm',
                rep.isValid ? 'border-[#10B981]/30 bg-[#10B981]/10' : 'border-alert/30 bg-alert/10',
              )}
            >
              {rep.isValid ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#10B981]" aria-hidden />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-alert" aria-hidden />
              )}
              <span className="font-mono font-bold tabular-nums">Rep {rep.repNumber}:</span>
              <span className={rep.isValid ? 'text-[#10B981]' : 'text-red-300'}>
                {rep.isValid || !rep.errorType || rep.errorType === 'perfect' ? 'Perfect Form' : ERROR_NAMES[rep.errorType]}
              </span>
            </li>
          ))}
        </ol>
      )}

      <h3 className="mt-5 text-sm font-bold">AI Form Corrections</h3>
      <div className="mt-2 space-y-2">
        {errorsSeen.length === 0 && reps.length > 0 && (
          <p className="flex items-start gap-2 rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 p-3 text-sm text-zinc-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" aria-hidden />
            Clean set — every rep had full range with elbows pinned.
          </p>
        )}
        {errorsSeen.map((error) => (
          <p key={error} className="rounded-xl border border-cyber-gold/30 bg-cyber-gold/10 p-3 text-sm leading-relaxed text-amber-100">
            {CORRECTIONS[error]}
          </p>
        ))}
        {flareNeverChecked && (
          <p className="flex items-start gap-2 text-xs text-zinc-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Elbow flare check needs a front-facing view.
          </p>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-cyber-gold/30 bg-bank-navy/60 p-3">
        <p className="text-sm text-zinc-200">{outcomeText(outcome)}</p>
        <span className="shrink-0 font-mono text-2xl font-black tabular-nums text-cyber-gold">+{outcome.pointsEarned}</span>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-line py-3 text-sm font-semibold text-zinc-200 hover:border-zinc-500"
        >
          <RotateCcw className="h-4 w-4" aria-hidden /> Retry Set
        </button>
        <button
          type="button"
          onClick={onSave}
          className="flex-1 rounded-xl bg-cyber-emerald py-3 text-sm font-extrabold text-zinc-950 shadow-glow-emerald hover:brightness-110"
        >
          Save &amp; Continue
        </button>
      </div>
    </section>
  );
}
