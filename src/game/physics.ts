import {
  FLOOR_H,
  INNER_L,
  INNER_R,
  PLAYER_H,
  PLAYER_W,
} from "./constants";
import { bandOf, F, jumpImpulse } from "./feel";
import type { Actions } from "./input";
import type { Floor, Player } from "./types";
import { floorTop, type World } from "./world";

export function makePlayer(
  id: string,
  name: string,
  color: number,
  spawnX: number,
  bot = false,
): Player {
  return {
    id,
    name,
    color,
    bot,
    faction: bot ? "ember" : "rime",
    x: spawnX,
    y: FLOOR_H,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: true,
    onWall: 0,
    coyote: 0,
    jumpBuf: 0,
    jumpCut: false,
    combo: 0,
    bestCombo: 0,
    floor: 0,
    score: 0,
    alive: true,
    spin: 0,
    spinV: 0,
    squash: 1,
    anim: "idle",
    animT: 0,
    power: null,
    blade: 0,
    slashT: 0,
    weapon: "blade",
    ammo: 0,
    weaponT: 8,
    hp: 100,
    maxHp: 100,
    hurtT: 0,
    trickT: 0,
    effects: {
      frozenT: 0,
      shrinkT: 0,
      springT: 0,
      glideT: 0,
      magnetT: 0,
      shield: false,
      invulnT: 0,
    },
    heldMove: 0,
    jumpHeld: false,
    wantJump: false,
    wantPower: false,
    deadAt: 0,
    comboGrace: 0.16,
    airT: 0,
    skipped: 0,
    takeoffFloor: 0,
    comboT: F.COMBO_TIMEOUT,
    wallLock: 0,
    wallDir: 0,
    trail: [],
    comboJumps: 0,
    comboStartFloor: 0,
  };
}

export function scaleOf(p: Player): number {
  return p.effects.shrinkT > 0 ? 0.85 : 1;
}

export function hitbox(p: Player): { x: number; y: number; w: number; h: number } {
  const s = scaleOf(p);
  const w = PLAYER_W * s;
  const h = PLAYER_H * s;
  return { x: p.x - w / 2, y: p.y, w, h };
}

