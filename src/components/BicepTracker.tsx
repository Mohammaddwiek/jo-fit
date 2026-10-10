'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import BicepSetResults from './BicepSetResults';
import { playGoodRepTone, playWarningTone } from '../lib/audioFeedback';
import { cn } from '../lib/cn';
import {
  ARMS,
  CONTRACTED_ANGLE,
  createCurlSession,
  CURL_ERROR_CUES,
  EXTENDED_ANGLE,
  type Arm,
  type CurlPhase,
  type CurlRep,
  type CurlViewMode,
} from '../lib/curlLogic';
import type { FrameIssue, Point } from '../lib/angleMath';
import { POINTS_PER_VALID_REP } from '../lib/progressiveOverload';
import type { SessionSummary } from '../lib/useJoFitState';
import { usePoseCamera, type PoseConnection, type PoseFrame } from '../lib/usePoseCamera';
import { summarizeSets, type SquatWorkoutResult, type WorkoutConfig } from '../lib/workoutConfig';

const CYAN = '#00E5FF';
const EMERALD = '#00E676';
const ALERT_RED = '#EF4444';
const MIN_DRAW_VISIBILITY = 0.5;
/** Landmarks 0–10 are the face; the HUD skeleton only draws the body. */
const FIRST_BODY_LANDMARK = 11;
/** Shoulders, elbows and wrists (11–16): turned red while the elbows flare. */
const ARM_LANDMARKS = new Set([11, 12, 13, 14, 15, 16]);
const FEEDBACK_DURATION_MS = 2000;
const HUD_ANGLE_INTERVAL_MS = 100;

interface Hud {
  frameIssue: FrameIssue | null;
  frameMessage: string;
  angle: number | null;
  phase: CurlPhase;
  viewMode: CurlViewMode;
  flaring: boolean;
}

const INITIAL_HUD: Hud = { frameIssue: null, frameMessage: '', angle: null, phase: 'READY', viewMode: 'FRONT', flaring: false };

