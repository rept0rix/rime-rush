import { StatusDot } from "@/components/status-dot";
import { useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { pushAlert } from "@/lib/alerts";
import { clientId } from "@/lib/client-id";
import { listNotes, markNotesRead, type NoteRow } from "@/lib/rime-data";
import { useGame } from "@/game/store";

export function NoteInbox() {
  const overlay = useGame((s) => s.overlay);
  const setOverlay = useGame((s) => s.setOverlay);
  const setUnread = useGame((s) => s.setUnreadNotes);
  const alerts = useGame((s) => s.save.alerts);
  const status = useGame((s) => s.save.status);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [toast, setToast] = useState<NoteRow | null>(null);
  const seen = useRef(new Set<number>());
  const primed = useRef(false);

  useEffect(() => {
    let on = true;
    const load = () => {
      void listNotes({ data: { clientId: clientId() } })
        .then((pack) => {
          if (!on) return;
          setNotes(pack.notes);
          setUnread(pack.unread);
          if (alerts && status !== "offline") {
            for (const n of pack.notes) {
              if (n.read || seen.current.has(n.id)) continue;
              if (primed.current) {
                pushAlert(
                  n.kind === "invite" ? `${n.fromName} invited you` : `${n.fromName} is online`,
                  n.body,
                );
                setToast(n);
              }
              seen.current.add(n.id);
            }
          }
          primed.current = true;
        })
        .catch(() => {});
    };
    load();
    const ms = status === "offline" ? 20000 : 6000;
    const t = window.setInterval(load, ms);
    return () => {
      on = false;
      window.clearInterval(t);
    };
  }, [alerts, status, setUnread]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const join = (room: string) => {
    const code = room.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    if (!/^[A-Z0-9]{4,6}$/.test(code)) return;
    const s = useGame.getState();
    s.setJoining(true);
    s.setRoom(code);
    s.setMode("laststand");
    s.setScreen("lobby");
    s.setOverlay(null);
    setToast(null);
  };

  const close = () => {
    setOverlay(null);
    const unread = notes.filter((n) => !n.read).map((n) => n.id);
    if (unread.length) {
      void markNotesRead({ data: { clientId: clientId(), ids: unread } }).catch(() => {});
      setUnread(0);
      setNotes((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  return (
    <>
      {toast && overlay !== "notes" && (
        <button
          type="button"
          onClick={() => {
            if (toast.kind === "invite" && toast.room) join(toast.room);
            else setOverlay("notes");
            setToast(null);
          }}
          className="fixed inset-x-3 top-[max(12px,env(safe-area-inset-top))] z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-ice/40 bg-surface px-3 py-2.5 text-start shadow-lg"
        >
          <StatusDot status={toast.kind === "invite" ? "waiting" : "online"} size="md" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">{toast.fromName}</span>
            <span className="block truncate text-[11px] text-muted">{toast.body}</span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-ice">
            {toast.kind === "invite" ? "Join" : "Open"}
          </span>
        </button>
      )}

      {overlay === "notes" && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-bg/70">
          <button type="button" aria-label="Dismiss" className="absolute inset-0" onClick={close} />
          <div className="relative w-full max-w-md rounded-t-3xl border border-line bg-surface px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 font-display text-3xl text-ice">
                <Bell className="size-5" /> Alerts
              </p>
              <button type="button" aria-label="Close" onClick={close} className="grid size-10 place-items-center text-muted">
                <X className="size-5" />
              </button>
            </div>
            <div className="max-h-[52dvh] space-y-2 overflow-y-auto">
              {notes.length === 0 && (
                <p className="rounded-2xl border border-line bg-bg px-3 py-4 text-sm text-muted">
                  Add friends from the board or a room. When they come online or invite you, it lands here.
                </p>
              )}
              {notes.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${
                    n.read ? "border-line bg-bg" : "border-ice/40 bg-bg"
                  }`}
                >
                  <StatusDot status={n.kind === "invite" ? "waiting" : "online"} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{n.fromName}</p>
                    <p className="truncate text-[11px] text-muted">{n.body}</p>
                  </div>
                  {n.kind === "invite" && n.room ? (
                    <button
                      type="button"
                      onClick={() => join(n.room)}
                      className="h-9 rounded-xl bg-ice px-3 text-xs font-bold text-bg"
                    >
                      JOIN
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-mint">In</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function BellButton() {
  const unread = useGame((s) => s.unreadNotes);
  const setOverlay = useGame((s) => s.setOverlay);
  return (
    <button
      type="button"
      aria-label="Alerts"
      onClick={() => setOverlay("notes")}
      className="relative grid size-11 place-items-center rounded-full border border-line bg-[#140c08]/80 text-ice"
    >
      <Bell className="size-5" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose px-1 text-[9px] font-bold text-fg">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}
