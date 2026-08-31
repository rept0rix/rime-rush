import { useEffect, useState } from "react";

const PRELOAD = [
  "/ui/hopper-anim.gif",
  "/ui/logo.png",
  "/ui/play.png",
  "/ui/home.png",
  "/ui/you-fell.png",
  "/ui/fell-board.png",
  "/ui/room.png",
  "/ui/enter.png",
  "/ui/tab-board.png",
  "/ui/tab-me.png",
  "/sprites/hopper/idle.png",
  "/sprites/hopper/run-a.png",
  "/sprites/hopper/jump.png",
];

export function Splash({ onDone }: { onDone: () => void }) {
  const [bar, setBar] = useState(12);

  useEffect(() => {
    let left = PRELOAD.length;
    const maybeDone = () => {
      left -= 1;
      setBar((b) => Math.max(b, Math.round(((PRELOAD.length - Math.max(0, left)) / PRELOAD.length) * 100)));
    };
    PRELOAD.forEach((src) => {
      const img = new Image();
      img.onload = maybeDone;
      img.onerror = maybeDone;
      img.src = src;
    });
    const load = window.setInterval(() => setBar((b) => Math.min(100, b + 10)), 60);
    const done = window.setTimeout(onDone, 900);
    return () => {
      window.clearInterval(load);
      window.clearTimeout(done);
    };
  }, [onDone]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#120c08]">
      <img src="/ui/logo.png" alt="Rime Rush" className="h-24 w-auto object-contain" />
      <img src="/ui/hopper-anim.gif" alt="" className="mt-6 h-44 w-44 object-contain" />
      <p className="mt-1 font-display text-2xl tracking-[0.35em] text-ice">LOADING</p>
      <div className="mt-3 h-2.5 w-44 overflow-hidden rounded-full border border-[#5a3a20] bg-[#1a100c]">
        <div className="h-full bg-ice" style={{ width: `${bar}%` }} />
      </div>
    </div>
  );
}
