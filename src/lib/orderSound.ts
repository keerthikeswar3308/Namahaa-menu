'use client';

// Singleton AudioContext and HTMLAudioElement for reliable playback across browsers
let sharedAudioCtx: AudioContext | null = null;
let sharedAudioElement: HTMLAudioElement | null = null;
let isUnlocked = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx();
  }
  return sharedAudioCtx;
}

export function getAudioElement(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioElement) {
    try {
      sharedAudioElement = new Audio('/sounds/order-chime.wav');
      sharedAudioElement.preload = 'auto';
      sharedAudioElement.volume = 1.0;
    } catch (e) {
      console.warn('Could not initialize HTMLAudioElement:', e);
    }
  }
  return sharedAudioElement;
}

/**
 * Checks if audio has already been unlocked by user gesture in this session
 */
export function isAudioReady(): boolean {
  if (typeof window === 'undefined') return false;
  if (isUnlocked) return true;
  try {
    if (window.sessionStorage && window.sessionStorage.getItem('namaha_sound_activated') === 'true') {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'running') {
        isUnlocked = true;
        return true;
      }
    }
  } catch {}
  return false;
}

/**
 * Synthesizes a bright, acoustic restaurant service bell tone
 * with fundamental sine body and harmonic overtone shimmer.
 */
function playBellTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  gainLevel: number = 0.75
) {
  try {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Fundamental tone (pure bell body)
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, startTime);

    // Upper harmonic (crisp acoustic ping overtone)
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, startTime);

    // Initial silent point
    gainNode.gain.setValueAtTime(0.0001, startTime);
    // Instant attack (6ms)
    gainNode.gain.exponentialRampToValueAtTime(gainLevel, startTime + 0.006);
    // Acoustic exponential decay
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
  } catch (err) {
    console.warn('Bell tone synthesis notice:', err);
  }
}

/**
 * Synthesizes a loud, piercing, commercial-grade 2-burst Kitchen Service Bell Chime:
 * Burst 1: Ding-Dong-Ding! (G5 -> C6 -> E6)
 * Burst 2: Ding-Dong-Ding! (C6 -> E6 -> G6)
 * Engineered to cut through ambient kitchen & dining noise.
 */
export function synthesizeBellChime(ctx?: AudioContext | null): void {
  const activeCtx = ctx || getAudioContext();
  if (!activeCtx) return;

  const playSequence = () => {
    try {
      const now = activeCtx.currentTime;

      // Burst 1: Ascending crisp service chime
      playBellTone(activeCtx, 783.99, now, 0.35, 0.75);         // G5
      playBellTone(activeCtx, 1046.50, now + 0.12, 0.40, 0.85);  // C6
      playBellTone(activeCtx, 1318.51, now + 0.24, 0.55, 0.95);  // E6

      // Burst 2: High confirmation chime (300ms after burst 1)
      playBellTone(activeCtx, 1046.50, now + 0.55, 0.35, 0.85);  // C6
      playBellTone(activeCtx, 1318.51, now + 0.67, 0.40, 0.95);  // E6
      playBellTone(activeCtx, 1567.98, now + 0.79, 0.70, 1.00);  // G6
    } catch (err) {
      console.warn('Bell chime synthesis error:', err);
    }
  };

  if (activeCtx.state === 'suspended') {
    activeCtx.resume().then(playSequence).catch(() => {});
  } else {
    playSequence();
  }
}

/**
 * Explicit User-Gesture Audio Unlock:
 * Triggered by tapping "Test & Activate Sound".
 * Resumes AudioContext, plays silent buffer for iOS Safari,
 * plays the loud chime immediately so the user hears it,
 * and permanently authorizes the tab for background sound playback.
 */
export async function unlockAudioAndPlay(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  isUnlocked = true;
  try {
    if (window.sessionStorage) {
      window.sessionStorage.setItem('namaha_sound_activated', 'true');
    }
  } catch {}

  let played = false;

  // 1. Resume and unlock Web Audio Context
  try {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      // Play 1-sample silent buffer to force-wake iOS Safari / Android hardware
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);

      synthesizeBellChime(ctx);
      played = true;
    }
  } catch (ctxErr) {
    console.warn('Web Audio unlock notice:', ctxErr);
  }

  // 2. Pre-warm HTML5 Audio element
  try {
    const audio = getAudioElement();
    if (audio) {
      audio.currentTime = 0;
      audio.volume = 1.0;
      const promise = audio.play();
      if (promise !== undefined) {
        await promise;
        played = true;
      }
    }
  } catch (htmlErr) {
    console.warn('HTML5 Audio unlock notice:', htmlErr);
  }

  // 3. Vibrate device (vibration pattern: buzz-pause-buzz)
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([250, 100, 250, 100, 400]);
    } catch {}
  }

  return played;
}

/**
 * Autoplay Unlock Listener:
 * Unlocks audio context on the first user interaction anywhere on the document.
 */
export function initAudioUnlock(): void {
  if (typeof window === 'undefined') return;

  const unlock = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const audio = getAudioElement();
      if (audio) {
        audio.load();
      }
      isUnlocked = true;
      try {
        if (window.sessionStorage) {
          window.sessionStorage.setItem('namaha_sound_activated', 'true');
        }
      } catch {}
    } catch {}
  };

  window.addEventListener('click', unlock, { passive: true, once: true });
  window.addEventListener('touchstart', unlock, { passive: true, once: true });
  window.addEventListener('pointerup', unlock, { passive: true, once: true });
}

/**
 * Plays the kitchen order arrival alert sound:
 * Synthesizes the dual-burst bell chime + plays WAV audio + vibrates device.
 */
export function playKitchenChime(): void {
  if (typeof window === 'undefined') return;

  // 1. Synthesize Web Audio bell chime (zero network latency, never fails)
  try {
    synthesizeBellChime();
  } catch (e) {
    console.warn('Web Audio chime error:', e);
  }

  // 2. Also trigger HTML5 Audio element
  try {
    const audio = getAudioElement();
    if (audio) {
      audio.currentTime = 0;
      audio.volume = 1.0;
      audio.play().catch(() => {});
    }
  } catch {}

  // 3. Vibrate device
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([250, 100, 250, 100, 400]);
    } catch {}
  }
}
