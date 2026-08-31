import {
  BASE_GAP,
  FLOOR_H,
  GAP_GROW,
  GAP_MAX,
  INNER_L,
  INNER_R,
  INNER_W,
} from "./constants";
import { randomPower } from "./powers";
import type { Floor, FloorKind, Pickup } from "./types";

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dailySeed(): number {
  return Math.floor(Date.now() / 86_400_000);
}

export class World {
  seed: number;
  rng: () => number;
  floors: Floor[] = [];
  pickups: Pickup[] = [];
  nextPickupId = 1;
  generated = -1;
  lastY = 0;
  killY = -40;
  lane = 0;
  laneHold = 0;
  scrollSpeed = 0;

  constructor(seed: number) {
    this.seed = seed;
    this.rng = mulberry32(seed);
    this.ensure(24);
  }

  gap(n: number): number {
    return Math.min(GAP_MAX, BASE_GAP + n * GAP_GROW);
  }

  floorY(n: number): number {
    if (n <= 0) return 0;
    let y = 0;
    for (let i = 1; i <= n; i++) y += this.gap(i);
    return y;
  }

  ensure(upTo: number): void {
    while (this.generated < upTo) {
      this.generated += 1;
      this.floors.push(this.makeFloor(this.generated));
    }
  }

  floorByN(n: number): Floor | undefined {
    this.ensure(n + 4);
    return this.floors[n];
  }

  nearby(y: number, range = 220): Floor[] {
    const loY = y - range;
    const hiY = y + range;
    const arr = this.floors;
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((arr[mid]?.y ?? 0) < loY) lo = mid + 1;
      else hi = mid;
    }
    const out: Floor[] = [];
    for (let i = lo; i < arr.length; i++) {
      const f = arr[i]!;
      if (f.y > hiY) break;
      if (!f.gone) out.push(f);
    }
    return out;
  }

  private makeFloor(n: number): Floor {
    if (n === 0) {
      this.lastY = 0;
      this.lane = 0;
      this.laneHold = 2;
      return {
        n,
        y: 0,
        x: INNER_L + 6,
        w: INNER_W - 12,
        kind: "ice",
        dir: 0,
        crumbleT: 0,
        gone: false,
        slickT: 0,
      };
    }
    this.lastY += this.gap(n);
    const y = this.lastY;
    const r = this.rng();
    const t = difficulty(n);

    let kind: FloorKind = "ice";
    if (n % 10 === 0) kind = "check";
    else if (n > 48 && r < 0.07 + t * 0.05) kind = "conveyor";
    else if (n > 55 && r < 0.1 + t * 0.06) kind = "crumble";
    else if (n > 10 && r > 0.88 - t * 0.03) kind = "spring";

    const { x, w } = this.place(n, kind, t);

    if (n >= 3 && (n % 3 === 0 || this.rng() < 0.28)) {
      this.pickups.push({
        id: this.nextPickupId++,
        x: x + w * (0.2 + this.rng() * 0.6),
        y: y + FLOOR_H + 22,
        power: null,
        kind: this.rng() > 0.82 ? "elixir" : "pill",
        taken: false,
      });
    }
    if (n >= 4 && (n % 5 === 0 || this.rng() < 0.18)) {
      this.pickups.push({
        id: this.nextPickupId++,
        x: x + w * (0.35 + this.rng() * 0.3),
        y: y + FLOOR_H + 24,
        power: randomPower(this.rng),
        kind: "power",
        taken: false,
      });
    }
    if (n >= 4 && (n % 4 === 0 || this.rng() < 0.2)) {
      this.pickups.push({
        id: this.nextPickupId++,
        x: x + w * 0.5,
        y: y + FLOOR_H + 22,
        power: null,
        kind: "ammo",
        taken: false,
      });
    }

    const dir = kind === "conveyor" ? (this.rng() < 0.5 ? -1 : 1) : 0;
    return { n, y, x, w, kind, dir, crumbleT: 0, gone: false, slickT: 0 };
  }

  private place(n: number, kind: FloorKind, t: number): { x: number; w: number } {
    const pad = 8;
    const inner = INNER_W - pad * 2;

    if (kind === "check" || n === 0) {
      const w = n === 0 ? inner : Math.max(140, 200 - t * 40);
      const x = INNER_L + pad + (inner - w) / 2;
      this.lane = 0;
      this.laneHold = 1;
      return { x, w };
    }

    if (n === 1) {
      this.lane = -1;
      this.laneHold = 0;
    } else if (n === 2) {
      this.lane = 1;
      this.laneHold = 0;
    } else if (n >= 20 && n < 28) {
      this.lane = n % 2 === 0 ? -1 : 1;
      this.laneHold = 1;
    } else if (this.laneHold <= 0) {
      const roll = this.rng();
      if (roll < 0.4) this.lane = -1;
      else if (roll < 0.8) this.lane = 1;
      else this.lane = 0;
      this.laneHold = n < 16 ? 1 : 1 + ((this.rng() * 3) | 0);
    } else {
      this.laneHold -= 1;
    }

    let minW: number;
    let maxW: number;
    if (n < 12) {
      minW = 168;
      maxW = 220;
    } else if (n < 24) {
      minW = 140;
      maxW = 190;
    } else if (n < 40) {
      minW = 118;
      maxW = 168;
    } else if (n < 70) {
      minW = 96;
      maxW = 142;
    } else {
      minW = 80;
      maxW = 118;
    }

    if (kind === "crumble") {
      minW *= 0.85;
      maxW *= 0.9;
    }
    if (kind === "spring") {
      minW = Math.max(64, minW * 0.75);
      maxW = Math.max(minW + 8, maxW * 0.8);
    }

    // Bounce chambers: hug a wall, force a cross-jump next.
    const bounce = n > 40 && this.rng() < 0.08 + t * 0.06;
    if (bounce) {
      const w = Math.max(64, minW * 0.72);
      const x = this.rng() < 0.5 ? INNER_L + pad : INNER_R - pad - w;
      this.lane = x < INNER_L + INNER_W / 2 ? -1 : 1;
      this.laneHold = 0;
      return { x, w };
    }

    const w = minW + this.rng() * (maxW - minW);
    let x: number;
    if (this.lane < 0) {
      x = INNER_L + pad + this.rng() * 18;
    } else if (this.lane > 0) {
      x = INNER_R - pad - w - this.rng() * 18;
    } else {
      const slack = Math.max(12, inner - w);
      x = INNER_L + pad + slack * 0.25 + this.rng() * slack * 0.5;
    }
    x = Math.max(INNER_L + pad, Math.min(x, INNER_R - pad - w));
    return { x, w };
  }

  tick(dt: number): number {
    const dy = this.scrollSpeed * dt;
    if (dy !== 0) {
      for (const f of this.floors) f.y -= dy;
      for (const pk of this.pickups) pk.y -= dy;
      this.lastY -= dy;
    }
    for (const f of this.floors) {
      if (f.slickT > 0) f.slickT = Math.max(0, f.slickT - dt);
      if (f.kind === "crumble" && f.crumbleT > 0 && !f.gone) {
        f.crumbleT -= dt;
        if (f.crumbleT <= 0) f.gone = true;
      }
    }
    this.pickups = this.pickups.filter((pk) => !pk.taken && pk.y > this.killY - 240);
    return dy;
  }
}

export function floorTop(f: Floor): number {
  return f.y + FLOOR_H;
}

function difficulty(n: number): number {
  return Math.max(0, Math.min(1, (n - 16) / 90));
}
