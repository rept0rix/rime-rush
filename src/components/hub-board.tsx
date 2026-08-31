import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StatusDot } from "@/components/status-dot";
import { t } from "@/game/i18n";
import { getDashboard, listBoard, addFriend, type BoardRow } from "@/lib/rime-data";
import { useGame } from "@/game/store";
import { clientId } from "@/lib/client-id";
import { UserPlus } from "lucide-react";

export function HubBoard() {
  const save = useGame((s) => s.save);
  const setHub = useGame((s) => s.setHub);
  const copy = t("en");
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [online, setOnline] = useState(0);
  const [waiting, setWaiting] = useState(0);
  const [added, setAdded] = useState<string>("");
  const selfId = clientId();

  useEffect(() => {
    void listBoard()
      .then(setRows)
      .catch(() => setRows([]));
    void getDashboard()
      .then((d) => {
        setOnline(d.onlineCount);
        setWaiting(d.waitingCount);
      })
      .catch(() => {});
  }, []);

  const local: BoardRow = {
    name: save.name.trim() || "You",
    floor: save.bestFloor,
    score: save.bestScore,
    combo: save.bestCombo,
    userId: "local",
  };

  const shown =
    rows && rows.length
      ? rows
      : save.bestFloor > 0
        ? [local]
        : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 pt-4">
      <button type="button" className="mb-2 self-start text-sm text-muted" onClick={() => setHub("home")}>
        ← Back
      </button>
      <h1 className="arcade-title font-display text-4xl text-ice">{copy.tabBoard}</h1>
      <p className="text-sm text-muted">
        {copy.boardTitle}
        {online > 0 ? ` · ${online} online` : ""}
        {waiting > 0 ? ` · ${waiting} waiting` : ""}
      </p>
      <Link to="/dash" className="mt-2 text-xs text-ice">
        {copy.liveDash} →
      </Link>
      <ol className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pb-4">
        {shown.length === 0 && <p className="text-sm text-muted">{copy.boardEmpty}</p>}
        {shown.map((r, i) => (
          <li
            key={`${r.userId}-${i}`}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-3"
          >
            <span className="w-7 font-display text-2xl text-gold">{i + 1}</span>
            <span className="flex-1 truncate font-bold">{r.name}</span>
            <span className="text-sm text-ice">{r.floor}</span>
            <span className="text-xs text-muted">{r.score}</span>
            {r.userId !== "local" && r.userId !== selfId && (
              <button
                type="button"
                aria-label="Add friend"
                onClick={() => {
                  void addFriend({ data: { clientId: selfId, friendId: r.userId } }).then(() => {
                    setAdded(r.userId);
                    window.setTimeout(() => setAdded(""), 1400);
                  });
                }}
                className="grid size-9 place-items-center rounded-lg text-ice"
              >
                {added === r.userId ? (
                  <StatusDot status="online" />
                ) : (
                  <UserPlus className="size-4" />
                )}
              </button>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
