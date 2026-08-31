import { useEffect, useRef } from "react";
import { livePose } from "@/game/live-snap";
import { displayName, useGame } from "@/game/store";
import { clientId } from "@/lib/client-id";
import { logEvent, pingPresence } from "@/lib/rime-data";

let lastBeat = 0;

export function ActivityPulse() {
  const screen = useGame((s) => s.screen);
  const mode = useGame((s) => s.mode);
  const save = useGame((s) => s.save);
  const liveFloor = useGame((s) => s.liveFloor);
  const inRun = useGame((s) => s.inRun);
  const lastStart = useRef("");
  const screenRef = useRef(screen);
  const modeRef = useRef(mode);
  const floorRef = useRef(liveFloor);
  const runRef = useRef(inRun);
  screenRef.current = screen;
  modeRef.current = mode;
  floorRef.current = liveFloor;
  runRef.current = inRun;

  useEffect(() => {
    const id = clientId();
    const name = displayName(save, save.lang);
    const beat = () => {
      const now = Date.now();
      if (now - lastBeat < 1100) return;
      lastBeat = now;
      const climbing = runRef.current || screenRef.current === "play";
      void pingPresence({
        data: {
          clientId: id,
          name,
          screen: climbing ? "play" : screenRef.current,
          mode: modeRef.current,
          floor: climbing ? livePose.floor || floorRef.current : save.lastFloor,
          color: save.color,
          x: livePose.x,
          y: livePose.y,
          vx: livePose.vx,
          combo: livePose.combo,
          score: livePose.score,
          alive: livePose.alive,
          status: save.status,
        },
      }).catch(() => {});
    };
    beat();
    const t = window.setInterval(beat, 2500);
    return () => window.clearInterval(t);
  }, [save.name, save.lang, save.color, save.lastFloor, save.status]);

  useEffect(() => {
    if (screen !== "play" && !inRun) return;
    const key = `${mode}-${useGame.getState().runId}`;
    if (lastStart.current === key) return;
    lastStart.current = key;
    void logEvent({
      data: {
        clientId: clientId(),
        name: displayName(save, save.lang),
        kind: "start",
        mode,
        floor: 0,
      },
    }).catch(() => {});
  }, [screen, mode, save, inRun]);

  return null;
}
