'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NormalizedLandmark, PoseLandmarker } from '@mediapipe/tasks-vision';
import {
  calculateAngle,
  estimateKneeFlexion,
  isUserInFrame,
  LEGS,
  type FrameIssue,
  type Point,
  type Side,
} from '../lib/angleMath';
import { playGoodRepTone, playWarningTone } from '../lib/audioFeedback';
import { openCameraWithRetry } from '../lib/openCamera';
import { POINTS_PER_VALID_REP } from '../lib/progressiveOverload';
import { DEPTH_ANGLE, DESCENT_ANGLE, MIN_DESCENT_MS, STANDING_ANGLE } from '../lib/squatThresholds';
import {
  classifyRep,
  createValgusDetector,
  isKneeCaving,
  isStanceTooWide,
  measureStance,
  type RepFault,
} from '../lib/stanceAnalysis';
import {
  EMPTY_FAULTS,
  summarizeSets,
  type FormFaults,
  type SquatSetResult,
  type SquatWorkoutResult,
  type WorkoutConfig,
} from '../lib/workoutConfig';

// Self-hosted (see scripts/copy-mediapipe.mjs) so the demo doesn't depend on venue Wi-Fi.
const WASM_PATH = '/mediapipe/wasm';
const MODEL_PATH = '/models/pose_landmarker_lite.task';

const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;

/** How far the angle must climb above its minimum before we call it the bottom. */
const INFLECTION_DELTA = 8;
/** Additional climb past the bottom before we call it ascending. */
const ASCENT_DELTA = 15;
/** Exponential smoothing factor for the raw knee angle (1 = no smoothing). */
const ANGLE_SMOOTHING = 0.5;
/** Smoothing for the standing thigh length used by the front-view estimate. */
const THIGH_LENGTH_SMOOTHING = 0.1;
/** Hip spread below this fraction of thigh length means the user is side-on. */
const SIDE_VIEW_HIP_SPREAD = 0.35;

const FEEDBACK_DURATION_MS = 2000;
const MIN_DRAW_VISIBILITY = 0.5;
/** Landmarks 0–10 are the face; the HUD skeleton only draws the body. */
const FIRST_BODY_LANDMARK = 11;

// Canvas can't read Tailwind classes, so the HUD colors live here.
const CYAN = '#00E5FF';
const EMERALD = '#00E676';
const AMBER = '#F59E0B';
const ALERT_RED = '#EF4444';

/** Hips, knees, ankles and feet (MediaPipe 23–32): turned red when stance or knee form fails. */
const FIRST_LEG_LANDMARK = 23;

const FAULT_MESSAGES: Record<RepFault, (validAngle: number) => string> = {
  wideStance: () => 'Stance too wide — rep not counted',
  valgus: () => 'Knees caved in — rep not counted. Push knees out',
  shallow: (validAngle) => `Go Lower: Reach ${validAngle}°`,
};

type Phase = 'STANDING' | 'DESCENDING' | 'BOTTOM' | 'ASCENDING';
type ViewMode = 'SIDE' | 'FRONT';
type Status = 'loading' | 'ready' | 'error';
type Connection = { start: number; end: number };

export interface SquatTrackerProps {
  config: WorkoutConfig;
  onFinish: (result: SquatWorkoutResult) => void;
}

function pickVisibleSide(landmarks: NormalizedLandmark[]): Side {
  const score = (side: Side) => {
    const leg = LEGS[side];
    return [leg.hip, leg.knee, leg.ankle].reduce((sum, i) => sum + (landmarks[i]?.visibility ?? 0), 0);
  };
  return score('left') >= score('right') ? 'left' : 'right';
}

/**
 * Normalized x/y are scaled independently (640 vs 480), so convert to pixels
 * before measuring angles or they come out skewed.
 */
