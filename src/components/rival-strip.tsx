import { PLAYER_COLORS } from "@/game/constants";
import { POWER_NAME } from "@/game/i18n";
import type { PowerId } from "@/game/types";

export type RivalRow = {
  id: string;
  name: string;
  floor: number;
  score: number;
  power: PowerId | null;
  alive: boolean;
  color: number;
};

export function RivalStrip({ others }: { others: RivalRow[] }) {
  if (others.length === 0) return null;
  const rows = [...others]
    .sort((a, b) => Number(b.alive) - Number(a.alive) || b.floor - a.floor)
    .slice(0, 3);
  return (
    <div className="mt-1 flex gap-1 overflow-x-auto">
      {rows.map((o) => {
        const col = PLAYER_COLORS[o.color % 4]!;
        const power = o.power ? POWER_NAME.en[o.power] : "—";
        return (
          <div
            key={o.id}
            className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-[#3a2018]/70 bg-[#140c08]/70 px-1.5 py-1 ${
              o.alive ? "" : "opacity-55 grayscale"
            }`}
          >
            <span
              className="size-5 shrink-0 rounded-full border border-[#5a3a20]/80 shadow-sm"
              style={{ background: o.alive ? col : "#6a5a4a" }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-[10px] font-bold leading-tight ${
                  o.alive ? "text-ice" : "text-muted"
                }`}
              >
                {o.name}
                {!o.alive ? " · OUT" : ""}
              </p>
              <p className="truncate text-[9px] font-medium tabular-nums leading-tight text-fg/70">
                {power} · {o.score} · L{o.floor}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
