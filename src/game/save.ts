import { unlockBadges } from "./achievements";
import type { PresenceStatus, SaveData } from "./types";
export type { SaveData };

const KEY = "rime-rush-save-v1";
const SAVE_VERSION = 7;

function cleanStatus(v: unknown): PresenceStatus {
  return v === "offline" || v === "waiting" ? v : "online";
}

const defaults: SaveData = {
  version: SAVE_VERSION,
  lang: "en",
  name: "",
  color: 0,
  mute: false,
  shake: true,
  bestFloor: 0,
  bestScore: 0,
  bestCombo: 0,
  games: 0,
  lastFloor: 0,
  badges: [],
  weapon: "blade",
  coins: 0,
  ownedSkins: [0],
  ownedWeapons: ["blade"],
  seenBoard: false,
  authProvider: "",
  status: "online",
  alerts: true,
};

function migrate(raw: SaveData): SaveData {
  const merged: SaveData = {
    ...defaults,
    ...raw,
    version: SAVE_VERSION,
    lang: "en",
    badges: raw.badges ?? [],
    ownedSkins: raw.ownedSkins?.length ? raw.ownedSkins : [0],
    ownedWeapons: raw.ownedWeapons?.length ? raw.ownedWeapons : ["blade"],
    coins: raw.coins ?? 0,
    seenBoard: !!raw.seenBoard,
    authProvider: raw.authProvider === "google" || raw.authProvider === "x" ? raw.authProvider : "",
    status: cleanStatus((raw as SaveData).status),
    alerts: raw.alerts !== false,
  };
  if (!merged.weapon) merged.weapon = "blade";
  if (merged.weapon && !merged.ownedWeapons.includes(merged.weapon)) {
    merged.ownedWeapons = [...merged.ownedWeapons, merged.weapon];
  }
  return merged;
}

export function loadSave(): SaveData {
  try {
    const txt = localStorage.getItem(KEY);
    if (!txt) return { ...defaults };
    return migrate(JSON.parse(txt) as SaveData);
  } catch {
    return { ...defaults };
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // private mode / quota
  }
}

export function clearSave(): SaveData {
  const next = { ...defaults };
  writeSave(next);
  return next;
}

export function recordRun(floor: number, score: number, combo: number): SaveData {
  const s = loadSave();
  s.games += 1;
  s.lastFloor = floor;
  s.bestFloor = Math.max(s.bestFloor, floor);
  s.bestScore = Math.max(s.bestScore, score);
  s.bestCombo = Math.max(s.bestCombo, combo);
  s.coins += 12 + floor + combo * 2;
  const fresh = unlockBadges(s);
  if (fresh.length) s.badges = [...s.badges, ...fresh];
  writeSave(s);
  return s;
}
