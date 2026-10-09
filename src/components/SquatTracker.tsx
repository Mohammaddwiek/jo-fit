'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { NormalizedLandmark, PoseLandmarker } from '@mediapipe/tasks-vision';
import { calculateAngle, isUserInFrame, LANDMARK, type Point } from '../lib/angleMath';
import { playGoodRepTone, playWarningTone } from '../lib/audioFeedback';
import { POINTS_PER_VALID_REP } from '../lib/progressiveOverload';

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;

// Squat state machine thresholds (knee angle, degrees).
const STANDING_ANGLE = 160;
const DESCENT_ANGLE = 145;
const DEPTH_ANGLE = 90;
/** How far the angle must climb above its minimum before we call it the bottom. */
const INFLECTION_DELTA = 8;
/** Additional climb past the bottom before we call it ascending. */
const ASCENT_DELTA = 15;
/** Exponential smoothing factor for the raw knee angle (1 = no smoothing). */
const ANGLE_SMOOTHING = 0.5;

const FEEDBACK_DURATION_MS = 2000;
const MIN_DRAW_VISIBILITY = 0.5;
/** Landmarks 0–10 are the face; the HUD skeleton only draws the body. */
const FIRST_BODY_LANDMARK = 11;

const CYAN = '#00E5FF';
const AMBER = '#FFB300';
const RED = '#FF3D57';

type Phase = 'STANDING' | 'DESCENDING' | 'BOTTOM' | 'ASCENDING';
type Side = 'left' | 'right';
type Status = 'loading' | 'ready' | 'error';
type Connection = { start: number; end: number };

const LEGS: Record<Side, { hip: number; knee: number; ankle: number }> = {
  left: { hip: LANDMARK.LEFT_HIP, knee: LANDMARK.LEFT_KNEE, ankle: LANDMARK.LEFT_ANKLE },
  right: { hip: LANDMARK.RIGHT_HIP, knee: LANDMARK.RIGHT_KNEE, ankle: LANDMARK.RIGHT_ANKLE },
};

export interface SquatSessionResult {
  validReps: number;
  badReps: number;
  totalReps: number;
  targetReps: number;
  /** Share of reps that reached depth, as a percentage (0–100). */
  formAccuracy: number;
  pointsEarned: number;
}

