import type { Lang } from "./types";

export const FACTION_YOU = "RIME";
export const FACTION_THEM = "EMBER";

export const RAID_NAMES: Record<Lang, string[]> = {
  en: ["Ash", "Cinder", "Blaze"],
  he: ["אפר", "גחל", "להבה"],
};

const BEATS: { at: number; en: string; he: string }[] = [
  { at: 0, en: "RIME CLAN  vs  EMBER RAIDERS", he: "שבט ריים  נגד  פשיטת אמבר" },
  { at: 6, en: "Raiders climb with you. Shove them off.", he: "הפשיטה מטפסת איתך. תדחו אותם." },
  { at: 12, en: "THE ROOTS — beasts wake below", he: "השורשים — החיות מתעוררות" },
  { at: 20, en: "TEMPLE — Ember wants the relics", he: "המקדש — אמבר רוצים את השרידים" },
  { at: 32, en: "CANOPY — don't look down", he: "החופה — אל תביטו למטה" },
  { at: 40, en: "FUNGAL — the tower hunts both clans", he: "הפטריות — המגדל צד את שני השבטים" },
  { at: 52, en: "OPEN SKY — last stretch", he: "השמיים — הישורת האחרונה" },
  { at: 60, en: "THE KEEP — only one clan tops out", he: "המצודה — רק שבט אחד מגיע למעלה" },
  { at: 80, en: "SOLAR — the crown of the tower", he: "השמש — כתר המגדל" },
  { at: 100, en: "FROST — nothing left but climb", he: "הכפור — נשאר רק לטפס" },
];

export function storyBeat(floor: number, lang: Lang): string | null {
  let line: string | null = null;
  for (const b of BEATS) {
    if (floor >= b.at) line = lang === "he" ? b.he : b.en;
  }
  return line;
}

export function storyJustHit(floor: number): boolean {
  return BEATS.some((b) => b.at === floor);
}
