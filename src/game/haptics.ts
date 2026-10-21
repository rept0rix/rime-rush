import { audioBus } from "./audio";

let lastRumbleTime = 0;

export function rumble(pat: number | number[] = 24): void {
  try {
    if (typeof window === "undefined") return;

    // pat 0 means cancel all ongoing vibrations immediately
    if (pat === 0) {
      try {
        navigator.vibrate?.(0);
      } catch {
        /* ignore */
      }
      return;
    }

    // Native iOS bridge if running inside iOS app wrapper
    const webkit = (window as unknown as { webkit?: { messageHandlers?: { haptics?: { postMessage: (msg: string) => void } } } }).webkit;
    if (webkit?.messageHandlers?.haptics) {
      const isHeavy = Array.isArray(pat) ? pat.length > 2 || (pat[0] ?? 0) > 50 : pat > 40;
      webkit.messageHandlers.haptics.postMessage(isHeavy ? "heavy" : "light");
      return;
    }

    // Minimum cooldown between vibration triggers (120ms) to protect Android motors & battery
    const now = performance.now();
    if (now - lastRumbleTime < 120) return;
    lastRumbleTime = now;

    // Chrome logs a blocked-call warning before the first user gesture; skip until then.
    if ((navigator as { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive === false) return;

    // Clamp vibration durations to prevent phone motor overheating on Android
    let safePat: number | number[];
    if (Array.isArray(pat)) {
      safePat = pat.slice(0, 5).map((p) => Math.min(60, Math.max(0, p)));
    } else {
      safePat = Math.min(40, Math.max(0, pat));
    }

    navigator.vibrate?.(safePat);
  } catch {
    /* fallback */
  }
}

export type HapticType = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection";

export function hapticFeedback(type: HapticType = "light"): void {
  try {
    if (typeof window === "undefined") return;
    const webkit = (window as unknown as { webkit?: { messageHandlers?: { haptics?: { postMessage: (msg: string) => void } } } }).webkit;
    if (webkit?.messageHandlers?.haptics) {
      webkit.messageHandlers.haptics.postMessage(type);
      return;
    }
    if (type === "heavy" || type === "error") rumble(45);
    else if (type === "medium" || type === "warning") rumble(28);
    else if (type === "success") rumble([20, 30, 40]);
    else rumble(16);
  } catch {
    /* ignore */
  }
}

export function uiClick(): void {
  audioBus.uiTap();
  hapticFeedback("selection");
}

const SHAKE_MS = 720;

export function bumpShake(root?: Element | null): void {
  rumble([40, 30, 80, 30, 110, 40, 140]);
  const nodes = new Set<HTMLElement>();
  const add = (el: Element | null | undefined) => {
    if (el instanceof HTMLElement) nodes.add(el);
  };
  add(document.documentElement);
  add(document.body);
  add(document.querySelector("[data-arcade-root]"));
  add(document.getElementById("root"));
  add(root);
  for (const el of nodes) {
    el.classList.remove("feel-shake");
    void el.offsetWidth;
    el.classList.add("feel-shake");
  }
  window.setTimeout(() => {
    for (const el of nodes) el.classList.remove("feel-shake");
  }, SHAKE_MS);
}

export function applySound(muted: boolean): void {
  audioBus.setMute(muted);
  if (!muted) {
    audioBus.unlock();
    audioBus.ping();
  }
}

export function applyShake(on: boolean, engine?: { setShake(v: boolean): void } | null): void {
  engine?.setShake(on);
  bumpShake();
  if (!on) {
    window.setTimeout(() => {
      try {
        navigator.vibrate?.(0);
      } catch {
        /* ignore */
      }
    }, SHAKE_MS);
  }
}
