export type SheetName = "idle" | "run" | "jump" | "spin" | "land" | "wall";

export const SKINS = [
  { id: "hopper", name: "Hopper" },
  { id: "ember", name: "Ember" },
  { id: "nova", name: "Nova" },
  { id: "frost", name: "Frost" },
] as const;

const HOPPER: Record<SheetName, string[]> = {
  idle: ["/sprites/hopper/idle.png"],
  run: [
    "/sprites/hopper/run-a.png",
    "/sprites/hopper/run-d.png",
    "/sprites/hopper/run-c.png",
    "/sprites/hopper/run-b.png",
    "/sprites/hopper/lean.png",
    "/sprites/hopper/run-c.png",
  ],
  jump: [
    "/sprites/hopper/jump-up.png",
    "/sprites/hopper/apex.png",
    "/sprites/hopper/jump.png",
    "/sprites/hopper/fall.png",
  ],
  spin: [
    "/sprites/hopper/tuck.png",
    "/sprites/hopper/roll-a.png",
    "/sprites/hopper/roll-e.png",
    "/sprites/hopper/roll-b.png",
    "/sprites/hopper/roll-c.png",
    "/sprites/hopper/kick.png",
    "/sprites/hopper/roll-d.png",
    "/sprites/hopper/cheer.png",
  ],
  land: ["/sprites/hopper/land.png"],
  wall: ["/sprites/hopper/wall.png"],
};

function alt(id: string): Record<SheetName, string[]> {
  const p = `/sprites/${id}`;
  return {
    idle: [`${p}/idle.png`],
    run: [`${p}/run.png`, `${p}/idle.png`],
    jump: [`${p}/jump.png`, `${p}/fall.png`],
    spin: [`${p}/flip.png`, `${p}/jump.png`, `${p}/fall.png`],
    land: [`${p}/idle.png`],
    wall: [`${p}/run.png`],
  };
}

const SHEETS: Record<string, Record<SheetName, string[]>> = {
  hopper: HOPPER,
  ember: alt("ember"),
  nova: alt("nova"),
  frost: alt("frost"),
};

export function skinId(color: number): string {
  return SKINS[((color % SKINS.length) + SKINS.length) % SKINS.length]!.id;
}

export const LEDGE_COUNT = 30;
export const LEDGE_ATLAS = "/ledges/atlas.png";
export const LEDGE_CELL_W = 190;
export const LEDGE_CELL_H = 36;
export const LEDGE_COLS = 6;
export const LEDGE_WIDTHS = [
  94, 105, 121, 88, 93, 80, 77, 103, 119, 91, 93, 100, 157, 132, 189, 111, 115, 95, 72, 62, 74, 71, 67, 69, 129, 138,
  128, 132, 130, 111,
] as const;

export type LedgeBlit = { img: HTMLImageElement; sx: number; sy: number; sw: number; sh: number };

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export class SpriteBank {
  private images = new Map<string, HTMLImageElement>();
  private atlas: HTMLImageElement | null = null;
  private creeps = new Map<string, HTMLImageElement[]>();
  ready = false;
  private warming = false;
  bg: HTMLImageElement | null = null;

  async load(): Promise<void> {
    const idle = await loadImg("/sprites/hopper/idle.png");
    if (idle) this.images.set("/sprites/hopper/idle.png", idle);
    this.ready = true;
  }

  warmPlay(): void {
    if (this.warming) return;
    this.warming = true;
    void this.loadHopper();
    void this.loadAtlas();
    void this.loadCreeps();
  }

  private async loadHopper(): Promise<void> {
    const urls = [...new Set(Object.values(HOPPER).flat())].filter((src) => src !== "/sprites/hopper/idle.png");
    const loaded = await Promise.all(urls.map((src) => loadImg(src)));
    urls.forEach((src, i) => {
      const img = loaded[i];
      if (img) this.images.set(src, img);
    });
  }

  private async loadAtlas(): Promise<void> {
    const img = await loadImg(LEDGE_ATLAS);
    if (img) this.atlas = img;
  }

  private async loadCreeps(): Promise<void> {
    const kinds = ["rat", "bat", "ember", "raider"] as const;
    await Promise.all(
      kinds.map(async (kind) => {
        const frames = await Promise.all([0, 1, 2, 3].map((i) => loadImg(`/enemies/${kind}-${i}.png`)));
        this.creeps.set(
          kind,
          frames.filter((f): f is HTMLImageElement => !!f),
        );
      }),
    );
  }

  frame(sheet: SheetName, t: number, color = 0): HTMLImageElement | null {
    const id = skinId(color);
    const list = SHEETS[id]?.[sheet] ?? HOPPER[sheet];
    const i = Math.floor(Math.max(0, t)) % list.length;
    const img = this.images.get(list[i]!);
    if (img) return img;
    return this.images.get(HOPPER[sheet][0]!) ?? null;
  }

  creep(kind: string, t: number): HTMLImageElement | null {
    return this.creepFrame(kind, t, "idle");
  }

  /** Pick a readable attack pose without new art: wind favors late frames, lunge mid frames. */
  creepFrame(kind: string, t: number, mode: "idle" | "wind" | "lunge" = "idle"): HTMLImageElement | null {
    const frames = this.creeps.get(kind);
    if (!frames || frames.length === 0) return null;
    const n = frames.length;
    const base = Math.floor(Math.max(0, t));
    let i: number;
    if (mode === "wind") {
      // Favor coiled/strike frames 2–3.
      i = n <= 2 ? base % n : 2 + (base % Math.max(1, n - 2));
    } else if (mode === "lunge") {
      // Favor mid lunge frames 1–2.
      i = n <= 1 ? 0 : 1 + (base % Math.min(2, n - 1));
    } else {
      i = base % n;
    }
    return frames[i % n] ?? frames[0] ?? null;
  }

  ledge(index: number): LedgeBlit | null {
    if (!this.atlas) return null;
    const i = ((index % LEDGE_COUNT) + LEDGE_COUNT) % LEDGE_COUNT;
    const col = i % LEDGE_COLS;
    const row = Math.floor(i / LEDGE_COLS);
    return {
      img: this.atlas,
      sx: col * LEDGE_CELL_W,
      sy: row * LEDGE_CELL_H,
      sw: LEDGE_WIDTHS[i] ?? LEDGE_CELL_W,
      sh: LEDGE_CELL_H,
    };
  }

  stageBg(_stage: string): HTMLImageElement | null {
    return null;
  }
}

export function ledgeIndex(n: number, kind: string): number {
  if (kind === "check") return 21;
  if (kind === "crumble") return 19;
  if (kind === "spring") return 17;
  if (kind === "conveyor") return 5;
  if (n === 0) return 0;
  return (n * 13 + 7) % LEDGE_COUNT;
}

