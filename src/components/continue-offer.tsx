export function ContinueOffer({
  coins,
  cost,
  left,
  onRevive,
  onSkip,
}: {
  coins: number;
  cost: number;
  left: number;
  onRevive: () => void;
  onSkip: () => void;
}) {
  const ok = coins >= cost;
  return (
    <div className="pointer-events-auto absolute inset-x-0 top-24 z-40 flex flex-col items-center px-4">
      <p className="font-display text-4xl text-gold">CONTINUE?</p>
      <p className="text-xs text-muted">{left.toFixed(1)}s</p>
      <button
        type="button"
        disabled={!ok}
        onClick={onRevive}
        className={`mt-2 h-11 w-48 rounded-lg font-display text-xl ${ok ? "bg-gold text-bg" : "bg-line text-muted"}`}
      >
        {ok ? `REVIVE  ${cost}` : `NEED ${cost}`}
      </button>
      <button type="button" onClick={onSkip} className="mt-2 text-[11px] text-muted underline">
        Let me fall · {coins} coins
      </button>
    </div>
  );
}
