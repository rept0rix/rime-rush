import { useRef, useState } from "react";
import { audioBus } from "@/game/audio";

interface Props {
  mute: boolean;
  shake: boolean;
  onMute: (muted: boolean) => void;
  onShake: (on: boolean) => void;
}

export function FeelTiles({ mute, shake, onMute, onShake }: Props) {
  const [flash, setFlash] = useState<null | "ding" | "boom">(null);
  const guard = useRef(0);
  const once = (fn: () => void) => {
    const n = performance.now();
    if (n - guard.current < 260) return;
    guard.current = n;
    fn();
  };

  return (
    <div className="flex justify-center gap-5">
      <PlaqueBtn
        src={mute ? "/ui/set-sound-off.jpg" : "/ui/set-sound-on.jpg"}
        alt={mute ? "Sound off" : "Sound on"}
        label={mute ? "MUTE" : "SOUND"}
        tone={mute ? "muted" : "ice"}
        testId="feel-sound"
        flash={flash === "ding" ? "DING!" : null}
        onFire={() =>
          once(() => {
            audioBus.unlock();
            const next = !mute;
            onMute(next);
            if (!next) setFlash("ding");
            window.setTimeout(() => setFlash(null), 520);
          })
        }
      />
      <PlaqueBtn
        src={shake ? "/ui/set-shake-on.jpg" : "/ui/set-shake-off.jpg"}
        alt={shake ? "Shake on" : "Shake off"}
        label={shake ? "SHAKE" : "STILL"}
        tone={shake ? "gold" : "muted"}
        testId="feel-shake"
        flash={flash === "boom" ? "BOOM!" : null}
        onFire={() =>
          once(() => {
            audioBus.unlock();
            onShake(!shake);
            setFlash("boom");
            window.setTimeout(() => setFlash(null), 520);
          })
        }
      />
    </div>
  );
}

export function PlaqueBtn({
  src,
  alt,
  label,
  tone = "ice",
  onFire,
  flash,
  fit = "cover",
  testId,
}: {
  src: string;
  alt?: string;
  label: string;
  tone?: "ice" | "gold" | "rose" | "muted";
  onFire: () => void;
  flash?: string | null;
  fit?: "cover" | "contain";
  testId?: string;
}) {
  const color =
    tone === "rose" ? "text-rose" : tone === "gold" ? "text-gold" : tone === "muted" ? "text-muted" : "text-ice";
  return (
    <button
      type="button"
      data-testid={testId}
      onPointerDown={(e) => {
        e.preventDefault();
        onFire();
      }}
      onClick={onFire}
      className="relative active:scale-95"
      style={{ touchAction: "manipulation" }}
    >
      <img
        src={src}
        alt={alt ?? label}
        className={`mx-auto h-28 w-28 rounded-lg border-2 border-line ${fit === "contain" ? "object-contain bg-[#1a100c]" : "object-cover"}`}
      />
      {flash && (
        <span className="pointer-events-none absolute inset-x-0 top-8 text-center font-display text-4xl text-gold drop-shadow-[0_2px_0_#140c08]">
          {flash}
        </span>
      )}
      <span className={`mt-1 block text-center font-display text-2xl ${color}`}>{label}</span>
    </button>
  );
}