function toPixels(p: NormalizedLandmark, width: number, height: number): Point {
  return { x: p.x * width, y: p.y * height, visibility: p.visibility };
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  connections: Connection[],
  activeSide: Side,
  width: number,
  height: number,
  legAlert: boolean,
) {
  const leg = LEGS[activeSide];
  const activeJoints = new Set([leg.hip, leg.knee, leg.ankle]);
  const isVisible = (i: number) => (landmarks[i]?.visibility ?? 0) >= MIN_DRAW_VISIBILITY;
  const isLeg = (i: number) => i >= FIRST_LEG_LANDMARK;

  ctx.save();
  ctx.lineCap = 'round';

  // Glow = a wide translucent stroke under a solid one (canvas shadowBlur is too slow per frame).
  for (const { start, end } of connections) {
    if (start < FIRST_BODY_LANDMARK || end < FIRST_BODY_LANDMARK) continue;
    if (!isVisible(start) || !isVisible(end)) continue;
    const isActive = activeJoints.has(start) && activeJoints.has(end);
    const color = legAlert && isLeg(start) && isLeg(end) ? ALERT_RED : CYAN;
    const lineWidth = isActive ? 6 : 3;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(landmarks[start].x * width, landmarks[start].y * height);
    ctx.lineTo(landmarks[end].x * width, landmarks[end].y * height);
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = lineWidth * 3;
    ctx.stroke();
    ctx.globalAlpha = isActive ? 1 : 0.75;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  for (let i = FIRST_BODY_LANDMARK; i < landmarks.length; i++) {
    if (!isVisible(i)) continue;
    ctx.fillStyle = legAlert && isLeg(i) ? ALERT_RED : '#FFFFFF';
    ctx.beginPath();
    ctx.arc(landmarks[i].x * width, landmarks[i].y * height, activeJoints.has(i) ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Draws the knee readout. The canvas is CSS-mirrored, so the text is flipped back to stay readable. */
function drawAngleReadout(ctx: CanvasRenderingContext2D, knee: Point, angle: number, color: string) {
  const label = `${Math.round(angle)}°`;
  ctx.save();
  ctx.translate(knee.x, knee.y);
  ctx.scale(-1, 1);
  ctx.font = 'bold 22px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  const textWidth = ctx.measureText(label).width;
  const x = 18;
  const y = -14;
  ctx.fillStyle = 'rgba(5, 12, 20, 0.75)';
  ctx.fillRect(x - 8, y - 22, textWidth + 16, 32);
  ctx.fillStyle = color;
  ctx.fillText(label, x, y);
  ctx.restore();
}

function describeStartupError(err: unknown, stage: 'camera' | 'model'): string {
  if (stage === 'model') return 'Could not load the pose model. Reload the page and try again.';
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera access was denied. Allow camera permissions for this site and reload.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'The camera is in use by another app (Zoom, Teams, etc.). Close it and reload.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No camera was found. Connect a webcam and reload.';
  }
  return 'Could not start the camera. Check your webcam and reload.';
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export default function SquatTracker({ config, onFinish }: SquatTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The animation loop reads these without re-running the setup effect.
  const configRef = useRef(config);
  const pausedRef = useRef(false);
  configRef.current = config;

  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [frameIssue, setFrameIssue] = useState<FrameIssue | null>(null);
  const [phase, setPhase] = useState<Phase>('STANDING');
  const [viewMode, setViewMode] = useState<ViewMode>('FRONT');
  const [currentAngle, setCurrentAngle] = useState<number | null>(null);
  const [validReps, setValidReps] = useState(0);
  const [badReps, setBadReps] = useState(0);
  const [faults, setFaults] = useState<FormFaults>(EMPTY_FAULTS);
  const [stanceWide, setStanceWide] = useState(false);
  const [completedSets, setCompletedSets] = useState<SquatSetResult[]>([]);
  const [restRemaining, setRestRemaining] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; tone: 'warn' | 'info' } | null>(null);

  const resting = restRemaining !== null;
  pausedRef.current = resting;

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let stream: MediaStream | null = null;
    let landmarker: PoseLandmarker | null = null;
    let connections: Connection[] = [];
    let lastVideoTime = -1;

    const tracker = {
      phase: 'STANDING' as Phase,
      smoothedAngle: null as number | null,
      minAngle: 180,
      lockedSide: null as Side | null,
      descentStartedAt: 0,
      thighLength: { left: 0, right: 0 } as Record<Side, number>,
      // Front-view form checks for the current rep.
      stanceWideNow: false,
      stanceWideAtStart: false,
      valgusDetected: false,
      checkedThisRep: false,
    };
    const valgus = createValgusDetector();

    /** Releases whatever was created. Safe to call more than once. */
    const release = () => {
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      landmarker?.close();
      landmarker = null;
    };

    const enterPhase = (next: Phase) => {
      tracker.phase = next;
      setPhase(next);
      if (next === 'STANDING') tracker.lockedSide = null;
    };

    const showFeedback = (message: string, tone: 'warn' | 'info') => {
      setFeedback({ message, tone });
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), FEEDBACK_DURATION_MS);
    };

    const finishRep = () => {
      const { depth } = configRef.current;
      const verdict = classifyRep({
        minAngle: tracker.minAngle,
        depth,
        wideStanceAtStart: tracker.stanceWideAtStart,
        valgusDetected: tracker.valgusDetected,
      });
      const checked = tracker.checkedThisRep;
      setFaults((prev) => ({
        shallow: prev.shallow + (verdict.faults.includes('shallow') ? 1 : 0),
        wideStance: prev.wideStance + (verdict.faults.includes('wideStance') ? 1 : 0),
        valgus: prev.valgus + (verdict.faults.includes('valgus') ? 1 : 0),
        checkedReps: prev.checkedReps + (checked ? 1 : 0),
      }));

      if (!verdict.valid) {
        setBadReps((n) => n + 1);
        playWarningTone();
        showFeedback(FAULT_MESSAGES[verdict.faults[0]](depth.validAngle), 'warn');
        return;
      }
      setValidReps((n) => n + 1);
      if (verdict.tooDeep) {
        playWarningTone();
        showFeedback('Too Deep — Protect Your Knee', 'warn');
      } else {
        playGoodRepTone();
      }
    };

    /** Starts a fresh set of form checks when a descent begins. */
    const startRepChecks = (measured: boolean) => {
      tracker.stanceWideAtStart = tracker.stanceWideNow;
      tracker.valgusDetected = false;
      tracker.checkedThisRep = measured;
      valgus.reset();
    };

    const updateStateMachine = (angle: number) => {
      switch (tracker.phase) {
        case 'STANDING':
          if (angle < DESCENT_ANGLE) {
            tracker.minAngle = angle;
            tracker.descentStartedAt = performance.now();
            enterPhase('DESCENDING');
          }
          break;
        case 'DESCENDING':
          tracker.minAngle = Math.min(tracker.minAngle, angle);
          if (angle >= tracker.minAngle + INFLECTION_DELTA) {
            // Too fast to be a controlled squat: a stumble or a quick bend.
            const tooFast = performance.now() - tracker.descentStartedAt < MIN_DESCENT_MS;
            enterPhase(tooFast ? 'STANDING' : 'BOTTOM');
          }
          break;
        case 'BOTTOM':
          // The user may sink a little deeper after the first inflection.
          tracker.minAngle = Math.min(tracker.minAngle, angle);
          if (angle > STANDING_ANGLE) {
            finishRep();
            enterPhase('STANDING');
          } else if (angle >= tracker.minAngle + ASCENT_DELTA) {
            enterPhase('ASCENDING');
          }
          break;
        case 'ASCENDING':
          if (angle > STANDING_ANGLE) {
            finishRep();
            enterPhase('STANDING');
          }
          break;
      }
    };

    const resetTracking = () => {
      tracker.smoothedAngle = null;
      tracker.stanceWideNow = false;
      if (tracker.phase !== 'STANDING') enterPhase('STANDING');
      setCurrentAngle(null);
      setStanceWide(false);
    };

    const renderFrame = () => {
      rafId = requestAnimationFrame(renderFrame);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !landmarker || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      if (video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { width, height } = canvas;

      const result = landmarker.detectForVideo(video, performance.now());
      ctx.drawImage(video, 0, 0, width, height);

      const landmarks = result.landmarks[0];
      if (!landmarks) {
        setFrameIssue('LOW_VISIBILITY');
        resetTracking();
        return;
      }

      // The leg is locked for the whole rep so a visibility flicker can't swap legs mid-squat.
      const side = tracker.lockedSide ?? pickVisibleSide(landmarks);

      const frameCheck = isUserInFrame(landmarks, side);
      setFrameIssue(frameCheck.code ?? null);
      if (!frameCheck.inFrame || pausedRef.current) {
        drawSkeleton(ctx, landmarks, connections, side, width, height, false);
        resetTracking();
        return;
      }

      const leg = LEGS[side];
      const hip = toPixels(landmarks[leg.hip], width, height);
      const knee = toPixels(landmarks[leg.knee], width, height);
      const ankle = toPixels(landmarks[leg.ankle], width, height);

      if (tracker.phase === 'STANDING') {
        const thigh = distance(hip, knee);
        const previous = tracker.thighLength[side];
        tracker.thighLength[side] = previous === 0 ? thigh : previous + THIGH_LENGTH_SMOOTHING * (thigh - previous);
      }
      const thighLength = tracker.thighLength[side];

      // Side-on, the 2D knee angle is accurate; facing the camera it barely changes, so estimate from hip drop.
      const otherLeg = LEGS[side === 'left' ? 'right' : 'left'];
      const hipSpread = Math.abs(landmarks[leg.hip].x - landmarks[otherLeg.hip].x) * width;
      const mode: ViewMode = hipSpread < SIDE_VIEW_HIP_SPREAD * thighLength ? 'SIDE' : 'FRONT';
      setViewMode(mode);

      const rawAngle = mode === 'SIDE' ? calculateAngle(hip, knee, ankle) : estimateKneeFlexion(hip, knee, thighLength);
      const angle =
        tracker.smoothedAngle === null
          ? rawAngle
          : tracker.smoothedAngle + ANGLE_SMOOTHING * (rawAngle - tracker.smoothedAngle);
      tracker.smoothedAngle = angle;

      // Stance and knee checks need left-right distances, which only a front view shows.
      const stance = mode === 'FRONT' ? measureStance(landmarks) : null;
      if (tracker.phase === 'STANDING') tracker.stanceWideNow = stance ? isStanceTooWide(stance) : false;

      const wasStanding = tracker.phase === 'STANDING';
      updateStateMachine(angle);
      if (wasStanding && tracker.phase === 'DESCENDING') {
        tracker.lockedSide = side;
        startRepChecks(stance !== null);
      }

      let kneesCaving = false;
      if (tracker.phase !== 'STANDING' && stance) {
        tracker.checkedThisRep = true;
        kneesCaving = isKneeCaving(stance);
        if (valgus.update(kneesCaving) && !tracker.valgusDetected) {
          tracker.valgusDetected = true;
          playWarningTone();
          showFeedback('Knees caving in! Push knees out', 'warn');
        }
      }

      const standing = tracker.phase === 'STANDING';
      setStanceWide(standing && tracker.stanceWideNow);
      const legAlert = standing ? tracker.stanceWideNow : kneesCaving || tracker.stanceWideAtStart;
      drawSkeleton(ctx, landmarks, connections, side, width, height, legAlert);

      setCurrentAngle(Math.round(angle));

      const { validAngle, tooDeepAngle } = configRef.current.depth;
      const kneeSafe = tooDeepAngle !== undefined;
      const readoutColor = kneeSafe && angle < DEPTH_ANGLE ? AMBER : angle <= validAngle ? EMERALD : CYAN;
      drawAngleReadout(ctx, knee, angle, readoutColor);
    };

    const createLandmarker = async () => {
      const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
      connections = PoseLandmarker.POSE_CONNECTIONS;
      const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
      const create = (delegate: 'GPU' | 'CPU') =>
        PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_PATH, delegate },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
      try {
        landmarker = await create('GPU');
      } catch {
        // Some devices (no WebGL2, blocked GPU) can't run the GPU delegate.
        landmarker = await create('CPU');
      }
    };

    const startCamera = async () => {
      // Stored immediately so release() can stop it even if play() fails or we unmount mid-start.
      stream = await openCameraWithRetry(
        {
          video: { width: { ideal: VIDEO_WIDTH }, height: { ideal: VIDEO_HEIGHT }, facingMode: 'user' },
          audio: false,
        },
        () => cancelled,
      );
      const video = videoRef.current;
      if (!video || cancelled) return;
      video.srcObject = stream;
      await video.play();
      if (canvasRef.current) {
        canvasRef.current.width = video.videoWidth || VIDEO_WIDTH;
        canvasRef.current.height = video.videoHeight || VIDEO_HEIGHT;
      }
    };

    const start = async () => {
      // Load the model while the camera permission prompt is open; settle both before deciding.
      const [modelResult, cameraResult] = await Promise.allSettled([createLandmarker(), startCamera()]);
      if (cancelled) {
        release();
        return;
      }
      if (cameraResult.status === 'rejected' || modelResult.status === 'rejected') {
        release();
        setErrorMessage(
          cameraResult.status === 'rejected'
            ? describeStartupError(cameraResult.reason, 'camera')
            : describeStartupError(null, 'model'),
        );
        setStatus('error');
        return;
      }
      setStatus('ready');
      rafId = requestAnimationFrame(renderFrame);
    };

    // Deferred by one tick so React's dev-mode double mount doesn't open the camera twice at once.
    const startTimer = setTimeout(() => void start(), 0);

    return () => {
      clearTimeout(startTimer);
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      release();
    };
  }, []);

  // Rest countdown between sets.
  useEffect(() => {
    if (restRemaining === null) return;
    if (restRemaining <= 0) {
      setRestRemaining(null);
      return;
    }
    const timeout = setTimeout(() => setRestRemaining((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(timeout);
  }, [restRemaining]);

  const finishWorkout = useCallback(
    (sets: SquatSetResult[]) => {
      onFinish({
        source: config.source,
        exerciseName: config.exerciseName,
        setsPlanned: config.sets,
        targetReps: config.targetReps,
        sets,
        ...summarizeSets(sets),
      });
    },
    [config, onFinish],
  );

  const currentSet: SquatSetResult = { validReps, badReps, faults };
  const setNumber = Math.min(completedSets.length + 1, config.sets);
  const isLastSet = completedSets.length + 1 >= config.sets;
  const isMultiSet = config.sets > 1;

  const handleFinishSet = () => {
    const sets = [...completedSets, currentSet];
    if (isLastSet) {
      finishWorkout(sets);
      return;
    }
    setCompletedSets(sets);
    setValidReps(0);
    setBadReps(0);
    setFaults(EMPTY_FAULTS);
    if (config.restSeconds > 0) setRestRemaining(config.restSeconds);
  };

  const handleEndWorkout = () => {
    const hasCurrentReps = validReps + badReps > 0;
    finishWorkout(hasCurrentReps ? [...completedSets, currentSet] : completedSets);
  };

  const allSets = [...completedSets, currentSet];
  const { validReps: totalValid, badReps: totalBad, formAccuracy } = summarizeSets(allSets);
  const totalReps = totalValid + totalBad;
  const potentialPoints = totalValid * POINTS_PER_VALID_REP;
  const kneeSafe = config.depth.tooDeepAngle !== undefined;

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-3 text-ink">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-base font-semibold text-ink">{config.exerciseName}</h2>
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          {isMultiSet ? `Set ${setNumber} / ${config.sets} · ` : ''}Target {config.targetReps} reps
          {kneeSafe ? ' · Knee-safe' : ''}
        </p>
      </div>

      {/* The camera stage stays dark and left-to-right in every theme/language (mirrored video + HUD). */}
      <div
        dir="ltr"
        className="dark relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-cyber-cyan/30 bg-[#050C14] text-ink shadow-glow-cyan"
      >
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas
          ref={canvasRef}
          width={VIDEO_WIDTH}
          height={VIDEO_HEIGHT}
          className="block h-full w-full -scale-x-100"
        />

        {status === 'loading' && (
          <div className="absolute inset-0 grid place-items-center p-4 text-center font-mono text-sm text-accent-cyan">
            Starting camera &amp; pose model… allow camera access if your browser asks.
          </div>
        )}
        {status === 'error' && (
          <div role="alert" className="absolute inset-0 grid place-items-center p-6 text-center text-sm font-medium text-rose-400">
            {errorMessage}
          </div>
        )}

        {status === 'ready' && frameIssue === 'OUT_OF_BOUNDS' && !resting && (
          <div
            role="alert"
            className="absolute left-1/2 top-4 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full bg-cyber-gold px-4 py-2 text-center text-sm font-extrabold tracking-wide text-amber-950 shadow-glow-gold"
          >
            ⚠️ STEP BACK: Make sure your full body is visible
          </div>
        )}
        {status === 'ready' && frameIssue === null && stanceWide && !resting && (
          <div
            role="alert"
            className="absolute left-1/2 top-4 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full bg-alert px-4 py-2 text-center text-sm font-extrabold tracking-wide text-white shadow-glow-red"
          >
            ⚠️ Stance too wide. Bring feet closer to shoulder width.
          </div>
        )}
        {status === 'ready' && frameIssue === 'LOW_VISIBILITY' && !resting && (
          <div
            role="alert"
            className="absolute left-1/2 top-4 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full border border-cyber-gold bg-zinc-950/85 px-4 py-2 text-center text-sm font-bold text-accent-gold"
          >
            Tracking lost — improve lighting or face the camera
          </div>
        )}

        {feedback && !resting && (
          <div
            role="status"
            className={`absolute left-1/2 top-1/2 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl px-5 py-3 text-center text-lg font-extrabold text-white sm:text-xl ${
              feedback.tone === 'warn' ? 'bg-alert/90 shadow-glow-red' : 'bg-cyber-cyan/90 text-zinc-950'
            }`}
          >
            {feedback.message}
          </div>
        )}

        {resting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/80 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">
              Rest · Next: Set {completedSets.length + 1} / {config.sets}
            </p>
            <p className="font-mono text-6xl font-bold tabular-nums text-accent-cyan [text-shadow:0_0_18px_rgba(0,229,255,0.6)]">
              {restRemaining}s
            </p>
            <button
              type="button"
              onClick={() => setRestRemaining(null)}
              className="rounded-lg border border-cyber-cyan/60 px-4 py-2 text-sm font-semibold text-accent-cyan hover:bg-cyber-cyan/10"
            >
              Skip Rest
            </button>
          </div>
        )}

        {status === 'ready' && (
          <div className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] rounded-md border border-cyber-cyan/40 bg-zinc-950/70 px-2.5 py-1 font-mono text-[11px] tracking-[0.15em] text-accent-cyan">
            {resting
              ? 'RESTING'
              : viewMode === 'FRONT'
                ? `${phase} · FRONT VIEW · FORM CHECKS ON`
                : `${phase} · SIDE VIEW · face camera for stance/knee checks`}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4">
        <div className="grid grid-cols-3 items-center gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
              {isMultiSet ? `Reps · Set ${setNumber}` : 'Reps'}
            </p>
            <p className="font-mono font-black tabular-nums text-ink">
              <span className="text-4xl">{pad2(validReps)}</span>
              <span className="text-lg text-muted"> / {pad2(config.targetReps)}</span>
            </p>
          </div>
          <div className="flex justify-center">
            <AccuracyRing value={totalReps > 0 ? formAccuracy : null} />
          </div>
          <div className="min-w-0 text-right">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
              {viewMode === 'FRONT' ? 'Knee (est.)' : 'Knee Angle'}
            </p>
            <p className="font-mono text-2xl font-black tabular-nums text-accent-cyan [text-shadow:0_0_12px_rgba(0,229,255,0.5)]">
              {currentAngle !== null ? `${currentAngle}°` : '--°'}
            </p>
            <p className="font-mono text-sm font-black tabular-nums text-accent-gold">+{potentialPoints} pts</p>
            <p className="text-[10px] font-medium text-muted">potential · Arab Bank</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isMultiSet && (
            <button
              type="button"
              onClick={handleEndWorkout}
              className="flex-1 rounded-xl border border-line px-4 py-3 text-sm font-semibold text-soft hover:border-muted hover:text-ink"
            >
              End Workout
            </button>
          )}
          <button
            type="button"
            onClick={handleFinishSet}
            disabled={resting}
            className="flex-1 rounded-xl bg-cyber-emerald px-5 py-3 text-sm font-extrabold text-zinc-950 shadow-glow-emerald transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isMultiSet && isLastSet ? 'Finish Workout' : 'Finish Set'}
          </button>
        </div>
      </div>
    </div>
  );
}

const RING_RADIUS = 30;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Circular form-accuracy gauge, as in the mockup's tracker screen. */
function AccuracyRing({ value }: { value: number | null }) {
  const progress = value === null ? 0 : Math.min(100, Math.max(0, value)) / 100;
  return (
    <div className="relative h-20 w-20" role="img" aria-label={value === null ? 'Form accuracy: no reps yet' : `Form accuracy ${value}%`}>
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
        <circle cx="36" cy="36" r={RING_RADIUS} fill="none" stroke="#262630" strokeWidth="7" />
        <circle
          cx="36"
          cy="36"
          r={RING_RADIUS}
          fill="none"
          stroke="#00E676"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
          className="transition-[stroke-dashoffset] duration-500 [filter:drop-shadow(0_0_4px_rgba(0,230,118,0.7))]"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-lg font-black tabular-nums text-ink">{value === null ? '--' : `${value}%`}</span>
        <span className="text-[9px] font-medium uppercase text-muted">Form</span>
      </div>
    </div>
  );
}
