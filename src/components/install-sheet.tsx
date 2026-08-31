import { Share, Smartphone, X } from "lucide-react";
import { useGame } from "@/game/store";

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function InstallSheet() {
  const overlay = useGame((s) => s.overlay);
  const setOverlay = useGame((s) => s.setOverlay);
  if (overlay !== "install") return null;
  const ios = isIos();

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-bg/70">
      <button type="button" aria-label="Dismiss" className="absolute inset-0" onClick={() => setOverlay(null)} />
      <div className="relative w-full max-w-md rounded-t-3xl border border-line bg-surface px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-3xl text-ice">Home screen</p>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOverlay(null)}
            className="grid size-10 place-items-center text-muted"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-col items-center rounded-2xl border border-line bg-bg px-4 py-5">
          <img
            src="/icon-180.png"
            alt="RIME RUSH"
            className="size-20 rounded-[22px] border border-line object-cover"
          />
          <p className="mt-2 font-display text-2xl tracking-wide text-fg">RIME RUSH</p>
          <p className="text-[11px] text-muted">This name and icon land on your phone</p>
        </div>

        {ios ? (
          <ol className="mt-4 space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-bg font-display text-lg text-gold">
                1
              </span>
              <p>
                Tap <Share className="mx-0.5 inline size-4 text-ice" /> Share at the bottom of Safari.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-bg font-display text-lg text-gold">
                2
              </span>
              <p>
                Scroll and tap <span className="font-bold text-ice">Add to Home Screen</span>.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-bg font-display text-lg text-gold">
                3
              </span>
              <p>
                Keep the name <span className="font-bold">RIME RUSH</span> and tap Add. The ice-tower icon
                appears on your home screen.
              </p>
            </li>
          </ol>
        ) : (
          <ol className="mt-4 space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-bg font-display text-lg text-gold">
                1
              </span>
              <p className="flex items-center gap-1">
                Open the browser menu <Smartphone className="size-4 text-ice" />
              </p>
            </li>
            <li className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-bg font-display text-lg text-gold">
                2
              </span>
              <p>
                Tap <span className="font-bold text-ice">Add to Home Screen</span> / Install app.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-bg font-display text-lg text-gold">
                3
              </span>
              <p>
                Confirm the name <span className="font-bold">RIME RUSH</span>.
              </p>
            </li>
          </ol>
        )}
        <p className="mt-3 text-[11px] text-muted">
          Use Safari on iPhone. Chrome on iOS saves a bookmark, not the full app icon.
        </p>
      </div>
    </div>
  );
}
