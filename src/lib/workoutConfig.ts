import type { PlanExercise } from './planGenerator';
import { DEPTH_ANGLE, KNEE_SAFE_TOO_DEEP_ANGLE, KNEE_SAFE_VALID_ANGLE } from './squatThresholds';

export interface DepthConfig {
  /** A rep counts when the knee angle reaches this value or lower. */
  validAngle: number;
  /** Going below this still counts, but triggers a "too deep" warning (knee-safe mode). */
  tooDeepAngle?: number;
}

export interface WorkoutConfig {
  source: 'standalone' | 'plan';
  exerciseName: string;
  sets: number;
  targetReps: number;
  restSeconds: number;
  depth: DepthConfig;
}

export interface SquatSetResult {
  validReps: number;
  badReps: number;
}

export interface SquatWorkoutResult {
  source: WorkoutConfig['source'];
  exerciseName: string;
  setsPlanned: number;
  targetReps: number;
  sets: SquatSetResult[];
  validReps: number;
  badReps: number;
  /** Share of all reps that reached depth, as a percentage (0–100). */
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
    exerciseName: 'Barbell / Bodyweight Squats',
    sets: 1,
    targetReps,
    restSeconds: 0,
    depth: kneeSafe ? KNEE_SAFE_DEPTH : NORMAL_DEPTH,
  };
}

export function buildPlanConfig(exercise: PlanExercise, kneeSafe: boolean): WorkoutConfig {
  return {
    source: 'plan',
    exerciseName: exercise.name,
    sets: Math.max(1, exercise.sets),
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
