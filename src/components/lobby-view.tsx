import { useEffect, useState } from "react";
import { GameView } from "@/components/game-view";
import { StatusDot } from "@/components/status-dot";
import { makeRoomCode, roomId } from "@/game/room";
import { botName } from "@/game/bots";
import { SKINS } from "@/game/sprites";
import { displayName, useGame } from "@/game/store";
import { addFriend, getDashboard, inviteFriend, type PresenceRow } from "@/lib/rime-data";
import { useP2PRoom } from "@/lib/multiplayer";
import type { BotSeed, LobbyPlayer, Mode, NetMsg } from "@/game/types";
import { clientId } from "@/lib/client-id";

export function inviteUrl(code: string): string {
  if (typeof window === "undefined") return code;
  const u = new URL(window.location.href);
  u.searchParams.set("room", code.toUpperCase());
  return u.toString();
}

function leaveToMenu(): void {
  const s = useGame.getState();
  s.setRoom("");
  s.setJoining(false);
  s.setMode("solo");
  s.setScreen("menu");
  try {
    const u = new URL(window.location.href);
    u.searchParams.delete("room");
    window.history.replaceState(null, "", u.pathname + u.hash);
  } catch {
    /* ignore */
  }
}

export function LobbyView() {
  const joining = useGame((s) => s.joining);
  const existing = useGame((s) => s.room);

  useEffect(() => {
    if (existing) return;
    useGame.getState().setJoining(false);
    useGame.getState().setRoom(makeRoomCode());
  }, [existing]);

  if (!existing) {
    return (
      <div className="grid h-full place-items-center text-muted">
        <p className="font-display text-3xl text-ice">Opening room…</p>
      </div>
    );
  }

  return <LiveLobby key={existing} code={existing} host={!joining} />;
}

