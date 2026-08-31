import { useEffect, useState } from "react";
import { ActivityPulse } from "@/components/activity-pulse";
import { ConnectPrompt, shouldPromptConnect } from "@/components/connect-prompt";
import { GameView } from "@/components/game-view";
import { HubBoard } from "@/components/hub-board";
import { HubHome } from "@/components/hub-home";
import { HubProfile } from "@/components/hub-profile";
import { InstallSheet } from "@/components/install-sheet";
import { LobbyView } from "@/components/lobby-view";
import { NoteInbox } from "@/components/note-inbox";
import { audioBus } from "@/game/audio";
import { t } from "@/game/i18n";
import { displayName, useGame } from "@/game/store";
import { clientId } from "@/lib/client-id";
import { useP2PRoom } from "@/lib/multiplayer";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function RimeApp() {
  const screen = useGame((s) => s.screen);
  const result = useGame((s) => s.result);

  useEffect(() => {
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
  }, []);

  useEffect(() => {
    try {
      const raw = new URLSearchParams(window.location.search).get("room");
      if (!raw) return;
      const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
      if (!/^[A-Z0-9]{4,6}$/.test(code)) return;
      const s = useGame.getState();
      s.setJoining(true);
      s.setRoom(code);
      s.setMode("laststand");
      s.setScreen("lobby");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const unlock = () => audioBus.unlock();
    const block = (e: Event) => e.preventDefault();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("touchstart", unlock, { passive: true });
    window.addEventListener("touchend", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    window.addEventListener("contextmenu", block);
    document.addEventListener("contextmenu", block);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("touchend", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("contextmenu", block);
      document.removeEventListener("contextmenu", block);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-bg text-fg">
      <ActivityPulse />
      <NoteInbox />
      <InstallSheet />
      {screen === "play" && <PlayGate />}
      {screen === "lobby" && <LobbyView />}
      {screen === "menu" && <Hub />}
      {result && screen !== "lobby" && <Results />}
    </div>
  );
}

function PlayGate() {
  const mode = useGame((s) => s.mode);
  const runId = useGame((s) => s.runId);
  const save = useGame((s) => s.save);
  const p2p = useP2PRoom({
    room: "rime-live",
    name: displayName(save, "en"),
    selfId: clientId(),
  });
  return (
    <GameView
      key={runId}
      mode={mode}
      net={{
        selfId: p2p.selfId,
        sendState: (pl) => p2p.broadcast({ t: "state", p: pl }),
        sendEvent: (msg) => p2p.send(msg),
        onMessage: p2p.onMessage,
      }}
    />
  );
}

function Hub() {
  const hub = useGame((s) => s.hub);
  if (hub === "home") {
    return (
      <div className="absolute inset-0 overflow-hidden bg-bg">
        <HubHome />
      </div>
    );
  }
  return (
    <div className="absolute inset-0 flex justify-center overflow-hidden bg-bg">
      <div className="relative z-10 mx-auto flex h-full w-full max-w-md flex-col pt-[max(8px,env(safe-area-inset-top))] pb-[max(8px,env(safe-area-inset-bottom))]">
        {hub === "board" && <HubBoard />}
        {hub === "me" && <HubProfile />}
      </div>
    </div>
  );
}

function Results() {
  const result = useGame((s) => s.result)!;
  const copy = t("en");
  const setScreen = useGame((s) => s.setScreen);
  const setResult = useGame((s) => s.setResult);
  const replay = useGame((s) => s.replay);
  const games = useGame((s) => s.save.games);
  const { user, isPending } = useCurrentUserState();
  const signedIn = !!user && !user.isDevFallback;
  const [hideConnect, setHideConnect] = useState(false);
  const showConnect = !isPending && !hideConnect && shouldPromptConnect(games, signedIn);

  useEffect(() => {
    let ready = false;
    const wait = window.setTimeout(() => {
      ready = true;
    }, 900);
    const onKey = (e: KeyboardEvent) => {
      if (!ready || e.repeat) return;
      if (e.code === "Space" || e.code === "Enter" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        replay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(wait);
      window.removeEventListener("keydown", onKey);
    };
  }, [replay]);

  const goHome = () => {
    setResult(null);
    setScreen("menu");
    useGame.getState().setRoom("");
    useGame.getState().setMode("solo");
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center pb-[max(20px,env(safe-area-inset-bottom))]">
      {showConnect && <ConnectPrompt onClose={() => setHideConnect(true)} />}
      <div className="relative w-[92%] max-w-[360px]">
        <img src="/ui/fell-board.png" alt="" className="w-full object-contain" />
        <div className="absolute inset-[12%] flex flex-col items-center justify-center">
          <img src="/ui/you-fell.png" alt="You fell" className="h-12 w-auto object-contain" />
          <div className="mt-2 flex items-end gap-6 text-center">
            <Stat n={result.floor} l={copy.floor} />
            <Stat n={result.combo} l={copy.combo} />
            <Stat n={result.score} l={copy.score} />
          </div>
          {result.ranks.length > 1 && (
            <ol className="mt-1 text-[10px] text-fg">
              {result.ranks.map((r, i) => (
                <li key={r.id}>
                  {i + 1}. {r.name} · {r.floor}
                </li>
              ))}
            </ol>
          )}
          <div className="mt-3 flex items-center justify-center gap-2">
            <button type="button" className="active:scale-95" onClick={replay}>
              <img src="/ui/play.png" alt="Play" className="h-12 w-auto object-contain" />
            </button>
            <button type="button" className="active:scale-95" onClick={goHome}>
              <img src="/ui/home.png" alt="Home" className="h-12 w-auto object-contain" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <div>
      <p className="font-display text-4xl leading-none text-gold drop-shadow">{n}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted">{l}</p>
    </div>
  );
}