export function stepPlayer(
  p: Player,
  input: Actions,
  world: World,
  dt: number,
  juice: JuiceSink,
): void {
  if (!p.alive) return;
  const e = p.effects;
  e.frozenT = Math.max(0, e.frozenT - dt);
  e.shrinkT = Math.max(0, e.shrinkT - dt);
  e.springT = Math.max(0, e.springT - dt);
  e.glideT = Math.max(0, e.glideT - dt);
  e.magnetT = Math.max(0, e.magnetT - dt);
  e.invulnT = Math.max(0, e.invulnT - dt);
  if (e.invulnT <= 0) e.shield = false;
  p.slashT = Math.max(0, p.slashT - dt);
  p.hurtT = Math.max(0, p.hurtT - dt);
  p.weaponT = Math.max(0, p.weaponT - (p.slashT > 0 ? dt * 0.55 : 0));
  if (p.hurtT <= 0 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + 16 * dt);

  p.heldMove = input.moveX;
  p.jumpHeld = input.jumpHeld;
  if (input.jumpPressed) p.jumpBuf = F.JUMP_BUF;
  else p.jumpBuf = Math.max(0, p.jumpBuf - dt);
  if (input.powerPressed) p.wantPower = true;

  const frozen = e.frozenT > 0;
  const maxSpd = F.MAX_SPEED * (e.shrinkT > 0 ? 0.78 : 1);
  p.wallLock = Math.max(0, p.wallLock - dt);

  if (!frozen) {
    const intoWall =
      p.wallLock > 0 && input.moveX !== 0 && Math.sign(input.moveX) === p.wallDir;
    const inAir = !p.grounded;
    const air = inAir ? F.AIR_CONTROL : 1;
    if (input.moveX !== 0 && !intoWall) {
      const reverse = p.vx !== 0 && Math.sign(p.vx) !== input.moveX;
      const a = (reverse ? F.REVERSE : F.ACCEL) * air;
      p.vx += input.moveX * a * dt;
      p.facing = input.moveX > 0 ? 1 : -1;
    } else {
      const brake = F.BRAKING * air * dt;
      if (Math.abs(p.vx) <= brake) p.vx = 0;
      else p.vx -= Math.sign(p.vx) * brake;
    }
    if (p.grounded) {
      const floor = currentFloor(p, world);
      if (floor?.kind === "conveyor") p.vx += floor.dir * 110 * dt;
    }
    p.vx = clamp(p.vx, -maxSpd, maxSpd);
  } else {
    p.vx *= Math.pow(0.92, dt * 60);
  }

  if (p.grounded) p.coyote = F.COYOTE;
  else p.coyote = Math.max(0, p.coyote - dt);

  if (p.grounded) p.airT = 0;
  else p.airT += dt;

  const magnetWall = e.magnetT > 0 && p.onWall !== 0;
  const wallKick = p.onWall !== 0 && p.airT > 0.08 && !p.grounded;
  const canJump = !frozen && (p.coyote > 0 || magnetWall || wallKick);
  if (p.jumpBuf > 0 && canJump) {
    bounceUp(p, juice);
    p.jumpBuf = 0;
    p.coyote = 0;
    p.onWall = 0;
    p.wallLock = 0.12;
  }

  if (e.glideT > 0 && p.vy < 0) p.vy -= F.GRAVITY * 0.38 * dt;
  else p.vy -= F.GRAVITY * dt;
  if (p.vy < -F.TERM_VEL) p.vy = -F.TERM_VEL;

  const wasGround = p.grounded;
  const steps = Math.max(1, Math.ceil((Math.abs(p.vx) + Math.abs(p.vy)) * dt / 10));
  const sdt = dt / steps;
  p.onWall = 0;
  for (let i = 0; i < steps; i++) integrate(p, world, sdt, juice);

  if (p.grounded && input.jumpHeld && !wasGround) p.jumpBuf = Math.max(p.jumpBuf, 0.1);

  if (p.combo > 0) {
    p.comboT -= dt;
    if (p.comboT <= 0) {
      settleCombo(p);
      juice.comboBreak(p);
      p.combo = 0;
      p.spinV = 0;
    }
  }

  if (p.combo >= 1 || bandOf(p.vx) === "fast" || bandOf(p.vx) === "max") {
    p.trail.push({ x: p.x, y: p.y, spin: p.spin, facing: p.facing });
    if (p.trail.length > 5) p.trail.shift();
  } else if (p.trail.length) {
    p.trail.shift();
  }

  p.spin = 0;
  p.spinV = 0;
  p.squash += (1 - p.squash) * Math.min(1, 14 * dt);

  const hb = hitbox(p);
  if (p.y > 8) {
    const approx = Math.max(0, Math.floor(p.y / 54) - 1);
    for (let n = approx; n < approx + 12; n++) {
      const f = world.floorByN(n);
      if (!f || f.gone) continue;
      if (hb.x + hb.w > f.x && hb.x < f.x + f.w && p.y >= floorTop(f) - 8) {
        noteFloor(p, f.n, juice);
      }
    }
  }

  const moving = Math.abs(p.vx) > 28;
  p.trickT = Math.max(0, (p.trickT ?? 0) - dt);
  if (p.onWall) {
    p.anim = "wall";
    p.animT += dt * 8;
  } else if (p.squash < 0.86) {
    p.anim = "land";
  } else if (!p.grounded) {
    if (p.trickT > 0) {
      p.anim = "spin";
      p.animT += dt * 10;
    } else {
      p.anim = "jump";
      p.animT = p.vy > 120 ? 0 : p.vy > 20 ? 1 : p.vy > -90 ? 2 : 3;
    }
  } else if (moving) {
    p.anim = "run";
    p.animT += dt * (6 + Math.abs(p.vx) / 70);
  } else {
    p.anim = "idle";
    p.animT += dt * 4;
  }
}

function integrate(p: Player, world: World, dt: number, juice: JuiceSink): void {
  const s = scaleOf(p);
  const w = PLAYER_W * s;
  p.x += p.vx * dt;

  const left = INNER_L + w / 2;
  const right = INNER_R - w / 2;
  if (p.x < left) {
    p.x = left;
    if (p.vx < 0) {
      bounceWall(p, 1, juice);
      p.trickT = 0.45;
    }
    else p.vx = Math.max(0, p.vx);
  } else if (p.x > right) {
    p.x = right;
    if (p.vx > 0) {
      bounceWall(p, -1, juice);
      p.trickT = 0.45;
    }
    else p.vx = Math.min(0, p.vx);
  }

  const prevY = p.y;
  p.y += p.vy * dt;
  const wasGround = p.grounded;
  p.grounded = false;

  if (p.vy <= 0) {
    const feet = p.y;
    for (const f of world.nearby(p.y, 90)) {
      if (f.gone) continue;
      const top = floorTop(f);
      const overlapNeed = PLAYER_W * scaleOf(p) * F.LANDING_OVERLAP;
      const overlap =
        Math.min(p.x + w / 2, f.x + f.w) - Math.max(p.x - w / 2, f.x);
      const overlapX = overlap >= overlapNeed;
      if (overlapX && prevY >= top - 1 && feet <= top + Math.max(6, -p.vy * dt + 4)) {
        p.y = top;
        if (f.kind === "crumble" && f.crumbleT === 0) f.crumbleT = 0.7;
        if (f.kind === "spring") f.pulseT = 0.42;
        else if (f.kind === "check") f.pulseT = 0.28;
        if (!wasGround) {
          p.squash = f.kind === "spring" ? 0.55 : 0.7;
          juice.land(p, f);
          const edge = Math.min(p.x - f.x, f.x + f.w - p.x);
          if (edge < 12 && Math.abs(p.vx) > 40) juice.close(p);
          if (f.n < p.takeoffFloor) {
            if (p.combo > 0) {
              settleCombo(p);
              juice.comboBreak(p);
              p.combo = 0;
            }
          }
          noteFloor(p, f.n, juice);
        }
        const frozen = p.effects.frozenT > 0;
        if (!frozen) {
          let boost = p.effects.springT > 0 ? 1.35 : 1;
          if (f.kind === "spring") boost *= 1.15;
          if (p.effects.shrinkT > 0) boost *= 0.72;
          p.vy = jumpImpulse(p.vx) * boost;
          p.grounded = false;
          p.takeoffFloor = f.n;
        } else {
          p.vy = 0;
          p.grounded = true;
        }
        break;
      }
    }
  }
}

