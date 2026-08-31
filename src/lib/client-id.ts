const KEY = "rime-cid";

export function clientId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id || id.length < 8) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "anon-local";
  }
}
