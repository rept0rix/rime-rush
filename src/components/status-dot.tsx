import type { PresenceStatus } from "@/game/types";

const TONE: Record<PresenceStatus, string> = {
  online: "bg-mint",
  waiting: "bg-gold",
  offline: "bg-muted",
};

export function StatusDot({
  status,
  size = "sm",
}: {
  status: PresenceStatus;
  size?: "sm" | "md";
}) {
  const dim = size === "md" ? "size-3" : "size-2.5";
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${TONE[status]} ${dim} ${
        status === "online" ? "status-pulse" : ""
      }`}
      aria-hidden
    />
  );
}

export function statusLabel(status: PresenceStatus): string {
  if (status === "waiting") return "Waiting";
  if (status === "offline") return "Offline";
  return "Online";
}
