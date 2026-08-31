import { useRef } from "react";
import { audioBus } from "@/game/audio";
import type { PowerId, WeaponId } from "@/game/types";

interface Props {
  power: PowerId | null;
  weapon: WeaponId;
  ammo: number;
  onMove: (x: number) => void;
  onPower: (down: boolean) => void;
  onWeapon: (down: boolean) => void;
}

export function TouchControls({ power, ammo, onMove, onPower, onWeapon }: Props) {
  const hold = useRef({ l: false, r: false });
  const lastTap = useRef(0);

  const emitMove = () => {
    const { l, r } = hold.current;
    onMove(l && !r ? -1 : r && !l ? 1 : 0);
  };

  const holdSide = (side: "l" | "r", down: boolean) => {
    hold.current[side] = down;
    emitMove();
  };

  const tapCenter = () => {
    audioBus.unlock();
    const now = performance.now();
    if (power && power !== "blade" && now - lastTap.current < 280) {
      lastTap.current = 0;
      onPower(true);
      window.setTimeout(() => onPower(false), 80);
      return;
    }
    lastTap.current = now;
    onWeapon(true);
    window.setTimeout(() => onWeapon(false), 80);
  };

  return (
    <div className="absolute inset-0 z-20" dir="ltr">
      <Zone
        className="absolute inset-y-0 left-0 w-[38%]"
        aria="Move left"
        onHold={(d) => holdSide("l", d)}
      />
      <button
        type="button"
        aria-label="Attack"
        className="absolute inset-y-0 left-[38%] right-[38%] z-20 touch-none select-none"
        style={{ touchAction: "none", WebkitTouchCallout: "none" }}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          e.preventDefault();
          tapCenter();
        }}
      />
      <Zone
        className="absolute inset-y-0 right-0 w-[38%]"
        aria="Move right"
        onHold={(d) => holdSide("r", d)}
      />
      <p className="pointer-events-none absolute bottom-[max(12px,env(safe-area-inset-bottom))] left-1/2 z-30 -translate-x-1/2 rounded-full bg-[#140c08]/55 px-2 py-0.5 text-[10px] font-bold tracking-wide text-gold">
        {ammo > 0 ? `ATK ${ammo}` : "ATK"}
        {power && power !== "blade" ? " · 2× TAP POWER" : ""}
      </p>
    </div>
  );
}

function Zone({
  className,
  aria,
  onHold,
}: {
  className: string;
  aria: string;
  onHold: (d: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-label={aria}
      className={`${className} z-20 touch-none select-none`}
      style={{ touchAction: "none", WebkitTouchCallout: "none" }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        e.preventDefault();
        audioBus.unlock();
        (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
        onHold(true);
      }}
      onPointerUp={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
      onPointerLeave={(e) => {
        if (e.buttons === 0) onHold(false);
      }}
    />
  );
}
