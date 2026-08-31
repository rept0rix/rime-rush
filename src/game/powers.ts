import type { PowerId } from "./types";

export interface PowerDef {
  id: PowerId;
  slot: "self" | "atk";
  color: string;
}

export const POWERS: PowerDef[] = [
  { id: "spring", slot: "self", color: "#7ee7ff" },
  { id: "shield", slot: "self", color: "#a8d4ff" },
  { id: "glide", slot: "self", color: "#e8f4ff" },
  { id: "magnet", slot: "self", color: "#7cffb2" },
  { id: "freeze", slot: "atk", color: "#7ee7ff" },
  { id: "gust", slot: "atk", color: "#c9e8ff" },
  { id: "swap", slot: "atk", color: "#ffd36a" },
  { id: "slick", slot: "atk", color: "#7ee7ff" },
  { id: "quake", slot: "atk", color: "#ff4d8a" },
  { id: "shrink", slot: "atk", color: "#ff4d8a" },
  { id: "blade", slot: "self", color: "#e8f4ff" },
];

export const POWER_BY_ID: Record<PowerId, PowerDef> = Object.fromEntries(
  POWERS.map((p) => [p.id, p]),
) as Record<PowerId, PowerDef>;

export function randomPower(rng: () => number): PowerId {
  const self = POWERS.filter((p) => p.slot === "self");
  const pool = rng() < 0.7 ? self : POWERS;
  return pool[Math.floor(rng() * pool.length)!]!.id;
}

export function isAttack(id: PowerId): boolean {
  return POWER_BY_ID[id].slot === "atk";
}