export interface SquatTrackerProps {
  targetReps?: number;
  onFinish?: (result: SquatSessionResult) => void;
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

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  connections: Connection[],
  activeSide: Side,
  width: number,
  height: number,
) {
  const leg = LEGS[activeSide];
  const activeJoints = new Set([leg.hip, leg.knee, leg.ankle]);
  const isVisible = (i: number) => (landmarks[i]?.visibility ?? 0) >= MIN_DRAW_VISIBILITY;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = CYAN;
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = 14;

  for (const { start, end } of connections) {
    if (start < FIRST_BODY_LANDMARK || end < FIRST_BODY_LANDMARK) continue;
    if (!isVisible(start) || !isVisible(end)) continue;
    const isActive = activeJoints.has(start) && activeJoints.has(end);
    ctx.lineWidth = isActive ? 6 : 3;
    ctx.globalAlpha = isActive ? 1 : 0.7;
    ctx.beginPath();
    ctx.moveTo(landmarks[start].x * width, landmarks[start].y * height);
    ctx.lineTo(landmarks[end].x * width, landmarks[end].y * height);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.fillStyle = '#FFFFFF';
  for (let i = FIRST_BODY_LANDMARK; i < landmarks.length; i++) {
    if (!isVisible(i)) continue;
    ctx.beginPath();
    ctx.arc(landmarks[i].x * width, landmarks[i].y * height, activeJoints.has(i) ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Draws the knee readout. The canvas is CSS-mirrored, so the text is flipped back to stay readable. */
function drawAngleReadout(ctx: CanvasRenderingContext2D, knee: Point, angle: number, depthReached: boolean) {
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
  ctx.fillStyle = depthReached ? '#00FF9C' : CYAN;
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 10;
  ctx.fillText(label, x, y);
  ctx.restore();
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export default function SquatTracker({ targetReps = 10, onFinish }: SquatTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [inFrame, setInFrame] = useState(true);
  const [phase, setPhase] = useState<Phase>('STANDING');
  const [currentAngle, setCurrentAngle] = useState<number | null>(null);
  const [validReps, setValidReps] = useState(0);
  const [badReps, setBadReps] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

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
      depthValid: false,
    };

    const enterPhase = (next: Phase) => {
      tracker.phase = next;
      setPhase(next);
    };

    const showFeedback = (message: string) => {
      setFeedback(message);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), FEEDBACK_DURATION_MS);
    };

    const finishRep = () => {
      if (tracker.depthValid) {
        setValidReps((n) => n + 1);
        playGoodRepTone();
      } else {
        setBadReps((n) => n + 1);
        playWarningTone();
        showFeedback('Go Lower: Reach 90°');
      }
    };

    const updateStateMachine = (angle: number) => {
      switch (tracker.phase) {
        case 'STANDING':
          if (angle < DESCENT_ANGLE) {
            tracker.minAngle = angle;
            tracker.depthValid = false;
            enterPhase('DESCENDING');
          }
          break;
        case 'DESCENDING':
          tracker.minAngle = Math.min(tracker.minAngle, angle);
          if (angle >= tracker.minAngle + INFLECTION_DELTA) {
            tracker.depthValid = tracker.minAngle <= DEPTH_ANGLE;
            enterPhase('BOTTOM');
          }
          break;
        case 'BOTTOM':
          // The user may sink a little deeper after the first inflection.
          if (angle < tracker.minAngle) {
            tracker.minAngle = angle;
            tracker.depthValid = tracker.minAngle <= DEPTH_ANGLE;
          }
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
      if (tracker.phase !== 'STANDING') enterPhase('STANDING');
      setCurrentAngle(null);
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
        setInFrame(false);
        resetTracking();
        return;
      }

      const side = pickVisibleSide(landmarks);
      drawSkeleton(ctx, landmarks, connections, side, width, height);

      const frameCheck = isUserInFrame(landmarks);
      setInFrame(frameCheck.inFrame);
      if (!frameCheck.inFrame) {
        resetTracking();
        return;
      }

      const leg = LEGS[side];
      const knee = toPixels(landmarks[leg.knee], width, height);
      const rawAngle = calculateAngle(
        toPixels(landmarks[leg.hip], width, height),
        knee,
        toPixels(landmarks[leg.ankle], width, height),
      );
      const angle =
        tracker.smoothedAngle === null
          ? rawAngle
          : tracker.smoothedAngle + ANGLE_SMOOTHING * (rawAngle - tracker.smoothedAngle);
      tracker.smoothedAngle = angle;

      updateStateMachine(angle);
      setCurrentAngle(Math.round(angle));
      drawAngleReadout(ctx, knee, angle, angle <= DEPTH_ANGLE);
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
        return await create('GPU');
      } catch {
        // Some devices (no WebGL2, blocked GPU) can't run the GPU delegate.
        return await create('CPU');
      }
    };

    const startCamera = async () => {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: VIDEO_WIDTH }, height: { ideal: VIDEO_HEIGHT }, facingMode: 'user' },
        audio: false,
      });
      const video = videoRef.current;
      if (!video) return media;
      video.srcObject = media;
      await video.play();
      if (canvasRef.current) {
        canvasRef.current.width = video.videoWidth || VIDEO_WIDTH;
        canvasRef.current.height = video.videoHeight || VIDEO_HEIGHT;
      }
      return media;
    };

    (async () => {
      try {
        const [createdLandmarker, media] = await Promise.all([createLandmarker(), startCamera()]);
        landmarker = createdLandmarker;
        stream = media;
        if (cancelled) {
          landmarker.close();
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setStatus('ready');
        rafId = requestAnimationFrame(renderFrame);
      } catch (err) {
        if (cancelled) return;
        const denied = err instanceof DOMException && err.name === 'NotAllowedError';
        setErrorMessage(
          denied
            ? 'Camera access was denied. Allow camera permissions and reload.'
            : 'Could not start the tracker. Check your camera and connection.',
        );
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      stream?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
    };
  }, []);

  const totalReps = validReps + badReps;
  const formAccuracy = totalReps > 0 ? Math.round((validReps / totalReps) * 100) : 0;
  const pointsEarned = validReps * POINTS_PER_VALID_REP;

  const handleFinish = () => {
    onFinish?.({ validReps, badReps, totalReps, targetReps, formAccuracy, pointsEarned });
  };

  return (
    <div style={styles.root}>
      <div style={styles.stage}>
        <video ref={videoRef} style={styles.hiddenVideo} playsInline muted />
        <canvas ref={canvasRef} width={VIDEO_WIDTH} height={VIDEO_HEIGHT} style={styles.canvas} />

        {status === 'loading' && <div style={styles.overlayMessage}>Loading pose model…</div>}
        {status === 'error' && <div style={{ ...styles.overlayMessage, color: RED }}>{errorMessage}</div>}

        {status === 'ready' && !inFrame && (
          <div role="alert" style={styles.stepBackPill}>
            ⚠️ STEP BACK: Make sure your full body is visible
          </div>
        )}

        {feedback && (
          <div role="status" style={styles.feedbackToast}>
            {feedback}
          </div>
        )}

        {status === 'ready' && <div style={styles.phaseTag}>{phase}</div>}
      </div>

      <div style={styles.card}>
        <div style={styles.stats}>
          <Stat label="Reps" value={`${pad2(validReps)} / ${pad2(targetReps)}`} />
          <Stat label="Form Accuracy" value={totalReps > 0 ? `${formAccuracy}%` : '--%'} />
          <Stat label="Knee Angle" value={currentAngle !== null ? `${currentAngle}°` : '--°'} />
        </div>
        <div style={styles.cardFooter}>
          <div style={styles.pointsBadge}>
            <span style={styles.pointsSponsor}>Arab Bank</span>
            <span style={styles.pointsValue}>+{pointsEarned} Pts</span>
          </div>
          <button type="button" onClick={handleFinish} style={styles.finishButton}>
            Finish Set
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.stat}>
      <span style={styles.statLabel}>{label}</span>
      <span style={styles.statValue}>{value}</span>
    </div>
  );
}

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

