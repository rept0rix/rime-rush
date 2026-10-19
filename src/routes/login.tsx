import { createFileRoute, Link } from "@tanstack/react-router";
import { SocialButtons } from "@/components/social-buttons";
import { authEnabled } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="relative grid min-h-dvh h-dvh overflow-y-auto place-items-center bg-bg px-5 py-8 text-fg">
      <div className="relative w-full max-w-sm space-y-4 rounded-3xl border border-line bg-surface/95 p-6 my-auto">
        <p className="arcade-title text-center font-display text-5xl text-ice">RIME</p>
        <p className="arcade-title -mt-3 text-center font-display text-4xl text-gold">RUSH</p>
        <p className="text-center text-sm text-muted">
          Connect to save your score and climb with friends.
        </p>
        {authEnabled ? (
          <SocialButtons />
        ) : (
          <p className="text-sm text-muted">Sign-in is disabled.</p>
        )}
        <Link to="/" className="block text-center text-sm text-muted">
          Back to play
        </Link>
      </div>
    </main>
  );
}
