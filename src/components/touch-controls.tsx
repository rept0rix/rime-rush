import React, { memo, useCallback, useEffect, useRef, useState } from "react";
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

interface TouchRipple {
  id: number;
  x: number;
  y: number;
  zone: "left" | "center" | "right";
}

function useTouchUi(): boolean {
  const check = () => {
    if (typeof window === "undefined") return false;
    if (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) return true;
    if (/iPad|iPhone|iPod|Android/i.test(navigator.userAgent)) return true;
    if (typeof window.matchMedia === "function") {
      return window.matchMedia("(pointer: coarse), (max-width: 1024px)").matches;
    }
    return false;
  };

  const [on, setOn] = useState(check);
  useEffect(() => {
    setOn(check());
    const mq = window.matchMedia?.("(pointer: coarse)");
    const sync = () => setOn(check());
    mq?.addEventListener?.("change", sync);
    window.addEventListener?.("resize", sync);
    return () => {
      mq?.removeEventListener?.("change", sync);
      window.removeEventListener?.("resize", sync);
    };
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
  const containerRef = useRef<HTMLDivElement>(null);
  const activePointers = useRef<Map<number, { x: number; y: number; zone: "left" | "center" | "right" }>>(
    new Map(),
  );
  const lastTapTime = useRef<number>(0);
  const [ripples, setRipples] = useState<TouchRipple[]>([]);
  const rippleSeq = useRef(0);

  const getZone = (clientX: number): "left" | "center" | "right" => {
    const rect = containerRef.current?.getBoundingClientRect();
    const width = rect?.width || window.innerWidth || 390;
    const relX = clientX - (rect?.left || 0);
    const ratio = relX / width;

    if (ratio < 0.38) return "left";
    if (ratio > 0.62) return "right";
    return "center";
  };

  const syncStateFromPointers = useCallback(() => {
    let moveDir: -1 | 0 | 1 = 0;
    let anyJump = false;

    for (const info of activePointers.current.values()) {
      if (info.zone === "left") {
        moveDir = -1;
        anyJump = true;
      } else if (info.zone === "right") {
        moveDir = 1;
        anyJump = true;
      } else if (info.zone === "center") {
        anyJump = true;
      }
    }

    onMove(moveDir);
    onJump(anyJump);
  }, [onMove, onJump]);

  const addRipple = (x: number, y: number, zone: "left" | "center" | "right") => {
    const id = ++rippleSeq.current;
    setRipples((prev) => [...prev.slice(-3), { id, x, y, zone }]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 280);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    audioBus.unlock();

    // Double tap anywhere on screen triggers weapon attack
    const now = Date.now();
    if (now - lastTapTime.current < 260) {
      onWeapon(true);
      window.setTimeout(() => onWeapon(false), 80);
      lastTapTime.current = 0;
    } else {
      lastTapTime.current = now;
    }

    const zone = getZone(e.clientX);
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, zone });

    const rect = containerRef.current?.getBoundingClientRect();
    const localX = e.clientX - (rect?.left || 0);
    const localY = e.clientY - (rect?.top || 0);
    addRipple(localX, localY, zone);

    syncStateFromPointers();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activePointers.current.has(e.pointerId)) return;
    const zone = getZone(e.clientX);
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, zone });
    syncStateFromPointers();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    syncStateFromPointers();
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    syncStateFromPointers();
  };

  const triggerAttack = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
    audioBus.unlock();
    onWeapon(true);
    window.setTimeout(() => onWeapon(false), 80);
  };

  const triggerPower = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
    audioBus.unlock();
    onPower(true);
    window.setTimeout(() => onPower(false), 80);
  };

  if (!show) return null;

  return (
    <div
      ref={containerRef}
      className="pointer-events-auto absolute inset-0 z-20 select-none touch-none overflow-hidden"
      dir="ltr"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Subtle, soft touch feedback ripples under finger */}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-ice/50 bg-ice/15 animate-ping duration-300"
          style={{
            left: r.x,
            top: r.y,
            width: 70,
            height: 70,
          }}
        />
      ))}

      {/* Discreet, non-intrusive action controls in lower corners - only when needed */}
      <div className="pointer-events-none absolute inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-30 flex items-end justify-between">
        {/* Subtle touch hints on screen edge */}
        <div className="flex items-center gap-1 opacity-25 pointer-events-none text-[10px] font-bold text-ice tracking-wider">
          <span>◀ LEFT</span>
        </div>

        {/* Minimalist Floating Action Controls (Attack & Power) */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          {power && power !== "blade" && (
            <button
              type="button"
              aria-label="Power"
              onClick={triggerPower}
              className="flex size-11 items-center justify-center rounded-full border border-gold/70 bg-[#160c08]/85 text-gold shadow-md backdrop-blur-xs active:scale-90"
            >
              <span className="font-display text-xs font-black">POW</span>
            </button>
          )}

          <button
            type="button"
            aria-label="Attack"
            onClick={triggerAttack}
            className="flex size-11 items-center justify-center rounded-full border border-rose/70 bg-[#160c08]/85 text-rose shadow-md backdrop-blur-xs active:scale-90"
          >
            <span className="font-display text-xs font-bold">
              {ammo > 0 ? `×${ammo}` : "ATK"}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-1 opacity-25 pointer-events-none text-[10px] font-bold text-ice tracking-wider">
          <span>RIGHT ▶</span>
        </div>
      </div>
    </div>
  );
});
