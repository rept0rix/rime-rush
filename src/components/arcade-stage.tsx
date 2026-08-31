import { useEffect, useRef } from "react";
import { drawArcadeWorld, WORLD_TITLE, worldForTime } from "@/game/arcade-bg";

export function ArcadeStage() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let live = true;
    const tick = (now: number) => {
      if (!live) return;
      const parent = canvas.parentElement;
      const cssW = parent?.clientWidth || window.innerWidth;
      const cssH = parent?.clientHeight || window.innerHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(320, Math.floor(cssW));
      const h = Math.max(480, Math.floor(cssH));
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const t = now / 1000;
      const world = worldForTime(t, 7.5);
      drawArcadeWorld(ctx, world, t, 0, w, h);
      ctx.fillStyle = "rgba(20,12,8,0.55)";
      ctx.fillRect(0, 18, w, 28);
      ctx.font = "800 16px Bangers, Teko, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffd36a";
      ctx.fillText(WORLD_TITLE[world], w / 2, 38);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      live = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
