'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NormalizedLandmark, PoseLandmarker } from '@mediapipe/tasks-vision';
import { openCameraWithRetry } from './openCamera';

// Self-hosted (see scripts/copy-mediapipe.mjs) so the demo doesn't depend on venue Wi-Fi.
const WASM_PATH = '/mediapipe/wasm';
const MODEL_PATH = '/models/pose_landmarker_lite.task';
const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;

export type PoseCameraStatus = 'loading' | 'ready' | 'stopped' | 'error';
export type PoseConnection = { start: number; end: number };

export interface PoseFrame {
  video: HTMLVideoElement;
  /** The first detected person's landmarks, or null when nobody is detected. */
  landmarks: NormalizedLandmark[] | null;
  connections: PoseConnection[];
  now: number;
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

/**
 * Starts the webcam and MediaPipe pose model on mount and calls `onFrame` for every new
 * video frame. `stop()` ends the loop, turns the camera off and closes the model.
 */
export function usePoseCamera(onFrame: (frame: PoseFrame) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;
  const stopRef = useRef<() => void>(() => {});
  const [status, setStatus] = useState<PoseCameraStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let stream: MediaStream | null = null;
    let landmarker: PoseLandmarker | null = null;
    let connections: PoseConnection[] = [];
    let lastVideoTime = -1;

    /** Releases whatever was created. Safe to call more than once. */
    const release = () => {
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      landmarker?.close();
      landmarker = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    const loop = () => {
      rafId = requestAnimationFrame(loop);
      const video = videoRef.current;
      if (!video || !landmarker || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      if (video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;
      const now = performance.now();
      const result = landmarker.detectForVideo(video, now);
      onFrameRef.current({ video, landmarks: result.landmarks[0] ?? null, connections, now });
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
    };

    stopRef.current = () => {
      cancelled = true;
      release();
      setStatus('stopped');
    };

    const start = async () => {
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
      rafId = requestAnimationFrame(loop);
    };

    // Deferred by one tick: React's dev-mode mount → unmount → mount then cancels the first
    // start before it ever opens the camera or builds a second GPU model, instead of two
    // overlapping camera opens (which Windows webcams reject as "device in use").
    const startTimer = setTimeout(() => void start(), 0);

    return () => {
      clearTimeout(startTimer);
      cancelled = true;
      release();
    };
  }, []);

  const stop = useCallback(() => stopRef.current(), []);

  return { videoRef, status, errorMessage, stop, videoWidth: VIDEO_WIDTH, videoHeight: VIDEO_HEIGHT };
}
