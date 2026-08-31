interface Props {
  title: string;
  body: string;
  confirm: string;
  danger?: boolean;
  busy?: boolean;
  onYes: () => void;
  onNo: () => void;
}

export function ArcadeConfirm({ title, body, confirm, danger, busy, onYes, onNo }: Props) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-bg/80 px-4">
      <div className="relative w-full max-w-[340px]">
        <img src="/ui/fell-board.png" alt="" className="w-full object-contain" />
        <div className="absolute inset-[11%] flex flex-col items-center justify-center text-center">
          <p className={`font-display text-4xl leading-none ${danger ? "text-rose" : "text-gold"}`}>{title}</p>
          <p className="mt-2 max-w-[220px] text-xs font-medium text-fg">{body}</p>
          <div className="mt-3 flex items-center gap-3">
            <button type="button" disabled={busy} onClick={onNo} className="active:scale-95 disabled:opacity-50">
              <img src="/ui/home.png" alt="Cancel" className="h-12 w-auto object-contain" />
            </button>
            <button type="button" disabled={busy} onClick={onYes} className="active:scale-95 disabled:opacity-50">
              <img src="/ui/enter.png" alt={confirm} className="h-12 w-auto object-contain" />
            </button>
          </div>
          <p className={`mt-1 font-display text-lg ${danger ? "text-rose" : "text-ice"}`}>
            {busy ? "…" : confirm}
          </p>
        </div>
      </div>
    </div>
  );
}
