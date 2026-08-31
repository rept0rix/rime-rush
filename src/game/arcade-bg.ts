export const STAGES = [
  "roots",
  "trunk",
  "leaves",
  "fruit",
  "sky",
  "earth",
  "sun",
  "pluto",
] as const;

export type ArcadeWorld = (typeof STAGES)[number];

export const WORLD_TITLE: Record<ArcadeWorld, string> = {
  roots: "THE ROOTS",
  trunk: "TEMPLE",
  leaves: "CANOPY",
  fruit: "FUNGAL",
  sky: "OPEN SKY",
  earth: "KEEP",
  sun: "SOLAR",
  pluto: "FROST",
};

export const STAGE_SPAN = 20;

export const WALL_PALETTE: Record<ArcadeWorld, { a: string; b: string; c: string; moss: string }> = {
  roots: { a: "#3a2414", b: "#2a180c", c: "#1a1008", moss: "#2a3a14" },
  trunk: { a: "#4a5a38", b: "#3a4a30", c: "#2a3824", moss: "#3a6a28" },
  leaves: { a: "#3a5038", b: "#2a3a28", c: "#1a2818", moss: "#2a8a30" },
  fruit: { a: "#2a2038", b: "#1a1828", c: "#121018", moss: "#6a2a6a" },
  sky: { a: "#6a7a88", b: "#5a6a78", c: "#4a5a68", moss: "#8ab4c8" },
  earth: { a: "#4a3a68", b: "#3a2a58", c: "#2a1a48", moss: "#6a4a88" },
  sun: { a: "#8a5a28", b: "#6a4018", c: "#4a280c", moss: "#c87828" },
  pluto: { a: "#3a4a58", b: "#2a3848", c: "#1a2838", moss: "#7aa0c0" },
};

export function worldForFloor(floor: number): ArcadeWorld {
  const i = Math.floor(Math.max(0, floor) / STAGE_SPAN) % STAGES.length;
  return STAGES[i]!;
}

export function worldForTime(sec: number, hold = 8): ArcadeWorld {
  return worldForFloor(Math.floor(sec / hold) * STAGE_SPAN);
}

export function drawArcadeWorld(
  ctx: CanvasRenderingContext2D,
  world: ArcadeWorld,
  t: number,
  camY: number,
  w: number,
  h: number,
): void {
  ctx.save();
  if (world === "roots") drawRoots(ctx, t, camY, w, h);
  else if (world === "trunk") drawTemple(ctx, t, camY, w, h);
  else if (world === "leaves") drawCanopy(ctx, t, camY, w, h);
  else if (world === "fruit") drawFungal(ctx, t, camY, w, h);
  else if (world === "sky") drawSky(ctx, t, camY, w, h);
  else if (world === "earth") drawKeep(ctx, t, camY, w, h);
  else if (world === "sun") drawSun(ctx, t, camY, w, h);
  else drawFrost(ctx, t, camY, w, h);
  ctx.restore();
}

function bricks(ctx: CanvasRenderingContext2D, camY: number, w: number, h: number, pal: { a: string; b: string; c: string }, bw = 56, bh = 36): void {
  const ox = -((camY * 0.15) % bh);
  for (let y = ox - bh; y < h + bh; y += bh) {
    const row = Math.floor((y + camY * 0.15) / bh);
    const shift = row % 2 === 0 ? 0 : bw / 2;
    for (let x = -bw; x < w + bw; x += bw) {
      ctx.fillStyle = (row + Math.floor(x / bw)) % 3 === 0 ? pal.a : pal.b;
      ctx.fillRect(x + shift, y, bw - 2, bh - 2);
      ctx.fillStyle = pal.c;
      ctx.fillRect(x + shift, y + bh - 3, bw - 2, 2);
    }
  }
}

function drawRoots(ctx: CanvasRenderingContext2D, t: number, camY: number, w: number, h: number): void {
  bricks(ctx, camY, w, h, WALL_PALETTE.roots);
  ctx.strokeStyle = "#1a0c04";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(30 + i * 60, h);
    ctx.quadraticCurveTo(40 + i * 50 + Math.sin(t + i) * 10, h * 0.5, 20 + i * 55, 0);
    ctx.stroke();
  }
}