function LiveLobby({ code, host }: { code: string; host: boolean }) {
  const save = useGame((s) => s.save);
  const fillBots = useGame((s) => s.fillBots);
  const setFillBots = useGame((s) => s.setFillBots);
  const mpMode = useGame((s) => s.mpMode);
  const setMpMode = useGame((s) => s.setMpMode);
  const [started, setStarted] = useState<null | { seed: number; mode: Mode; bots: BotSeed[] }>(null);
  const [copied, setCopied] = useState("");
  const [online, setOnline] = useState<PresenceRow[]>([]);
  const [added, setAdded] = useState("");
  const [pinged, setPinged] = useState("");
  const name = displayName(save, "en");
  const link = inviteUrl(code);
  const p2p = useP2PRoom({ room: roomId(code), name });

  useEffect(() => {
    const load = () => {
      void getDashboard()
        .then((d) => setOnline(d.online.filter((p) => p.name !== name)))
        .catch(() => {});
    };
    load();
    const t = window.setInterval(load, 8000);
    return () => window.clearInterval(t);
  }, [name]);

  useEffect(() => {
    const unsub = p2p.onMessage((_from, data) => {
      const msg = data as NetMsg;
      if (!msg || typeof msg !== "object") return;
      if (msg.t === "lobby") {
        setMpMode(msg.mode === "race" ? "race" : "laststand");
        setFillBots(msg.bots);
      } else if (msg.t === "start") {
        setStarted({ seed: msg.seed, mode: msg.mode, bots: msg.bots });
      } else if (msg.t === "hello") {
        if (host) publishLobby(p2p, save.color, name, mpMode, fillBots, p2p.selfId);
      }
    });
    const tmr = window.setTimeout(() => {
      p2p.send({ t: "hello", name, color: save.color } satisfies NetMsg);
      if (host) publishLobby(p2p, save.color, name, mpMode, fillBots, p2p.selfId);
    }, 400);
    return () => {
      unsub();
      clearTimeout(tmr);
    };
  }, [p2p.onMessage, p2p.send, p2p.selfId, host, name, save.color, mpMode, fillBots]);

  useEffect(() => {
    if (host) publishLobby(p2p, save.color, name, mpMode, fillBots, p2p.selfId);
  }, [p2p.send, p2p.selfId, p2p.peers, host, fillBots, mpMode, name, save.color]);

  if (started) {
    return (
      <GameView
        mode={started.mode}
        seed={started.seed}
        bots={started.bots}
        net={{
          selfId: p2p.selfId,
          sendState: (pl) => p2p.broadcast({ t: "state", p: pl }),
          sendEvent: (msg) => p2p.send(msg),
          onMessage: p2p.onMessage,
        }}
      />
    );
  }

  const others = p2p.peers.map((peer, i) => ({
    id: peer.id,
    name: peer.name || `P${i + 2}`,
    color: (save.color + 1 + i) % 4,
    ready: peer.connectionState === "connected",
    state: peer.connectionState,
  }));

  const seats: ({ kind: "you" } | { kind: "peer"; p: (typeof others)[0] } | { kind: "empty" })[] = [{ kind: "you" }];
  for (const p of others) seats.push({ kind: "peer", p });
  while (seats.length < 4) seats.push({ kind: "empty" });

  const startMatch = () => {
    const bots: BotSeed[] = [];
    if (fillBots) {
      const need = Math.max(0, 4 - (1 + others.filter((o) => o.ready).length));
      for (let i = 0; i < need; i++) {
        bots.push({ id: `bot-${i}`, name: botName(i, "en"), color: (save.color + 1 + i) % 4 });
      }
    }
    const seed = (Math.random() * 1e9) | 0;
    const mode: Mode = mpMode;
    p2p.send({ t: "start", seed, mode, raceFloor: 60, bots } satisfies NetMsg);
    setStarted({ seed, mode, bots });
  };

  const copyLink = async (who?: string) => {
    const text = who ? `${who}, join my RIME RUSH room ${code} ${link}` : link;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(who ?? "link");
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      /* ignore */
    }
  };

  const share = async (who?: string) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "RIME RUSH",
          text: who ? `${who}, jump in` : "Join my tower",
          url: link,
        });
        return;
      }
    } catch {
      /* fall through */
    }
    await copyLink(who);
  };

  return (
    <div className="relative mx-auto flex h-full max-w-md flex-col overflow-y-auto px-4 pt-[max(16px,env(safe-area-inset-top))] pb-5">
      <button type="button" className="mb-2 self-start text-sm text-muted" onClick={leaveToMenu}>
        ← Back
      </button>

      <img src="/ui/room.png" alt="Room" className="mx-auto h-14 w-auto object-contain" />
      <p className="mt-1 text-center font-display text-5xl tracking-[0.28em] text-ice">{code}</p>
      {host && <p className="text-center text-[11px] font-bold text-gold">YOU HOST</p>}
      {!p2p.joined && <p className="text-center text-xs text-muted">Connecting…</p>}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void share()}
          className="h-11 rounded-xl border-2 border-[#5a3a20] bg-[#2a1c14] font-display text-xl text-gold"
        >
          INVITE
        </button>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="h-11 rounded-xl border-2 border-[#5a3a20] bg-[#2a1c14] text-sm font-bold text-ice"
        >
          {copied === "link" ? "COPIED" : "COPY LINK"}
        </button>
      </div>

      <p className="mt-4 font-display text-xl text-gold">Squad</p>
      <div className="mt-1 grid grid-cols-2 gap-2">
        {seats.map((s, i) => {
          if (s.kind === "you") {
            return <Seat key="you" name={name} color={save.color} tag={host ? "HOST" : "YOU"} />;
          }
          if (s.kind === "peer") {
            return (
              <Seat
                key={s.p.id}
                name={s.p.name}
                color={s.p.color}
                tag={s.p.ready ? "IN" : s.p.state}
              />
            );
          }
          return (
            <button
              key={`empty-${i}`}
              type="button"
              onClick={() => void share()}
              className="flex min-h-[88px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-[#140c08]/70"
            >
              <span className="font-display text-3xl text-muted">+</span>
              <span className="text-[11px] text-ice">Invite</span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 font-display text-xl text-gold">Online now</p>
      <div className="mt-1 space-y-1.5">
        {online.length === 0 && (
          <p className="rounded-xl border border-line bg-[#140c08]/70 px-3 py-3 text-xs text-muted">
            Nobody else online yet. Invite with the link.
          </p>
        )}
        {online.map((p, i) => (
          <div key={`${p.name}-${i}`} className="flex items-center gap-2 rounded-xl border border-line bg-[#140c08]/80 px-2 py-1.5">
            <img
              src={`/sprites/${SKINS[p.color % SKINS.length]!.id}/idle.png`}
              alt=""
              className="h-10 w-10 object-contain"
            />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-bold">
                <StatusDot status={p.status} />
                {p.name}
              </p>
              <p className="text-[10px] text-muted">
                {p.status === "waiting" ? "Waiting" : p.screen === "play" ? `Floor ${p.floor}` : p.screen}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void addFriend({ data: { clientId: clientId(), friendId: p.id } }).then(() => {
                  setAdded(p.id);
                  window.setTimeout(() => setAdded(""), 1400);
                });
              }}
              className="rounded-lg border border-line px-2 py-1 text-[11px] font-bold text-ice"
            >
              {added === p.id ? "ADDED" : "ADD"}
            </button>
            <button
              type="button"
              onClick={() => {
                void inviteFriend({
                  data: { clientId: clientId(), name, toId: p.id, room: code },
                }).then(() => {
                  setPinged(p.id);
                  window.setTimeout(() => setPinged(""), 1400);
                });
                void share(p.name);
              }}
              className="rounded-lg bg-ice px-2 py-1 text-[11px] font-bold text-bg"
            >
              {pinged === p.id || copied === p.name ? "SENT" : "INVITE"}
            </button>
          </div>
        ))}
      </div>

      {host && (
        <div className="mt-4 space-y-2">
          <div className="flex gap-2">
            <Toggle on={mpMode === "laststand"} onClick={() => setMpMode("laststand")}>
              Last stand
            </Toggle>
            <Toggle on={mpMode === "race"} onClick={() => setMpMode("race")}>
              Race
            </Toggle>
          </div>
          <label className="flex items-center justify-between rounded-xl border border-line bg-[#140c08]/80 px-3 py-2 text-sm">
            <span>Brawl — fill empty seats with bots</span>
            <input type="checkbox" checked={fillBots} onChange={(e) => setFillBots(e.target.checked)} />
          </label>
          <button type="button" onClick={startMatch} className="block w-full active:scale-[0.98]">
            <img src="/ui/play.png" alt="Open match" className="mx-auto h-16 w-auto object-contain" />
          </button>
        </div>
      )}
      {!host && <p className="mt-6 text-center text-sm text-muted">Waiting for host…</p>}
    </div>
  );
}

