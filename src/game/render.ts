import {
  BASE_W,
  COMBO_TITLES_EN,
  COMBO_TITLES_HE,
  DRAW_H,
  DRAW_W,
  PLAYER_COLORS,
  WALL,
} from "./constants";
import { drawArcadeWorld, WALL_PALETTE, WORLD_TITLE, worldForFloor, type ArcadeWorld } from "./arcade-bg";
import { POWER_BY_ID } from "./powers";
import { POWER_NAME } from "./i18n";
import { ledgeIndex, type SpriteBank } from "./sprites";
import type { Corpse, Creep, Floor, Lang, Particle, Player, Popup } from "./types";
import { floorTop, type World } from "./world";

export interface Cam {
  y: number;
  shakeX: number;
  shakeY: number;
}

export function worldToScreen(y: number, cam: Cam, viewH: number): number {
  return viewH - (y - cam.y);
}

export function comboTitle(n: number, lang: Lang): string {
  const list = lang === "he" ? COMBO_TITLES_HE : COMBO_TITLES_EN;
  let label = list[0]?.label ?? "HOP!";
  for (const row of list) if (n >= row.at) label = row.label;
  return label;
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  world: World,
  players: Player[],
  particles: Particle[],
  popups: Popup[],
  cam: Cam,
  sprites: SpriteBank,
  viewW: number,
  viewH: number,
  now: number,
  lang: Lang,
  localId: string,
  stageFloor = 0,
  iceFlash = 0,
  shots: { x: number; y: number; vx: number; life: number }[] = [],
  hideTitle = false,
  creeps: Creep[] = [],
  pitY: number | null = null,
  corpses: Corpse[] = [],
): void {
  ctx.save();
  ctx.translate(cam.shakeX, cam.shakeY);

  ctx.imageSmoothingEnabled = false;
  const local = players.find((p) => p.id === localId);
  const stage = worldForFloor(stageFloor);
  drawBackdrop(ctx, cam, viewW, viewH, now, stage, hideTitle);
  drawWalls(ctx, cam, viewH, now, stage);
  drawFloors(ctx, world, cam, viewH, now, sprites);
  if (!hideTitle) drawPickups(ctx, world, cam, viewH, now, lang);
  if (!hideTitle) drawCreeps(ctx, creeps, cam, viewH, sprites);
  if (!hideTitle) drawPit(ctx, cam, viewH, pitY, corpses, sprites);
  if (!hideTitle && local && local.combo >= 6) drawSpeedLines(ctx, local, cam, viewW, viewH);
  const named = players.length > 1;
  const sorted = [...players].sort((a, b) => Number(a.id === localId) - Number(b.id === localId));
  for (const p of sorted) {
    if (!p.alive && corpses.length > 0) continue;
    drawPlayer(ctx, p, sprites, cam, viewH, now, p.id === localId, named);
  }
  if (!hideTitle) drawShots(ctx, shots, cam, viewH);
  drawParticles(ctx, particles, cam, viewH);
  if (!hideTitle) drawPopups(ctx, popups, cam, viewH);
  ctx.restore();
  if (!hideTitle) drawOffscreen(ctx, players, cam, viewW, viewH, localId);
  if (iceFlash > 0) drawIceFlash(ctx, viewW, viewH, iceFlash);
}

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  cam: Cam,
  viewW: number,
  viewH: number,
  now: number,
  stage: ArcadeWorld,
  hideTitle = false,
): void {
  const shot = getBackdrop(stage, cam.y, viewW, viewH, now);
  ctx.drawImage(shot, 0, 0, viewW, viewH);
  ctx.fillStyle = "rgba(8,6,12,0.28)";
  ctx.fillRect(0, 0, viewW, viewH);
  if (!hideTitle) {
    ctx.font = "800 11px Bangers, Teko, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,211,106,0.35)";
    ctx.fillText(WORLD_TITLE[stage], viewW / 2, 28);
  }
}

const bgCache = {
  canvas: null as HTMLCanvasElement | null,
  stage: "" as string,
  cam: -99999,
  w: 0,
  h: 0,
};

