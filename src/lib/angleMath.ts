/**
 * Geometry helpers for pose landmarks (MediaPipe-style normalized coordinates,
 * where x/y are in [0, 1] and y grows downward).
 */

export type Point = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};

export type FrameCheck = {
  inFrame: boolean;
  reason?: string;
};

/** MediaPipe Pose landmark indices used for framing checks. */
export const LANDMARK = {
  NOSE: 0,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

const KEY_LANDMARKS: readonly number[] = Object.values(LANDMARK);

const MIN_VISIBILITY = 0.6;
const MAX_ANKLE_Y = 0.92;
const MIN_NOSE_Y = 0.08;

const STEP_BACK_MESSAGE = 'STEP BACK: Ensure your head and feet are visible';

/**
 * Interior angle at joint `b` formed by segments b→a and b→c, in degrees [0, 180].
 * Uses only the x/y components (2D). Returns 0 if either segment has zero length.
 */
export function calculateAngle(a: Point, b: Point, c: Point): number {
  const abX = a.x - b.x;
  const abY = a.y - b.y;
  const cbX = c.x - b.x;
  const cbY = c.y - b.y;

  if ((abX === 0 && abY === 0) || (cbX === 0 && cbY === 0)) return 0;

  const radians = Math.atan2(cbY, cbX) - Math.atan2(abY, abX);
  let degrees = Math.abs((radians * 180) / Math.PI);

  // atan2 difference spans (-360, 360); fold into the interior angle.
  if (degrees > 180) degrees = 360 - degrees;

  return Math.min(180, Math.max(0, degrees));
}

/**
 * Verifies the full body is visible: key landmarks are confidently detected,
 * the feet aren't cut off at the bottom, and the head isn't cut off at the top.
 * Landmarks without a `visibility` score are treated as not visible.
 */
export function isUserInFrame(landmarks: Point[]): FrameCheck {
  const notInFrame: FrameCheck = { inFrame: false, reason: STEP_BACK_MESSAGE };

  for (const index of KEY_LANDMARKS) {
    const landmark = landmarks[index];
    if (!landmark || (landmark.visibility ?? 0) < MIN_VISIBILITY) return notInFrame;
  }

  const leftAnkle = landmarks[LANDMARK.LEFT_ANKLE];
  const rightAnkle = landmarks[LANDMARK.RIGHT_ANKLE];
  if (leftAnkle.y > MAX_ANKLE_Y || rightAnkle.y > MAX_ANKLE_Y) return notInFrame;

  if (landmarks[LANDMARK.NOSE].y < MIN_NOSE_Y) return notInFrame;

  return { inFrame: true };
}
