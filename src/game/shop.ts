import type { WeaponId } from "./types";

export const SKIN_PRICE = [0, 80, 140, 200] as const;

export const WEAPON_SHOP: { id: WeaponId; name: string; price: number; blurb: string }[] = [
  { id: "blade", name: "Blade", price: 0, blurb: "Slash bounce" },
  { id: "gun", name: "Blaster", price: 90, blurb: "Ice shots" },
];
