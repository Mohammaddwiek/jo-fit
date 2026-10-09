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

export type Side = 'left' | 'right';

export type FrameIssue = 'OUT_OF_BOUNDS' | 'LOW_VISIBILITY';

export type FrameCheck = {
  inFrame: boolean;
  reason?: string;
  code?: FrameIssue;
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

export const LEGS: Record<Side, { hip: number; knee: number; ankle: number }> = {
  left: { hip: LANDMARK.LEFT_HIP, knee: LANDMARK.LEFT_KNEE, ankle: LANDMARK.LEFT_ANKLE },
  right: { hip: LANDMARK.RIGHT_HIP, knee: LANDMARK.RIGHT_KNEE, ankle: LANDMARK.RIGHT_ANKLE },
};

const MIN_VISIBILITY = 0.6;
const MAX_ANKLE_Y = 0.92;
const MIN_NOSE_Y = 0.08;

export const STEP_BACK_MESSAGE = 'STEP BACK: Ensure your head and feet are visible';
export const LOW_VISIBILITY_MESSAGE = 'Tracking lost: improve lighting or face the camera';

const toDegrees = (radians: number) => (radians * 180) / Math.PI;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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
  let degrees = Math.abs(toDegrees(radians));

  // atan2 difference spans (-360, 360); fold into the interior angle.
  if (degrees > 180) degrees = 360 - degrees;

  return clamp(degrees, 0, 180);
}

/**
 * View-independent knee flexion estimate from how far the hip has dropped relative
 * to the knee, scaled by the standing thigh length (all in pixels).
 *
 * Vertical distances look the same from the front and the side, so this works when
 * the user faces the camera, where the 2D knee angle barely changes. Standing ≈ 180°,
 * thigh parallel ≈ 90°, hip below knee < 90°. It assumes a vertical shin, so it
 * under-reports depth rather than over-reporting it.
 */
export function estimateKneeFlexion(hip: Point, knee: Point, standingThighLength: number): number {
  if (standingThighLength <= 0) return 180;
  const ratio = clamp((knee.y - hip.y) / standingThighLength, -1, 1);
  return 90 + toDegrees(Math.asin(ratio));
}

/**
 * Verifies the body is framed for tracking. With `side`, only the nose and that leg
 * must be visible (the far leg is hidden when standing side-on); without it, both legs.
 *
 * Bounds are checked before visibility: MediaPipe still predicts off-screen landmarks
 * (with low visibility), so a cut-off foot reads as "step back", not "bad lighting".
 * Landmarks without a `visibility` score are treated as not visible.
 */
export function isUserInFrame(landmarks: Point[], side?: Side): FrameCheck {
  const legs = side ? [LEGS[side]] : [LEGS.left, LEGS.right];
  const required = [LANDMARK.NOSE, ...legs.flatMap((leg) => [leg.hip, leg.knee, leg.ankle])];

  if (required.some((index) => !landmarks[index])) {
    return { inFrame: false, reason: STEP_BACK_MESSAGE, code: 'OUT_OF_BOUNDS' };
  }

  const anklesCutOff = legs.some((leg) => landmarks[leg.ankle].y > MAX_ANKLE_Y);
  if (anklesCutOff || landmarks[LANDMARK.NOSE].y < MIN_NOSE_Y) {
    return { inFrame: false, reason: STEP_BACK_MESSAGE, code: 'OUT_OF_BOUNDS' };
  }

  if (required.some((index) => (landmarks[index].visibility ?? 0) < MIN_VISIBILITY)) {
    return { inFrame: false, reason: LOW_VISIBILITY_MESSAGE, code: 'LOW_VISIBILITY' };
  }

  return { inFrame: true };
}
