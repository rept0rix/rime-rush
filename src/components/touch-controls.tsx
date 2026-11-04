import React, { memo, useCallback, useRef, useState } from "react";
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

export const TouchControls = memo(function TouchControls({
  onMove,
  onJump,
  onPower,
  onWeapon,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activePointers = useRef<
    Map<number, { x: number; y: number; startY: number; zone: "left" | "center" | "right" }>
  >(new Map());
  const lastTapTime = useRef<number>(0);
  const [ripples, setRipples] = useState<TouchRipple[]>([]);
  const rippleSeq = useRef(0);

  const getZone = (clientX: number): "left" | "center" | "right" => {
    const rect = containerRef.current?.getBoundingClientRect();
    const width = rect?.width || window.innerWidth || 390;
    const relX = clientX - (rect?.left || 0);
    const ratio = relX / width;

    if (ratio < 0.46) return "left";
    if (ratio > 0.54) return "right";
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
    try {
      (e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }

    const now = Date.now();
    // Multi-touch attack: 2 or more fingers down = immediate attack
    if (activePointers.current.size >= 1) {
      onWeapon(true);
      window.setTimeout(() => onWeapon(false), 90);
    } else if (now - lastTapTime.current < 280) {
      // Double tap anywhere on screen triggers attack
      onWeapon(true);
      window.setTimeout(() => onWeapon(false), 90);
      lastTapTime.current = 0;
    } else {
      lastTapTime.current = now;
    }

    const zone = getZone(e.clientX);
    activePointers.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      startY: e.clientY,
      zone,
    });

    const rect = containerRef.current?.getBoundingClientRect();
    const localX = e.clientX - (rect?.left || 0);
    const localY = e.clientY - (rect?.top || 0);
    addRipple(localX, localY, zone);

    syncStateFromPointers();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const existing = activePointers.current.get(e.pointerId);
    if (!existing) return;

    // Swipe up triggers Power
    if (existing.startY - e.clientY > 50) {
      onPower(true);
      window.setTimeout(() => onPower(false), 100);
      existing.startY = e.clientY; // Reset swipe tracker
    }

    const zone = getZone(e.clientX);
    activePointers.current.set(e.pointerId, {
      ...existing,
      x: e.clientX,
      y: e.clientY,
      zone,
    });
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

  return (
    <div
      ref={containerRef}
      className="pointer-events-auto absolute inset-0 z-20 select-none touch-none overflow-hidden"
      style={{ touchAction: "none" }}
      dir="ltr"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Soft ice ripples under finger - Zero buttons, 100% immersive fullscreen touch */}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-ice/40 bg-ice/10 animate-ping duration-300"
          style={{
            left: r.x,
            top: r.y,
            width: 70,
            height: 70,
          }}
        />
      ))}
    </div>
  );
});
