/**
 * Bicep curl tracking: upper-body framing, elbow range of motion and elbow flare.
 * Pure logic (no React) so every rule can be tested with synthetic landmarks.
 */
import {
  calculateAngle,
  estimateKneeFlexion,
  LANDMARK,
  LOW_VISIBILITY_MESSAGE,
  type FrameCheck,
  type FrameIssue,
  type Point,
} from './angleMath';

/** Full extension at the bottom of the curl. */
export const EXTENDED_ANGLE = 150;
/** Dropping below this from extension starts a rep. */
export const START_ANGLE = 135;
/** Full contraction at the top of the curl. */
export const CONTRACTED_ANGLE = 50;
/** A curl that never gets below this wasn't a real attempt (a twitch), so it isn't logged. */
export const MIN_ATTEMPT_ANGLE = 120;
/** How far the angle must reverse before a turnaround (top or bottom) is recognised. */
export const REVERSAL_DELTA = 10;
/** Elbows wider than this multiple of shoulder width count as flaring. */
export const FLARE_RATIO = 1.3;
/** Consecutive flaring frames required, so tracking jitter doesn't trigger a fault. */
export const FLARE_FRAMES = 3;
/** Reps faster than this are treated as noise, not curls. */
export const MIN_REP_MS = 400;

const MIN_VISIBILITY = 0.6;
const MIN_NOSE_Y = 0.05;
const MAX_HIP_Y = 0.98;
const ANGLE_SMOOTHING = 0.5;
const FOREARM_SMOOTHING = 0.1;
/** Shoulder spread below this fraction of upper-arm length means the user is side-on. */
const SIDE_VIEW_SHOULDER_SPREAD = 0.35;

export const TORSO_STEP_BACK_MESSAGE = 'Step back until your head and torso are fully in frame.';

export type CurlError = 'elbow_flare' | 'partial_rep_top' | 'partial_rep_bottom';
/** Highest priority first: a rep with several errors is logged with the first one. */
export const CURL_ERROR_PRIORITY: CurlError[] = ['elbow_flare', 'partial_rep_top', 'partial_rep_bottom'];

export interface CurlRep {
  repNumber: number;
  isValid: boolean;
  errorType: 'perfect' | CurlError | null;
  /** Whether the elbow-flare check could run during this rep (front view, elbows visible). */
  flareChecked?: boolean;
}

export type Arm = 'left' | 'right';
export type CurlPhase = 'READY' | 'EXTENDED' | 'CURLING' | 'LOWERING';
export type CurlViewMode = 'SIDE' | 'FRONT';

export const ARMS: Record<Arm, { shoulder: number; elbow: number; wrist: number }> = {
  left: { shoulder: LANDMARK.LEFT_SHOULDER, elbow: LANDMARK.LEFT_ELBOW, wrist: LANDMARK.LEFT_WRIST },
  right: { shoulder: LANDMARK.RIGHT_SHOULDER, elbow: LANDMARK.RIGHT_ELBOW, wrist: LANDMARK.RIGHT_WRIST },
};

const TORSO_LANDMARKS = [
  LANDMARK.NOSE,
  LANDMARK.LEFT_SHOULDER,
  LANDMARK.RIGHT_SHOULDER,
  LANDMARK.LEFT_ELBOW,
  LANDMARK.RIGHT_ELBOW,
  LANDMARK.LEFT_WRIST,
  LANDMARK.RIGHT_WRIST,
  LANDMARK.LEFT_HIP,
  LANDMARK.RIGHT_HIP,
];

/**
 * Head, shoulders, elbows, wrists and hips must be in frame; legs don't matter for curls.
 * Bounds are checked before visibility so a cut-off head reads as "step back".
 */
export function isTorsoInFrame(landmarks: Point[]): FrameCheck {
  if (TORSO_LANDMARKS.some((index) => !landmarks[index])) {
    return { inFrame: false, reason: TORSO_STEP_BACK_MESSAGE, code: 'OUT_OF_BOUNDS' };
  }
  const hipsCutOff = [LANDMARK.LEFT_HIP, LANDMARK.RIGHT_HIP].some((index) => landmarks[index].y > MAX_HIP_Y);
  if (hipsCutOff || landmarks[LANDMARK.NOSE].y < MIN_NOSE_Y) {
    return { inFrame: false, reason: TORSO_STEP_BACK_MESSAGE, code: 'OUT_OF_BOUNDS' };
  }
  if (TORSO_LANDMARKS.some((index) => (landmarks[index].visibility ?? 0) < MIN_VISIBILITY)) {
    return { inFrame: false, reason: LOW_VISIBILITY_MESSAGE, code: 'LOW_VISIBILITY' };
  }
  return { inFrame: true };
}

