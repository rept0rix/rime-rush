export async function requestAlerts(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const next = await Notification.requestPermission();
    return next === "granted";
  } catch {
    return false;
  }
}

export function pushAlert(title: string, body: string): void {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  if (typeof document !== "undefined" && !document.hidden) return;
  try {
    const n = new Notification(title, {
      body,
      icon: "/icon-180.png",
      badge: "/icon-180.png",
      tag: `rime-${title}`,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* iOS Safari only allows this in an installed home-screen app */
  }
}
