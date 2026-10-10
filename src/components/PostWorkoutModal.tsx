'use client';

import { AlertTriangle, Ban, CheckCircle2, Info, ShieldCheck, TrendingDown, TrendingUp, Trophy } from 'lucide-react';
import Modal from './Modal';
import { cn } from '../lib/cn';
import { FORM_SCORE_THRESHOLD } from '../lib/progressiveOverload';
import type { SessionSummary } from '../lib/useJoFitState';
import { sumFaults } from '../lib/workoutConfig';

/** One analysis row: check for ok, warning for not ok, neutral info for null. */
function AnalysisLine({ ok, children }: { ok: boolean | null; children: React.ReactNode }) {
  return (
    <p className="mt-2 flex items-start gap-2 text-sm text-soft">
      {ok === null ? (
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
      ) : ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-emerald" aria-hidden />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent-gold" aria-hidden />
      )}
      <span>{children}</span>
    </p>
  );
}

interface PostWorkoutModalProps {
  summary: SessionSummary | null;
  onClose: () => void;
  onViewLeaderboard: () => void;
}

const STATUS_STYLES: Record<SessionSummary['status'], { badge: string; icon: typeof TrendingUp; headline: string }> = {
  'Overload Achieved': { badge: 'border-cyber-emerald/50 bg-cyber-emerald/10 text-accent-emerald', icon: TrendingUp, headline: 'Hero Session Completed!' },
  'Form Gate Active': { badge: 'border-cyber-gold/50 bg-cyber-gold/10 text-accent-gold', icon: ShieldCheck, headline: 'Session Completed!' },
  'Deload Triggered': { badge: 'border-rose-500/50 bg-rose-500/10 text-rose-400', icon: TrendingDown, headline: 'Session Completed' },
  'Set Discarded': { badge: 'border-line bg-surface-2 text-soft', icon: Ban, headline: 'Set Not Counted' },
};

const fmt = (n: number) => n.toLocaleString('en-US');

function recommendation(s: SessionSummary): string {
  const load = (w: number) => (s.isBodyweight ? 'bodyweight' : `${w} kg`);
  switch (s.status) {
    case 'Overload Achieved':
      return s.isBodyweight
        ? `Great depth and form — add a rep: ${s.previousTargetReps} → ${s.nextTargetReps} reps next session.`
        : `Great depth and form — increase to ${s.nextWeight} kg next session (+${(s.nextWeight - s.previousWeight).toFixed(1)} kg).`;
    case 'Form Gate Active':
      return `Keep ${load(s.previousWeight)} until form accuracy reaches ${FORM_SCORE_THRESHOLD}%. Focus on reaching depth on every rep.`;
    case 'Deload Triggered':
      return s.isBodyweight
        ? `Recover with ${s.nextTargetReps} reps next session, then build back up.`
        : `Deload to ${s.nextWeight} kg next session to recover, then build back up.`;
    case 'Set Discarded':
      return 'Not enough reps to count — your progression was not changed. Try again when ready.';
  }
}

export default function PostWorkoutModal({ summary, onClose, onViewLeaderboard }: PostWorkoutModalProps) {
  if (!summary) return null;
  const { badge, icon: StatusIcon, headline } = STATUS_STYLES[summary.status];
  const totalReps = summary.validReps + summary.badReps;
  const hasFaultData = summary.sets.some((set) => set.faults);
  const faults = sumFaults(summary.sets);
  // Older sessions have no fault breakdown, so every bad rep was a depth failure.
  const deepReps = hasFaultData ? totalReps - faults.shallow : summary.validReps;
  const depthGood = totalReps > 0 && (deepReps / totalReps) * 100 >= FORM_SCORE_THRESHOLD;

  return (
    <Modal open onClose={onClose} title={headline} size="max-w-md">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-muted">{summary.exerciseName}</p>
          <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold', badge)}>
            <StatusIcon className="h-3.5 w-3.5" aria-hidden />
            {summary.status}
          </span>
        </div>

        <div className="grid grid-cols-2 divide-x divide-line rounded-2xl border border-line bg-surface-2 py-4 text-center">
          <div>
            <p className="font-mono text-4xl font-black tabular-nums text-accent-gold">+{fmt(summary.pointsEarned)}</p>
            <p className="text-xs font-medium text-muted">Arab Bank Pts</p>
          </div>
          <div>
            <p className="font-mono text-4xl font-black tabular-nums text-accent-emerald">{summary.formAccuracy}%</p>
            <p className="text-xs font-medium text-muted">Avg Form Score</p>
          </div>
        </div>

        <section className="rounded-2xl border border-line bg-surface-2 p-4">
          <h3 className="text-sm font-bold text-ink">AI Form Analysis</h3>
          <AnalysisLine ok={depthGood}>
            Knee depth: <span className="font-semibold text-ink">{deepReps} of {totalReps}</span> reps reached target
            depth
          </AnalysisLine>
          {hasFaultData && totalReps > 0 && faults.checkedReps === 0 ? (
            <AnalysisLine ok={null}>Stance &amp; knee checks need a front-facing view</AnalysisLine>
          ) : (
            hasFaultData &&
            totalReps > 0 && (
              <>
                <AnalysisLine ok={faults.wideStance === 0}>
                  Stance width:{' '}
                  {faults.wideStance === 0 ? (
                    <span className="font-semibold text-accent-emerald">OK</span>
                  ) : (
                    <span className="font-semibold text-ink">
                      {faults.wideStance} rep{faults.wideStance === 1 ? '' : 's'} started too wide
                    </span>
                  )}
                </AnalysisLine>
                <AnalysisLine ok={faults.valgus === 0}>
                  Knee tracking:{' '}
                  {faults.valgus === 0 ? (
                    <span className="font-semibold text-accent-emerald">Stable</span>
                  ) : (
                    <span className="font-semibold text-ink">
                      {faults.valgus} rep{faults.valgus === 1 ? '' : 's'} caved in
                    </span>
                  )}
                </AnalysisLine>
              </>
            )
          )}
          {summary.sets.length > 1 && (
            <p className="mt-2 font-mono text-xs tabular-nums text-muted">
              {summary.sets
                .map((set, i) => `Set ${i + 1}: ${set.validReps}${set.validReps >= summary.targetReps ? ' ✓' : ''}`)
                .join(' · ')}
              {summary.sets.length < summary.setsPlanned && ` · ${summary.setsPlanned - summary.sets.length} skipped`}
            </p>
          )}
          <p className="mt-2 text-[11px] text-muted">
            Target: {summary.targetReps} reps per set. Form score = share of reps passing depth, stance and knee checks.
          </p>
        </section>

        <section className="rounded-2xl border border-line bg-surface-2 p-4">
          <h3 className="text-sm font-bold text-ink">AI Next-Session Recommendation</h3>
          <p className="mt-1.5 text-sm text-soft">{recommendation(summary)}</p>
        </section>

        {summary.rankAfter < summary.rankBefore && (
          <p className="flex items-center gap-2 text-sm font-semibold text-accent-gold">
            <Trophy className="h-4 w-4" aria-hidden />
            You moved up to #{summary.rankAfter} on the Heroes Gym leaderboard!
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-line py-3 text-sm font-semibold text-soft hover:border-muted"
          >
            Done
          </button>
          <button
            type="button"
            onClick={onViewLeaderboard}
            className="flex-1 rounded-xl bg-cyber-emerald py-3 text-sm font-extrabold text-zinc-950 shadow-glow-emerald hover:brightness-110"
          >
            View Leaderboard
          </button>
        </div>
      </div>
    </Modal>
  );
}
