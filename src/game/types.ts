export type Lang = "he" | "en";
export type Screen = "menu" | "howto" | "lobby" | "play" | "results";
export type HubTab = "home" | "board" | "badges" | "me";
export type Mode = "solo" | "train" | "bots" | "laststand" | "race";
export type FloorKind = "ice" | "conveyor" | "crumble" | "spring" | "check";
export type Anim = "idle" | "run" | "jump" | "spin" | "land" | "wall";
export type WeaponId = "blade" | "gun";
export type Faction = "rime" | "ember";
export type PowerId =
  | "spring"
  | "shield"
  | "glide"
  | "magnet"
  | "freeze"
  | "gust"
  | "swap"
  | "slick"
  | "quake"
  | "shrink"
  | "blade";

export interface Floor {
  n: number;
  y: number;
  x: number;
  w: number;
  kind: FloorKind;
  dir: number;
  crumbleT: number;
  gone: boolean;
  slickT: number;
}

export type LootKind = "power" | "pill" | "elixir" | "ammo";

export interface Pickup {
  id: number;
  x: number;
  y: number;
  power: PowerId | null;
  kind: LootKind;
  taken: boolean;
}

export interface Creep {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  kind: "rat" | "bat" | "ember";
  facing: 1 | -1;
  alive: boolean;
  hurtT: number;
  animT: number;
  windup: number;
}

export interface Effects {
  frozenT: number;
  shrinkT: number;
  springT: number;
  glideT: number;
  magnetT: number;
  shield: boolean;
  invulnT: number;
}

export interface Player {
  id: string;
  name: string;
  color: number;
  bot: boolean;
  faction: Faction;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  onWall: number;
  coyote: number;
  jumpBuf: number;
  jumpCut: boolean;
  combo: number;
  bestCombo: number;
  floor: number;
  score: number;
  alive: boolean;
  spin: number;
  spinV: number;
  squash: number;
  anim: Anim;
  animT: number;
  power: PowerId | null;
  blade: number;
  slashT: number;
  weapon: WeaponId;
  ammo: number;
  weaponT: number;
  hp: number;
  maxHp: number;
  hurtT: number;
  trickT: number;
  effects: Effects;
  heldMove: number;
  jumpHeld: boolean;
  wantJump: boolean;
  wantPower: boolean;
  deadAt: number;
  comboGrace: number;
  airT: number;
  skipped: number;
  takeoffFloor: number;
  comboT: number;
  wallLock: number;
  wallDir: number;
  trail: { x: number; y: number; spin: number; facing: 1 | -1 }[];
  comboJumps: number;
  comboStartFloor: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: "snow" | "spark" | "ice" | "dust" | "confetti" | "trail" | "blood";
}

export interface Corpse {
  x: number;
  y: number;
  facing: 1 | -1;
  color: number;
}

export interface Popup {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
  scale?: number;
}

export interface GameResult {
  mode: Mode;
  floor: number;
  score: number;
  combo: number;
  winnerId: string | null;
  winnerName: string;
  ranks: { id: string; name: string; floor: number; score: number; alive: boolean }[];
}

export interface LobbyPlayer {
  id: string;
  name: string;
  color: number;
  ready: boolean;
  bot: boolean;
}

export type NetMsg =
  | { t: "hello"; name: string; color: number }
  | { t: "lobby"; hostId: string; mode: Mode; bots: boolean; raceFloor: number; players: LobbyPlayer[] }
  | { t: "start"; seed: number; mode: Mode; raceFloor: number; bots: BotSeed[] }
  | { t: "state"; p: NetPlayer }
  | { t: "power"; who: string; power: PowerId; target?: string; extra?: Record<string, number> }
  | { t: "hit"; who: string; target: string; kx: number; ky: number }
  | { t: "dead"; who: string; floor: number; score: number }
  | { t: "win"; who: string; name: string }
  | { t: "ping"; at: number };

export interface BotSeed {
  id: string;
  name: string;
  color: number;
}

export interface NetPlayer {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  combo: number;
  floor: number;
  score: number;
  alive: boolean;
  anim: Anim;
  spin: number;
  power: PowerId | null;
  frozenT: number;
  shrinkT: number;
  shield: boolean;
}

export type PresenceStatus = "online" | "offline" | "waiting";

export interface SaveData {
  version: number;
  lang: Lang;
  name: string;
  color: number;
  mute: boolean;
  shake: boolean;
  bestFloor: number;
  bestScore: number;
  bestCombo: number;
  games: number;
  lastFloor: number;
  badges: string[];
  weapon: WeaponId;
  coins: number;
  ownedSkins: number[];
  ownedWeapons: WeaponId[];
  seenBoard: boolean;
  authProvider: "" | "google" | "x";
  status: PresenceStatus;
  alerts: boolean;
}