function getBackdrop(stage: ArcadeWorld, camY: number, w: number, h: number, now: number): HTMLCanvasElement {
  let c = bgCache.canvas;
  if (!c) {
    c = document.createElement("canvas");
    bgCache.canvas = c;
  }
  const dirty =
    bgCache.stage !== stage ||
    bgCache.w !== w ||
    bgCache.h !== h ||
    Math.abs(camY - bgCache.cam) > 28;
  if (dirty) {
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
    const g = c.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);
    drawArcadeWorld(g, stage, now / 1000, camY, w, h);
    bgCache.stage = stage;
    bgCache.cam = camY;
    bgCache.w = w;
    bgCache.h = h;
  }
  return c;
}

function drawWalls(
  ctx: CanvasRenderingContext2D,
  cam: Cam,
  viewH: number,
  now: number,
  stage: ArcadeWorld,
): void {
  const pal = WALL_PALETTE[stage];
  const top = cam.y + viewH + 50;
  const bot = cam.y - 50;
  const brickH = 36;
  const vis = 38;
  for (const side of [0, BASE_W - vis] as const) {
    const inner = side === 0;
    ctx.fillStyle = pal.c;
    ctx.fillRect(side, 0, vis, viewH);
    for (let y = Math.floor(bot / brickH) * brickH; y < top; y += brickH) {
      const sy = worldToScreen(y, cam, viewH);
      const odd = Math.floor(y / brickH) % 2;
      ctx.fillStyle = odd ? pal.a : pal.b;
      ctx.fillRect(side + 1, sy - brickH + 1, vis - 2, brickH - 2);
      ctx.fillStyle = pal.c;
      ctx.fillRect(side + 1, sy - 2, vis - 2, 2);
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.fillRect(inner ? side + 4 : side + vis - 10, sy - brickH + 3, 6, 3);
      const row = Math.floor(y / brickH);
      if (row % 4 === 0) {
        ctx.fillStyle = pal.moss;
        ctx.globalAlpha = 0.45;
        ctx.fillRect(side + (inner ? vis - 12 : 2), sy - brickH + 6, 10, 12);
        ctx.globalAlpha = 1;
      }
    }
    const shade = ctx.createLinearGradient(side, 0, side + vis, 0);
    if (inner) {
      shade.addColorStop(0, "rgba(0,0,0,0.15)");
      shade.addColorStop(1, "rgba(0,0,0,0.55)");
    } else {
      shade.addColorStop(0, "rgba(0,0,0,0.55)");
      shade.addColorStop(1, "rgba(0,0,0,0.15)");
    }
    ctx.fillStyle = shade;
    ctx.fillRect(side, 0, vis, viewH);
  }
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(vis - 2, 0, 6, viewH);
  ctx.fillRect(BASE_W - vis - 4, 0, 6, viewH);
  void now;
}

