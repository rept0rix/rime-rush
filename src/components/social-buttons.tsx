import { useState } from "react";
import { authClient, GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { useGame } from "@/game/store";
import { syncLocalSaveWithCloud } from "@/lib/rime-data";

export function SocialButtons({
  size = "md",
  onPicked,
}: {
  size?: "sm" | "md";
  onPicked?: (id: "google" | "x" | "email") => void;
}) {
  const [showEmail, setShowEmail] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const patchSave = useGame((s) => s.patchSave);

  const goOauth = (id: "google" | "x") => {
    const providerId = id === "google" ? "grok-google" : "grok-x";
    if (!GROK_PROVIDERS.some((p) => p.providerId === providerId)) {
      setError("OAuth provider not configured on this host. Use Email sign-in.");
      setShowEmail(true);
      return;
    }
    patchSave({ authProvider: id });
    onPicked?.(id);
    void signIn(providerId, { callbackURL: "/" });
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in email and password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (isRegister) {
        const userName = name.trim() || useGame.getState().save.name || "Climber";
        const res = await authClient.signUp.email({
          email,
          password,
          name: userName,
        });
        if (res.error) {
          setError(res.error.message || "Sign up failed");
          setLoading(false);
          return;
        }
      } else {
        const res = await authClient.signIn.email({
          email,
          password,
        });
        if (res.error) {
          setError(res.error.message || "Invalid email or password");
          setLoading(false);
          return;
        }
      }
      patchSave({ authProvider: "email" });
      onPicked?.("email");
      // Trigger cloud-to-device save sync
      void syncLocalSaveWithCloud();
      setShowEmail(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication error");
    } finally {
      setLoading(false);
    }
  };

  const box = size === "sm" ? "size-10" : "size-11";

  return (
    <div className="flex w-full max-w-[280px] flex-col items-center gap-2.5">
      <div className="flex items-center justify-center gap-3">
        <SocBtn className={box} label="Google" onClick={() => goOauth("google")}>
          <GoogleMark />
        </SocBtn>
        <SocBtn className={box} label="X" onClick={() => goOauth("x")}>
          <XMark />
        </SocBtn>
        <button
          type="button"
          onClick={() => setShowEmail(!showEmail)}
          className={`${box} grid place-items-center rounded-full border border-line bg-[#1a100c] text-xs font-bold text-ice shadow-sm active:scale-95`}
          title="Sign in with Email"
        >
          ✉
        </button>
      </div>

      {!showEmail && (
        <button
          type="button"
          onClick={() => setShowEmail(true)}
          className="text-[11px] text-muted underline underline-offset-2 hover:text-ice"
        >
          Or sign in with email & password
        </button>
      )}

      {showEmail && (
        <form
          onSubmit={handleEmailAuth}
          className="mt-1 flex w-full flex-col gap-2 rounded-xl border border-line bg-[#140c08]/90 p-3 text-left shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="font-display text-xs text-gold">
              {isRegister ? "CREATE ACCOUNT" : "SIGN IN WITH EMAIL"}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
              className="text-[10px] text-ice underline"
            >
              {isRegister ? "Already have account?" : "Need account?"}
            </button>
          </div>

          {isRegister && (
            <input
              type="text"
              placeholder="Player Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 rounded-lg border border-line bg-black/40 px-2.5 text-xs text-fg placeholder:text-muted focus:outline-none focus:border-ice"
              maxLength={16}
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-8 rounded-lg border border-line bg-black/40 px-2.5 text-xs text-fg placeholder:text-muted focus:outline-none focus:border-ice"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="h-8 rounded-lg border border-line bg-black/40 px-2.5 text-xs text-fg placeholder:text-muted focus:outline-none focus:border-ice"
          />

          {error && <p className="text-[10px] text-rose-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="h-8 flex-1 rounded-lg bg-ice font-display text-xs text-bg transition hover:brightness-110 disabled:opacity-50"
            >
              {loading ? "SAVING..." : isRegister ? "REGISTER" : "LOGIN"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowEmail(false);
                setError("");
              }}
              className="h-8 rounded-lg border border-line px-2 text-[10px] text-muted hover:text-fg"
            >
              CANCEL
            </button>
          </div>
        </form>
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
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8v3h2.6V21h2.9z" />
    </svg>
  );
}

export function TikTokMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M16.6 3c.3 2.2 1.6 3.6 3.9 3.8v2.6c-1.4.1-2.6-.3-3.9-1.1v5.6c0 6.4-7 8.4-9.8 3.8-1.8-3-.7-8.2 5.2-8.4v2.8c-.5.1-1 .2-1.4.4-1.3.4-2 1.3-1.8 2.8.4 2.7 5.3 3.5 4.9-1.8V3h2.9z" />
    </svg>
  );
}