const styles: Record<string, CSSProperties> = {
  root: {
    width: '100%',
    maxWidth: VIDEO_WIDTH,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    color: '#E6F7FF',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  stage: {
    position: 'relative',
    width: '100%',
    aspectRatio: `${VIDEO_WIDTH} / ${VIDEO_HEIGHT}`,
    background: '#050C14',
    borderRadius: 16,
    overflow: 'hidden',
    border: `1px solid ${CYAN}55`,
    boxShadow: `0 0 24px ${CYAN}33`,
  },
  hiddenVideo: { display: 'none' },
  canvas: { width: '100%', height: '100%', display: 'block', transform: 'scaleX(-1)' },
  overlayMessage: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    padding: 16,
    textAlign: 'center',
    fontFamily: MONO,
    color: CYAN,
  },
  stepBackPill: {
    position: 'absolute',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    maxWidth: 'calc(100% - 32px)',
    padding: '10px 18px',
    borderRadius: 999,
    background: AMBER,
    color: '#1A1200',
    fontWeight: 800,
    fontSize: 14,
    textAlign: 'center',
    letterSpacing: 0.3,
    boxShadow: `0 0 20px ${AMBER}AA`,
  },
  feedbackToast: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    padding: '12px 22px',
    borderRadius: 12,
    background: 'rgba(255, 61, 87, 0.92)',
    color: '#FFFFFF',
    fontWeight: 800,
    fontSize: 20,
    whiteSpace: 'nowrap',
    boxShadow: `0 0 24px ${RED}AA`,
  },
  phaseTag: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    padding: '4px 10px',
    borderRadius: 6,
    background: 'rgba(5, 12, 20, 0.7)',
    border: `1px solid ${CYAN}66`,
    color: CYAN,
    fontFamily: MONO,
    fontSize: 12,
    letterSpacing: 1.5,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    background: 'linear-gradient(160deg, #0A1824 0%, #050C14 100%)',
    border: `1px solid ${CYAN}44`,
  },
  stats: { display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  stat: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: '1 1 120px' },
  statLabel: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#7FA8BC' },
  statValue: {
    fontFamily: MONO,
    fontVariantNumeric: 'tabular-nums',
    fontSize: 32,
    fontWeight: 700,
    color: CYAN,
    textShadow: `0 0 12px ${CYAN}88`,
  },
  cardFooter: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pointsBadge: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    padding: '8px 14px',
    borderRadius: 999,
    background: 'rgba(0, 229, 255, 0.08)',
    border: `1px solid ${CYAN}66`,
  },
  pointsSponsor: { fontSize: 12, color: '#7FA8BC', fontWeight: 600 },
  pointsValue: { fontFamily: MONO, fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#00FF9C' },
  finishButton: {
    padding: '12px 22px',
    borderRadius: 12,
    border: 'none',
    background: CYAN,
    color: '#03141C',
    fontWeight: 800,
    fontSize: 15,
    cursor: 'pointer',
    boxShadow: `0 0 18px ${CYAN}88`,
  },
};
