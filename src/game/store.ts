import { create } from "zustand";
import { loadSave, writeSave, clearSave, type SaveData } from "./save";
import type { GameResult, HubTab, Lang, Mode, Screen } from "./types";

export type Overlay = null | "notes" | "install";

export interface GameStore {
  save: SaveData;
  screen: Screen;
  hub: HubTab;
  mode: Mode;
  room: string;
  joining: boolean;
  fillBots: boolean;
  mpMode: "laststand" | "race";
  result: GameResult | null;
  runId: number;
  liveFloor: number;
  inRun: boolean;
  overlay: Overlay;
  unreadNotes: number;
  setScreen: (s: Screen) => void;
  setHub: (h: HubTab) => void;
  setMode: (m: Mode) => void;
  setRoom: (r: string) => void;
  setJoining: (v: boolean) => void;
  setFillBots: (v: boolean) => void;
  setMpMode: (m: "laststand" | "race") => void;
  setResult: (r: GameResult | null) => void;
  replay: () => void;
  setLiveFloor: (n: number) => void;
  setInRun: (v: boolean) => void;
  setOverlay: (o: Overlay) => void;
  setUnreadNotes: (n: number) => void;
  patchSave: (p: Partial<SaveData>) => void;
  wipeSave: () => void;
}

export const useGame = create<GameStore>((set, get) => ({
  save: loadSave(),
  screen: "menu",
  hub: "home",
  mode: "solo",
  room: "",
  joining: false,
  fillBots: true,
  mpMode: "laststand",
  result: null,
  runId: 0,
  liveFloor: 0,
  inRun: false,
  overlay: null,
  unreadNotes: 0,
  patchSave: (p) => {
    const save = { ...get().save, ...p };
    writeSave(save);
    set({ save });
  },
  wipeSave: () => set({ save: clearSave() }),
  setScreen: (screen) => set({ screen: screen === "howto" ? "menu" : screen }),
  setHub: (hub) => set({ hub }),
  setMode: (mode) => set({ mode }),
  setRoom: (room) => set({ room }),
  setJoining: (joining) => set({ joining }),
  setFillBots: (fillBots) => set({ fillBots }),
  setMpMode: (mpMode) => set({ mpMode }),
  setResult: (result) => set({ result }),
  replay: () => set((s) => ({ result: null, screen: "play" as const, runId: s.runId + 1 })),
  setLiveFloor: (liveFloor) => set({ liveFloor }),
  setInRun: (inRun) => set({ inRun }),
  setOverlay: (overlay) => set({ overlay }),
  setUnreadNotes: (unreadNotes) => set({ unreadNotes }),
}));

export function displayName(save: SaveData, lang: Lang): string {
  if (save.name.trim()) return save.name.trim().slice(0, 12);
  return lang === "he" ? "שחקן" : "Player";
}
