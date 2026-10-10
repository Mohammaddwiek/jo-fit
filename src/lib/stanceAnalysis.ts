/**
 * Front-view squat form checks: starting stance width and knee valgus (knees caving in).
 * Only left-right (x) distances are used, so these checks need the user facing the camera;
 * side-on the feet overlap in the image and the distances can't be measured.
 */
import { LANDMARK, type Point } from './angleMath';
import type { DepthConfig } from './workoutConfig';

/** Feet wider than this multiple of shoulder width count as an overly wide stance. */
export const WIDE_STANCE_RATIO = 1.5;
/** Knees narrower than this fraction of ankle width count as caving in. */
export const VALGUS_RATIO = 0.9;
/** Consecutive caving frames required, so tracking jitter doesn't trigger a fault. */
export const VALGUS_FRAMES = 3;
const MIN_VISIBILITY = 0.6;

export type RepFault = 'wideStance' | 'valgus' | 'shallow';
/** Highest priority first: this decides which correction the user sees. */
export const FAULT_PRIORITY: RepFault[] = ['wideStance', 'valgus', 'shallow'];

export interface StanceMeasurement {
  shoulderDist: number;
  ankleDist: number;
  kneeDist: number;
}

const REQUIRED = [
  LANDMARK.LEFT_SHOULDER,
  LANDMARK.RIGHT_SHOULDER,
  LANDMARK.LEFT_KNEE,
  LANDMARK.RIGHT_KNEE,
  LANDMARK.LEFT_ANKLE,
  LANDMARK.RIGHT_ANKLE,
];

/** Horizontal widths of shoulders, knees and ankles, or null if any joint isn't clearly visible. */
export function measureStance(landmarks: Point[]): StanceMeasurement | null {
  if (REQUIRED.some((index) => (landmarks[index]?.visibility ?? 0) < MIN_VISIBILITY)) return null;
  const width = (a: number, b: number) => Math.abs(landmarks[a].x - landmarks[b].x);
  return {
    shoulderDist: width(LANDMARK.LEFT_SHOULDER, LANDMARK.RIGHT_SHOULDER),
    ankleDist: width(LANDMARK.LEFT_ANKLE, LANDMARK.RIGHT_ANKLE),
    kneeDist: width(LANDMARK.LEFT_KNEE, LANDMARK.RIGHT_KNEE),
  };
}

export function isStanceTooWide(m: StanceMeasurement): boolean {
  return m.ankleDist > m.shoulderDist * WIDE_STANCE_RATIO;
}

export function isKneeCaving(m: StanceMeasurement): boolean {
  return m.kneeDist < m.ankleDist * VALGUS_RATIO;
}

/** Flags valgus once knees have caved in for VALGUS_FRAMES consecutive frames. */
export function createValgusDetector() {
  let streak = 0;
  return {
    update(caving: boolean): boolean {
      streak = caving ? streak + 1 : 0;
      return streak >= VALGUS_FRAMES;
    },
    reset() {
      streak = 0;
    },
  };
}

export interface RepInput {
  minAngle: number;
  depth: DepthConfig;
  wideStanceAtStart: boolean;
  valgusDetected: boolean;
}

export interface RepVerdict {
  valid: boolean;
  /** Ordered by FAULT_PRIORITY. */
  faults: RepFault[];
  /** Valid but deeper than the knee-safe limit (warning only). */
  tooDeep: boolean;
}

export function classifyRep({ minAngle, depth, wideStanceAtStart, valgusDetected }: RepInput): RepVerdict {
  const present: Record<RepFault, boolean> = {
    wideStance: wideStanceAtStart,
    valgus: valgusDetected,
    shallow: minAngle > depth.validAngle,
  };
  const faults = FAULT_PRIORITY.filter((fault) => present[fault]);
  const valid = faults.length === 0;
  return {
    valid,
    faults,
    tooDeep: valid && depth.tooDeepAngle !== undefined && minAngle < depth.tooDeepAngle,
  };
}
