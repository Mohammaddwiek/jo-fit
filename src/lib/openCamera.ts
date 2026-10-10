/**
 * Opens the webcam, retrying briefly when the device is busy. On Windows a webcam that was
 * just released (previous tracker, "Retry Set", React's dev double-mount) can report
 * NotReadableError / AbortError for a moment before it can be opened again.
 */
const BUSY_ERRORS = new Set(['NotReadableError', 'TrackStartError', 'AbortError']);
const RETRY_DELAYS_MS = [300, 700, 1200, 2000];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class CameraCancelledError extends Error {
  constructor() {
    super('Camera start was cancelled');
    this.name = 'CameraCancelledError';
  }
}

export async function openCameraWithRetry(
  constraints: MediaStreamConstraints,
  isCancelled: () => boolean,
): Promise<MediaStream> {
  for (let attempt = 0; ; attempt++) {
    if (isCancelled()) throw new CameraCancelledError();
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (isCancelled()) {
        stream.getTracks().forEach((track) => track.stop());
        throw new CameraCancelledError();
      }
      return stream;
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      if (!BUSY_ERRORS.has(name) || attempt >= RETRY_DELAYS_MS.length) throw error;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
}
