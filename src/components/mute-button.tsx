import { Volume2, VolumeX } from "lucide-react";
import { applySound } from "@/game/haptics";
import { useGame } from "@/game/store";

interface Props {
  className?: string;
}

/** Always-on mute. One tap silences stems + SFX and persists save.mute. */
export function MuteButton({ className }: Props) {
  const mute = useGame((s) => s.save.mute);
  const patchSave = useGame((s) => s.patchSave);

  return (
    <button
      type="button"
      aria-label={mute ? "unmute" : "mute"}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        const next = !mute;
        patchSave({ mute: next });
        applySound(next);
      }}
      className={
        className ??
        "flex size-8 items-center justify-center rounded-full bg-[#1a100c]/70 text-gold"
      }
    >
      {mute ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
    </button>
  );
}
