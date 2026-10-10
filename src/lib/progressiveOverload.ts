export type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface UserProfile {
  name: string;
  age: number;
  experience: ExperienceLevel;
  /** Working weight in kg. 0 means a bodyweight exercise. */
  currentWeight: number;
  targetReps: number;
  fitPoints: number;
}

export type SessionStatus = 'Overload Achieved' | 'Form Gate Active' | 'Deload Triggered';

export interface SessionResult {
  status: SessionStatus;
  nextProfile: UserProfile;
  pointsEarned: number;
}

export const WEIGHT_INCREMENT_KG = 2.5;
/** Dumbbell curls progress in smaller jumps than squats. */
export const CURL_WEIGHT_INCREMENT_KG = 1;
export const REP_INCREMENT_BODYWEIGHT = 1;
export const FORM_SCORE_THRESHOLD = 80;
export const POINTS_PER_VALID_REP = 10;
export const DELOAD_FACTOR = 0.9;

const roundTo = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/**
 * Decides the next session's load from this session's performance.
 *
 * @param formScore Form accuracy as a percentage (0–100).
 * @param pointsReps Valid reps to award points for. Defaults to `completedReps`; a
 *   multi-set workout passes its total valid reps while `completedReps` is its weakest set.
 * @param weightIncrement Load added on overload (kg). Defaults to the squat increment.
 */
export function calculateNextSession(
  currentProfile: UserProfile,
  completedReps: number,
  formScore: number,
  pointsReps: number = completedReps,
  weightIncrement: number = WEIGHT_INCREMENT_KG,
): SessionResult {
  const isBodyweight = currentProfile.currentWeight <= 0;
  const hitTarget = completedReps >= currentProfile.targetReps;

  if (hitTarget && formScore >= FORM_SCORE_THRESHOLD) {
    const pointsEarned = pointsReps * POINTS_PER_VALID_REP;
    return {
      status: 'Overload Achieved',
      pointsEarned,
      nextProfile: {
        ...currentProfile,
        currentWeight: isBodyweight
          ? currentProfile.currentWeight
          : currentProfile.currentWeight + weightIncrement,
        targetReps: isBodyweight
          ? currentProfile.targetReps + REP_INCREMENT_BODYWEIGHT
          : currentProfile.targetReps,
        fitPoints: currentProfile.fitPoints + pointsEarned,
      },
    };
  }

  if (hitTarget) {
    return {
      status: 'Form Gate Active',
      pointsEarned: 0,
      nextProfile: { ...currentProfile },
    };
  }

  // Bodyweight has no load to cut, so deload the rep target instead (minimum 1 rep).
  return {
    status: 'Deload Triggered',
    pointsEarned: 0,
    nextProfile: {
      ...currentProfile,
      currentWeight: isBodyweight
        ? currentProfile.currentWeight
        : roundTo(currentProfile.currentWeight * DELOAD_FACTOR, 2),
      targetReps: isBodyweight
        ? Math.max(1, Math.floor(currentProfile.targetReps * DELOAD_FACTOR))
        : currentProfile.targetReps,
    },
  };
}
