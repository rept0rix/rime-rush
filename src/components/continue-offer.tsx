import { MuteButton } from "@/components/mute-button";
import { deathCauseLine, type DeathCause } from "@/game/types";
export function ContinueOffer({
  coins,
  cost,
  cause,
  left,
  onRevive,
  onSkip,
}: {
  coins: number;
  cost: number;
  cause?: DeathCause | null;
  left: number;
  onRevive: () => void;
  onSkip: () => void;
}) {
  const ok = coins >= cost;
  return (
    <div className="pointer-events-auto absolute inset-x-0 top-24 z-40 flex flex-col items-center px-4">
      <div className="absolute right-3 -top-16">
        <MuteButton />
      </div>
      <p className="font-display text-4xl text-gold">CONTINUE?</p>
      <p className="mt-1 max-w-[280px] text-center text-sm font-semibold text-ice">{deathCauseLine(cause)}</p>
      <p className="mt-1 text-xs tabular-nums text-muted">{left.toFixed(1)}s left</p>
      <button
        type="button"
        disabled={!ok}
        onClick={onRevive}
        className={`mt-3 h-12 w-60 rounded-xl font-display text-lg active:scale-95 ${ok ? "bg-gold text-bg" : "bg-line text-muted"}`}
      >
        {ok ? `REVIVE · ${cost} coins` : `NEED ${cost} coins (you have ${coins})`}
      </button>
      <button
        type="button"
        onClick={onSkip}
        className="mt-3 h-11 w-60 rounded-xl border border-ice/35 bg-bg/70 font-display text-base text-ice active:scale-95"
      >
        PLAY AGAIN
      </button>
      <p className="mt-2 text-[11px] text-muted">You have {coins} coins</p>
    </div>
  );
}
