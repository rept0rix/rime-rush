import { useEffect, useRef, useState } from "react";
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

const TOUCH_QUERY = "(pointer: coarse), (max-width: 640px)";

/** True on touch or narrow viewports, where visible pads are drawn. */
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

// Layout: left thumb moves (LEFT 25% / RIGHT 25%), right thumb acts (ATK 20% / JUMP 30%).
export function TouchControls({ power, ammo, onMove, onJump, onPower, onWeapon }: Props) {
  const hold = useRef({ l: false, r: false });
  const lastTap = useRef(0);
  const show = useTouchUi();

  const emitMove = () => {
    const { l, r } = hold.current;
    onMove(l && !r ? -1 : r && !l ? 1 : 0);
  };

  const holdSide = (side: "l" | "r", down: boolean) => {
    hold.current[side] = down;
    emitMove();
  };

  const tapAttack = () => {
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
      <Zone className="left-0 w-[25%]" aria="Move left" onHold={(d) => holdSide("l", d)}>
        {show && <Pad label="◀" sub="LEFT" />}
      </Zone>
      <Zone className="left-[25%] w-[25%]" aria="Move right" onHold={(d) => holdSide("r", d)}>
        {show && <Pad label="▶" sub="RIGHT" />}
      </Zone>
      <Zone
        className="left-[50%] w-[20%]"
        aria="Attack"
        onHold={(d) => {
          if (d) tapAttack();
        }}
      >
        {show && (
          <Pad
            label="ATK"
            sub={`${ammo > 0 ? `×${ammo}` : ""}${power && power !== "blade" ? " 2× POWER" : ""}`.trim()}
            small
          />
        )}
      </Zone>
      <Zone className="right-0 w-[30%]" aria="Jump" onHold={onJump}>
        {show && <Pad label="▲" sub="JUMP" big />}
      </Zone>
    </div>
  );
}

function Pad({ label, sub, big, small }: { label: string; sub?: string; big?: boolean; small?: boolean }) {
  const size = big ? "h-[76px] w-[76px] text-3xl" : small ? "h-[54px] w-[54px] text-sm" : "h-[62px] w-[62px] text-2xl";
  return (
    <span className="pointer-events-none absolute inset-x-0 bottom-[max(18px,env(safe-area-inset-bottom))] flex flex-col items-center gap-1">
      <span
        className={`${size} flex items-center justify-center rounded-full border-2 border-ice/70 bg-[#140c08]/55 font-display font-bold text-ice shadow-[0_0_14px_rgba(140,220,255,0.35)] backdrop-blur-[2px]`}
      >
        {label}
      </span>
      {sub ? <span className="text-[10px] font-bold tracking-wide text-gold">{sub}</span> : null}
    </span>
  );
}

function Zone({
  className,
  aria,
  onHold,
  children,
}: {
  className: string;
  aria: string;
  onHold: (d: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={aria}
      className={`absolute inset-y-0 ${className} z-20 touch-none select-none`}
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
    >
      {children}
    </button>
  );
}
