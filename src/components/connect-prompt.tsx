import { useEffect, useState } from "react";
import { SocialButtons } from "@/components/social-buttons";
import { SKINS } from "@/game/sprites";
import { displayName, useGame } from "@/game/store";
import { useCurrentUser, useCurrentUserState } from "@/lib/auth/use-current-user";
import { saveMyRun } from "@/lib/rime-data";

export function shouldPromptConnect(games: number, signedIn: boolean): boolean {
  if (signedIn) return false;
  if (games <= 0) return false;
  return games === 1 || games % 10 === 0;
}

export function ConnectPrompt({ onClose }: { onClose: () => void }) {
  const save = useGame((s) => s.save);
  const result = useGame((s) => s.result);
  const user = useCurrentUser();
  const { isPending } = useCurrentUserState();
  const [saving, setSaving] = useState(false);
  const skin = SKINS[save.color % SKINS.length]!;
  const signedIn = !!user && !user.isDevFallback;

  useEffect(() => {
    if (!signedIn || !result || saving) return;
    setSaving(true);
    void saveMyRun({
      data: {
        name: displayName(save, save.lang),
        floor: result.floor,
        score: result.score,
        combo: result.combo,
        mode: result.mode,
        badges: save.badges,
      },
    })
      .catch(() => {})
      .finally(() => onClose());
  }, [signedIn, result, save, saving, onClose]);

  if (isPending || signedIn) return null;

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-[#140c08]/70 px-5">
      <div className="w-full max-w-[320px] rounded-[28px] border border-line bg-surface px-5 py-6 text-center shadow-2xl">
        <div className="mx-auto grid size-20 place-items-center overflow-hidden rounded-full border-2 border-dashed border-muted bg-[#1a100c]">
          {user?.profileImageUrl ? (
            <img src={user.profileImageUrl} alt="" className="size-full object-cover" />
          ) : (
            <img src={`/sprites/${skin.id}/idle.png`} alt="" className="h-16 w-16 object-contain opacity-70" />
          )}
        </div>
        <p className="mt-3 font-display text-3xl leading-none text-gold">{displayName(save, save.lang)}</p>
        {result && (
          <div className="mt-3 flex items-end justify-center gap-5">
            <Mini n={result.floor} l="Floor" />
            <Mini n={result.score} l="Score" />
            <Mini n={result.combo} l="Combo" />
          </div>
        )}
        <p className="mt-4 text-sm leading-snug text-fg">
          Connect to save your score and climb with your friends.
        </p>
        <div className="mt-4">
          <SocialButtons size="sm" />
        </div>
        <button type="button" onClick={onClose} className="mt-4 text-xs text-muted underline-offset-2 hover:underline">
          Not now
        </button>
      </div>
    </div>
  );
}

function Mini({ n, l }: { n: number; l: string }) {
  return (
    <div>
      <p className="font-display text-3xl leading-none text-ice">{n}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted">{l}</p>
    </div>
  );
}