function bounceUp(p: Player, juice: JuiceSink): void {
  const boost = (p.effects.springT > 0 ? 1.35 : 1) * (p.effects.shrinkT > 0 ? 0.72 : 1);
  p.vy = jumpImpulse(p.vx) * boost;
  p.takeoffFloor = p.floor;
  p.grounded = false;
  p.airT = 0;
  p.spin = 0;
  p.spinV = 0;
  p.squash = 1.22;
  juice.jump(p);
}

function bounceWall(p: Player, dir: number, juice: JuiceSink): void {
  const speed = Math.max(90, Math.abs(p.vx) * F.WALL_BOUNCE);
  p.vx = dir * speed;
  p.onWall = dir < 0 ? 1 : -1;
  p.wallDir = p.onWall;
  p.wallLock = F.WALL_LOCK;
  p.facing = dir > 0 ? 1 : -1;
  p.squash = 0.86;
  if (p.vy < -40) p.vy *= 0.88;
  juice.wall(p);
}

function settleCombo(p: Player): void {
  if (p.comboJumps >= 2) {
    const s = Math.max(0, p.floor - p.comboStartFloor);
    p.score += s * s * Math.max(1, p.combo);
  }
  p.comboJumps = 0;
}

function noteFloor(p: Player, n: number, juice: JuiceSink): void {
  if (n <= p.floor) return;
  const d = n - p.floor;
  const jumpGain = n - p.takeoffFloor;
  p.floor = n;
  p.comboT = F.COMBO_TIMEOUT;
  if (p.combo === 0) p.comboStartFloor = p.takeoffFloor;
  const prev = p.combo;
  p.combo = Math.min(F.MAX_COMBO, p.combo + d);
  p.comboJumps += 1;
  p.bestCombo = Math.max(p.bestCombo, p.combo);
  p.skipped += Math.max(0, jumpGain - 1);
  const skipBonus = jumpGain >= 2 ? 1.6 : 1;
  const gain = Math.round(d * 12 * Math.max(1, p.combo) * skipBonus);
  p.score += gain;
  juice.combo(p, prev, gain);
  if (jumpGain >= 2) {
    juice.skip(p, jumpGain);
    p.trickT = 0.5;
  }
}

function currentFloor(p: Player, world: World): Floor | null {
  if (!p.grounded) return null;
  for (const f of world.nearby(p.y, 40)) {
    if (f.gone) continue;
    const top = floorTop(f);
    if (Math.abs(p.y - top) < 4 && p.x > f.x && p.x < f.x + f.w) return f;
  }
  return null;
}

export function collidePlayers(a: Player, b: Player, juice: JuiceSink): void {
  if (!a.alive || !b.alive) return;
  if (a.effects.invulnT > 0 || b.effects.invulnT > 0) return;
  const ha = hitbox(a);
  const hb = hitbox(b);
  if (ha.x + ha.w < hb.x || hb.x + hb.w < ha.x) return;
  if (ha.y + ha.h < hb.y || hb.y + hb.h < ha.y) return;
  const dx = b.x - a.x || 0.1;
  const power = 1 + Math.min(a.combo, b.combo) * 0.04;
  const push = 130 * Math.sign(dx) * power;
  const rel = a.vx - b.vx;
  a.vx -= push * 0.38 + rel * 0.18;
  b.vx += push * 0.38 + rel * 0.18;
  if (Math.abs(rel) > 110) {
    juice.bump(a, b);
    const dmg = 8 + Math.min(18, Math.abs(rel) * 0.04);
    if (a.hurtT <= 0) {
      a.hp -= dmg;
      a.hurtT = 0.35;
    }
    if (b.hurtT <= 0) {
      b.hp -= dmg;
      b.hurtT = 0.35;
    }
  }
}

export interface JuiceSink {
  jump(p: Player): void;
  land(p: Player, floor?: Floor): void;
  wall(p: Player): void;
  combo(p: Player, prev: number, gain: number): void;
  comboBreak(p: Player): void;
  bump(a: Player, b: Player): void;
  close(p: Player): void;
  skip(p: Player, floors: number): void;
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}
