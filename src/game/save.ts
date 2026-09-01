import { unlockBadges } from "./achievements";
import type { Lang, PresenceStatus, SaveData } from "./types";
export type { SaveData };

const KEY = "rime-rush-save-v1";
const SAVE_VERSION = 8;

function cleanStatus(v: unknown): PresenceStatus {
  return v === "offline" || v === "waiting" ? v : "online";
}

function cleanLang(v: unknown): Lang | null {
  return v === "he" || v === "en" ? v : null;
}

/** Prefer Hebrew when browser/navigator is he / he-IL. */
export function detectLang(): Lang {
  try {
    const nav =
      typeof navigator !== "undefined"
        ? navigator.language || (navigator.languages && navigator.languages[0]) || ""
        : "";
    if (/^he\b/i.test(nav)) return "he";
  } catch {
    /* ignore */
  }
  return "en";
}

function baseDefaults(): SaveData {
  return {
    version: SAVE_VERSION,
    lang: detectLang(),
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
}

function migrate(raw: SaveData): SaveData {
  const prevVersion = typeof raw.version === "number" ? raw.version : 0;
  // Before v8 lang was forced to "en". On unlock, pick navigator once; after that keep saved choice.
  const lang = prevVersion >= 8 ? (cleanLang(raw.lang) ?? detectLang()) : detectLang();
  const merged: SaveData = {
    ...baseDefaults(),
    ...raw,
    version: SAVE_VERSION,
    lang,
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
    if (!txt) {
      const fresh = baseDefaults();
      writeSave(fresh);
      return fresh;
    }
    const raw = JSON.parse(txt) as SaveData;
    const prevVersion = typeof raw.version === "number" ? raw.version : 0;
    const merged = migrate(raw);
    // Persist unlock (navigator default / version bump) so it sticks once.
    if (prevVersion < SAVE_VERSION) writeSave(merged);
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
