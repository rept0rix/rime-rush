export const BASE_W = 390;
export const BASE_H = 780;

export const WALL = 26;
export const INNER_L = WALL;
export const INNER_R = BASE_W - WALL;
export const INNER_W = INNER_R - INNER_L;

export const PLAYER_W = 18;
export const PLAYER_H = 28;
export const DRAW_W = 38;
export const DRAW_H = 50;

export const GRAV_UP = 1520;
export const GRAV_DOWN = 2100;
export const TERM_VEL = 920;
export const JUMP_V = 560;
export const SPEED_JUMP = 540;
export const COYOTE = 0.12;
export const JUMP_BUF = 0.16;
export const GROUND_ACCEL = 300;
export const AIR_ACCEL = 520;
export const FRICTION = 0.994;
export const AIR_DRAG = 0.9994;
export const MAX_SPEED = 360;
export const COMBO_SPEED = 28;
export const COMBO_JUMP = 0.11;
export const MAX_COMBO = 80;
export const COMBO_VX = 55;
export const STILL_VX = 28;
export const WALL_REST = 1.06;
export const WALL_LOCK = 0.14;
export const WALL_MIN = 150;
export const FIXED_DT = 1 / 60;
export const MAX_FRAME = 0.1;
export const COMBO_GRACE = 0.16;
export const COMBO_TIME = 3.2;
export const MIN_AIR_CUT = 0.16;
export const SPAWN_PROTECT = 1.6;
export const DEATH_PAD = 36;

export const FLOOR_H = 12;
export const BASE_GAP = 86;
export const GAP_GROW = 0.32;
export const GAP_MAX = 128;

export const CAM_FOLLOW = 6.4;

export const STATE_HZ = 20;
export const MAX_PLAYERS = 4;
export const RACE_FLOOR = 60;

export const PLAYER_COLORS = ["#7ee7ff", "#ff4d8a", "#ffd36a", "#7cffb2"] as const;
export const PLAYER_HUES = [0, 150, -145, -72] as const;

export const COMBO_TITLES_HE: { at: number; label: string }[] = [
  { at: 2, label: "X2" },
  { at: 3, label: "X3" },
  { at: 4, label: "COMBO!!" },
  { at: 6, label: "COMBO!!" },
  { at: 8, label: "COMBO!!" },
  { at: 10, label: "X10" },
  { at: 14, label: "MASTER" },
  { at: 18, label: "X18" },
  { at: 24, label: "COMBO!!" },
  { at: 32, label: "RIME RUSH!" },
];

export const COMBO_TITLES_EN: { at: number; label: string }[] = [
  { at: 2, label: "X2" },
  { at: 3, label: "X3" },
  { at: 4, label: "COMBO!!" },
  { at: 6, label: "COMBO!!" },
  { at: 8, label: "COMBO!!" },
  { at: 10, label: "X10" },
  { at: 14, label: "MASTER" },
  { at: 18, label: "X18" },
  { at: 24, label: "COMBO!!" },
  { at: 32, label: "RIME RUSH!" },
];
