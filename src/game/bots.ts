import type { Actions } from "./input";
import type { Player } from "./types";
import type { World } from "./world";
import { INNER_L, INNER_R } from "./constants";

const BOT_NAMES = ["Ash", "Cinder", "Blaze", "Ember", "אפר", "גחל", "להבה", "אמבר"];

export function botName(i: number, lang: "he" | "en"): string {
  return lang === "he" ? BOT_NAMES[4 + (i % 4)]! : BOT_NAMES[i % 4]!;
}

export function thinkBot(p: Player, world: World, rivals: Player[]): Actions {
  const next = world.floorByN(p.floor + 1) ?? world.floorByN(p.floor + 2);
  const targetX = next ? next.x + next.w * 0.5 : (INNER_L + INNER_R) / 2;
  const dx = targetX - p.x;
  let moveX = 0;
  if (Math.abs(dx) > 8) moveX = Math.sign(dx);

  if (p.grounded && Math.abs(p.vx) > 30) {
    const toward = Math.sign(dx) || Math.sign(p.vx);
    if (toward === Math.sign(p.vx) || Math.abs(dx) < 50) moveX = Math.sign(p.vx) || moveX;
  }

  if (p.x < INNER_L + 30) moveX = 1;
  if (p.x > INNER_R - 30) moveX = -1;

  const overNext = !!next && p.x > next.x - 4 && p.x < next.x + next.w + 4;
  const approaching = !!next && Math.abs(p.x - targetX) < Math.max(64, (next.w ?? 80) * 0.7);
  const fast = Math.abs(p.vx) > 70;
  let jumpPressed = p.grounded && fast && (approaching || overNext || p.floor === 0);

  if (p.grounded && p.floor === 0 && Math.abs(p.vx) < 80) {
    moveX = p.x < (INNER_L + INNER_R) / 2 ? 1 : -1;
  }

  const local = rivals.find((r) => !r.bot && r.alive);
  let weaponPressed = Math.random() < 0.02;
  if (local && local.alive) {
    const dy = local.y - p.y;
    const ddx = local.x - p.x;
    if (Math.abs(dy) < 70) {
      if (Math.abs(ddx) > 16) moveX = Math.sign(ddx);
      if (Math.abs(ddx) < 52) weaponPressed = true;
    }
    if (dy > 36 && p.grounded) jumpPressed = true;
  }

  let powerPressed = false;
  if (p.power && Math.random() < 0.04) {
    const near = rivals.some((r) => r.alive && r.id !== p.id && Math.hypot(r.x - p.x, r.y - p.y) < 140);
    if (near || p.power === "spring" || p.power === "glide" || p.power === "magnet" || p.power === "shield") {
      powerPressed = true;
    }
  }

  return {
    moveX,
    jumpHeld: !p.grounded || jumpPressed,
    jumpPressed,
    powerPressed,
    weaponPressed,
    pausePressed: false,
  };
}
