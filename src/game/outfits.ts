/** Simple climber outfits — light layers on the same sheet. */
export type OutfitId = 0 | 1 | 2;

export interface OutfitDef {
  id: OutfitId;
  name: string;
  /** Accent color for scarf / stripe (hex). */
  accent: string;
  /** 0 classic (no layer), 1 scarf, 2 shoulder stripe. */
  layer: "none" | "scarf" | "stripe";
}

export const OUTFITS: readonly OutfitDef[] = [
  { id: 0, name: "Classic", accent: "#ffffff", layer: "none" },
  { id: 1, name: "Scarf", accent: "#ff6b6b", layer: "scarf" },
  { id: 2, name: "Stripe", accent: "#ffd36a", layer: "stripe" },
] as const;

export function outfitOf(n: number): OutfitDef {
  const i = ((n % OUTFITS.length) + OUTFITS.length) % OUTFITS.length;
  return OUTFITS[i]!;
}

/** Per-skin accent shift so scarf/stripe still read unique across roster. */
export function outfitAccent(skinColor: number, outfit: number): string {
  const base = outfitOf(outfit);
  if (base.layer === "none") return base.accent;
  const hues = [
    "#ff6b6b",
    "#ffa94d",
    "#ffd43b",
    "#69db7c",
    "#38d9a9",
    "#4dabf7",
    "#748ffc",
    "#b197fc",
    "#f783ac",
    "#e599f7",
    "#66d9e8",
    "#ffe066",
  ];
  if (outfit === 1) return hues[((skinColor % hues.length) + hues.length) % hues.length]!;
  // stripe: goldish variants
  const stripes = [
    "#ffd36a",
    "#ffe8a3",
    "#f4a261",
    "#e9c46a",
    "#b8f0ff",
    "#7cffb2",
    "#c4a0ff",
    "#ff8a4d",
    "#7ee7ff",
    "#ff6bcb",
    "#a8ff4d",
    "#d4d4ff",
  ];
  return stripes[((skinColor % stripes.length) + stripes.length) % stripes.length]!;
}
