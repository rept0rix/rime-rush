import { useEffect, useState } from "react";
import { ActivityPulse } from "@/components/activity-pulse";
import { PhoneStage } from "@/components/phone-stage";
import { ConnectPrompt, shouldPromptConnect } from "@/components/connect-prompt";
import { GameView } from "@/components/game-view";
import { HubBoard } from "@/components/hub-board";
import { HubHome } from "@/components/hub-home";
import { HubProfile } from "@/components/hub-profile";
import { InstallSheet } from "@/components/install-sheet";
import { LobbyView } from "@/components/lobby-view";
import { MatchEnd } from "@/components/match-end";
import { MuteButton } from "@/components/mute-button";
import { NoteInbox } from "@/components/note-inbox";
import { audioBus } from "@/game/audio";
import { dir, t } from "@/game/i18n";
import { useGame } from "@/game/store";
import type { GameResult } from "@/game/types";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function RimeApp() {
  const screen = useGame((s) => s.screen);
  const result = useGame((s) => s.result);
  const lang = useGame((s) => s.save.lang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir(lang);
  }, [lang]);

  useEffect(() => {
    audioBus.setMute(useGame.getState().save.mute);
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
    <>
      <ActivityPulse />
      <PhoneStage>
        {screen === "play" && <PlayGate />}
        {screen === "lobby" && <LobbyView />}
        {screen === "menu" && <Hub />}
        {result && screen !== "lobby" && (result.mode === "solo" || result.mode === "train") && <Results />}
        {result && screen !== "lobby" && (result.mode === "bots" || result.mode === "laststand" || result.mode === "race") && (
          <MatchEndGate result={result} />
        )}
      </PhoneStage>
      <NoteInbox />
      <InstallSheet />
    </>
  );
}

function PlayGate() {
  const mode = useGame((s) => s.mode);
  const runId = useGame((s) => s.runId);
  // Solo / train / bots / replay: no WebRTC. Presence ghosts stay via live-tower.
  // Explicit ROOM / laststand / race keep their own P2P mesh inside LobbyView.
  return <GameView key={runId} mode={mode} />;
}

function Hub() {
  const hub = useGame((s) => s.hub);
  if (hub === "home") {
    return <HubHome />;
  }
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-bg pt-[max(8px,env(safe-area-inset-top))] pb-[max(8px,env(safe-area-inset-bottom))]">
      {hub === "board" && <HubBoard />}
      {hub === "me" && <HubProfile />}
    </div>
  );
}


function MatchEndGate({ result }: { result: GameResult }) {
  const setScreen = useGame((s) => s.setScreen);
  const setResult = useGame((s) => s.setResult);
  const replay = useGame((s) => s.replay);

  const onHome = () => {
    audioBus.setScene("off");
    setResult(null);
    setScreen("menu");
    useGame.getState().setRoom("");
    useGame.getState().setMode("solo");
  };

  return (
    <MatchEnd
      result={result}
      onHome={onHome}
      onRoom={() => replay()}
      roomLabel={result.mode === "bots" ? "Play again" : "Room"}
    />
  );
}

function Results() {
  const result = useGame((s) => s.result)!;
  const lang = useGame((s) => s.save.lang);
  const copy = t(lang);
  const setScreen = useGame((s) => s.setScreen);
  const setResult = useGame((s) => s.setResult);
  const replay = useGame((s) => s.replay);
  const games = useGame((s) => s.save.games);
  const bestFloor = useGame((s) => s.save.bestFloor);
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
    audioBus.setScene("off");
    setResult(null);
    setScreen("menu");
    useGame.getState().setRoom("");
    useGame.getState().setMode("solo");
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center pb-[max(20px,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto absolute right-3 top-[max(10px,env(safe-area-inset-top))] z-[60]">
        <MuteButton />
      </div>
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
          <div className="mt-3 flex items-center justify-center gap-3">
            <div className="flex flex-col items-center">
              <button type="button" className="active:scale-95" onClick={replay}>
                <img src="/ui/play.png" alt="Play" className="play-hungry h-14 w-auto object-contain" />
              </button>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-gold">
                {result.floor >= bestFloor ? "NEW BEST — GO" : `BEAT ${bestFloor}`}
              </p>
            </div>
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
