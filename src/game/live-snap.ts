export type LivePose = {
  x: number;
  y: number;
  vx: number;
  combo: number;
  score: number;
  alive: boolean;
  floor: number;
};

export const livePose: LivePose = {
  x: 195,
  y: 22,
  vx: 0,
  combo: 0,
  score: 0,
  alive: true,
  floor: 0,
};

export function writeLivePose(p: Partial<LivePose>): void {
  Object.assign(livePose, p);
}
