export type SheetName = "idle" | "run" | "jump" | "spin" | "land" | "wall";

export const SKINS = [
  { id: "hopper", name: "Hopper" },
  { id: "ember", name: "Ember" },
  { id: "nova", name: "Nova" },
  { id: "frost", name: "Frost" },
  { id: "hopper", name: "Spark" },
  { id: "ember", name: "Blaze" },
  { id: "nova", name: "Pulse" },
  { id: "frost", name: "Glacier" },
  { id: "hopper", name: "Jade" },
  { id: "ember", name: "Magma" },
  { id: "nova", name: "Violet" },
  { id: "frost", name: "Mist" },
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

const SHARED_IMAGES = new Map<string, HTMLImageElement>();
let SHARED_ATLAS: HTMLImageElement | null = null;
const SHARED_CREEPS = new Map<string, HTMLImageElement[]>();
let preloadPromise: Promise<void> | null = null;

export function preloadAllGameAssets(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (preloadPromise) return preloadPromise;

  preloadPromise = (async () => {
    // 1. Atlas
    const atlasP = loadImg(LEDGE_ATLAS).then((img) => {
      if (img) SHARED_ATLAS = img;
    });

    // 2. All player skins
    const skinUrls = [
      ...new Set([
        ...Object.values(HOPPER).flat(),
        ...Object.values(alt("ember")).flat(),
        ...Object.values(alt("nova")).flat(),
        ...Object.values(alt("frost")).flat(),
      ]),
    ];
    const skinsP = Promise.all(
      skinUrls.map(async (src) => {
        if (!SHARED_IMAGES.has(src)) {
          const img = await loadImg(src);
          if (img) SHARED_IMAGES.set(src, img);
        }
      }),
    );

    // 3. Enemies
    const kinds = ["rat", "bat", "ember", "raider"] as const;
    const creepsP = Promise.all(
      kinds.map(async (kind) => {
        if (!SHARED_CREEPS.has(kind)) {
          const frames = await Promise.all([0, 1, 2, 3].map((i) => loadImg(`/enemies/${kind}-${i}.png`)));
          SHARED_CREEPS.set(
            kind,
            frames.filter((f): f is HTMLImageElement => !!f),
          );
        }
      }),
    );

    // 4. Common UI
    const uiUrls = [
      "/ui/logo.png",
      "/ui/play.png",
      "/ui/you-fell.png",
      "/ui/fell-board.png",
      "/ui/home.png",
      "/ui/room.png",
    ];
    const uiP = Promise.all(
      uiUrls.map(async (src) => {
        if (!SHARED_IMAGES.has(src)) {
          const img = await loadImg(src);
          if (img) SHARED_IMAGES.set(src, img);
        }
      }),
    );

    await Promise.all([atlasP, skinsP, creepsP, uiP]);
  })();

  return preloadPromise;
}

// Automatically initiate preload on import in browser
if (typeof window !== "undefined") {
  void preloadAllGameAssets();
}

export class SpriteBank {
  bg: HTMLImageElement | null = null;

  get ready(): boolean {
    return SHARED_ATLAS !== null && SHARED_IMAGES.size > 0;
  }

  set ready(_val: boolean) {
    /* no-op for backward compatibility */
  }

  async load(): Promise<void> {
    await preloadAllGameAssets();
  }

  warmPlay(): void {
    void preloadAllGameAssets();
  }

  frame(sheet: SheetName, t: number, color = 0): HTMLImageElement | null {
    const id = skinId(color);
    const list = SHEETS[id]?.[sheet] ?? HOPPER[sheet];
    const i = Math.floor(Math.max(0, t)) % list.length;
    const img = SHARED_IMAGES.get(list[i]!);
    if (img) return img;
    return SHARED_IMAGES.get(HOPPER[sheet][0]!) ?? SHARED_IMAGES.get("/sprites/hopper/idle.png") ?? null;
  }

  creep(kind: string, t: number): HTMLImageElement | null {
    return this.creepFrame(kind, t, "idle");
  }

  /** Pick a readable attack pose without new art: wind favors late frames, lunge mid frames. */
  creepFrame(kind: string, t: number, mode: "idle" | "wind" | "lunge" = "idle"): HTMLImageElement | null {
    const frames = SHARED_CREEPS.get(kind);
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
    if (!SHARED_ATLAS) return null;
    const i = ((index % LEDGE_COUNT) + LEDGE_COUNT) % LEDGE_COUNT;
    const col = i % LEDGE_COLS;
    const row = Math.floor(i / LEDGE_COLS);
    return {
      img: SHARED_ATLAS,
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

