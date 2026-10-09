/**
 * Zero-dependency feedback tones using the native Web Audio API.
 * Browsers only allow audio after a user gesture, so the first call should
 * happen from (or after) a click/tap, e.g. the "Start workout" button.
 */

type AudioContextConstructor = typeof AudioContext;

let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!sharedContext) {
    const Ctor: AudioContextConstructor | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
    if (!Ctor) return null;
    sharedContext = new Ctor();
  }

  if (sharedContext.state === 'suspended') {
    void sharedContext.resume();
  }

  return sharedContext;
}

function playTone(frequency: number, durationMs: number, type: OscillatorType, peakGain: number): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const start = ctx.currentTime;
  const end = start + durationMs / 1000;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);

  // Exponential ramps can't target 0, so fade to a near-silent value to avoid clicks.
  gain.gain.setValueAtTime(peakGain, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(start);
  oscillator.stop(end);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
}

/**
 * Creates/resumes the shared AudioContext. Call from a click handler so later tones,
 * which fire from the animation loop, are allowed to play.
 */
export function unlockAudio(): void {
  getAudioContext();
}

/** Bright confirmation chime for a clean rep: 880 Hz sine, 120 ms. */
export function playGoodRepTone(): void {
  playTone(880, 120, 'sine', 0.3);
}

/** Low buzz for shallow depth or form failure: 220 Hz square, 200 ms. */
export function playWarningTone(): void {
  // Square waves are much louder than sines at the same gain.
  playTone(220, 200, 'square', 0.12);
}