function Seat({ name, color, tag }: { name: string; color: number; tag: string }) {
  const skin = SKINS[color % SKINS.length]!;
  return (
    <div className="flex items-center gap-2 rounded-2xl border-2 border-[#5a3a20] bg-[#1a100c] px-2 py-2">
      <img src={`/sprites/${skin.id}/idle.png`} alt="" className="h-12 w-12 object-contain" />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{name}</p>
        <p className="text-[10px] text-gold">{tag}</p>
      </div>
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 flex-1 rounded-xl text-xs font-bold ${on ? "bg-ice text-bg" : "border border-line bg-[#140c08] text-muted"}`}
    >
      {children}
    </button>
  );
}

function publishLobby(
  p2p: { selfId: string; send: (d: unknown) => void; peers: { id: string; name: string; connectionState: string }[] },
  color: number,
  name: string,
  mode: "laststand" | "race",
  bots: boolean,
  hostId: string,
) {
  const players: LobbyPlayer[] = [
    { id: p2p.selfId, name, color, ready: true, bot: false },
    ...p2p.peers.map((p, i) => ({
      id: p.id,
      name: p.name || `P${i + 2}`,
      color: (color + 1 + i) % 4,
      ready: p.connectionState === "connected",
      bot: false,
    })),
  ];
  p2p.send({ t: "lobby", hostId, mode, bots, raceFloor: 60, players } satisfies NetMsg);
}