/** Elbow and shoulder widths for the flare check, or null if a joint isn't clearly visible. */
export function measureElbowSpread(landmarks: Point[]): { elbowDist: number; shoulderDist: number } | null {
  const required = [LANDMARK.LEFT_SHOULDER, LANDMARK.RIGHT_SHOULDER, LANDMARK.LEFT_ELBOW, LANDMARK.RIGHT_ELBOW];
  if (required.some((index) => (landmarks[index]?.visibility ?? 0) < MIN_VISIBILITY)) return null;
  return {
    elbowDist: Math.abs(landmarks[LANDMARK.LEFT_ELBOW].x - landmarks[LANDMARK.RIGHT_ELBOW].x),
    shoulderDist: Math.abs(landmarks[LANDMARK.LEFT_SHOULDER].x - landmarks[LANDMARK.RIGHT_SHOULDER].x),
  };
}

export function isElbowFlaring(m: { elbowDist: number; shoulderDist: number }): boolean {
  return m.elbowDist > m.shoulderDist * FLARE_RATIO;
}

/** Picks the arm whose shoulder, elbow and wrist are most visible. */
export function pickVisibleArm(landmarks: Point[]): Arm {
  const score = (arm: Arm) => {
    const a = ARMS[arm];
    return [a.shoulder, a.elbow, a.wrist].reduce((sum, i) => sum + (landmarks[i]?.visibility ?? 0), 0);
  };
  return score('left') >= score('right') ? 'left' : 'right';
}

/** The highest-priority error, 'perfect' when there are none. */
export function classifyCurl(errors: Set<CurlError>): Pick<CurlRep, 'isValid' | 'errorType'> {
  const primary = CURL_ERROR_PRIORITY.find((error) => errors.has(error));
  return primary ? { isValid: false, errorType: primary } : { isValid: true, errorType: 'perfect' };
}

export const CURL_ERROR_CUES: Record<CurlError, string> = {
  elbow_flare: 'Elbows flaring — rep not counted',
  partial_rep_top: 'Pull the weight all the way up',
  partial_rep_bottom: 'Extend your arms fully at the bottom',
};

export interface CurlFrameInput {
  /** Normalized landmarks (x/y in 0–1). */
  landmarks: Point[];
  width: number;
  height: number;
  /** Timestamp in ms (performance.now()). */
  now: number;
}

export interface CurlFrameOutput {
  frameIssue: FrameIssue | null;
  frameMessage?: string;
  angle: number | null;
  /** Elbow position in pixels, for the angle readout. */
  anchor: Point | null;
  viewMode: CurlViewMode;
  phase: CurlPhase;
  arm: Arm;
  /** Elbows are flaring right now (drives the live pill and red arms). */
  flaring: boolean;
  /** A rep finished on this frame. */
  completedRep?: CurlRep;
  /** An instant warning to show (first flare detection in a rep). */
  cue?: string;
}