function drawFloors(
  ctx: CanvasRenderingContext2D,
  world: World,
  cam: Cam,
  viewH: number,
  now: number,
  sprites: SpriteBank,
): void {
  for (const f of world.nearby(cam.y + viewH * 0.5, viewH + 80)) {
    if (f.gone) continue;
    const top = worldToScreen(floorTop(f), cam, viewH);
    const crumbling = f.kind === "crumble" && f.crumbleT > 0;
    const shake = crumbling ? Math.sin(now / 36) * (1.6 + (1 - Math.min(1, f.crumbleT / 0.7)) * 2.2) : 0;
    const x = f.x + shake;
    const w = f.w;
    const springPulse = f.kind === "spring" ? Math.min(1, f.pulseT / 0.42) : 0;
    const idleBob = f.kind === "spring" ? Math.sin(now / 140) * 0.8 : 0;
    const h = f.kind === "spring" ? 15 * (1 - springPulse * 0.28) + idleBob * 0.15 : 15;
    const y = f.kind === "spring" ? top + (15 - h) + springPulse * 2 : top;
    const blit = sprites.ledge(ledgeIndex(f.n, f.kind));

    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.beginPath();
    ctx.ellipse(x + w / 2, top + 15 + 3, w * 0.42, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    if (blit) {
      ctx.save();
      roundRect(ctx, x, y, w, h, 4);
      ctx.clip();
      drawNine(ctx, blit, x, y, w, h);
      ctx.restore();
    } else {
      drawFallbackLedge(ctx, x, y, w, h, f.kind);
    }
    drawLedgeFx(ctx, f, x, y, w, h, now, ledgeIndex(f.n, f.kind));

    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(x + 3, y, w - 6, 1.5);

    if (f.n > 0 && f.n % 10 === 0) {
      const px = x + w / 2;
      const badgeY = top + 15 + 1;
      ctx.fillStyle = "#3a2818";
      ctx.fillRect(px - 14, badgeY, 28, 11);
      ctx.strokeStyle = "#140c08";
      ctx.strokeRect(px - 14, badgeY, 28, 11);
      ctx.fillStyle = "#fff4dc";
      ctx.font = "700 10px Teko, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(f.n), px, badgeY + 9);
    }
  }
}

function drawLedgeFx(
  ctx: CanvasRenderingContext2D,
  f: Floor,
  x: number,
  y: number,
  w: number,
  h: number,
  now: number,
  style: number,
): void {
  const t = now / 1000;
  const span = Math.max(12, w - 16);
  ctx.save();

  // --- kind juice (specials first) ---
  if (f.kind === "ice") {
    // cool rim shimmer
    const shimmer = 0.18 + Math.sin(t * 5 + f.n) * 0.1;
    ctx.fillStyle = `rgba(180,230,255,${shimmer})`;
    ctx.fillRect(x + 2, y + 1, w - 4, 2);
    // sparkles skim the top
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < 4; i++) {
      const px = x + 8 + ((t * 38 + i * 53 + f.n * 17) % span);
      const py = y - 1 - Math.abs(Math.sin(t * 6 + i + f.n)) * 3.5;
      ctx.globalAlpha = 0.3 + (i % 2) * 0.28;
      ctx.beginPath();
      ctx.arc(px, py, 1.2 + (i % 2) * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // melt drips under the ledge
    ctx.strokeStyle = "rgba(170,220,255,0.45)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      const dx = x + 10 + ((f.n * 19 + i * 41) % span);
      const len = 3 + ((Math.sin(t * 3 + i + f.n) + 1) * 2.5);
      ctx.globalAlpha = 0.35 + Math.abs(Math.sin(t * 2.4 + i)) * 0.35;
      ctx.beginPath();
      ctx.moveTo(dx, y + h - 1);
      ctx.lineTo(dx, y + h + len);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(dx, y + h + len + 0.8, 1.1, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(200,236,255,0.55)";
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  if (f.kind === "check") {
    const pulse = 0.35 + Math.sin(t * 4 + f.n) * 0.15 + Math.min(0.35, f.pulseT * 1.2);
    ctx.strokeStyle = `rgba(255,211,106,${pulse})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    ctx.fillStyle = `rgba(255,211,106,${0.12 + pulse * 0.2})`;
    ctx.fillRect(x + 3, y + 2, w - 6, 3);
    ctx.fillStyle = "rgba(255,244,220,0.8)";
    for (let i = 0; i < 2; i++) {
      const px = x + 12 + ((t * 22 + i * 70 + f.n * 9) % span);
      ctx.globalAlpha = 0.4 + pulse * 0.4;
      ctx.beginPath();
      ctx.arc(px, y - 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  if (f.kind === "crumble") {
    const danger = f.crumbleT > 0 ? 1 - Math.min(1, f.crumbleT / 0.7) : 0;
    ctx.strokeStyle = `rgba(60,36,20,${0.35 + danger * 0.5})`;
    ctx.lineWidth = 1.25;
    const cracks = 2 + (danger > 0.2 ? 2 : 0);
    for (let i = 0; i < cracks; i++) {
      const cx = x + w * (0.2 + i * 0.22);
      ctx.beginPath();
      ctx.moveTo(cx, y + 2);
      ctx.lineTo(cx + 3 + i, y + h * 0.55);
      ctx.lineTo(cx - 2, y + h - 1);
      ctx.stroke();
    }
    if (danger > 0) {
      ctx.fillStyle = `rgba(196,168,130,${0.25 + danger * 0.45})`;
      for (let i = 0; i < 3; i++) {
        const px = x + 6 + ((t * 50 + i * 37 + f.n * 11) % span);
        const py = y + h + 1 + Math.abs(Math.sin(t * 9 + i)) * (2 + danger * 4);
        ctx.globalAlpha = 0.35 + danger * 0.4;
        ctx.beginPath();
        ctx.arc(px, py, 1.2 + danger, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgba(90,50,30,${danger * 0.22})`;
      ctx.fillRect(x, y, w, h);
    }
  }

  if (f.kind === "spring") {
    const pulse = Math.min(1, f.pulseT / 0.42);
    const bob = Math.abs(Math.sin(t * 7));
    const glow = 0.28 + bob * 0.22 + pulse * 0.45;
    ctx.fillStyle = `rgba(120,255,170,${glow})`;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + 2, w * 0.28, 3 + pulse * 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // coil / pad cue
    const padH = 2 + bob * 2 - pulse * 1.5;
    ctx.fillStyle = `rgba(80,220,140,${0.55 + pulse * 0.35})`;
    ctx.fillRect(x + w * 0.5 - 7, y - padH - pulse, 14, Math.max(1.5, padH));
    if (pulse > 0.05) {
      ctx.strokeStyle = `rgba(180,255,210,${pulse * 0.85})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 1, w - 4, h - 2);
    }
  }

  if (f.kind === "conveyor") {
    const dir = f.dir >= 0 ? 1 : -1;
    const scroll = ((t * 55 * dir) % 18 + 18) % 18;
    ctx.save();
    roundRect(ctx, x + 2, y + 3, w - 4, h - 5, 2);
    ctx.clip();
    ctx.fillStyle = "rgba(7,18,44,0.22)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(126,231,255,0.55)";
    ctx.lineWidth = 1.5;
    for (let sx = -18; sx < w + 18; sx += 18) {
      const cx = x + sx + scroll;
      ctx.beginPath();
      if (dir >= 0) {
        ctx.moveTo(cx, y + 5);
        ctx.lineTo(cx + 6, y + h * 0.5);
        ctx.lineTo(cx, y + h - 4);
      } else {
        ctx.moveTo(cx + 6, y + 5);
        ctx.lineTo(cx, y + h * 0.5);
        ctx.lineTo(cx + 6, y + h - 4);
      }
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = "rgba(126,231,255,0.35)";
    ctx.fillRect(x + 2, y + 1, w - 4, 1.5);
  }

  if (f.slickT > 0) {
    const a = Math.min(1, f.slickT / 5) * 0.35;
    ctx.fillStyle = `rgba(180,240,255,${a})`;
    ctx.fillRect(x + 2, y + 1, w - 4, 3);
  }

  // --- leftover atlas-style accents (ice variety) ---
  if (f.kind === "ice") {
    if (style === 4 || style === 13) {
      const pulse = 0.28 + Math.sin(t * 6 + f.n) * 0.16;
      ctx.fillStyle = style === 4 ? `rgba(255,120,40,${pulse})` : `rgba(160,80,255,${pulse})`;
      ctx.fillRect(x + 4, y + 3, w - 8, 2);
    }
    if (style === 14) {
      ctx.strokeStyle = `rgba(80,255,255,${0.35 + Math.sin(t * 8) * 0.2})`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    }
    if (style === 1 || style === 16 || style === 18) {
      ctx.fillStyle = "rgba(80,180,70,0.5)";
      ctx.fillRect(x + 8, y - 3, 3, 4);
      ctx.fillRect(x + w * 0.6, y - 4, 2.5, 5);
    }
  }

  ctx.restore();
}

function drawNine(
  ctx: CanvasRenderingContext2D,
  blit: { img: HTMLImageElement; sx: number; sy: number; sw: number; sh: number },
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  if (w < 8 || h < 4) return;
  const { img, sx, sy, sw, sh } = blit;
  if (!img || sw < 4 || sh < 4 || sx < 0 || sy < 0) return;
  const cap = Math.max(10, Math.min(Math.floor(sw * 0.2), Math.floor(sw / 3)));
  const midS = Math.max(1, sw - cap * 2);
  const capD = Math.max(6, Math.min(14, w * 0.16));
  const midD = Math.max(1, w - capD * 2);
  if (cap <= 0 || midS <= 0 || capD <= 0 || midD <= 0 || h <= 0) return;
  ctx.imageSmoothingEnabled = true;
  try {
    ctx.drawImage(img, sx, sy, cap, sh, x, y, capD, h);
    ctx.drawImage(img, sx + cap, sy, midS, sh, x + capD, y, midD, h);
    ctx.drawImage(img, sx + sw - cap, sy, cap, sh, x + capD + midD, y, capD, h);
  } catch {
    ctx.fillStyle = "#6a7888";
    ctx.fillRect(x, y, w, h);
  }
  ctx.imageSmoothingEnabled = false;
}

function drawFallbackLedge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  kind: string,
): void {
  let ice = "#e8f4ff";
  let body = "#5a6a78";
  if (kind === "check") {
    ice = "#ffe08a";
    body = "#6a5428";
  } else if (kind === "crumble") {
    ice = "#d0b090";
    body = "#5a4030";
  } else if (kind === "spring") {
    ice = "#b8ffd0";
    body = "#2a5a40";
  } else if (kind === "conveyor") {
    ice = "#9ad8ff";
    body = "#1a2a48";
  }
  ctx.fillStyle = body;
  ctx.fillRect(x + 1, y + 4, w - 2, Math.max(4, h - 5));
  ctx.fillStyle = ice;
  ctx.fillRect(x, y, w, 5);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillRect(x + 4, y + 1, w - 8, 1.5);
}

function drawPickups(ctx: CanvasRenderingContext2D, world: World, cam: Cam, viewH: number, now: number, lang: Lang): void {
  for (const pk of world.pickups) {
    if (pk.taken) continue;
    const sy = worldToScreen(pk.y, cam, viewH);
    if (sy < -20 || sy > viewH + 20) continue;
    const bob = Math.sin(now / 280 + pk.id) * 5;
    ctx.save();
    ctx.translate(pk.x, sy - bob);
    if (pk.kind === "pill" || pk.kind === "elixir") {
      const big = pk.kind === "elixir";
      ctx.fillStyle = "rgba(10,8,4,0.4)";
      ctx.beginPath();
      ctx.ellipse(0, 8, big ? 10 : 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = big ? "#ffd36a" : "#ff4d8a";
      roundRect(ctx, big ? -8 : -5, big ? -12 : -8, big ? 16 : 10, big ? 16 : 12, 4);
      ctx.fill();
      ctx.fillStyle = "#fff4dc";
      ctx.font = "800 8px Rubik, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(big ? "XL" : "+", 0, 3);
      ctx.restore();
      continue;
    }
    if (pk.kind === "ammo") {
      ctx.fillStyle = "#7ee7ff";
      ctx.fillRect(-7, -10, 14, 10);
      ctx.fillStyle = "#140c08";
      ctx.font = "800 8px Rubik, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("AM", 0, -2);
      ctx.restore();
      continue;
    }
    if (!pk.power) {
      ctx.restore();
      continue;
    }
    const power = POWER_BY_ID[pk.power];
    const label = POWER_NAME[lang][pk.power];
    ctx.fillStyle = "rgba(10,8,4,0.45)";
    ctx.beginPath();
    ctx.ellipse(0, 10, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(0, -6);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = power.color;
    ctx.fillRect(-9, -9, 18, 18);
    ctx.strokeStyle = "#fff4dc";
    ctx.lineWidth = 2;
    ctx.strokeRect(-9, -9, 18, 18);
    ctx.rotate(-Math.PI / 4);
    ctx.font = "800 9px Rubik, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#140c08";
    ctx.fillText(label.slice(0, 3).toUpperCase(), 0, 4);
    ctx.font = "800 10px Rubik, sans-serif";
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = "rgba(20,12,8,0.85)";
    roundRect(ctx, -tw / 2 - 4, 16, tw + 8, 13, 4);
    ctx.fill();
    ctx.fillStyle = "#fff4dc";
    ctx.fillText(label, 0, 26);
    ctx.restore();
  }
}

function drawSpeedLines(
  ctx: CanvasRenderingContext2D,
  p: Player,
  cam: Cam,
  viewW: number,
  viewH: number,
): void {
  const sy = worldToScreen(p.y, cam, viewH);
  ctx.save();
  ctx.strokeStyle = "rgba(126,231,255,0.35)";
  ctx.lineWidth = 1.4;
  const n = 7 + Math.min(6, p.combo);
  for (let i = 0; i < n; i++) {
    const x = 30 + ((p.x * 0.3 + i * 47) % (viewW - 60));
    const len = 10 + (p.combo % 5) * 3 + (i % 3) * 8;
    ctx.beginPath();
    ctx.moveTo(x, sy + 20);
    ctx.lineTo(x, sy + 20 + len);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  p: Player,
  sprites: SpriteBank,
  cam: Cam,
  viewH: number,
  now: number,
  isLocal: boolean,
  named: boolean,
): void {
  const sy = worldToScreen(p.y, cam, viewH);
  if (sy < -60 || sy > viewH + 60) return;
  const color = PLAYER_COLORS[p.color % 4]!;
  const s = p.effects.shrinkT > 0 ? 0.88 : 1;
  const img = sprites.frame(p.anim, p.animT, p.color);
  const ratio = img && img.height > 0 ? img.width / img.height : DRAW_W / DRAW_H;
  const dh = DRAW_H * s;
  const dw = dh * ratio;

  const trail = p.trail ?? [];
  if (isLocal && trail.length > 1 && (p.combo >= 2 || Math.abs(p.vx) > 160)) {
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = color;
    for (let i = 0; i < trail.length; i += 2) {
      const g = trail[i]!;
      const gy = worldToScreen(g.y, cam, viewH);
      ctx.beginPath();
      ctx.ellipse(g.x, gy, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  ctx.save();
  ctx.translate(p.x, sy);
  if (!p.alive) {
    ctx.rotate(p.spin || 0.6);
    ctx.globalAlpha = 0.9;
  }
  ctx.beginPath();
  ctx.ellipse(0, 4, 14, 4.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(10,8,4,0.32)";
  ctx.fill();

  const frozen = p.effects.frozenT > 0;
  const lean = p.grounded ? 0 : Math.max(-0.18, Math.min(0.18, p.vx * 0.00045));
  ctx.rotate(lean);
  ctx.scale(p.facing, 1);
  if (frozen) ctx.globalAlpha = 0.7;

  if (img) ctx.drawImage(img, -dw / 2, -dh, dw, dh);
  else {
    ctx.fillStyle = color;
    roundRect(ctx, -12, -40, 24, 40, 10);
    ctx.fill();
  }

  if (frozen) {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "#c4f3ff";
    roundRect(ctx, -dw / 2 - 3, -dh - 2, dw + 6, dh + 8, 10);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 2.2;
    roundRect(ctx, -dw / 2 - 3, -dh - 2, dw + 6, dh + 8, 10);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(-dw / 2 + 4, -dh + 6, 6, 10);
  }
  ctx.globalAlpha = 1;

  if (p.effects.shield) {
    const pulse = 1 + Math.sin(now / 140) * 0.08;
    ctx.strokeStyle = "rgba(126,231,255,0.95)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    const rx = dw * 0.55 * pulse;
    const ry = dh * 0.58 * pulse;
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const x = Math.cos(a) * rx;
      const y = -dh * 0.48 + Math.sin(a) * ry;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = "rgba(126,231,255,0.12)";
    ctx.fill();
  }
  if (p.slashT > 0) {
    ctx.strokeStyle = `rgba(232,244,255,${Math.min(1, p.slashT * 4)})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -dh * 0.45, dw * 0.85, -0.9, 1.4);
    ctx.stroke();
    ctx.strokeStyle = `rgba(126,231,255,${Math.min(1, p.slashT * 3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -dh * 0.45, dw * 1.05, -1.1, 1.6);
    ctx.stroke();
  }

  if (p.weaponT > 0 && p.weapon === "blade") {
    ctx.strokeStyle = "#e8f4ff";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(7, -10);
    ctx.lineTo(11, -24);
    ctx.stroke();
  } else if (p.weaponT > 0 && p.weapon === "gun") {
    ctx.fillStyle = "#c4a882";
    ctx.fillRect(6, -16, 11, 5);
  }
  ctx.restore();

  const barY = sy - dh - (named && isLocal ? 14 : 8);
  if (isLocal) {
    const bw = 28;
    ctx.fillStyle = "rgba(12,8,6,0.7)";
    ctx.fillRect(p.x - bw / 2, barY, bw, 4);
    ctx.fillStyle = p.hp / p.maxHp < 0.3 ? "#ff4d8a" : "#7cffb2";
    ctx.fillRect(p.x - bw / 2, barY, bw * Math.max(0, p.hp / p.maxHp), 4);
    if (p.hurtT > 0) {
      ctx.fillStyle = `rgba(255,77,138,${p.hurtT})`;
      ctx.fillRect(p.x - bw / 2, barY, bw, 4);
    }
  }

  if (named) {
    const label = isLocal ? (p.combo >= 2 ? `YOU ×${p.combo}` : "YOU") : (p.name || "?").slice(0, 8);
    ctx.font = "800 9px Rubik, sans-serif";
    ctx.textAlign = "center";
    const ny = barY - 7;
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(12,8,6,0.85)";
    ctx.strokeText(label, p.x, ny);
    ctx.fillStyle = isLocal ? "#7ee7ff" : color;
    ctx.fillText(label, p.x, ny);
  }
}

function drawPit(
  ctx: CanvasRenderingContext2D,
  cam: Cam,
  viewH: number,
  pitY: number | null,
  corpses: Corpse[],
  sprites: SpriteBank,
): void {
  if (pitY == null) return;
  const sy = worldToScreen(pitY, cam, viewH);
  if (sy < -40 || sy > viewH + 70) return;
  const x = WALL;
  const w = BASE_W - WALL * 2;
  ctx.fillStyle = "rgba(8,4,6,0.55)";
  ctx.fillRect(x, sy + 10, w, viewH);
  ctx.fillStyle = "#1a1418";
  roundRect(ctx, x, sy, w, 16, 3);
  ctx.fill();
  ctx.fillStyle = "#3a3236";
  roundRect(ctx, x, sy - 7, w, 9, 4);
  ctx.fill();
  ctx.fillStyle = "#6a121c";
  ctx.globalAlpha = 0.7;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.ellipse(x + 28 + i * 54, sy - 2, 14 + (i % 2) * 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < corpses.length; i++) {
    const n = corpses[i]!;
    const cx = 62 + (i % 6) * 50;
    const cy = sy - 4;
    const img = sprites.frame("land", 0, n.color) ?? sprites.frame("idle", 0, n.color);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(1.55);
    ctx.globalAlpha = 0.88;
    if (img) ctx.drawImage(img, -22, -14, 40, 26);
    ctx.restore();
    ctx.fillStyle = "rgba(90,16,24,0.65)";
    ctx.beginPath();
    ctx.ellipse(cx, sy + 2, 16, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCreeps(ctx: CanvasRenderingContext2D, creeps: Creep[], cam: Cam, viewH: number, sprites: SpriteBank): void {
  for (const c of creeps) {
    if (!c.alive) continue;
    const sy = worldToScreen(c.y, cam, viewH);
    if (sy < -40 || sy > viewH + 40) continue;
    const img = sprites.creep(c.kind, c.animT);
    const flash = c.windup > 0.2;
    ctx.save();
    ctx.translate(c.x, sy);
    if (c.hurtT > 0) ctx.globalAlpha = 0.65;
    if (flash) {
      ctx.fillStyle = c.kind === "raider" ? "rgba(255,120,40,0.45)" : "rgba(255,80,80,0.35)";
      const er = c.kind === "raider" ? 30 : 22;
      ctx.beginPath();
      ctx.ellipse(0, -18, er, er, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.scale(c.facing, 1);
    if (img) {
      const dh = c.kind === "raider" ? 46 : c.kind === "bat" ? 34 : 36;
      const dw = dh * (img.width / img.height);
      ctx.drawImage(img, -dw / 2, -dh, dw, dh);
    } else {
      ctx.fillStyle =
        c.kind === "ember" ? "#ff4d8a" : c.kind === "bat" ? "#6a4a88" : c.kind === "raider" ? "#8a3a28" : "#5a3220";
      const bw = c.kind === "raider" ? 14 : 10;
      const bh = c.kind === "raider" ? 28 : 22;
      roundRect(ctx, -bw, -bh, bw * 2, bh, 6);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = "rgba(12,8,6,0.65)";
    ctx.fillRect(c.x - 10, sy - 28, 20, 3);
    ctx.fillStyle = "#ff4d8a";
    ctx.fillRect(c.x - 10, sy - 28, 20 * Math.max(0, c.hp / c.maxHp), 3);
  }
}

function drawOffscreen(
  ctx: CanvasRenderingContext2D,
  players: Player[],
  cam: Cam,
  viewW: number,
  viewH: number,
  localId: string,
): void {
  if (players.length < 2) return;
  ctx.save();
  ctx.font = "800 10px Rubik, sans-serif";
  ctx.textAlign = "center";
  for (const o of players) {
    if (o.id === localId) continue;
    const sy = worldToScreen(o.y, cam, viewH);
    if (sy >= 72 && sy <= viewH - 120) continue;
    const up = sy < 72;
    const cx = Math.max(52, Math.min(viewW - 52, o.x));
    const cy = up ? 58 : viewH - 118;
    const col = o.alive ? (o.faction === "ember" ? "#ff4d8a" : PLAYER_COLORS[o.color % 4]!) : "#8a7a68";
    ctx.fillStyle = "rgba(12,8,6,0.82)";
    roundRect(ctx, cx - 32, up ? cy - 6 : cy - 18, 64, 24, 10);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath();
    if (up) {
      ctx.moveTo(cx, cy - 4);
      ctx.lineTo(cx - 7, cy + 8);
      ctx.lineTo(cx + 7, cy + 8);
    } else {
      ctx.moveTo(cx, cy + 12);
      ctx.lineTo(cx - 7, cy);
      ctx.lineTo(cx + 7, cy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(12,8,6,0.9)";
    ctx.lineWidth = 3;
    const d = `${(o.name || "?").slice(0, 8)} ${o.floor}`;
    ctx.strokeText(d, cx, up ? cy + 16 : cy - 6);
    ctx.fillStyle = col;
    ctx.fillText(d, cx, up ? cy + 16 : cy - 6);
  }
  ctx.restore();
}

function drawShots(
  ctx: CanvasRenderingContext2D,
  shots: { x: number; y: number; vx: number; life: number }[],
  cam: Cam,
  viewH: number,
): void {
  for (const s of shots) {
    const sy = worldToScreen(s.y, cam, viewH);
    ctx.fillStyle = `rgba(255,211,106,${Math.min(1, s.life * 2)})`;
    ctx.beginPath();
    ctx.arc(s.x, sy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,244,220,0.5)";
    ctx.fillRect(s.x - Math.sign(s.vx) * 10, sy - 1.5, Math.sign(s.vx) * 10, 3);
  }
}

function drawIceFlash(ctx: CanvasRenderingContext2D, viewW: number, viewH: number, iceFlash: number): void {
  ctx.save();
  ctx.fillStyle = `rgba(170,230,255,${0.28 * iceFlash})`;
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.strokeStyle = `rgba(255,255,255,${0.55 * iceFlash})`;
  ctx.lineWidth = 8 * iceFlash;
  ctx.strokeRect(6, 6, viewW - 12, viewH - 12);
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[], cam: Cam, viewH: number): void {
  for (const q of particles) {
    const sy = worldToScreen(q.y, cam, viewH);
    ctx.globalAlpha = Math.max(0, q.life / q.max);
    ctx.fillStyle = q.color;
    if (q.kind === "trail") {
      ctx.globalAlpha *= 0.45;
      ctx.beginPath();
      ctx.ellipse(q.x, sy, q.size, q.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (q.kind === "spark" || q.kind === "confetti") {
      ctx.save();
      ctx.translate(q.x, sy);
      ctx.rotate(q.life * 8);
      ctx.fillRect(-q.size / 2, -q.size / 2, q.size, q.size);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(q.x, sy, q.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawPopups(ctx: CanvasRenderingContext2D, popups: Popup[], cam: Cam, viewH: number): void {
  for (const q of popups) {
    const sy = worldToScreen(q.y, cam, viewH);
    const a = Math.min(1, q.life * 2);
    const o = q.scale ?? 1;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(q.x, sy - (1 - Math.min(1, q.life)) * 28);
    ctx.rotate(-0.05);
    ctx.scale(o, o);
    ctx.font = "800 32px Bangers, Teko, sans-serif";
    ctx.textAlign = "center";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#140c08";
    ctx.lineWidth = 7;
    ctx.strokeText(q.text, 0, 0);
    ctx.fillStyle = q.color;
    ctx.fillText(q.text, 0, 0);
    ctx.restore();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const ww = Math.max(0, w);
  const hh = Math.max(0, h);
  const rr = Math.max(0, Math.min(r, ww / 2, hh / 2));
  ctx.beginPath();
  if (ww < 1 || hh < 1) {
    ctx.rect(x, y, ww, hh);
    return;
  }
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, ww, hh, rr);
    return;
  }
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + ww, y, x + ww, y + hh, rr);
  ctx.arcTo(x + ww, y + hh, x, y + hh, rr);
  ctx.arcTo(x, y + hh, x, y, rr);
  ctx.arcTo(x, y, x + ww, y, rr);
  ctx.closePath();
}
