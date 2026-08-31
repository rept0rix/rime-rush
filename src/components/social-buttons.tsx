import { useState } from "react";
import { GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { useGame } from "@/game/store";

type SocialId = "google" | "x" | "facebook" | "tiktok";

const REAL: Record<"google" | "x", string> = {
  google: "grok-google",
  x: "grok-x",
};

export function SocialButtons({
  size = "md",
  onPicked,
}: {
  size?: "sm" | "md";
  onPicked?: (id: "google" | "x") => void;
}) {
  const [soon, setSoon] = useState<SocialId | null>(null);
  const patchSave = useGame((s) => s.patchSave);

  const go = (id: SocialId) => {
    if (id === "facebook" || id === "tiktok") {
      setSoon(id);
      window.setTimeout(() => setSoon(null), 1600);
      return;
    }
    const providerId = REAL[id];
    if (!GROK_PROVIDERS.some((p) => p.providerId === providerId)) return;
    patchSave({ authProvider: id });
    onPicked?.(id);
    void signIn(providerId, { callbackURL: "/" });
  };

  const box = size === "sm" ? "size-10" : "size-12";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-center gap-2.5">
        <SocBtn className={box} label="Google" onClick={() => go("google")}>
          <GoogleMark />
        </SocBtn>
        <SocBtn className={box} label="Facebook" onClick={() => go("facebook")}>
          <FacebookMark />
        </SocBtn>
        <SocBtn className={box} label="TikTok" onClick={() => go("tiktok")}>
          <TikTokMark />
        </SocBtn>
        <SocBtn className={box} label="X" onClick={() => go("x")}>
          <XMark />
        </SocBtn>
      </div>
      {soon ? (
        <p className="text-[11px] text-muted">{soon === "facebook" ? "Facebook" : "TikTok"} coming soon</p>
      ) : (
        <p className="text-[11px] text-muted">Google and X save your score</p>
      )}
    </div>
  );
}

function SocBtn({
  className,
  label,
  onClick,
  children,
}: {
  className: string;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`${className} grid place-items-center rounded-full border border-line bg-[#1a100c] text-fg shadow-sm active:scale-95`}
    >
      {children}
    </button>
  );
}

export function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.3-1.9 3l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-1.9H12z" />
      <path fill="#34A853" d="M6.6 14.3 5.5 15.1 2.1 17.8C4.2 21.1 7.8 23.2 12 23.2c3.2 0 5.9-1.1 7.9-2.9l-3.1-2.4c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1z" />
      <path fill="#4A90E2" d="M2.1 6.2C1.4 7.6 1 9.2 1 11s.4 3.4 1.1 4.8L6.6 14C6.3 13.1 6.1 12.1 6.1 11s.2-2.1.5-3z" />
      <path fill="#FBBC05" d="M12 5.9c1.5 0 2.9.5 4 1.5l3-3C16.9 2.7 14.6 1.8 12 1.8 7.8 1.8 4.2 3.9 2.1 7.2L6.6 9.7C7.4 7.3 9.6 5.9 12 5.9z" />
    </svg>
  );
}

export function XMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M18.2 3H21l-6.5 7.4L22 21h-6.2l-4.3-5.6L6.2 21H3.4l7-8L2 3h6.3l3.9 5.2L18.2 3zm-1.1 16.2h1.7L7 4.7H5.2l11.9 14.5z" />
    </svg>
  );
}

export function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#1877F2"
        d="M22 12.1C22 6.5 17.5 2 12 2S2 6.5 2 12.1c0 5 3.7 9.1 8.4 9.9v-7H8.1v-2.9h2.3V9.9c0-2.3 1.4-3.6 3.5-3.6 1 0 2 .2 2 .2v2.2h-1.1c-1.1 0-1.5.7-1.5 1.4v1.7h2.5l-.4 2.9h-2.1v7C18.3 21.2 22 17.1 22 12.1z"
      />
    </svg>
  );
}

export function TikTokMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="currentColor"
        d="M14.2 3c.3 2.4 1.6 4.4 3.8 5.1v2.5c-1.4.1-2.7-.3-3.8-1.1v6.2c0 3.3-2.7 6-6.1 6S2 18.9 2 15.6c0-3.2 2.5-5.8 5.7-6v2.6c-1.7.3-3 1.7-3 3.4 0 1.9 1.6 3.5 3.6 3.5s3.6-1.6 3.6-3.5V3h2.3z"
      />
    </svg>
  );
}
