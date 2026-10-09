/** Squat state machine thresholds, in degrees of knee flexion (180 = straight leg). */
export const STANDING_ANGLE = 160;
export const DESCENT_ANGLE = 145;
/** Standard depth: thigh roughly parallel. */
export const DEPTH_ANGLE = 90;

/** Knee-safe mode: reps count from box depth, and going much deeper is flagged. */
export const KNEE_SAFE_VALID_ANGLE = 100;
export const KNEE_SAFE_TOO_DEEP_ANGLE = 80;

/** A descent that bottoms out faster than this is treated as a stumble, not a rep. */
export const MIN_DESCENT_MS = 400;
