'use client';

// Singleton AudioContext shared across admin session
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Autoplay Unlock Handler:
 * Modern browsers block audio until the user interacts with the page.
 * We register one-time listeners on click/touch/keydown to resume AudioContext.
 */
export function initAudioUnlock(): void {
  if (typeof window === 'undefined') return;

  const unlock = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
    } catch {}
    window.removeEventListener('click', unlock);
    window.removeEventListener('touchstart', unlock);
    window.removeEventListener('keydown', unlock);
  };

  window.addEventListener('click', unlock, { passive: true, once: true });
  window.addEventListener('touchstart', unlock, { passive: true, once: true });
  window.addEventListener('keydown', unlock, { passive: true, once: true });
}

/**
 * Synthesizes a clean bell harmonic tone
 */
function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  maxGain: number = 0.5
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // 'triangle' waveform produces a rich, bright acoustic bell timbre
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(maxGain, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

/**
 * Plays a loud, distinctive 3-tone Kitchen Service Bell Chime ("Ding-Dong-Ding!")
 * Used by commercial restaurant POS systems to cut through kitchen ambient noise.
 */
export function playKitchenChime(): void {
  if (typeof window === 'undefined') return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tone 1: High crisp bell (G5 - 783.99 Hz)
    playTone(ctx, 783.99, now, 0.45, 0.6);

    // Tone 2: Higher bell chime (C6 - 1046.50 Hz) - 150ms delay
    playTone(ctx, 1046.50, now + 0.15, 0.55, 0.7);

    // Tone 3: Bright finale chord (E6 - 1318.51 Hz) - 300ms delay
    playTone(ctx, 1318.51, now + 0.30, 0.7, 0.8);

    // Vibrate device if mobile/tablet supports it
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([200, 100, 200, 100, 300]);
      } catch {}
    }
  } catch (err) {
    console.warn('Kitchen chime playback notice:', err);
  }
}
