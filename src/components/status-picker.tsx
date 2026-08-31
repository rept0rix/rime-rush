import { StatusDot, statusLabel } from "@/components/status-dot";
import type { PresenceStatus } from "@/game/types";

const OPTIONS: PresenceStatus[] = ["online", "waiting", "offline"];

export function StatusPicker({
  value,
  onChange,
}: {
  value: PresenceStatus;
  onChange: (next: PresenceStatus) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-bg p-1.5">
      {OPTIONS.map((opt) => {
        const on = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`flex h-11 items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-colors ${
              on ? "bg-surface text-fg" : "text-muted"
            }`}
          >
            <StatusDot status={opt} />
            {statusLabel(opt)}
          </button>
        );
      })}
    </div>
  );
}
