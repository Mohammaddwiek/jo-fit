import { Gauge } from 'lucide-react';
import type { UserProfile } from '../lib/progressiveOverload';
import {
  DELOAD_FACTOR,
  FORM_SCORE_THRESHOLD,
  POINTS_PER_VALID_REP,
  REP_INCREMENT_BODYWEIGHT,
  WEIGHT_INCREMENT_KG,
} from '../lib/progressiveOverload';
import { DEPTH_ANGLE, KNEE_SAFE_VALID_ANGLE } from '../lib/squatThresholds';
import type { SessionSummary } from '../lib/useJoFitState';

interface OverloadStatusCardProps {
  profile: UserProfile;
  lastSession: SessionSummary | null;
  kneeSafe: boolean;
  hydrated: boolean;
}

function nextSessionText(profile: UserProfile, session: SessionSummary | null): string {
  if (!session) return 'Complete your first set to unlock progression.';
  const load = profile.currentWeight > 0 ? `${profile.currentWeight} kg` : 'Bodyweight';
  switch (session.status) {
    case 'Overload Achieved':
      return `Overload achieved — next: ${load} × ${profile.targetReps}`;
    case 'Form Gate Active':
      return `Form gate active — hold ${load} until form reaches ${FORM_SCORE_THRESHOLD}%`;
    case 'Deload Triggered':
      return `Recovery deload — next: ${load} × ${profile.targetReps}`;
    case 'Set Discarded':
      return `Last workout discarded — next: ${load} × ${profile.targetReps}`;
  }
}

export default function OverloadStatusCard({ profile, lastSession, kneeSafe, hydrated }: OverloadStatusCardProps) {
  const rules = [
    { label: 'Form gate', value: `≥ ${FORM_SCORE_THRESHOLD}%` },
    { label: 'Squat depth', value: kneeSafe ? `≤ ${KNEE_SAFE_VALID_ANGLE}° (knee-safe)` : `≤ ${DEPTH_ANGLE}°` },
    { label: 'Overload', value: `+${WEIGHT_INCREMENT_KG} kg / +${REP_INCREMENT_BODYWEIGHT} rep` },
    { label: 'Deload', value: `−${Math.round((1 - DELOAD_FACTOR) * 100)}%` },
    { label: 'Points', value: `${POINTS_PER_VALID_REP} / valid rep` },
  ];

  return (
    <section
      aria-labelledby="overload-heading"
      className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5"
    >
      <h2 id="overload-heading" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-zinc-400">
        <Gauge className="h-4 w-4 text-cyber-cyan" aria-hidden /> Progressive Overload
      </h2>

      <div className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
        <Figure label="Working weight" value={hydrated ? (profile.currentWeight > 0 ? `${profile.currentWeight} kg` : 'Bodyweight') : null} />
        <Figure label="Target reps" value={hydrated ? String(profile.targetReps) : null} />
        <Figure label="Experience" value={hydrated ? profile.experience : null} />
      </div>

      <p className="mt-3 rounded-lg border border-cyber-cyan/25 bg-cyber-cyan/5 px-3 py-2 text-sm text-zinc-200">
        {hydrated ? nextSessionText(profile, lastSession) : ' '}
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
        {rules.map((rule) => (
          <div key={rule.label} className="rounded-lg bg-zinc-950/60 px-3 py-2">
            <dt className="text-zinc-500">{rule.label}</dt>
            <dd className="font-mono font-semibold text-zinc-200">{rule.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Figure({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">{label}</p>
      {value === null ? (
        <span className="mt-1 block h-7 w-20 animate-pulse rounded bg-zinc-800" aria-hidden />
      ) : (
        <p className="font-mono text-xl font-bold tabular-nums text-zinc-100">{value}</p>
      )}
    </div>
  );
}
