import type { Lang, SaveData } from "./types";

export interface Badge {
  id: string;
  at?: number;
  nameEn: string;
  nameHe: string;
  hintEn: string;
  hintHe: string;
}

export const BADGES: Badge[] = [
  { id: "first", nameEn: "First climb", nameHe: "טיפוס ראשון", hintEn: "Finish a run.", hintHe: "סיים ריצה." },
  { id: "floor10", nameEn: "Floor 10", nameHe: "קומה 10", hintEn: "Reach floor 10.", hintHe: "הגע לקומה 10." },
  { id: "floor25", nameEn: "Floor 25", nameHe: "קומה 25", hintEn: "Reach floor 25.", hintHe: "הגע לקומה 25." },
  { id: "floor50", nameEn: "Floor 50", nameHe: "קומה 50", hintEn: "Reach floor 50.", hintHe: "הגע לקומה 50." },
  { id: "floor100", nameEn: "Century", nameHe: "מאה", hintEn: "Reach floor 100.", hintHe: "הגע לקומה 100." },
  { id: "combo5", nameEn: "Good!", nameHe: "יפה!", hintEn: "Hit a 5 combo.", hintHe: "הגע לקומבו 5." },
  { id: "combo10", nameEn: "Extreme", nameHe: "קיצוני", hintEn: "Hit a 10 combo.", hintHe: "הגע לקומבו 10." },
  { id: "combo20", nameEn: "Horrifying", nameHe: "מטורף", hintEn: "Hit a 20 combo.", hintHe: "הגע לקומבו 20." },
  { id: "games10", nameEn: "Regular", nameHe: "קבוע", hintEn: "Play 10 games.", hintHe: "שחק 10 משחקים." },
  { id: "score5k", nameEn: "High roller", nameHe: "ניקוד גדול", hintEn: "Score 5,000.", hintHe: "הגע ל־5,000 נקודות." },
];

export function badgeName(b: Badge, lang: Lang): string {
  return lang === "he" ? b.nameHe : b.nameEn;
}

export function badgeHint(b: Badge, lang: Lang): string {
  return lang === "he" ? b.hintHe : b.hintEn;
}

export function unlockBadges(save: SaveData): string[] {
  const have = new Set(save.badges);
  const add: string[] = [];
  const tryAdd = (id: string, ok: boolean) => {
    if (ok && !have.has(id)) add.push(id);
  };
  tryAdd("first", save.games >= 1);
  tryAdd("floor10", save.bestFloor >= 10);
  tryAdd("floor25", save.bestFloor >= 25);
  tryAdd("floor50", save.bestFloor >= 50);
  tryAdd("floor100", save.bestFloor >= 100);
  tryAdd("combo5", save.bestCombo >= 5);
  tryAdd("combo10", save.bestCombo >= 10);
  tryAdd("combo20", save.bestCombo >= 20);
  tryAdd("games10", save.games >= 10);
  tryAdd("score5k", save.bestScore >= 5000);
  return add;
}
