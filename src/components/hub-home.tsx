import { ContinueOffer } from "@/components/continue-offer";
import { ComboHud } from "@/components/combo-hud";
import { FeelTiles } from "@/components/feel-tiles";
import { PlayerFace } from "@/components/player-face";
import { useLiveTower } from "@/components/live-tower";
import { BellButton } from "@/components/note-inbox";
import { StatusDot } from "@/components/status-dot";
import { TouchControls } from "@/components/touch-controls";
import { Pause, Settings, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { audioBus } from "@/game/audio";
import { applyShake, applySound } from "@/game/haptics";
import { RimeEngine, type HudSnap } from "@/game/engine";
import { t } from "@/game/i18n";
import { makeRoomCode } from "@/game/room";
import { recordRun } from "@/game/save";
import { SKINS } from "@/game/sprites";
import { displayName, useGame } from "@/game/store";
import { dailySeed } from "@/game/world";
import { clientId } from "@/lib/client-id";
import { getDashboard, submitRun } from "@/lib/rime-data";
import { useCurrentUser } from "@/lib/auth/use-current-user";

export function HubHome() {
  const save = useGame((s) => s.save);
  const setScreen = useGame((s) => s.setScreen);
  const setMode = useGame((s) => s.setMode);
  const patchSave = useGame((s) => s.patchSave);
  const setHub = useGame((s) => s.setHub);
  const setResult = useGame((s) => s.setResult);
  const result = useGame((s) => s.result);
  const lang = save.lang;
  const copy = t(lang);
  const user = useCurrentUser();
  const signedIn = !!user && !user.isDevFallback;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<RimeEngine | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const startRef = useRef<() => void>(() => {});
  const [askName, setAskName] = useState(false);
  const [nameDraft, setNameDraft] = useState(() => save.name);
  const [live, setLive] = useState(false);
  const [settings, setSettings] = useState(false);
  const [hud, setHud] = useState<HudSnap | null>(null);
  const [online, setOnline] = useState(0);
  const [waiting, setWaiting] = useState(0);
  const [climbers, setClimbers] = useState<string[]>([]);
  const hadLive = useRef(false);
  const selfId = useRef(clientId()).current;
  // Presence ghosts via live-tower / activity-pulse — no WebRTC on hub solo.
  useLiveTower(engineRef, selfId);

  useEffect(() => {
    const load = () => {
      void getDashboard()
        .then((d) => {
          setOnline(d.onlineCount);
          setWaiting(d.waitingCount);
          setClimbers(
            d.online
              .filter((p) => p.status === "online" && p.screen === "play" && p.name !== displayName(save, lang))
              .map((p) => p.name)
              .slice(0, 6),
          );
        })
        .catch(() => {});
    };
    load();
    const tmr = window.setInterval(load, 4000);
    return () => window.clearInterval(tmr);
  }, []);

  const commitName = (): boolean => {
    const n = (nameDraft.trim() || save.name.trim() || "Climber").slice(0, 12);
    if (n !== save.name) patchSave({ name: n });
    setAskName(false);
    return true;
  };

  const startSolo = () => {
    const eng = engineRef.current;
    if (eng && !eng.attract && eng.mode === "solo" && eng.started) {
      setLive(true);
      return;
    }
    if (!commitName()) return;
    audioBus.unlock();
    if (save.status === "waiting") patchSave({ status: "online" });
    useGame.getState().setResult(null);
    useGame.getState().setInRun(true);
    const pl = engineRef.current?.local();
    if (pl) pl.name = (nameDraft.trim() || save.name.trim() || "Climber").slice(0, 12);
    engineRef.current?.beginPlay();
    setLive(true);
    setSettings(false);
    setMode("solo");
  };
  startRef.current = startSolo;

  const startRoom = () => {
    if (!commitName()) return;
    audioBus.unlock();
    if (save.status === "waiting") patchSave({ status: "online" });
    useGame.getState().setResult(null);
    useGame.getState().setJoining(false);
    useGame.getState().setRoom(makeRoomCode());
    setMode("laststand");
    setScreen("lobby");
  };

  const toMenu = () => {
    setLive(false);
    setSettings(false);
    setResult(null);
    useGame.getState().setInRun(false);
    engineRef.current?.returnAttract();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new RimeEngine(
      canvas,
      {
        mode: "train",
        seed: dailySeed(),
        localId: selfId,
        localName: displayName(save, lang),
        localColor: save.color,
        lang,
        shake: save.shake,
        mute: save.mute,
        bots: [],
        attract: true,
        weapon: save.weapon ?? "blade",
      },
      {
        onHud: (h) => {
          setHud(h);
          if (h.floor !== useGame.getState().liveFloor) useGame.getState().setLiveFloor(h.floor);
        },
        onOver: (r) => {
          const next = recordRun(r.floor, r.score, r.combo);
          patchSave(next);
          setResult(r);
          setLive(false);
          useGame.getState().setInRun(false);
          void submitRun({
            data: {
              clientId: clientId(),
              name: displayName(next, lang),
              floor: r.floor,
              score: r.score,
              combo: r.combo,
              mode: "solo",
              badges: next.badges,
            },
          }).catch(() => {});
        },
        onAttractStart: () => startRef.current(),
        onCoins: (n) => {
          const s = useGame.getState().save;
          patchSave({ coins: s.coins + n });
        },
      },
    );
    engineRef.current = engine;
    void engine.start();
    const onVis = () => {
      if (!document.hidden) engine.audio.resume();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      engine.stop();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save.color, lang]);

  useEffect(() => {
    if (live) {
      hadLive.current = true;
      engineRef.current?.setPaused(false);
    }
  }, [live]);

  useEffect(() => {
    if (hadLive.current && !live && !result) {
      hadLive.current = false;
      engineRef.current?.returnAttract();
      if (askName) engineRef.current?.setPaused(true);
    }
  }, [live, result, askName]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT") return;
      if (live && e.code === "Escape") {
        engineRef.current?.setPaused(true);
        setSettings(true);
        return;
      }
      if (live || useGame.getState().result) return;
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Enter") {
        e.preventDefault();
        startRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [live]);

  const skin = SKINS[save.color % SKINS.length]!;

  return (
    <div data-arcade-root data-phone-surface className="absolute inset-0 overflow-hidden bg-bg" dir="ltr">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        style={{ touchAction: "none" }}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={() => {
          if (!live && !result) startSolo();
        }}
      />

      {!live && !result && (
        <button
          type="button"
          aria-label={copy.play}
          onClick={startSolo}
          onPointerDown={startSolo}
          className="absolute inset-0 z-20 bg-transparent"
        />
      )}

      <div className={`absolute inset-x-0 top-0 z-30 flex items-start justify-between px-3 pt-[max(8px,env(safe-area-inset-top))] ${live || result ? "chrome-out" : ""}`}>
        <button
          type="button"
          aria-label={copy.profile}
          onClick={() => setHub("me")}
          className="flex items-center gap-2 rounded-full border border-line bg-[#140c08]/80 pr-3"
        >
          <span className="relative overflow-hidden rounded-full">
            <PlayerFace
              url={signedIn ? user?.profileImageUrl : null}
              skinId={skin.id}
              className="h-10 w-10 object-cover"
            />
            <span className="absolute right-0 bottom-0">
              <StatusDot status={save.status} />
            </span>
          </span>
          <span className="text-sm font-bold">{save.name.trim() || copy.profile}</span>
        </button>
        <div className="flex items-center gap-2">
          <BellButton />
          <p className="font-display text-lg text-gold">{save.coins}</p>
          <button
            type="button"
            aria-label="Board"
            onClick={() => {
              patchSave({ seenBoard: true });
              setHub("board");
            }}
            className="relative"
          >
            <img src="/ui/tab-board.png" alt="Board" className="h-12 w-12 object-contain" />
            {!save.seenBoard && <span className="absolute top-0 right-0 size-3 rounded-full bg-rose" />}
          </button>
        </div>
      </div>

      <div className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center ${live || result ? "chrome-out" : ""}`}>
        <div className="flex flex-col items-center">
          <div className="logo-sheen">
            <img src="/ui/logo.png" alt="Rime Rush" className="logo-ice h-24 w-auto" />
          </div>
          <p className="mt-3 rounded-full bg-[#140c08]/70 px-3 py-0.5 text-[10px] font-bold tracking-wide text-mint">
            {online} online
            {waiting ? ` · ${waiting} waiting` : ""}
            {climbers.length ? ` · ${climbers.slice(0, 3).join(", ")} climbing` : " · live tower"}
          </p>
          {!live && !result && (
            <button
              type="button"
              aria-label={copy.play}
              onClick={startSolo}
              className="pointer-events-auto mt-6 active:scale-95"
            >
              <img src="/ui/play.png" alt="Play" className="h-20 w-auto object-contain drop-shadow-lg" />
            </button>
          )}
        </div>
      </div>

      {askName && !live && (
        <div className="pointer-events-none absolute inset-x-0 top-[28%] z-40 flex justify-center">
          <div className="pointer-events-auto flex w-52 flex-col items-center gap-2">
            <input
              ref={nameRef}
              value={nameDraft}
              maxLength={12}
              placeholder={copy.name}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") startSolo();
              }}
              className="h-9 w-full rounded-md border border-[#6a4a28] bg-[#1a100c]/90 px-2 text-center text-sm text-fg outline-none placeholder:text-muted focus:border-ice"
            />
          </div>
        </div>
      )}

      {!askName && !live && !result && (
        <button
          type="button"
          aria-label="Room"
          onClick={startRoom}
          className="absolute right-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-30"
        >
          <span className="relative block">
            <img src="/ui/room.png" alt="Room" className="h-14 w-auto object-contain drop-shadow-lg" />
            <span className="absolute -top-1 -left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-mint px-1.5 text-[10px] font-bold text-bg">
              {online}
            </span>
          </span>
          <span className="mt-0.5 block text-center text-[10px] font-bold text-ice">{online} online</span>
        </button>
      )}

      {live && hud && (
        <div className="hud-in pointer-events-none absolute inset-x-0 top-0 z-40 px-2 pt-[max(8px,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between">
            <div className="pointer-events-auto flex gap-1.5">
              <IconBtn
                label={save.mute ? "unmute" : "mute"}
                onClick={() => {
                  const next = !save.mute;
                  patchSave({ mute: next });
                  applySound(next);
                  engineRef.current?.setMute(next);
                }}
              >
                {save.mute ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </IconBtn>
              <IconBtn
                label="pause"
                onClick={() => {
                  engineRef.current?.setPaused(true);
                  setSettings(true);
                }}
              >
                <Pause className="size-4" />
              </IconBtn>
              <IconBtn
                label="settings"
                onClick={() => {
                  engineRef.current?.setPaused(true);
                  setSettings(true);
                }}
              >
                <Settings className="size-4" />
              </IconBtn>
            </div>
            <div className="text-center">
              <p className="font-display text-2xl leading-none text-gold">{hud.score}</p>
            </div>
            <p className="font-display text-2xl leading-none text-ice">{hud.floor}</p>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[9px] font-bold text-rose">HP</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-sm border border-[#3a2018] bg-[#1a100c]">
              <div
                className="h-full bg-rose"
                style={{ width: `${Math.max(0, (hud.hp / hud.maxHp) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] font-bold text-ice">WPN</span>
            <div className="h-2.5 w-16 overflow-hidden rounded-sm border border-[#3a2018] bg-[#1a100c]">
              <div className="h-full bg-ice" style={{ width: `${Math.min(100, (hud.weaponT / 12) * 100)}%` }} />
            </div>
          </div>
          {hud.others.length > 0 && (
            <p className="mt-1 truncate text-center text-[10px] font-bold tracking-wide text-ice/75">
              {hud.others
                .filter((o) => o.alive)
                .slice(0, 3)
                .map((o) => `${o.name} ${o.floor}`)
                .join(" · ")}
            </p>
          )}
        </div>
      )}

      {live && hud && !settings && !hud.downed && hud.alive && (
        <ComboHud
          combo={hud.combo}
          comboKey={hud.comboKey}
          yell={hud.comboYell}
          gain={hud.lastGain}
          story={hud.story}
        />
      )}

      {live && hud?.downed && hud.continueLeft > 0.05 && (
        <ContinueOffer
          coins={save.coins}
          cost={hud.reviveCost}
          left={hud.continueLeft}
          onRevive={() => {
            if (save.coins < hud.reviveCost) return;
            patchSave({ coins: save.coins - hud.reviveCost });
            engineRef.current?.revive();
          }}
          onSkip={() => engineRef.current?.skipContinue()}
        />
      )}

      {live && hud && !hud.downed && !settings && (
        <TouchControls
          power={hud.power}
          weapon={hud.weapon}
          ammo={Math.ceil(hud.weaponT)}
          onMove={(x) => engineRef.current?.input.setTouch({ move: x })}
          onPower={(d) => engineRef.current?.input.setTouch({ power: d })}
          onWeapon={(d) => engineRef.current?.input.setTouch({ weapon: d })}
        />
      )}

      {settings && (
        <div data-arcade-root className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-bg/80">
          <p className="font-display text-6xl text-ice">{copy.pause}</p>
          <FeelTiles
            mute={save.mute}
            shake={save.shake}
            onMute={(muted) => {
              patchSave({ mute: muted });
              applySound(muted);
              engineRef.current?.setMute(muted);
            }}
            onShake={(on) => {
              patchSave({ shake: on });
              applyShake(on, engineRef.current);
            }}
          />
          <button
            type="button"
            className="active:scale-95"
            onClick={() => {
              setSettings(false);
              engineRef.current?.setPaused(false);
            }}
          >
            <img src="/ui/play.png" alt="Continue" className="h-14 w-auto object-contain" />
          </button>
          <button type="button" className="active:scale-95" onClick={toMenu}>
            <img src="/ui/home.png" alt="Menu" className="h-12 w-auto object-contain" />
          </button>
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-full bg-[#1a100c]/80 text-gold"
    >
      {children}
    </button>
  );
}
