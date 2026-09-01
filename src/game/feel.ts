/** CLASSIC preset — matched to the snappier Icy Rush bounce-controller. */

export const F = {
  MAX_SPEED: 280,
  ACCEL: 1180,
  BRAKING: 980,
  REVERSE: 2100,
  AIR_CONTROL: 0.48,
  FRICTION: 0.993,
  AIR_DRAG: 0.9996,

  BASE_JUMP: 740,
  MIN_JUMP: 640,
  MAX_JUMP: 1220,
  SPEED_TO_JUMP: 1.5,
  GRAVITY: 1380,
  TERM_VEL: 920,
  COYOTE: 0.12,
  JUMP_BUF: 0.16,

  WALL_BOUNCE: 0.82,
  WALL_BOOST: 0,
  WALL_LOCK: 0.08,

  LANDING_OVERLAP: 0.18,
  COMBO_TIMEOUT: 3.8,
  MAX_COMBO: 80,

  SCROLL_START_FLOOR: 12,
  SCROLL_SPEED: 20,
  SCROLL_ACCEL: 7,
  SCROLL_INTERVAL: 40,
  DEATH_PAD: 52,
  SPAWN_PROTECT: 2.0,
  CAM_FOLLOW: 8.5,
  CAM_LOOKAHEAD: 0.12,

  /** Visual juice — squash/stretch + brief hitstop (draw-only; not hitbox). */
  LAND_SQUASH: 0.58,
  LAND_SQUASH_SPRING: 0.5,
  LAND_SQUASH_HARD: 0.52,
  JUMP_STRETCH: 1.24,
  HIT_STRETCH: 1.2,
  SQUASH_RECOVER: 11,
  HITSTOP_HIT: 0.05,
} as const;

export type Band = "idle" | "walk" | "run" | "fast" | "max";

export function speedRatio(vx: number): number {
  return Math.min(1, Math.abs(vx) / F.MAX_SPEED);
}

export function jumpImpulse(vx: number): number {
  const v = F.BASE_JUMP + Math.abs(vx) * F.SPEED_TO_JUMP;
  return Math.max(F.MIN_JUMP, Math.min(F.MAX_JUMP, v));
}

export function accelFor(vx: number, input: number, grounded: boolean): number {
  const reverse = Math.sign(vx) !== 0 && Math.sign(vx) !== input;
  const a = reverse ? F.REVERSE : F.ACCEL;
  return a * (grounded ? 1 : F.AIR_CONTROL);
}

export function bandOf(vx: number): Band {
  const r = speedRatio(vx);
  if (r < 0.2) return "idle";
  if (r < 0.45) return "walk";
  if (r < 0.7) return "run";
  if (r < 0.9) return "fast";
  return "max";
}
