import { useEffect, useState, type ReactNode } from "react";
import { audioBus } from "@/game/audio";
import { makeRoomCode } from "@/game/room";
import { SKINS } from "@/game/sprites";
import { useGame } from "@/game/store";
import { clientId } from "@/lib/client-id";
import {
  listBoard,
  listLiveClimbers,
  type BoardRow,
  type LiveClimber,
} from "@/lib/rime-data";

const CABINET_MQ = "(min-width: 1000px)";

function useCabinet(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(CABINET_MQ);
    const apply = () => setOn(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return on;
}

export function PhoneStage({ children }: { children: ReactNode }) {
  const cabinet = useCabinet();

  return (
    <div className="phone-cabinet">
      <div className="phone-cabinet-art" aria-hidden />
      <aside className="phone-rail phone-rail-left" aria-hidden={!cabinet}>
        {cabinet && <TowerRail />}
      </aside>
      <div className="phone-frame">
        <div className="phone-screen">{children}</div>
      </div>
      <aside className="phone-rail phone-rail-right" aria-hidden={!cabinet}>
        {cabinet && <SideRail />}
      </aside>
    </div>
  );
}

function TowerRail() {
  const [rows, setRows] = useState<LiveClimber[]>([]);
  const selfId = clientId();

  useEffect(() => {
    let on = true;
    const load = () => {
      void listLiveClimbers({ data: { clientId: selfId } })
        .then((list) => {
          if (!on) return;
          setRows(list.filter((p) => p.screen === "play"));
        })
        .catch(() => {});
    };
    load();
    const t = window.setInterval(load, 2500);
    return () => {
      on = false;
      window.clearInterval(t);
    };
  }, [selfId]);

  return (
    <div className="phone-plaque flex min-h-0 flex-1 flex-col overflow-hidden">
      <p className="arcade-title font-display text-2xl leading-none text-ice">ON THE TOWER</p>
      <p className="mt-1 text-[10px] font-bold tracking-[0.18em] text-muted uppercase">Live climbers</p>
      <ol className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
        {rows.length === 0 && (
          <li className="rounded-lg border border-dashed border-line/80 bg-[#140c08]/50 px-3 py-4 text-center text-xs text-muted">
            ghosts will appear
          </li>
        )}
        {rows.slice(0, 10).map((p) => {
          const skin = SKINS[p.color % SKINS.length]!;
          return (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-lg border border-line bg-[#140c08]/80 px-2 py-1.5"
            >
              <img
                src={`/sprites/${skin.id}/idle.png`}
                alt=""
                className="h-8 w-8 shrink-0 object-contain"
              />
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{p.name}</span>
              <span className="font-display text-lg leading-none text-ice">{p.floor}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function SideRail() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <KeysPlaque />
      <BoardPlaque />
      <RoomPlaque />
    </div>
  );
}

function KeysPlaque() {
  return (
    <div className="phone-plaque">
      <p className="arcade-title font-display text-2xl leading-none text-gold">KEYS</p>
      <ul className="mt-3 space-y-1.5 text-[11px] text-muted">
        <li className="flex items-center gap-2">
          <span className="flex gap-0.5">
            <K>←</K>
            <K>→</K>
          </span>
          <span className="text-fg/70">/</span>
          <span className="flex gap-0.5">
            <K>A</K>
            <K>D</K>
          </span>
          <span className="ml-auto font-bold tracking-wide text-ice">MOVE</span>
        </li>
        <li className="flex items-center gap-2">
          <K>SPACE</K>
          <span className="ml-auto font-bold tracking-wide text-ice">JUMP</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="flex gap-0.5">
            <K>J</K>
            <K>K</K>
          </span>
          <span className="ml-auto font-bold tracking-wide text-ice">ATK</span>
        </li>
        <li className="flex items-center gap-2">
          <K>ESC</K>
          <span className="ml-auto font-bold tracking-wide text-ice">PAUSE</span>
        </li>
      </ul>
    </div>
  );
}

function BoardPlaque() {
  const save = useGame((s) => s.save);
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const selfId = clientId();

  useEffect(() => {
    let on = true;
    const load = () => {
      void listBoard()
        .then((list) => {
          if (on) setRows(list);
        })
        .catch(() => {
          if (on) setRows([]);
        });
    };
    load();
    const t = window.setInterval(load, 8000);
    return () => {
      on = false;
      window.clearInterval(t);
    };
  }, []);

  const local: BoardRow = {
    name: save.name.trim() || "You",
    floor: save.bestFloor,
    score: save.bestScore,
    combo: save.bestCombo,
    userId: "local",
  };
  const shown =
    rows && rows.length ? rows.slice(0, 5) : save.bestFloor > 0 ? [local] : [];

  return (
    <div className="phone-plaque">
      <p className="arcade-title font-display text-2xl leading-none text-gold">HALL</p>
      <p className="mt-1 text-[10px] font-bold tracking-[0.18em] text-muted uppercase">Top marks</p>
      <ol className="mt-3 space-y-1">
        {shown.length === 0 && (
          <li className="text-xs text-muted">No marks yet.</li>
        )}
        {shown.map((r, i) => {
          const you = r.userId === selfId || r.userId === "local";
          return (
            <li key={`${r.userId}-${i}`} className="flex items-baseline gap-2 text-sm">
              <span className="w-4 font-display text-lg text-gold">{i + 1}</span>
              <span className={`min-w-0 flex-1 truncate font-bold ${you ? "text-ice" : ""}`}>
                {r.name}
              </span>
              <span className="font-display text-lg leading-none text-ice">{r.floor}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function RoomPlaque() {
  const screen = useGame((s) => s.screen);
  const inRun = useGame((s) => s.inRun);
  const busy = inRun || screen === "play" || screen === "lobby";

  const openRoom = () => {
    if (busy) return;
    audioBus.unlock();
    const s = useGame.getState();
    if (s.save.status === "waiting") s.patchSave({ status: "online" });
    s.setResult(null);
    s.setJoining(false);
    s.setRoom(makeRoomCode());
    s.setMode("laststand");
    s.setScreen("lobby");
  };

  return (
    <div className="phone-plaque">
      <p className="arcade-title font-display text-2xl leading-none text-mint">ROOM</p>
      <p className="mt-1 text-xs text-muted">Climb with a crew · last stand</p>
      <button
        type="button"
        disabled={busy}
        onClick={openRoom}
        className="mt-3 w-full rounded-lg border-2 border-[#5a3a20] bg-[#2a1c14] py-2 font-display text-xl tracking-wide text-gold enabled:active:scale-95 disabled:opacity-40"
      >
        {screen === "lobby" ? "IN A ROOM" : "OPEN ROOM"}
      </button>
    </div>
  );
}

function K({ children }: { children: ReactNode }) {
  return (
    <kbd className="arcade-key inline-block min-w-7 rounded-md px-1.5 py-0.5 text-center text-[10px] font-bold">
      {children}
    </kbd>
  );
}
