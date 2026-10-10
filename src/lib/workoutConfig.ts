import type { CurlRep } from './curlLogic';
import type { PlanExercise } from './planGenerator';
import { DEPTH_ANGLE, KNEE_SAFE_TOO_DEEP_ANGLE, KNEE_SAFE_VALID_ANGLE } from './squatThresholds';

export interface DepthConfig {
  /** A rep counts when the knee angle reaches this value or lower. */
  validAngle: number;
  /** Going below this still counts, but triggers a "too deep" warning (knee-safe mode). */
  tooDeepAngle?: number;
}

export type ExerciseType = 'squat' | 'curl';

export interface WorkoutConfig {
  source: 'standalone' | 'plan';
  exercise: ExerciseType;
  exerciseName: string;
  sets: number;
  targetReps: number;
  restSeconds: number;
  depth: DepthConfig;
}

/** Why bad reps failed, plus how many reps had front-view stance/knee checks applied. */
export interface FormFaults {
  shallow: number;
  wideStance: number;
  valgus: number;
  checkedReps: number;
}

export interface SquatSetResult {
  validReps: number;
  badReps: number;
  /** Absent on sessions recorded before form checks existed. */
  faults?: FormFaults;
  /** Per-rep log for bicep curl sets. */
  curlReps?: CurlRep[];
}

export const EMPTY_FAULTS: FormFaults = { shallow: 0, wideStance: 0, valgus: 0, checkedReps: 0 };

export function sumFaults(sets: SquatSetResult[]): FormFaults {
  return sets.reduce<FormFaults>(
    (total, set) => ({
      shallow: total.shallow + (set.faults?.shallow ?? 0),
      wideStance: total.wideStance + (set.faults?.wideStance ?? 0),
      valgus: total.valgus + (set.faults?.valgus ?? 0),
      checkedReps: total.checkedReps + (set.faults?.checkedReps ?? 0),
    }),
    EMPTY_FAULTS,
  );
}

export interface SquatWorkoutResult {
  source: WorkoutConfig['source'];
  /** Absent means squat (results recorded before curls existed). */
  exercise?: ExerciseType;
  exerciseName: string;
  setsPlanned: number;
  targetReps: number;
  sets: SquatSetResult[];
  validReps: number;
  badReps: number;
  /** Share of all reps that passed depth, stance and knee checks, as a percentage (0–100). */
  formAccuracy: number;
}

export const NORMAL_DEPTH: DepthConfig = { validAngle: DEPTH_ANGLE };
export const KNEE_SAFE_DEPTH: DepthConfig = { validAngle: KNEE_SAFE_VALID_ANGLE, tooDeepAngle: KNEE_SAFE_TOO_DEEP_ANGLE };

const DEFAULT_TARGET_REPS = 10;

/** Top of a rep range: "10-12" → 12, "8" → 8. Falls back to 10 when no number is present. */
export function parseRepTarget(reps: string): number {
  const numbers = reps.match(/\d+/g)?.map(Number) ?? [];
  return numbers.length > 0 ? Math.max(...numbers) : DEFAULT_TARGET_REPS;
}

export function buildStandaloneConfig(targetReps: number, kneeSafe: boolean): WorkoutConfig {
  return {
    source: 'standalone',
    exercise: 'squat',
    exerciseName: 'Barbell / Bodyweight Squats',
    sets: 1,
    targetReps,
    restSeconds: 0,
    depth: kneeSafe ? KNEE_SAFE_DEPTH : NORMAL_DEPTH,
  };
}

export function buildPlanConfig(exercise: PlanExercise, kneeSafe: boolean): WorkoutConfig {
  const isCurl = exercise.kind === 'curl';
  return {
    source: 'plan',
    exercise: isCurl ? 'curl' : 'squat',
    exerciseName: exercise.name,
    // Curls run one set per launch, each ending in the Set Results screen.
    sets: isCurl ? 1 : Math.max(1, exercise.sets),
    targetReps: parseRepTarget(exercise.reps),
    restSeconds: exercise.restSeconds,
    depth: kneeSafe ? KNEE_SAFE_DEPTH : NORMAL_DEPTH,
  };
}

export function summarizeSets(sets: SquatSetResult[]): Pick<SquatWorkoutResult, 'validReps' | 'badReps' | 'formAccuracy'> {
  const validReps = sets.reduce((sum, set) => sum + set.validReps, 0);
  const badReps = sets.reduce((sum, set) => sum + set.badReps, 0);
  const total = validReps + badReps;
  return { validReps, badReps, formAccuracy: total > 0 ? Math.round((validReps / total) * 100) : 0 };
}