const toPixels = (p: Point, width: number, height: number): Point => ({ x: p.x * width, y: p.y * height, visibility: p.visibility });
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function createCurlSession() {
  let phase: CurlPhase = 'READY';
  let smoothed: number | null = null;
  let forearmLength = 0;
  let lockedArm: Arm | null = null;
  let viewMode: CurlViewMode = 'FRONT';
  let repNumber = 0;

  // Current rep.
  let repStartedAt = 0;
  let minAngle = 180;
  let maxSinceTop = 0;
  let errors = new Set<CurlError>();
  let flareChecked = false;
  let flareStreak = 0;

  const startRep = (angle: number, now: number) => {
    phase = 'CURLING';
    repStartedAt = now;
    minAngle = angle;
    maxSinceTop = 0;
    errors = new Set();
    flareChecked = false;
  };

  const finishRep = (now: number): CurlRep | undefined => {
    // Too fast or too small to be a real curl: drop it without logging.
    if (now - repStartedAt < MIN_REP_MS || minAngle > MIN_ATTEMPT_ANGLE) return undefined;
    repNumber += 1;
    return { repNumber, ...classifyCurl(errors), flareChecked };
  };

  const reset = () => {
    phase = 'READY';
    smoothed = null;
    lockedArm = null;
    flareStreak = 0;
  };

  function step({ landmarks, width, height, now }: CurlFrameInput): CurlFrameOutput {
    const arm = lockedArm ?? pickVisibleArm(landmarks);
    const frame = isTorsoInFrame(landmarks);
    if (!frame.inFrame) {
      reset();
      return { frameIssue: frame.code ?? null, frameMessage: frame.reason, angle: null, anchor: null, viewMode, phase, arm, flaring: false };
    }

    const a = ARMS[arm];
    const shoulder = toPixels(landmarks[a.shoulder], width, height);
    const elbow = toPixels(landmarks[a.elbow], width, height);
    const wrist = toPixels(landmarks[a.wrist], width, height);

    // Calibrate forearm length while the arm hangs (wrist below elbow, not mid-curl).
    if ((phase === 'READY' || phase === 'EXTENDED') && wrist.y > elbow.y) {
      const length = distance(elbow, wrist);
      forearmLength = forearmLength === 0 ? length : forearmLength + FOREARM_SMOOTHING * (length - forearmLength);
    }

    // Side-on the 2D elbow angle is accurate; facing the camera the forearm points at the lens
    // mid-curl, so estimate flexion from wrist height relative to the elbow instead.
    const other = ARMS[arm === 'left' ? 'right' : 'left'];
    const shoulderSpread = Math.abs(landmarks[a.shoulder].x - landmarks[other.shoulder].x) * width;
    viewMode = shoulderSpread < SIDE_VIEW_SHOULDER_SPREAD * distance(shoulder, elbow) ? 'SIDE' : 'FRONT';
    const raw = viewMode === 'SIDE' ? calculateAngle(shoulder, elbow, wrist) : estimateKneeFlexion(elbow, wrist, forearmLength);
    const angle = smoothed === null ? raw : smoothed + ANGLE_SMOOTHING * (raw - smoothed);
    smoothed = angle;

    // Elbow flare (front view only).
    const spread = viewMode === 'FRONT' ? measureElbowSpread(landmarks) : null;
    flareStreak = spread && isElbowFlaring(spread) ? flareStreak + 1 : 0;
    const flaring = flareStreak >= FLARE_FRAMES;

    let completedRep: CurlRep | undefined;
    let cue: string | undefined;

    switch (phase) {
      case 'READY':
        if (angle >= EXTENDED_ANGLE) phase = 'EXTENDED';
        break;
      case 'EXTENDED':
        if (angle < START_ANGLE) {
          lockedArm = arm;
          startRep(angle, now);
        }
        break;
      case 'CURLING':
        minAngle = Math.min(minAngle, angle);
        if (angle >= minAngle + REVERSAL_DELTA) {
          if (minAngle > MIN_ATTEMPT_ANGLE) {
            // Barely moved: not a rep attempt.
            phase = 'EXTENDED';
            lockedArm = null;
          } else {
            if (minAngle > CONTRACTED_ANGLE) errors.add('partial_rep_top');
            phase = 'LOWERING';
            maxSinceTop = angle;
          }
        }
        break;
      case 'LOWERING':
        maxSinceTop = Math.max(maxSinceTop, angle);
        if (angle >= EXTENDED_ANGLE) {
          completedRep = finishRep(now);
          phase = 'EXTENDED';
          lockedArm = null;
        } else if (angle <= maxSinceTop - REVERSAL_DELTA) {
          // Curling again before full extension: this rep never straightened out.
          errors.add('partial_rep_bottom');
          completedRep = finishRep(now);
          startRep(angle, now);
        }
        break;
    }

    // Flare counts against the rep in progress (first detection plays a cue).
    if (phase === 'CURLING' || phase === 'LOWERING') {
      if (spread) flareChecked = true;
      if (flaring && !errors.has('elbow_flare')) {
        errors.add('elbow_flare');
        cue = 'Elbows flaring! Pin them to your ribs.';
      }
    }

    return { frameIssue: null, angle, anchor: elbow, viewMode, phase, arm, flaring, completedRep, cue };
  }

  return { step, reset };
}
