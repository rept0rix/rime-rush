export function makeRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += alphabet[(Math.random() * alphabet.length) | 0];
  return s;
}

export function roomId(code: string): string {
  return `rime-${code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)}`;
}
