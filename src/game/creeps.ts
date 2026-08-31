import { INNER_L, INNER_R } from "./constants";
import { F } from "./feel";
import type { Creep, Player } from "./types";
import { floorTop, type World } from "./world";

let nextId = 1;

export function spawnCreep(world: World, floor: number): Creep | null {
  const f = world.floorByN(Math.max(1, floor));
  if (!f) return null;
  const roll = Math.random();
  const ember = floor > 10 && roll < 0.28;
  const bat = !ember && floor > 14 && roll < 0.62;
  const kind = ember ? "ember" : bat ? "bat" : "rat";
  const hp = kind === "ember" ? 56 : kind === "bat" ? 28 : 40;
  return {
    id: nextId++,
    x: f.x + f.w * (0.2 + Math.random() * 0.6),
    y: floorTop(f) + (kind === "bat" ? 40 : 8),
    vx: (Math.random() < 0.5 ? -1 : 1) * (70 + Math.random() * 50 + (kind === "ember" ? 30 : 0)),
    vy: 0,
    hp,
    maxHp: hp,
    kind,
    facing: 1,
    alive: true,
    hurtT: 0,
    animT: Math.random() * 4,
    windup: 0,
  };
}

export function stepCreep(c: Creep, world: World, dt: number, prey: Player | undefined): void {
  c.hurtT = Math.max(0, c.hurtT - dt);
  c.animT += dt * (c.kind === "bat" ? 12 : 8);
  const near = prey && prey.alive && Math.hypot(prey.x - c.x, prey.y - c.y) < (c.kind === "ember" ? 130 : 88);
  if (near && prey) {
    c.windup += dt;
    if (c.windup > 0.45) {
      const dir = Math.sign(prey.x - c.x) || c.facing;
      c.vx = dir * (c.kind === "ember" ? 260 : c.kind === "bat" ? 210 : 180);
      if (c.kind !== "rat") c.vy = Math.sign(prey.y + 10 - c.y) * 140;
      else c.vy = 220;
      c.windup = -0.35;
    }
  } else {
    c.windup = Math.max(0, c.windup - dt);
  }
  if (c.kind === "bat" || c.kind === "ember") {
    const chase = c.kind === "ember" ? 180 : 110;
    const lift = c.kind === "ember" ? 110 : 80;
    if (prey?.alive) {
      c.vx += Math.sign(prey.x - c.x) * chase * dt;
      c.vy += Math.sign(prey.y + 28 - c.y) * lift * dt;
    }
    c.vx *= Math.pow(0.9, dt * 60);
    c.vy *= Math.pow(0.9, dt * 60);
    c.x += c.vx * dt;
    c.y += c.vy * dt;
  } else {
    c.vy -= F.GRAVITY * dt;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    const nearby = world.nearby(c.y, 80);
    for (const f of nearby) {
      const top = floorTop(f);
      if (c.vy <= 0 && c.y >= top - 8 && c.y <= top + 16 && c.x > f.x - 6 && c.x < f.x + f.w + 6) {
        c.y = top;
        c.vy = 0;
        if (Math.random() < 0.012) c.vy = 300;
      }
    }
  }
  if (c.x < INNER_L + 16) {
    c.x = INNER_L + 16;
    c.vx = Math.abs(c.vx);
  }
  if (c.x > INNER_R - 16) {
    c.x = INNER_R - 16;
    c.vx = -Math.abs(c.vx);
  }
  c.facing = c.vx >= 0 ? 1 : -1;
}