function drawTemple(ctx: CanvasRenderingContext2D, t: number, camY: number, w: number, h: number): void {
  bricks(ctx, camY, w, h, WALL_PALETTE.trunk, 48, 32);
  ctx.fillStyle = "rgba(40,90,30,0.35)";
  for (let i = 0; i < 10; i++) {
    const x = (i * 47) % w;
    const y = ((i * 83 - camY * 0.2) % (h + 40)) - 20;
    ctx.fillRect(x, y, 8, 40 + (i % 3) * 20);
  }
  ctx.strokeStyle = "rgba(90,140,50,0.45)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(w, 20 + i * 80);
    ctx.quadraticCurveTo(w * 0.6, 60 + i * 70, w * 0.3, 10 + i * 90);
    ctx.stroke();
  }
  void t;
}

function drawCanopy(ctx: CanvasRenderingContext2D, t: number, camY: number, w: number, h: number): void {
  bricks(ctx, camY, w, h, WALL_PALETTE.leaves);
  ctx.fillStyle = "#1e5a28";
  for (let i = 0; i < 16; i++) {
    const x = ((i * 61 + t * 6) % (w + 30)) - 15;
    const y = ((i * 47 - camY * 0.1) % (h + 30)) - 15;
    ctx.beginPath();
    ctx.ellipse(x, y, 18, 10, i, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFungal(ctx: CanvasRenderingContext2D, t: number, camY: number, w: number, h: number): void {
  ctx.fillStyle = "#08060e";
  ctx.fillRect(0, 0, w, h);
  const caps = ["#c45a28", "#3a6ad4", "#7a2a8a", "#2a8a58", "#d43a6a"];
  for (let i = 0; i < 10; i++) {
    const x = 20 + ((i * 73) % (w - 40));
    const y = ((i * 91 - camY * 0.12) % (h + 60)) - 20;
    const r = 14 + (i % 5) * 7;
    ctx.fillStyle = caps[i % caps.length]!;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a2030";
    ctx.fillRect(x - 3, y, 6, 22);
  }
  ctx.fillStyle = "#c8ff6a";
  for (let i = 0; i < 12; i++) {
    const x = (i * 59 + t * 4) % w;
    const y = (i * 41) % h;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function drawSky(ctx: CanvasRenderingContext2D, t: number, camY: number, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#5aa8d8");
  g.addColorStop(1, "#c8dce8");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  bricks(ctx, camY, w, h, { a: "rgba(90,110,120,0.35)", b: "rgba(70,90,100,0.3)", c: "rgba(40,50,60,0.25)" }, 56, 36);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  for (let i = 0; i < 5; i++) {
    const x = ((i * 90 + t * 10) % (w + 60)) - 30;
    ctx.beginPath();
    ctx.arc(x, 50 + i * 40, 22, 0, Math.PI * 2);
    ctx.arc(x + 20, 54 + i * 40, 16, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawKeep(ctx: CanvasRenderingContext2D, t: number, camY: number, w: number, h: number): void {
  bricks(ctx, camY, w, h, WALL_PALETTE.earth, 50, 28);
  ctx.fillStyle = "rgba(20,10,30,0.25)";
  for (let i = 0; i < 8; i++) {
    const y = ((i * 90 - camY * 0.15) % (h + 40)) - 10;
    ctx.fillRect(w * 0.15, y, w * 0.2, 40);
    ctx.fillRect(w * 0.65, y + 20, w * 0.18, 36);
  }
  void t;
}

function drawSun(ctx: CanvasRenderingContext2D, t: number, camY: number, w: number, h: number): void {
  bricks(ctx, camY, w, h, WALL_PALETTE.sun, 44, 24);
  const g = ctx.createRadialGradient(w * 0.5, 40, 10, w * 0.5, 40, 180);
  g.addColorStop(0, "rgba(255,220,120,0.45)");
  g.addColorStop(1, "rgba(255,120,40,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  void t;
}

function drawFrost(ctx: CanvasRenderingContext2D, t: number, camY: number, w: number, h: number): void {
  bricks(ctx, camY, w, h, WALL_PALETTE.pluto, 40, 22);
  ctx.fillStyle = "rgba(200,220,240,0.15)";
  for (let i = 0; i < 20; i++) {
    const x = (i * 37) % w;
    const y = ((i * 53 - camY * 0.1) % h);
    ctx.fillRect(x, y, 3, 10);
  }
  void t;
}