export interface BicepTrackerProps {
  config: WorkoutConfig;
  /** What saving this result would do (points, next weight), without saving it. */
  preview: (result: SquatWorkoutResult) => SessionSummary;
  onSave: (result: SquatWorkoutResult) => void;
  onRetry: () => void;
  /** Reports whether the camera is live, so the page's LIVE pill can turn off when the set ends. */
  onLiveChange?: (live: boolean) => void;
}

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  connections: PoseConnection[],
  activeArm: Arm,
  width: number,
  height: number,
  armAlert: boolean,
) {
  const arm = ARMS[activeArm];
  const activeJoints = new Set([arm.shoulder, arm.elbow, arm.wrist]);
  const isVisible = (i: number) => (landmarks[i]?.visibility ?? 0) >= MIN_DRAW_VISIBILITY;

  ctx.save();
  ctx.lineCap = 'round';
  // Glow = a wide translucent stroke under a solid one. Canvas shadowBlur looks similar but is
  // far too slow to run on every line, every frame, next to the pose model.
  for (const { start, end } of connections) {
    if (start < FIRST_BODY_LANDMARK || end < FIRST_BODY_LANDMARK) continue;
    if (!isVisible(start) || !isVisible(end)) continue;
    const isActive = activeJoints.has(start) && activeJoints.has(end);
    const color = armAlert && ARM_LANDMARKS.has(start) && ARM_LANDMARKS.has(end) ? ALERT_RED : CYAN;
    const width1 = isActive ? 6 : 3;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(landmarks[start].x * width, landmarks[start].y * height);
    ctx.lineTo(landmarks[end].x * width, landmarks[end].y * height);
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = width1 * 3;
    ctx.stroke();
    ctx.globalAlpha = isActive ? 1 : 0.75;
    ctx.lineWidth = width1;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (let i = FIRST_BODY_LANDMARK; i < landmarks.length; i++) {
    if (!isVisible(i)) continue;
    ctx.fillStyle = armAlert && ARM_LANDMARKS.has(i) ? ALERT_RED : '#FFFFFF';
    ctx.beginPath();
    ctx.arc(landmarks[i].x * width, landmarks[i].y * height, activeJoints.has(i) ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Angle readout next to the elbow. The canvas is CSS-mirrored, so the text is flipped back. */
function drawAngleReadout(ctx: CanvasRenderingContext2D, anchor: Point, angle: number, color: string) {
  const label = `${Math.round(angle)}°`;
  ctx.save();
  ctx.translate(anchor.x, anchor.y);
  ctx.scale(-1, 1);
  ctx.font = 'bold 22px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  const textWidth = ctx.measureText(label).width;
  ctx.fillStyle = 'rgba(5, 12, 20, 0.75)';
  ctx.fillRect(10, -36, textWidth + 16, 32);
  ctx.fillStyle = color;
  ctx.fillText(label, 18, -12);
  ctx.restore();
}

const pad2 = (n: number) => String(n).padStart(2, '0');

const PHASE_LABEL: Record<CurlPhase, string> = {
  READY: 'EXTEND ARMS TO START',
  EXTENDED: 'EXTENDED',
  CURLING: 'CURLING',
  LOWERING: 'LOWERING',
};

export default function BicepTracker({ config, preview, onSave, onRetry, onLiveChange }: BicepTrackerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef(createCurlSession());
  const repsRef = useRef<CurlRep[]>([]);
  const endedRef = useRef(false);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [reps, setReps] = useState<CurlRep[]>([]);
  const [ended, setEnded] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [hud, setHud] = useState<Hud>(INITIAL_HUD);
  const hudRef = useRef<Hud>(INITIAL_HUD);
  const lastAngleUpdateRef = useRef(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { frameIssue, frameMessage, angle, phase, viewMode, flaring } = hud;

  /**
   * One React update per frame at most, and only when something visible changed. The stats-card
   * angle refreshes 10× per second; the on-video readout is drawn on the canvas every frame.
   */
  const pushHud = (next: Hud, now: number) => {
    const prev = hudRef.current;
    const angleDue = now - lastAngleUpdateRef.current >= HUD_ANGLE_INTERVAL_MS || (next.angle === null) !== (prev.angle === null);
    const merged: Hud = { ...next, angle: angleDue ? next.angle : prev.angle };
    if (angleDue) lastAngleUpdateRef.current = now;
    const changed = (Object.keys(merged) as (keyof Hud)[]).some((key) => merged[key] !== prev[key]);
    if (!changed) return;
    hudRef.current = merged;
    setHud(merged);
  };

  const showFeedback = (message: string) => {
    setFeedback(message);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), FEEDBACK_DURATION_MS);
  };

  const camera = usePoseCamera(
    useCallback((frame: PoseFrame) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || endedRef.current) return;
      if (frame.video.videoWidth && canvas.width !== frame.video.videoWidth) {
        canvas.width = frame.video.videoWidth;
        canvas.height = frame.video.videoHeight;
      }
      const { width, height } = canvas;
      ctx.drawImage(frame.video, 0, 0, width, height);

      if (!frame.landmarks) {
        sessionRef.current.reset();
        pushHud(
          {
            ...hudRef.current,
            frameIssue: 'LOW_VISIBILITY',
            frameMessage: 'Tracking lost: improve lighting or face the camera',
            angle: null,
            flaring: false,
          },
          frame.now,
        );
        return;
      }

      const out = sessionRef.current.step({ landmarks: frame.landmarks, width, height, now: frame.now });
      drawSkeleton(ctx, frame.landmarks, frame.connections, out.arm, width, height, out.flaring);
      pushHud(
        {
          frameIssue: out.frameIssue,
          frameMessage: out.frameMessage ?? '',
          phase: out.phase,
          viewMode: out.viewMode,
          flaring: out.flaring,
          angle: out.angle === null ? null : Math.round(out.angle),
        },
        frame.now,
      );
      if (out.angle !== null && out.anchor) {
        const color = out.angle <= CONTRACTED_ANGLE || out.angle >= EXTENDED_ANGLE ? EMERALD : CYAN;
        drawAngleReadout(ctx, out.anchor, out.angle, out.flaring ? ALERT_RED : color);
      }

      if (out.cue) {
        playWarningTone();
        showFeedback(out.cue);
      }
      if (out.completedRep) {
        const rep = out.completedRep;
        repsRef.current = [...repsRef.current, rep];
        setReps(repsRef.current);
        if (rep.isValid) {
          playGoodRepTone();
        } else {
          playWarningTone();
          if (rep.errorType && rep.errorType !== 'perfect') showFeedback(CURL_ERROR_CUES[rep.errorType]);
        }
        // The set ends automatically once the target number of reps (valid or not) is logged.
        if (repsRef.current.length >= config.targetReps) endSetRef.current();
      }
    }, [config.targetReps]),
  );

  const endSet = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    camera.stop();
    setEnded(true);
    hudRef.current = { ...hudRef.current, flaring: false };
    setHud(hudRef.current);
    setFeedback(null);
  };
  const endSetRef = useRef(endSet);
  endSetRef.current = endSet;

  // "Live" while starting or running; off once the set ends or the camera fails.
  const cameraLive = (camera.status === 'ready' || camera.status === 'loading') && !ended;
  useEffect(() => {
    onLiveChange?.(cameraLive);
  }, [cameraLive, onLiveChange]);

  const validReps = reps.filter((rep) => rep.isValid).length;
  const badReps = reps.length - validReps;

  const result = useMemo<SquatWorkoutResult>(() => {
    const sets = [{ validReps, badReps, curlReps: reps }];
    return {
      source: config.source,
      exercise: 'curl',
      exerciseName: config.exerciseName,
      setsPlanned: 1,
      targetReps: config.targetReps,
      sets,
      ...summarizeSets(sets),
    };
  }, [badReps, config.exerciseName, config.source, config.targetReps, reps, validReps]);

  if (showResults) {
    return (
      <BicepSetResults
        reps={reps}
        targetReps={config.targetReps}
        exerciseName={config.exerciseName}
        outcome={preview(result)}
        onSave={() => onSave(result)}
        onRetry={onRetry}
      />
    );
  }

  const formAccuracy = result.formAccuracy;
  const potentialPoints = validReps * POINTS_PER_VALID_REP;
  const live = camera.status === 'ready' && !ended;

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-3 text-zinc-100">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-base font-semibold text-zinc-100">{config.exerciseName}</h2>
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
          Target {config.targetReps} reps · ROM {EXTENDED_ANGLE}° → {CONTRACTED_ANGLE}°
        </p>
      </div>

      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-cyber-cyan/30 bg-[#050C14] shadow-glow-cyan">
        <video ref={camera.videoRef} className="hidden" playsInline muted />
        <canvas ref={canvasRef} width={camera.videoWidth} height={camera.videoHeight} className="block h-full w-full -scale-x-100" />

        {camera.status === 'loading' && (
          <div className="absolute inset-0 grid place-items-center p-4 text-center font-mono text-sm text-cyber-cyan">
            Starting camera &amp; pose model… allow camera access if your browser asks.
          </div>
        )}
        {camera.status === 'error' && (
          <div role="alert" className="absolute inset-0 grid place-items-center p-6 text-center text-sm font-medium text-rose-400">
            {camera.errorMessage}
          </div>
        )}

        {live && frameIssue === 'OUT_OF_BOUNDS' && (
          <Pill className="bg-cyber-gold text-amber-950 shadow-glow-gold">⚠️ {frameMessage}</Pill>
        )}
        {live && frameIssue === 'LOW_VISIBILITY' && (
          <Pill className="border border-cyber-gold bg-zinc-950/85 text-cyber-gold">{frameMessage}</Pill>
        )}
        {live && frameIssue === null && flaring && (
          <Pill className="bg-alert text-white shadow-glow-red">⚠️ Elbows flaring! Pin them to your ribs.</Pill>
        )}

        {feedback && live && (
          <div
            role="status"
            className="absolute left-1/2 top-1/2 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-alert/90 px-5 py-3 text-center text-lg font-extrabold text-white shadow-glow-red sm:text-xl"
          >
            {feedback}
          </div>
        )}

        {live && (
          <div className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] rounded-md border border-cyber-cyan/40 bg-zinc-950/70 px-2.5 py-1 font-mono text-[11px] tracking-[0.15em] text-cyber-cyan">
            {viewMode === 'FRONT'
              ? `${PHASE_LABEL[phase]} · FRONT VIEW · FLARE CHECK ON`
              : `${PHASE_LABEL[phase]} · SIDE VIEW · face camera for flare check`}
          </div>
        )}

        {ended && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-obsidian/90 p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Set ended · camera off</p>
            <p className="font-mono text-4xl font-black tabular-nums text-zinc-100">
              {pad2(validReps)} <span className="text-lg text-zinc-400">/ {pad2(config.targetReps)} valid</span>
            </p>
            <button
              type="button"
              onClick={() => setShowResults(true)}
              className="rounded-2xl bg-cyber-emerald px-8 py-4 text-lg font-extrabold text-zinc-950 shadow-glow-emerald transition hover:brightness-110"
            >
              📊 View Set Results
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4">
        <div className="grid grid-cols-3 items-center gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400">Reps logged</p>
            <p className="font-mono font-black tabular-nums text-zinc-100">
              <span className="text-4xl">{pad2(reps.length)}</span>
              <span className="text-lg text-zinc-400"> / {pad2(config.targetReps)}</span>
            </p>
            <p className="text-xs font-medium text-cyber-emerald">{validReps} valid</p>
          </div>
          <div className="flex justify-center">
            <AccuracyRing value={reps.length > 0 ? formAccuracy : null} />
          </div>
          <div className="min-w-0 text-right">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400">
              {viewMode === 'FRONT' ? 'Elbow (est.)' : 'Elbow Angle'}
            </p>
            <p className="font-mono text-2xl font-black tabular-nums text-cyber-cyan [text-shadow:0_0_12px_rgba(0,229,255,0.5)]">
              {angle !== null && live ? `${angle}°` : '--°'}
            </p>
            <p className="font-mono text-sm font-black tabular-nums text-cyber-gold">+{potentialPoints} pts</p>
            <p className="text-[10px] font-medium text-zinc-500">potential · Arab Bank</p>
          </div>
        </div>
        <button
          type="button"
          onClick={endSet}
          disabled={ended || camera.status !== 'ready'}
          className="rounded-xl border border-line px-4 py-3 text-sm font-semibold text-zinc-200 hover:border-zinc-500 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          End Set
        </button>
      </div>
    </div>
  );
}

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className={cn(
        'absolute left-1/2 top-4 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full px-4 py-2 text-center text-sm font-extrabold tracking-wide',
        className,
      )}
    >
      {children}
    </div>
  );
}

const RING_RADIUS = 30;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

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
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-lg font-black tabular-nums text-zinc-100">{value === null ? '--' : `${value}%`}</span>
        <span className="text-[9px] font-medium uppercase text-zinc-400">Form</span>
      </div>
    </div>
  );
}
