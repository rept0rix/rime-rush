import { useEffect, type MutableRefObject } from "react";
import type { RimeEngine } from "@/game/engine";
import { clientId } from "@/lib/client-id";
import { listLiveClimbers } from "@/lib/rime-data";

export function useLiveTower(engineRef: MutableRefObject<RimeEngine | null>, localId: string): void {
  useEffect(() => {
    let on = true;
    const tick = () => {
      void listLiveClimbers({ data: { clientId: localId || clientId() } })
        .then((rows) => {
          if (!on) return;
          engineRef.current?.syncGhosts(rows);
        })
        .catch(() => {});
    };
    tick();
    const t = window.setInterval(tick, 2500);
    return () => {
      on = false;
      window.clearInterval(t);
    };
  }, [engineRef, localId]);
}
