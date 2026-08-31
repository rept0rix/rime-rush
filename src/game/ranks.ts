export interface Rank {
  id: string;
  at: number;
  nameEn: string;
  nameHe: string;
}

export const RANKS: Rank[] = [
  { id: "frostling", at: 0, nameEn: "Frostling", nameHe: "כפורון" },
  { id: "climber", at: 10, nameEn: "Climber", nameHe: "מטפס" },
  { id: "skater", at: 25, nameEn: "Ice Skater", nameHe: "מחליק" },
  { id: "rimer", at: 50, nameEn: "Rimer", nameHe: "ריימר" },
  { id: "rat", at: 80, nameEn: "Tower Rat", nameHe: "חולדת מגדל" },
  { id: "lord", at: 120, nameEn: "Ice Lord", nameHe: "אדון קרח" },
  { id: "god", at: 200, nameEn: "Rime God", nameHe: "אל הריים" },
];

export function rankOf(floor: number): Rank {
  let best = RANKS[0]!;
  for (const r of RANKS) if (floor >= r.at) best = r;
  return best;
}

export function nextRank(floor: number): Rank | null {
  return RANKS.find((r) => r.at > floor) ?? null;
}

export function rankProgress(floor: number): number {
  const cur = rankOf(floor);
  const nxt = nextRank(floor);
  if (!nxt) return 1;
  const span = nxt.at - cur.at;
  return span <= 0 ? 1 : Math.min(1, (floor - cur.at) / span);
}

export function rankName(floor: number, lang: "he" | "en"): string {
  const r = rankOf(floor);
  return lang === "he" ? r.nameHe : r.nameEn;
}
