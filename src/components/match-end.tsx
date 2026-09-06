import type { GameResult } from "@/game/types";

function fmtSurvived(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.max(0, Math.round(s % 60));
  return `${m}m ${sec}s`;
}

interface Props {
  result: GameResult;
  onHome: () => void;
  onRoom: () => void;
  roomLabel?: string;
}

export function MatchEnd({ result, onHome, onRoom, roomLabel = "Room" }: Props) {
  const title =
    result.explain ??
    (result.winnerName ? `Match over — ${result.winnerName} wins.` : "Match over.");

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-[340px] rounded-2xl border-2 border-[#5a3a20] bg-[#1a100c] px-5 py-6 shadow-xl">
        <p className="text-center font-display text-2xl leading-tight text-ice">{title}</p>
        <ol className="mt-4 space-y-1.5">
          {result.ranks.map((r, i) => (
            <li
              key={r.id}
              className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                r.id === result.winnerId
                  ? "border-gold/50 bg-[#2a1c14] text-gold"
                  : "border-line bg-[#140c08]/80 text-fg"
              }`}
            >
              <span className="min-w-0 truncate font-bold">
                {i + 1}. {r.name}
              </span>
              <span className="ml-2 shrink-0 text-xs text-muted">
                {r.score} · {fmtSurvived(r.survived)}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onHome}
            className="h-11 rounded-xl border-2 border-[#5a3a20] bg-[#2a1c14] text-sm font-bold text-ice active:scale-[0.98]"
          >
            Home
          </button>
          <button
            type="button"
            onClick={onRoom}
            className="h-11 rounded-xl bg-ice text-sm font-bold text-bg active:scale-[0.98]"
          >
            {roomLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
