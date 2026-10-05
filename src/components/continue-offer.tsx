import { deathCauseLine } from "@/game/i18n";
import type { DeathCause } from "@/game/types";

export function ContinueOffer({
  coins,
  cost,
  left,
  cause,
  onRevive,
  onSkip,
}: {
  coins: number;
  cost: number;
  left: number;
  cause?: DeathCause | null;
  onRevive: () => void;
  onSkip: () => void;
}) {
  const ok = coins >= cost;
  return (
    <div className="pointer-events-auto absolute inset-x-0 top-20 z-40 flex flex-col items-center px-4">
      <p className="font-display text-4xl tracking-wide text-gold drop-shadow">CONTINUE?</p>
      <p className="mt-1 max-w-[280px] text-center text-sm font-semibold text-ice">
        {deathCauseLine(cause)}
      </p>
      <p className="mt-1 text-xs tabular-nums text-muted">{left.toFixed(1)}s left</p>
      <button
        type="button"
        disabled={!ok}
        onClick={onRevive}
        className={`mt-3 flex h-12 w-[min(100%,240px)] items-center justify-center rounded-xl font-display text-lg tracking-wide active:scale-95 ${
          ok ? "bg-gold text-bg shadow-[0_0_18px_rgba(255,211,106,0.45)]" : "bg-line text-muted"
        }`}
      >
        {ok ? `REVIVE · ${cost} coins` : `NEED ${cost} coins (you have ${coins})`}
      </button>
      <button
        type="button"
        onClick={onSkip}
        className="mt-3 flex h-11 w-[min(100%,240px)] items-center justify-center rounded-xl border border-ice/35 bg-bg/70 font-display text-base tracking-wide text-ice active:scale-95"
      >
        PLAY AGAIN
      </button>
      <p className="mt-2 text-[11px] text-muted">
        {ok ? `You have ${coins} coins` : "Skip for a fresh run"}
      </p>
    </div>
  );
}
