import React, { memo, useEffect, useRef, useState } from "react";
import { audioBus } from "@/game/audio";
import type { PowerId, WeaponId } from "@/game/types";

interface Props {
  power: PowerId | null;
  weapon: WeaponId;
  ammo: number;
  onMove: (x: number) => void;
  onJump: (down: boolean) => void;
  onPower: (down: boolean) => void;
  onWeapon: (down: boolean) => void;
}

const TOUCH_QUERY = "(pointer: coarse), (max-width: 768px)";

function useTouchUi(): boolean {
  const [on, setOn] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(TOUCH_QUERY).matches
      : false,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(TOUCH_QUERY);
    const sync = () => setOn(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return on;
}

export const TouchControls = memo(function TouchControls({
  power,
  ammo,
  onMove,
  onJump,
  onPower,
  onWeapon,
}: Props) {
  const show = useTouchUi();
  const leftPadRef = useRef<HTMLDivElement>(null);
  const padRectRef = useRef<{ left: number; width: number } | null>(null);
  const steerPointerId = useRef<number | null>(null);
  const [activeDir, setActiveDir] = useState<-1 | 0 | 1>(0);
  const [isJumpActive, setIsJumpActive] = useState(false);
  const [isAtkActive, setIsAtkActive] = useState(false);
  const [isPowerActive, setIsPowerActive] = useState(false);

  // Steer tracking (drag / slide support that works reliably on touch screens)
  const handleLeftPointer = (clientX: number) => {
    let rect = padRectRef.current;
    if (!rect && leftPadRef.current) {
      const b = leftPadRef.current.getBoundingClientRect();
      rect = { left: b.left, width: b.width };
      padRectRef.current = rect;
    }
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const diff = clientX - centerX;

    const deadZone = 12;
    let nextDir: -1 | 0 | 1 = 0;
    if (diff < -deadZone) nextDir = -1;
    else if (diff > deadZone) nextDir = 1;

    setActiveDir((prev) => {
      if (prev !== nextDir) {
        onMove(nextDir);
        return nextDir;
      }
      return prev;
    });
  };

  const handleLeftRelease = (e: React.PointerEvent) => {
    e.preventDefault();
    padRectRef.current = null;
    if (steerPointerId.current === e.pointerId) {
      steerPointerId.current = null;
      try {
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      setActiveDir(0);
      onMove(0);
    }
  };

  const tapAttack = (e: React.PointerEvent) => {
    e.preventDefault();
    audioBus.unlock();
    setIsAtkActive(true);
    onWeapon(true);
    window.setTimeout(() => onWeapon(false), 80);
    window.setTimeout(() => setIsAtkActive(false), 120);
  };

  const tapPower = (e: React.PointerEvent) => {
    e.preventDefault();
    audioBus.unlock();
    setIsPowerActive(true);
    onPower(true);
    window.setTimeout(() => onPower(false), 80);
    window.setTimeout(() => setIsPowerActive(false), 120);
  };

  const handleJumpPress = (e: React.PointerEvent) => {
    e.preventDefault();
    audioBus.unlock();
    setIsJumpActive(true);
    onJump(true);
  };

  const handleJumpRelease = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsJumpActive(false);
    onJump(false);
  };

  if (!show) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 select-none touch-none"
      dir="ltr"
    >
      {/* Bottom Controls Bar: natural thumb placement without expensive blur filters */}
      <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex items-end justify-between px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-2">
        {/* Left Thumb: Steering Slide Pad (Left & Right) */}
        <div
          ref={leftPadRef}
          data-pad="steer"
          className="relative flex h-[76px] w-[170px] touch-none items-center justify-between rounded-full border-2 border-ice/60 bg-[#100a08]/92 p-1.5 shadow-[0_0_12px_rgba(126,231,255,0.25)]"
          onPointerDown={(e) => {
            e.preventDefault();
            audioBus.unlock();
            steerPointerId.current = e.pointerId;
            try {
              (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
            } catch {
              /* ignore */
            }
            handleLeftPointer(e.clientX);
          }}
          onPointerMove={(e) => {
            if (steerPointerId.current === e.pointerId) {
              e.preventDefault();
              handleLeftPointer(e.clientX);
            }
          }}
          onPointerUp={handleLeftRelease}
          onPointerCancel={handleLeftRelease}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* LEFT BUTTON */}
          <div
            className={`flex h-full flex-1 items-center justify-center rounded-full transition-all duration-75 ${
              activeDir === -1
                ? "scale-95 bg-ice/40 text-fg shadow-[inset_0_0_10px_rgba(126,231,255,0.8)]"
                : "bg-white/5 text-ice/80"
            }`}
          >
            <div className="flex flex-col items-center pointer-events-none">
              <span className="font-display text-2xl font-bold leading-none">◀</span>
              <span className="text-[9px] font-bold tracking-wider text-gold">LEFT</span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-ice/20 mx-1 pointer-events-none" />

          {/* RIGHT BUTTON */}
          <div
            className={`flex h-full flex-1 items-center justify-center rounded-full transition-all duration-75 ${
              activeDir === 1
                ? "scale-95 bg-ice/40 text-fg shadow-[inset_0_0_10px_rgba(126,231,255,0.8)]"
                : "bg-white/5 text-ice/80"
            }`}
          >
            <div className="flex flex-col items-center pointer-events-none">
              <span className="font-display text-2xl font-bold leading-none">▶</span>
              <span className="text-[9px] font-bold tracking-wider text-gold">RIGHT</span>
            </div>
          </div>
        </div>

        {/* Right Thumb: Actions (POW, ATK & JUMP) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* DEDICATED POW BUTTON */}
          {power && power !== "blade" && (
            <button
              type="button"
              data-pad="pow"
              aria-label="Power"
              className={`flex h-[56px] w-[56px] touch-none flex-col items-center justify-center rounded-full border-2 border-gold bg-[#1e1408]/95 font-display text-gold shadow-[0_0_12px_rgba(255,211,106,0.6)] transition-all duration-75 active:scale-90 ${
                isPowerActive
                  ? "scale-90 border-fg bg-gold/40 text-fg shadow-[inset_0_0_12px_rgba(255,211,106,0.9)]"
                  : "animate-pulse"
              }`}
              onPointerDown={tapPower}
              onContextMenu={(e) => e.preventDefault()}
            >
              <span className="text-sm font-extrabold leading-none">POW</span>
              <span className="text-[7px] font-extrabold uppercase tracking-tight text-ice">
                {power}
              </span>
            </button>
          )}

          {/* ATK BUTTON */}
          <button
            type="button"
            data-pad="atk"
            aria-label="Attack"
            className={`flex h-[58px] w-[58px] touch-none flex-col items-center justify-center rounded-full border-2 border-rose/70 bg-[#160a08]/92 font-display text-sm font-bold text-rose shadow-[0_0_10px_rgba(255,77,138,0.3)] transition-transform duration-75 active:scale-90 ${
              isAtkActive ? "scale-90 bg-rose/40 text-fg shadow-[inset_0_0_10px_rgba(255,77,138,0.9)]" : ""
            }`}
            onPointerDown={tapAttack}
            onContextMenu={(e) => e.preventDefault()}
          >
            <span className="text-base leading-none">ATK</span>
            <span className="text-[8px] font-bold text-gold">
              {ammo > 0 ? `×${ammo}` : "HIT"}
            </span>
          </button>

          {/* BIG JUMP BUTTON */}
          <button
            type="button"
            data-pad="jump"
            aria-label="Jump"
            className={`flex h-[78px] w-[78px] touch-none flex-col items-center justify-center rounded-full border-[3px] border-ice bg-gradient-to-b from-[#18283a] to-[#0a1420] font-display text-ice shadow-[0_0_16px_rgba(126,231,255,0.4)] transition-all duration-75 active:scale-90 ${
              isJumpActive
                ? "scale-90 border-mint bg-mint/30 text-fg shadow-[inset_0_0_14px_rgba(124,255,178,0.9)]"
                : ""
            }`}
            onPointerDown={handleJumpPress}
            onPointerUp={handleJumpRelease}
            onPointerCancel={handleJumpRelease}
            onContextMenu={(e) => e.preventDefault()}
          >
            <span className="text-3xl font-extrabold leading-none">▲</span>
            <span className="text-[10px] font-extrabold tracking-widest text-mint">JUMP</span>
          </button>
        </div>
      </div>
    </div>
  );
});
