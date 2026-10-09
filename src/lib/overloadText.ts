import { FORM_SCORE_THRESHOLD, type UserProfile } from './progressiveOverload';
import type { SessionSummary } from './useJoFitState';

export function workingLoad(profile: UserProfile): string {
  return profile.currentWeight > 0 ? `${profile.currentWeight} kg` : 'Bodyweight';
}

/** One-line description of what the overload rules decided after the last session. */
export function nextSessionText(profile: UserProfile, session: SessionSummary | null): string {
  if (!session) return 'Complete your first set to unlock progression.';
  const load = workingLoad(profile);
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
