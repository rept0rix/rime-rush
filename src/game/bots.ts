import type { Actions } from "./input";
import type { Player } from "./types";
import { floorTop, type World } from "./world";
import { INNER_L, INNER_R } from "./constants";

const BOT_NAMES = ["Ash", "Cinder", "Blaze", "Ember"];

export function botName(i: number, _lang: "he" | "en"): string {
  return BOT_NAMES[i % BOT_NAMES.length]!;
}

export function thinkBot(p: Player, world: World, rivals: Player[]): Actions {
  // 1. Locate next reachable floor above the bot
  const candidates = world
    .nearby(p.y + 70, 200)
    .filter((f) => !f.gone && floorTop(f) > p.y + 4)
    .sort((a, b) => a.y - b.y);

  const next = candidates[0] ?? world.floorByN(p.floor + 1) ?? world.floorByN(p.floor + 2);
  const targetX = next ? next.x + next.w * 0.5 : (INNER_L + INNER_R) / 2;
  const dx = targetX - p.x;

  let moveX = 0;
  if (Math.abs(dx) > 10) {
    moveX = Math.sign(dx);
  }

  // Prevent getting glued to side walls
  if (p.x < INNER_L + 24) moveX = 1;
  if (p.x > INNER_R - 24) moveX = -1;

  // 2. Jumping logic: ground jump & wall kick
  let jumpPressed = false;
  if (p.onWall !== 0) {
    // Wall kick off the wall
    jumpPressed = true;
    moveX = -p.onWall;
  } else if (p.grounded || p.coyote > 0) {
    // Jump whenever grounded to climb upward
    jumpPressed = true;
  }

  // 3. Combat: attack nearby rivals
  const nearRival = rivals.find(
    (r) => r.id !== p.id && r.alive && Math.hypot(r.x - p.x, r.y - p.y) < 70,
  );
  let weaponPressed = false;
  if (nearRival && p.weaponT > 0) {
    weaponPressed = true;
    if (Math.abs(nearRival.x - p.x) > 8) moveX = Math.sign(nearRival.x - p.x);
  } else if (Math.random() < 0.02 && p.weaponT > 3) {
    weaponPressed = true;
  }

  // 4. Power usage
  let powerPressed = false;
  if (p.power) {
    const isBuff =
      p.power === "spring" || p.power === "glide" || p.power === "magnet" || p.power === "shield";
    const hasCombatTarget =
      nearRival || rivals.some((r) => r.id !== p.id && r.alive && Math.hypot(r.x - p.x, r.y - p.y) < 140);
    if ((isBuff && Math.random() < 0.08) || (hasCombatTarget && Math.random() < 0.12)) {
      powerPressed = true;
    }
  }

  return {
    moveX,
    jumpHeld: true,
    jumpPressed,
    powerPressed,
    weaponPressed,
    pausePressed: false,
  };
}
