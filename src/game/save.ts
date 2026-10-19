import { unlockBadges } from "./achievements";
import type { Lang, PresenceStatus, SaveData } from "./types";
export type { SaveData };

const KEY = "rime-rush-save-v1";
const SAVE_VERSION = 10;

function cleanStatus(v: unknown): PresenceStatus {
  return v === "offline" || v === "waiting" ? v : "online";
}

function cleanLang(_v: unknown): Lang {
  return "en";
}

/** English-only UI: always EN regardless of navigator. */
export function detectLang(): Lang {
  return "en";
}

function baseDefaults(): SaveData {
  return {
    version: SAVE_VERSION,
    lang: detectLang(),
    name: "",
    color: 0,
    outfit: 0,
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
    ownedSkins: [0, 1, 2],
    ownedWeapons: ["blade"],
    seenBoard: false,
    authProvider: "",
    status: "online",
    alerts: true,
    coachLeft: 3,
  };
}

function migrate(raw: SaveData): SaveData {
  const prevVersion = typeof raw.version === "number" ? raw.version : 0;
  // English-only UI: always coerce saved lang to "en".
  const lang = cleanLang(raw.lang);
  const rawSkins = Array.isArray(raw.ownedSkins) && raw.ownedSkins.length ? raw.ownedSkins : [0, 1, 2];
  const merged: SaveData = {
    ...baseDefaults(),
    ...raw,
    version: SAVE_VERSION,
    lang,
    badges: raw.badges ?? [],
    ownedSkins: Array.from(new Set([0, 1, 2, ...rawSkins])).sort((a, b) => a - b),
    ownedWeapons: raw.ownedWeapons?.length ? raw.ownedWeapons : ["blade"],
    coins: raw.coins ?? 0,
    seenBoard: !!raw.seenBoard,
    authProvider: raw.authProvider === "google" || raw.authProvider === "x" || raw.authProvider === "email" ? raw.authProvider : "",
    status: cleanStatus((raw as SaveData).status),
    alerts: raw.alerts !== false,
  };
  if (prevVersion < 9) {
    merged.coachLeft = (raw.games ?? 0) >= 3 ? 0 : 3;
  } else {
    merged.coachLeft = typeof (raw as { coachLeft?: unknown }).coachLeft === "number"
      ? (raw as SaveData).coachLeft
      : 3;
  }
  if (!merged.weapon) merged.weapon = "blade";
  if (merged.color < 0 || merged.color > 11) merged.color = 0;
  const rawOutfit = (raw as { outfit?: unknown }).outfit;
  merged.outfit = typeof rawOutfit === "number" && rawOutfit >= 0 && rawOutfit <= 2 ? Math.floor(rawOutfit) : 0;
  if (merged.weapon && !merged.ownedWeapons.includes(merged.weapon)) {
    merged.ownedWeapons = [...merged.ownedWeapons, merged.weapon];
  }
  return merged;
}

export function loadSave(): SaveData {
  try {
    const txt = localStorage.getItem(KEY);
    if (!txt) {
      const fresh = baseDefaults();
      writeSave(fresh);
      return fresh;
    }
    const raw = JSON.parse(txt) as SaveData;
    const prevVersion = typeof raw.version === "number" ? raw.version : 0;
    const merged = migrate(raw);
    merged.lang = "en";
    // Persist unlock (version bump) or lang coerce so EN sticks.
    if (prevVersion < SAVE_VERSION || raw.lang !== "en") writeSave(merged);
    return merged;
  } catch {
    return baseDefaults();
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
  const next = baseDefaults();
  writeSave(next);
  return next;
}

export function recordRun(floor: number, score: number, combo: number, current?: SaveData): SaveData {
  const s = current ? { ...current } : loadSave();
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
