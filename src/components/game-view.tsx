import { ContinueOffer } from "@/components/continue-offer";
import { MuteButton } from "@/components/mute-button";
import { ComboHud } from "@/components/combo-hud";
import { RivalStrip } from "@/components/rival-strip";
import { useLiveTower } from "@/components/live-tower";
import { TouchControls } from "@/components/touch-controls";
import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { botName } from "@/game/bots";
import { RimeEngine, type HudSnap } from "@/game/engine";
import { t } from "@/game/i18n";
import { recordRun } from "@/game/save";
import { displayName, useGame } from "@/game/store";
import { clientId } from "@/lib/client-id";
import { submitRun } from "@/lib/rime-data";
import type { BotSeed, GameResult, Mode, NetMsg, NetPlayer } from "@/game/types";
import { dailySeed } from "@/game/world";

interface Props {
  mode: Mode;
  seed?: number;
  bots?: BotSeed[];
  net?: {
    selfId: string;
    sendState: (p: NetPlayer) => void;
    sendEvent: (msg: NetMsg) => void;
    onMessage: (fn: (from: string, data: unknown, channel: "state" | "reliable") => void) => () => void;
    onPeerLeft?: (id: string) => void;
  };
}

export function GameView({ mode, seed, bots = [], net }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<RimeEngine | null>(null);
  const coachConsumedRef = useRef(false);
  const save = useGame((s) => s.save);
  const setScreen = useGame((s) => s.setScreen);
  const setResult = useGame((s) => s.setResult);
  const patchSave = useGame((s) => s.patchSave);
  const lang = save.lang;
  const copy = t(lang);
  const [hud, setHud] = useState<HudSnap | null>(null);
  const [ready, setReady] = useState(false);
  const localId = net?.selfId ?? clientId();
  useLiveTower(engineRef, localId);

  useEffect(() => {
    useGame.getState().setInRun(true);
    return () => useGame.getState().setInRun(false);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const localId = net?.selfId ?? clientId();
    const botList =
      bots.length > 0
        ? bots
        : mode === "bots"
          ? [0, 1, 2].map((i) => ({
              id: `bot-${i}`,
              name: botName(i, lang),
              color: (save.color + 1 + i) % 4,
            }))
          : [];
    const engine = new RimeEngine(
      canvas,
      {
        mode,
        seed: seed ?? (mode === "solo" ? dailySeed() : (Math.random() * 1e9) | 0),
        localId,
        localName: displayName(save, lang),
        localColor: save.color,
        lang,
        shake: save.shake,
        mute: save.mute,
        bots: botList,
        weapon: save.weapon ?? "blade",
        coach: save.coachLeft > 0,
      },
      {
        onHud: (h) => {
          setHud(h);
          if (h.floor !== useGame.getState().liveFloor) useGame.getState().setLiveFloor(h.floor);
        },
        onOver: (r: GameResult) => {
          const next = recordRun(r.floor, r.score, r.combo);
          patchSave(next);
          setResult(r);
          void submitRun({
            data: {
              clientId: clientId(),
              name: displayName(next, lang),
              floor: r.floor,
              score: r.score,
              combo: r.combo,
              mode,
              badges: next.badges,
            },
          }).catch(() => {});
        },
        sendState: net?.sendState,
        sendEvent: net?.sendEvent,
        onCoins: (n) => {
          const s = useGame.getState().save;
          patchSave({ coins: s.coins + n });
        },
      },
    );
    engineRef.current = engine;
    if (save.coachLeft > 0 && !coachConsumedRef.current) {
      coachConsumedRef.current = true;
      patchSave({ coachLeft: save.coachLeft - 1 });
    }
    void engine.start().then(() => setReady(true));

    const unsub = net?.onMessage((from, data, channel) => {
      const msg = data as NetMsg;
      if (!msg || typeof msg !== "object" || !("t" in msg)) return;
      engine.applyRemote(msg);
      void from;
      void channel;
    });

    const onVis = () => {
      engine.audio.handleVisibility();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      unsub?.();
      document.removeEventListener("visibilitychange", onVis);
      engine.stop();
      engineRef.current = null;
    };
    // boot once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-bg" dir="ltr" data-phone-surface>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full touch-none"
        style={{ touchAction: "none" }}
        onContextMenu={(e) => e.preventDefault()}
      />

      {hud && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-2 pt-[max(10px,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between">
            <div className="pointer-events-auto flex gap-1.5">
              <IconBtn
                label={copy.pause}
                onClick={() => engineRef.current?.setPaused(!hud.paused)}
              >
                {hud.paused ? <Play className="size-4" /> : <Pause className="size-4" />}
              </IconBtn>
              <MuteButton className="flex size-8 items-center justify-center rounded-full bg-[#1a100c]/70 text-gold" />
            </div>
            <div className="text-center">
              <p className="font-display text-xl leading-none text-fg/90">{hud.score}</p>
            </div>
            <p className="font-display text-2xl leading-none text-ice">{hud.floor}</p>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[9px] font-bold text-rose">HP</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-sm border border-[#3a2018] bg-[#1a100c]">
              <div className="h-full bg-rose" style={{ width: `${Math.max(0, (hud.hp / hud.maxHp) * 100)}%` }} />
            </div>
            <span className="text-[9px] font-bold text-ice">WPN</span>
            <div className="h-2.5 w-16 overflow-hidden rounded-sm border border-[#3a2018] bg-[#1a100c]">
              <div className="h-full bg-ice" style={{ width: `${Math.min(100, (hud.weaponT / 12) * 100)}%` }} />
            </div>
          </div>

          <RivalStrip others={hud.others} />
        </div>
      )}

      {hud && !hud.paused && !hud.downed && hud.alive && (
        <ComboHud
          combo={hud.combo}
          comboKey={hud.comboKey}
          yell={hud.comboYell}
          gain={hud.lastGain}
          story={hud.story}
        />
      )}

      {hud?.hint && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[48px] z-10 flex justify-center px-5">
          <p className="rounded-2xl bg-bg/75 px-3 py-1.5 text-center text-xs font-medium text-ice">
            {hud.hint}
          </p>
        </div>
      )}

      {hud?.danger && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[28%] z-10 flex justify-center">
          <p className="font-display text-3xl tracking-widest text-rose drop-shadow">
            {copy.danger}
          </p>
        </div>
      )}

      {hud?.spectate && !hud.paused && !hud.downed && (
        <div className="pointer-events-none absolute inset-0 z-20 bg-black/45 backdrop-blur-[2px]">
          <div className="absolute inset-x-0 top-16 flex justify-center px-4">
            <div className="w-full max-w-[300px] rounded-2xl border border-[#5a3a20]/80 bg-[#1a100c]/85 px-4 py-3">
              <p className="text-center font-display text-lg text-ice">
                {hud.spectate.leader ? `FOLLOWING ${hud.spectate.leader}` : "SPECTATING"}
              </p>
              <ul className="mt-2 space-y-1">
                {hud.spectate.rows.map((row) => {
                  const m = Math.floor(row.survived / 60);
                  const s = Math.max(0, Math.round(row.survived % 60));
                  return (
                    <li
                      key={row.id}
                      className={`flex items-center justify-between text-xs ${
                        row.you ? "font-bold text-gold" : row.alive ? "text-fg" : "text-muted"
                      }`}
                    >
                      <span className="truncate">
                        {row.name}
                        {row.you ? " (YOU)" : ""}
                      </span>
                      <span className="ml-2 shrink-0 tabular-nums">
                        {row.score} · {m}m {s}s
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {hud?.downed && hud.continueLeft > 0.05 && (
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

      {hud?.paused && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-bg/70 backdrop-blur-sm">
          <div className="absolute right-3 top-[max(10px,env(safe-area-inset-top))]">
            <MuteButton />
          </div>
          <p className="font-display text-5xl text-ice">{copy.pause}</p>
          <button
            type="button"
            className="rounded-2xl bg-ice px-8 py-3 font-bold text-bg"
            onClick={() => engineRef.current?.setPaused(false)}
          >
            {copy.cont}
          </button>
          <button
            type="button"
            className="text-muted"
            onClick={() => {
              engineRef.current?.stop();
              useGame.getState().setResult(null);
              useGame.getState().setMode("solo");
              setScreen("menu");
            }}
          >
            {copy.menu}
          </button>
        </div>
      )}

      {ready && !hud?.downed && !hud?.paused && (
        <TouchControls
          power={hud?.power ?? null}
          weapon={hud?.weapon ?? save.weapon ?? "blade"}
          ammo={Math.ceil(hud?.weaponT ?? 0)}
          onMove={(x) => engineRef.current?.input.setTouch({ move: x })}
          onPower={(d) => engineRef.current?.input.setTouch({ power: d })}
          onWeapon={(d) => engineRef.current?.input.setTouch({ weapon: d })}
        />
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-full bg-[#1a100c]/70 text-gold"
    >
      {children}
    </button>
  );
}
