'use client';

import { Gem, TrendingDown, TrendingUp, ShieldCheck, Ban, Trophy } from 'lucide-react';
import Modal from './Modal';
import type { SessionSummary } from '../lib/useJoFitState';
import { FORM_SCORE_THRESHOLD } from '../lib/progressiveOverload';

interface PostWorkoutModalProps {
  summary: SessionSummary | null;
  onClose: () => void;
}

const STATUS_STYLES: Record<SessionSummary['status'], { badge: string; icon: typeof TrendingUp }> = {
  'Overload Achieved': { badge: 'border-cyber-emerald/50 bg-cyber-emerald/10 text-cyber-emerald', icon: TrendingUp },
  'Form Gate Active': { badge: 'border-cyber-gold/50 bg-cyber-gold/10 text-cyber-gold', icon: ShieldCheck },
  'Deload Triggered': { badge: 'border-rose-500/50 bg-rose-500/10 text-rose-400', icon: TrendingDown },
  'Set Discarded': { badge: 'border-zinc-600 bg-zinc-800 text-zinc-300', icon: Ban },
};

const fmt = (n: number) => n.toLocaleString('en-US');

function nextTargetText(s: SessionSummary): string {
  switch (s.status) {
    case 'Overload Achieved':
      return s.isBodyweight
        ? `${s.previousTargetReps} → ${s.nextTargetReps} reps`
        : `${s.previousWeight} → ${s.nextWeight} kg`;
    case 'Form Gate Active':
      return s.isBodyweight
        ? `Hold ${s.previousTargetReps} reps — form below ${FORM_SCORE_THRESHOLD}%`
        : `Hold ${s.previousWeight} kg — form below ${FORM_SCORE_THRESHOLD}%`;
    case 'Deload Triggered':
      return s.isBodyweight
        ? `Deload: ${s.previousTargetReps} → ${s.nextTargetReps} reps`
        : `Deload: ${s.previousWeight} → ${s.nextWeight} kg`;
    case 'Set Discarded':
      return s.isBodyweight ? `Unchanged: ${s.previousTargetReps} reps` : `Unchanged: ${s.previousWeight} kg`;
  }
}

function pointsReason(s: SessionSummary): string | null {
  switch (s.status) {
    case 'Overload Achieved':
      return null;
    case 'Form Gate Active':
      return `Points unlock when form accuracy reaches ${FORM_SCORE_THRESHOLD}%.`;
    case 'Deload Triggered':
      return 'Points unlock when every set reaches the target reps.';
    case 'Set Discarded':
      return 'Not enough reps to count — your progression was not changed.';
  }
}

export default function PostWorkoutModal({ summary, onClose }: PostWorkoutModalProps) {
  if (!summary) return null;
  const { badge, icon: StatusIcon } = STATUS_STYLES[summary.status];
  const reason = pointsReason(summary);
  const lowestValid = summary.sets.length > 0 ? Math.min(...summary.sets.map((set) => set.validReps)) : 0;
  const repsHeadline = summary.sets.length > 1 ? lowestValid : summary.validReps;

  return (
    <Modal open onClose={onClose} title="Workout Summary" size="max-w-md">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-zinc-400">{summary.exerciseName}</p>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${badge}`}>
            <StatusIcon className="h-3.5 w-3.5" aria-hidden />
            {summary.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Metric
            label={summary.sets.length > 1 ? 'Valid Reps (weakest set)' : 'Valid Reps'}
            value={`${repsHeadline} / ${summary.targetReps}`}
            hint={summary.badReps > 0 ? `${summary.badReps} shallow rep${summary.badReps === 1 ? '' : 's'}` : 'No shallow reps'}
          />
          <Metric
            label="Average Form Score"
            value={`${summary.formAccuracy}%`}
            hint="% of reps reaching target depth"
          />
        </div>

        {summary.sets.length > 1 && (
          <p className="rounded-lg bg-zinc-950/60 px-3 py-2 font-mono text-xs tabular-nums text-zinc-300">
            {summary.sets
              .map((set, i) => `Set ${i + 1}: ${set.validReps}${set.validReps >= summary.targetReps ? ' ✓' : ''}`)
              .join(' · ')}
            {summary.sets.length < summary.setsPlanned && ` · ${summary.setsPlanned - summary.sets.length} skipped`}
          </p>
        )}

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
          <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-400">Next Session Target</p>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-zinc-100">{nextTargetText(summary)}</p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-cyber-gold/40 bg-bank-navy p-3">
          <div className="flex items-center gap-2">
            <Gem className="h-5 w-5 text-cyber-gold" aria-hidden />
            <div>
              <p className="text-xs font-semibold text-zinc-300">Arab Bank Points Awarded</p>
              {reason && <p className="text-xs text-zinc-400">{reason}</p>}
            </div>
          </div>
          <span className="font-mono text-2xl font-bold tabular-nums text-cyber-gold">+{fmt(summary.pointsEarned)}</span>
        </div>

        {summary.rankAfter < summary.rankBefore && (
          <p className="flex items-center gap-2 text-sm font-semibold text-cyber-cyan">
            <Trophy className="h-4 w-4" aria-hidden />
            You moved up to #{summary.rankAfter} on the Heroes Gym leaderboard!
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-1 w-full rounded-xl bg-cyber-cyan py-3 text-sm font-extrabold text-zinc-950 shadow-glow-cyan hover:brightness-110"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
      <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-cyber-cyan">{value}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}
