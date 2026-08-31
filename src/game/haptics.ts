import { audioBus } from "./audio";

export function rumble(pat: number | number[] = 24): void {
  try {
    navigator.vibrate?.(pat);
  } catch {
    /* iOS has no vibrate API */
  }
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
  audioBus.unlock();
  if (muted) {
    audioBus.clickOff();
    window.setTimeout(() => audioBus.setMute(true), 120);
  } else {
    audioBus.setMute(false);
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
