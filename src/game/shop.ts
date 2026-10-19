import type { WeaponId } from "./types";

export const SKIN_PRICE = [0, 0, 0, 40, 60, 80, 100, 120, 150, 180, 200, 250] as const;

export const WEAPON_SHOP: { id: WeaponId; name: string; price: number; blurb: string }[] = [
  { id: "blade", name: "Blade", price: 0, blurb: "Slash bounce" },
  { id: "gun", name: "Blaster", price: 90, blurb: "Ice shots" },
];
