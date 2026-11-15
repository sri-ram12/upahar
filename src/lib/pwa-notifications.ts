// UPAHAR Multi-Panel PWA Audio Chime & Native Notification Engine

export type NotificationToneType =
  | "new_order"
  | "kitchen_bell"
  | "rider_dispatch"
  | "order_update"
  | "delivered"
  | "urgent_alert";

const SOUND_STORAGE_KEY = "upahar_pwa_sound_enabled_v1";

let globalAudioCtx: AudioContext | null = null;
let audioUnlocked = false;

/**
 * Returns or initializes a shared Web Audio Context.
 * Resumes suspended context on user interaction to comply with browser autoplay policies.
 */
export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  try {
    if (!globalAudioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        globalAudioCtx = new AudioCtxClass();
      }
    }

    if (globalAudioCtx && globalAudioCtx.state === "suspended") {
      globalAudioCtx.resume().catch(() => {});
    }

    return globalAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Automatically unlocks Web Audio API on the first user click/touch anywhere on the window.
 */
if (typeof window !== "undefined") {
  const unlockAudio = () => {
    if (audioUnlocked) return;
    const ctx = getAudioContext();
    if (ctx) {
      ctx.resume().then(() => {
        audioUnlocked = true;
      }).catch(() => {});
    }
    window.removeEventListener("click", unlockAudio);
    window.removeEventListener("touchstart", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
  };

  window.addEventListener("click", unlockAudio, { passive: true });
  window.addEventListener("touchstart", unlockAudio, { passive: true });
  window.addEventListener("keydown", unlockAudio, { passive: true });
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const val = localStorage.getItem(SOUND_STORAGE_KEY);
    return val === null ? true : val === "true";
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
  } catch {}
}

/**
 * Synthesizes harmonious acoustic notification bell tones in real-time.
 * Works completely offline with zero network latency, zero MP3 asset dependencies,
 * and passes strict mobile browser media autoplay policies.
 */
export function playNotificationTone(tone: NotificationToneType = "order_update"): void {
  if (!isSoundEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    switch (tone) {
      case "new_order": {
        // Rich 2-tone melodic doorbell chime (Ding-Dong: D5 587Hz -> A5 880Hz)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        const gain2 = ctx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(587.33, now); // D5
        gain1.gain.setValueAtTime(0.35, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(880.0, now + 0.18); // A5
        gain2.gain.setValueAtTime(0.001, now);
        gain2.gain.setValueAtTime(0.4, now + 0.18);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.5);
        osc2.start(now + 0.18);
        osc2.stop(now + 0.9);
        break;
      }

      case "kitchen_bell": {
        // High-resonance acoustic kitchen order bell with bright harmonics (784Hz G5 & 1568Hz G6)
        const osc = ctx.createOscillator();
        const oscHarmonic = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(783.99, now);
        oscHarmonic.type = "triangle";
        oscHarmonic.frequency.setValueAtTime(1567.98, now);

        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(gain);
        oscHarmonic.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        oscHarmonic.start(now);
        osc.stop(now + 1.2);
        oscHarmonic.stop(now + 1.2);
        break;
      }

      case "rider_dispatch": {
        // Energetic 4-pulse rising attention chime (C5 -> E5 -> G5 -> C6)
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const noteTime = now + idx * 0.12;

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, noteTime);

          gain.gain.setValueAtTime(0.35, noteTime);
          gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(noteTime);
          osc.stop(noteTime + 0.35);
        });
        break;
      }

      case "delivered": {
        // Celebratory melodic 3-chord major arpeggio
        const chords = [523.25, 659.25, 1046.5];
        chords.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const noteTime = now + idx * 0.15;

          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, noteTime);

          gain.gain.setValueAtTime(0.3, noteTime);
          gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.7);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(noteTime);
          osc.stop(noteTime + 0.7);
        });
        break;
      }

      case "urgent_alert": {
        // Rapid double beep for unacknowledged kitchen tickets
        [0, 0.18].forEach((offset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const t = now + offset;

          osc.type = "square";
          osc.frequency.setValueAtTime(987.77, t); // B5

          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(t);
          osc.stop(t + 0.12);
        });
        break;
      }

      case "order_update":
      default: {
        // Smooth 2-tone status update chime (E5 659Hz -> A5 880Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.2);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.6);
        break;
      }
    }
  } catch (err) {
    console.warn("PWA Audio tone prevented:", err);
  }
}

/**
 * Triggers mobile device haptic vibration if supported.
 */
export function vibrateDevice(pattern: number | number[] = [200, 100, 200]): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
}

/**
 * Checks if the browser supports native desktop/mobile Notifications.
 */
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Returns current permission status ('granted' | 'denied' | 'default').
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return "denied";
  return Notification.permission;
}

/**
 * Prompts user for browser notification permission.
 * On first approval, plays a pleasant welcome chime and sends a test confirmation notification.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return "denied";

  try {
    // Resume audio context on user gesture
    getAudioContext();

    const result = await Notification.requestPermission();
    if (result === "granted") {
      playNotificationTone("new_order");
      vibrateDevice([150, 80, 150]);

      await sendPwaNotification({
        title: "🔔 UPAHAR Notifications Enabled!",
        body: "You will receive live real-time sound chimes and order updates on this device.",
        tone: "new_order",
        tag: "upahar-welcome",
        url: "/",
      });
    }
    return result;
  } catch (e) {
    console.warn("Notification permission request failed:", e);
    return "denied";
  }
}

export interface PwaNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tone?: NotificationToneType;
  tag?: string;
  silentAudio?: boolean;
  vibratePattern?: number[];
}

/**
 * Displays a native OS notification through Service Worker (with fallback to window.Notification),
 * plays the acoustic synthesized audio chime, and buzzes the device's vibration motor.
 */
export async function sendPwaNotification(options: PwaNotificationOptions): Promise<void> {
  const {
    title,
    body,
    icon = "/icons/customer-192.png",
    url = "/",
    tone = "order_update",
    tag = `upahar-${Date.now()}`,
    silentAudio = false,
    vibratePattern = [200, 100, 200, 100, 300],
  } = options;

  // 1. Play synthesized tone
  if (!silentAudio) {
    playNotificationTone(tone);
  }

  // 2. Trigger mobile vibration
  vibrateDevice(vibratePattern);

  // 3. Display OS System Notification if permitted
  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return;
  }

  try {
    // Prefer Service Worker registration so it displays even when PWA is minimized or screen locked
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && "showNotification" in registration) {
        await registration.showNotification(title, {
          body,
          icon,
          badge: icon,
          tag,
          vibrate: vibratePattern,
          data: { url },
        } as NotificationOptions);
        return;
      }
    }

    // Fallback to Window Notification
    const notif = new Notification(title, {
      body,
      icon,
      tag,
    });

    notif.onclick = () => {
      window.focus();
      if (url && typeof window !== "undefined") {
        window.location.href = url;
      }
      notif.close();
    };
  } catch (err) {
    console.warn("PWA showNotification error:", err);
  }
}
