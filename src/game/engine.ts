import { audioBus } from "./audio";
import { botName, thinkBot } from "./bots";
import {
  BASE_H,
  BASE_W,
  FIXED_DT,
  FLOOR_H,
  INNER_L,
  INNER_R,
  MAX_FRAME,
  RACE_FLOOR,
  STATE_HZ,
} from "./constants";
import { WORLD_TITLE, worldForFloor } from "./arcade-bg";
import { bandOf, F, jumpImpulse, speedRatio } from "./feel";
import { comboTitle, drawFrame, type Cam } from "./render";
import { t } from "./i18n";
import { Input, type Actions } from "./input";
import {
  collidePlayers,
  hitbox,
  makePlayer,
  stepPlayer,
  type JuiceSink,
} from "./physics";
import { isAttack, randomPower } from "./powers";
import { SpriteBank } from "./sprites";
import { spawnCreep, stepCreep } from "./creeps";
import { writeLivePose } from "./live-snap";
import { RAID_NAMES, storyBeat, storyJustHit } from "./story";
import { rumble as buzz } from "./haptics";
import type {
  Corpse,
  Creep,
  GameResult,
  Lang,
  LootKind,
  Mode,
  NetMsg,
  NetPlayer,
  Particle,
  Player,
  Popup,
  PowerId,
  WeaponId,
} from "./types";
import { floorTop, World, dailySeed } from "./world";
import type { LiveClimber } from "@/lib/rime-data";

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getX: () => number;
      getY: () => number;
      getCombo: () => number;
      getFloor: () => number;
      setKeys: (codes: string[]) => void;
    };
  }
}

export interface EngineHooks {
  onHud: (h: HudSnap) => void;
  onOver: (r: GameResult) => void;
  onAttractStart?: () => void;
  onCoins?: (n: number) => void;
  sendState?: (p: NetPlayer) => void;
  sendEvent?: (msg: NetMsg) => void;
}

export interface HudSnap {
  floor: number;
  combo: number;
  comboLeft: number;
  score: number;
  power: PowerId | null;
  blade: number;
  weapon: WeaponId;
  ammo: number;
  alive: boolean;
  paused: boolean;
  others: { id: string; name: string; floor: number; alive: boolean; color: number; off: "up" | "down" | "on" }[];
  killIn: number | null;
  hint: string | null;
  danger: boolean;
  debug: string;
  downed: boolean;
  continueLeft: number;
  reviveCost: number;
  hp: number;
  maxHp: number;
  weaponT: number;
  comboKey: number;
  comboYell: string;
  lastGain: number;
  story: string | null;
}

export interface Boot {
  mode: Mode;
  seed: number;
  localId: string;
  localName: string;
  localColor: number;
  lang: Lang;
  shake: boolean;
  mute: boolean;
  bots: { id: string; name: string; color: number }[];
  weapon?: WeaponId;
  raceFloor?: number;
  attract?: boolean;
}

interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  owner: string;
}

export class RimeEngine {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	world: World;
	players: Player[] = [];
	localId: string;
	mode: Mode;
	lang: Lang;
	input = new Input();
	audio = audioBus;
	sprites = new SpriteBank();
	cam = {
		y: -360,
		shakeX: 0,
		shakeY: 0
	};
	trauma = 0;
	particles: Particle[] = [];
	popups: Popup[] = [];
	running = false;
	paused = false;
	over = false;
	time = 0;
	acc = 0;
	last = 0;
	viewH = BASE_H;
	killY = -40;
	raceFloor: number;
	shakeOn: boolean;
	hooks: EngineHooks;
	remotes = new Map<string, { p: Player; tx: number; ty: number; tvx: number }>();
	raf = 0;
	sendAcc = 0;
	juice: JuiceSink;
	started = false;
	hitstop = 0;
	showedGo = false;
	coachUntil = 5;
	attract = false;
	attractDir = 1;
	hurryStage = -1;
	hurryOn = false;
	attractT = 0;
	hurryAt = 0;
	debugOn = false;
	stageName = "";
	iceFlash = 0;
	worldFreezeT = 0;
	shots: Shot[] = [];
	screamOn = false;
	continueT = 0;
	waitingContinue = false;
	creeps: Creep[] = [];
	spawnedTo = 0;
	corpses: Corpse[] = [];
	pitY: number | null = null;
	pitHit = false;
	ghostIds = new Set<string>();
	comboKey = 0;
	comboYell = "";
	lastGain = 0;
	storyLine: string | null = null;
	storyUntil = 0;
	lastDrop = 0;
	constructor(canvas: HTMLCanvasElement, boot: Boot, hooks: EngineHooks) {
		this.canvas = canvas;
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("canvas");
		this.ctx = ctx;
		this.world = new World(boot.seed);
		this.mode = boot.mode;
		this.lang = boot.lang;
		this.localId = boot.localId;
		this.raceFloor = boot.raceFloor ?? RACE_FLOOR;
		this.shakeOn = boot.shake;
		this.hooks = hooks;
		this.attract = !!boot.attract;
		this.audio.setMute(boot.mute);
		this.audio.setLang(boot.lang);
		this.debugOn = false;
		const slots = spawnSlots(1 + boot.bots.length);
		const local = makePlayer(boot.localId, boot.localName, boot.localColor, slots[0]!);
		this.arm(local, boot.weapon ?? "blade");
		this.players.push(local);
		boot.bots.forEach((b, i) => {
			const bot = makePlayer(b.id, b.name, b.color, slots[i + 1] ?? slots[0]!, true);
			this.arm(bot, i % 2 === 0 ? "gun" : "blade");
			this.players.push(bot);
		});
		if (!this.attract && boot.bots.length === 0 && this.mode !== "train") this.seedRivals();
		this.juice = {
			jump: (p) => {
				if (p.id === this.localId) {
					this.audio.jump(p.combo);
					this.shakeOn && buzz(p.combo >= 5 ? 14 : 8);
					if (Math.abs(p.vx) > 200) this.punch(.22);
				}
				this.burst(p.x, p.y, 7 + Math.min(6, p.combo), "#e8f4ff", "dust");
			},
			land: (p, floor) => {
				if (p.id === this.localId) {
					this.audio.land();
					this.shakeOn && buzz(10);
				}
				const kind = floor?.kind ?? "ice";
				if (kind === "spring") this.burst(p.x, p.y, 8, "#7cffb2", "spark");
				else if (kind === "crumble") this.burst(p.x, p.y, 8, "#c4a882", "dust");
				else if (kind === "check") this.burst(p.x, p.y, 7, "#ffd36a", "spark");
				else if (kind === "conveyor") this.burst(p.x, p.y, 5, "#7ee7ff", "trail");
				else this.burst(p.x, p.y, 8, "#b8f0ff", "ice");
				if (p.id === this.localId) this.punch(.38 + Math.min(.4, p.combo * .05));
			},
			wall: (p) => {
				this.burst(p.x, p.y + 16, 6, "#7ee7ff", "ice");
				if (p.id === this.localId) {
					this.audio.wall();
					this.shakeOn && buzz(16);
					this.punch(.48);
				}
			},
			combo: (p, prev, gain) => {
				if (p.id !== this.localId) return;
				this.audio.combo(p.combo);
				this.audio.setHeat(p.combo);
				if (p.combo < 2) return;
				this.punch(.28);
				this.comboKey += 1;
				this.comboYell = comboYellOf(p.combo);
				this.lastGain = gain;
				if (this.popups.length > 8) this.popups.splice(0, this.popups.length - 6);
				this.popups.push({
					x: p.x,
					y: p.y + 58,
					text: comboTitle(p.combo, this.lang),
					life: 0.7,
					color: p.combo >= 4 ? "#ff4d8a" : "#ffd36a",
					scale: p.combo >= 4 ? 1.25 : 1.05
				});
			},
			comboBreak: (p) => {
				if (p.id !== this.localId) return;
				this.audio.comboBreak();
				this.punch(.3);
				this.comboYell = "";
				this.lastGain = 0;
			},
			bump: (a, b) => {
				if (a.id === this.localId || b.id === this.localId) {
					this.audio.hit();
					this.punch(.4);
					this.shakeOn && buzz(20);
				}
				this.burst((a.x + b.x) / 2, (a.y + b.y) / 2, 8, "#fff4dc", "spark");
			},
			close: (p) => {
				if (p.id === this.localId) this.popups.push({
					x: p.x,
					y: p.y + 36,
					text: t(this.lang).closeCall,
					life: .7,
					color: "#7ee7ff"
				});
			},
			skip: (p, floors) => {
				if (p.id === this.localId && floors >= 3) {
					this.punch(.36);
					this.popups.push({
						x: p.x,
						y: p.y + 70,
						text: t(this.lang).skipYell,
						life: .9,
						color: "#7cffb2"
					});
					this.burst(p.x, p.y + 24, 14, "#7cffb2", "spark");
				}
			}
		};
		this.wireControlsTest();
	}
	wantPlay = false;
	async start() {
		this.audio.arm();
		const load = this.sprites.load();
		this.input.attach();
		this.canvas.addEventListener("pointerdown", () => this.audio.unlock());
		this.running = true;
		this.started = true;
		this.last = performance.now();
		void load;
		if (this.wantPlay) this.beginPlay();
		else this.audio.setScene(this.attract ? "menu" : "game");
		const loop = (now: number) => {
			if (!this.running) return;
			this.raf = requestAnimationFrame(loop);
			try {
				const raw = Math.min(MAX_FRAME, (now - this.last) / 1e3);
				this.last = now;
				if (this.paused || this.over) {
					this.tickPausedShake(raw);
					this.draw();
					this.emitHud();
					return;
				}
				this.acc += raw;
				while (this.acc >= FIXED_DT) {
					this.step(FIXED_DT);
					this.acc -= FIXED_DT;
				}
				this.draw();
				this.emitHud();
			} catch {
				this.acc = 0;
			}
		};
		this.raf = requestAnimationFrame(loop);
		window.setTimeout(() => this.sprites.warmPlay(), 800);
	}
	stop() {
		this.running = false;
		cancelAnimationFrame(this.raf);
		this.input.detach();
	}
	setPaused(v: boolean) {
		this.paused = v;
	}
	setMute(v: boolean) {
		this.audio.setMute(v);
	}
	setShake(v: boolean) {
		this.shakeOn = v;
		if (v) {
			this.punch(0.95);
			buzz([30, 40, 55, 40, 80]);
		}
	}
	private tickPausedShake(dt: number) {
		if (!this.shakeOn || this.trauma <= 0) {
			if (!this.shakeOn) {
				this.cam.shakeX = 0;
				this.cam.shakeY = 0;
			}
			return;
		}
		const mag = this.trauma;
		this.cam.shakeX = (Math.random() * 2 - 1) * (8 + 26 * mag) * mag;
		this.cam.shakeY = (Math.random() * 2 - 1) * (6 + 18 * mag) * mag;
		this.trauma = Math.max(0, this.trauma - dt * 2.6);
	}
	beginPlay() {
		if (!this.started) {
			this.wantPlay = true;
			this.attract = false;
			return;
		}
		this.wantPlay = false;
		this.attract = false;
		this.sprites.warmPlay();
		this.mode = "solo";
		this.over = false;
		this.paused = false;
		this.time = 0;
		this.acc = 0;
		this.last = performance.now();
		this.attractT = 0;
		this.world = new World(dailySeed());
		this.hurryOn = false;
		this.hurryAt = 0;
		this.hurryStage = 0;
		this.world.scrollSpeed = 0;
		this.world.killY = -40;
		this.killY = -40;
		this.showedGo = false;
		this.coachUntil = 3.2;
		this.popups = [];
		this.particles = [];
		this.shots = [];
		this.screamOn = false;
		this.continueT = 0;
		this.waitingContinue = false;
		this.audio.setScene("game");
		this.audio.unlock();
		this.audio.startFanfare();
		this.comboKey = 0;
		this.comboYell = "";
		this.lastGain = 0;
		this.lastDrop = 0;
		this.storyLine = storyBeat(0, this.lang);
		this.storyUntil = 4.2;
		const p = this.local();
		if (p) {
			p.x = 195;
			p.y = 22;
			p.vx = 0;
			p.vy = 0;
			p.floor = 0;
			p.score = 0;
			p.combo = 0;
			p.comboT = 0;
			p.bestCombo = 0;
			p.alive = true;
			p.grounded = true;
			p.spin = 0;
			p.spinV = 0;
			p.trail = [];
			p.power = null;
			p.effects.frozenT = 0;
			p.effects.shrinkT = 0;
			p.effects.shield = false;
			p.hp = 100;
			p.maxHp = 100;
			p.hurtT = 0;
			p.weaponT = 8;
			p.ammo = 8;
			p.blade = 5;
			p.faction = "rime";
		}
		this.cam.y = -80;
		this.cam.shakeX = 0;
		this.cam.shakeY = 0;
		this.creeps = [];
		this.spawnedTo = 0;
		this.corpses = [];
		this.pitY = null;
		this.pitHit = false;
		this.seedRivals();
	}
	syncGhosts(rows: any) {
		const next = new Set<string>();
		for (const row of rows) {
			if (!row.id || row.id === this.localId) continue;
			next.add(row.id);
			const x = Number.isFinite(row.x) && row.x > 8 ? row.x : 195;
			const y = Number.isFinite(row.y) && row.y > 4 ? row.y : this.world.floorY(Math.max(0, row.floor)) + 22;
			this.applyRemote({
				t: "state",
				p: {
					id: row.id,
					x,
					y,
					vx: row.vx || 0,
					vy: 0,
					facing: (row.vx || 0) < 0 ? -1 : 1,
					combo: row.combo || 0,
					floor: row.floor || 0,
					score: row.score || 0,
					alive: row.alive !== false,
					anim: Math.abs(row.vx || 0) > 28 ? "run" : "jump",
					spin: 0,
					power: null,
					frozenT: 0,
					shrinkT: 0,
					shield: false
				}
			});
			const pl = this.players.find((p) => p.id === row.id);
			if (pl) {
				pl.name = row.name || pl.name;
				pl.color = row.color % 4;
				pl.bot = false;
			}
		}
		for (const id of this.ghostIds) {
			if (next.has(id)) continue;
			this.players = this.players.filter((p) => p.id !== id);
			this.remotes.delete(id);
		}
		this.ghostIds = next;
	}
	returnAttract() {
		this.attract = true;
		this.mode = "train";
		this.over = false;
		this.paused = false;
		this.audio.setScene("menu");
		this.audio.setHeat(0);
		this.players = this.players.filter((p) => p.id === this.localId);
		this.remotes.clear();
		const p = this.local();
		if (p) {
			p.x = 195;
			p.y = 22;
			p.vx = 140 * this.attractDir;
			p.vy = jumpImpulse(140) * .8;
			p.floor = 0;
			p.score = 0;
			p.combo = 0;
			p.comboT = 0;
			p.alive = true;
			p.grounded = false;
			p.trail = [];
		}
		this.cam.y = -80;
		this.attractT = 0;
		this.time = 0;
		this.popups = [];
		this.world.scrollSpeed = 0;
		this.hurryOn = false;
		this.screamOn = false;
		this.continueT = 0;
		this.waitingContinue = false;
		this.creeps = [];
		this.spawnedTo = 0;
		this.pitY = null;
		this.pitHit = false;
	}
	applyRemote(msg: any) {
		if (msg.t === "state") {
			const np = msg.p;
			let row = this.remotes.get(np.id);
			let pl = this.players.find((p) => p.id === np.id);
			if (!pl) {
				pl = makePlayer(np.id, np.id.slice(0, 6), 1, np.x);
				this.players.push(pl);
			}
			pl.bot = false;
			if (!row) {
				row = {
					p: pl,
					tx: np.x,
					ty: np.y,
					tvx: np.vx
				};
				this.remotes.set(np.id, row);
			}
			row.tx = np.x;
			row.ty = np.y;
			row.tvx = np.vx;
			pl.facing = np.facing;
			pl.combo = np.combo;
			pl.floor = np.floor;
			pl.score = np.score;
			pl.alive = np.alive;
			pl.anim = np.anim;
			pl.spin = np.spin;
			pl.power = np.power;
			pl.effects.frozenT = np.frozenT;
			pl.effects.shrinkT = np.shrinkT;
			pl.effects.shield = np.shield;
		} else if (msg.t === "dead") {
			const p = this.players.find((x) => x.id === msg.who);
			if (p) p.alive = false;
		} else if (msg.t === "win") this.finish(msg.who, msg.name);
		else if (msg.t === "power") {
			const p = this.players.find((x) => x.id === msg.who);
			if (p) p.power = null;
		}
	}
	step(dt: any) {
		if (this.hitstop > 0) {
			this.hitstop -= dt;
			this.tickFx(dt * .4);
			return;
		}
		this.time += dt;
		this.iceFlash = Math.max(0, this.iceFlash - dt * .9);
		this.worldFreezeT = Math.max(0, this.worldFreezeT - dt);
		this.world.ensure(this.highestFloor() + 24);
		const sink = this.world.tick(dt);
		if (sink) {
			for (const p of this.players) if (p.alive && p.grounded) p.y -= sink;
		}
		this.updateScroll();
		this.tickShots(dt);
		const actions = this.input.sample();
		if (actions.pausePressed && !this.attract) this.paused = !this.paused;
		if (this.attract) {
			if (actions.jumpPressed || actions.powerPressed || actions.weaponPressed) {
				this.hooks.onAttractStart?.();
			}
			const p = this.local();
			this.attractT += dt;
			if (p && (p.floor >= 9 || this.attractT > 14)) {
				p.x = 195;
				p.y = 22;
				p.vx = 160 * this.attractDir;
				p.vy = jumpImpulse(160) * .85;
				p.floor = 0;
				p.score = 0;
				p.combo = 0;
				p.comboT = 0;
				p.spin = 0;
				p.spinV = 0;
				p.grounded = false;
				p.trail = [];
				this.cam.y = -360;
				this.attractT = 0;
			}
			if (p?.alive) stepPlayer(p, this.attractActions(p), this.world, dt, this.juice);
			this.tickFx(dt);
			this.updateCamera(dt);
			return;
		}
		if (this.paused) return;
		if (!this.showedGo && this.time > .15) {
			this.showedGo = true;
			const p = this.local();
			if (p) this.popups.push({
				x: p.x,
				y: p.y + 90,
				text: t(this.lang).goYell,
				life: 1.1,
				color: "#7ee7ff"
			});
		}
		for (const p of this.players) {
			if (!p.alive) {
				p.vy -= F.GRAVITY * 1.15 * dt;
				if (p.vy < -F.TERM_VEL * 1.15) p.vy = -F.TERM_VEL * 1.15;
				p.y += p.vy * dt;
				p.spin += (p.facing >= 0 ? 10 : -10) * dt;
				p.anim = "jump";
				p.animT = 3;
				if (this.pitY != null && p.y <= this.pitY) {
					p.y = this.pitY;
					p.vy = 0;
					if (!this.pitHit) {
						this.pitHit = true;
						this.splat(p);
						this.waitingContinue = true;
						this.continueT = 5.5;
					}
				}
				continue;
			}
			if (p.id === this.localId) {
				stepPlayer(p, actions, this.world, dt, this.juice);
				this.tryPickup(p);
				if (p.wantPower) {
					this.cast(p);
					p.wantPower = false;
				}
				if (actions.weaponPressed) this.useWeapon(p);
			} else if (p.bot) {
				const act = thinkBot(p, this.world, this.players);
				stepPlayer(p, act, this.world, dt, this.juice);
				this.tryPickup(p);
				if (p.wantPower) {
					this.cast(p);
					p.wantPower = false;
				}
				if (act.weaponPressed) this.useWeapon(p);
			} else {
				const row = this.remotes.get(p.id);
				if (row) {
					p.x += (row.tx - p.x) * Math.min(1, 12 * dt);
					p.y += (row.ty - p.y) * Math.min(1, 12 * dt);
					p.vx += (row.tvx - p.vx) * Math.min(1, 8 * dt);
				}
			}
		}
		for (let i = 0; i < this.players.length; i++) for (let j = i + 1; j < this.players.length; j++) collidePlayers(this.players[i], this.players[j], this.juice);
		for (const p of this.players) if (p.alive && p.hp <= 0) this.kill(p);
		this.tickFx(dt);
		this.tickCreeps(dt);
		this.restock(dt);
		this.updateCamera(dt);
		this.checkDeath();
		if (this.waitingContinue) {
			this.continueT -= dt;
			if (this.continueT <= 0 && (this.mode === "solo" || this.mode === "train")) {
				this.waitingContinue = false;
				const p = this.local();
				if (p && !p.alive) this.finish(p.id, p.name);
			}
		}
		this.checkWin();
		this.announceStage();
		this.sendAcc += dt;
		if (this.sendAcc >= 1 / 20) {
			this.sendAcc = 0;
			const local = this.local();
			if (local) this.hooks.sendState?.(this.snapshot(local));
		}
	}
	announceStage() {
		if (this.attract) return;
		const p = this.local();
		if (!p) return;
		const name = WORLD_TITLE[worldForFloor(p.floor)];
		if (name !== this.stageName) {
			const first = !this.stageName;
			this.stageName = name;
			if (!(first && p.floor < 2)) {
				this.popups.push({
					x: p.x,
					y: p.y + 88,
					text: name,
					life: 1.6,
					color: "#ffd36a",
					scale: 1.2
				});
				this.punch(.2);
			}
		}
		if (storyJustHit(p.floor)) {
			this.storyLine = storyBeat(p.floor, this.lang);
			this.storyUntil = this.time + 4.4;
		}
		if (this.storyUntil && this.time > this.storyUntil) this.storyLine = null;
	}
	updateScroll() {
		if (this.attract || this.mode === "train") {
			this.world.scrollSpeed = 0;
			return;
		}
		if (this.worldFreezeT > 0) {
			this.world.scrollSpeed = 0;
			return;
		}
		if (this.mode === "laststand" || this.mode === "bots") return;
		const floor = this.local()?.floor ?? 0;
		if (!this.hurryOn && floor >= F.SCROLL_START_FLOOR) {
			this.hurryOn = true;
			this.hurryAt = this.time;
			this.world.scrollSpeed = F.SCROLL_SPEED;
			const local = this.local();
			if (local) {
				this.popups.push({
					x: local.x,
					y: local.y + 80,
					text: t(this.lang).hurryUp,
					life: 1.4,
					color: "#ff4d8a"
				});
				this.audio.hurry();
				this.punch(.55);
			}
		}
		if (this.hurryOn) {
			const stage = Math.max(0, Math.floor((this.time - this.hurryAt) / F.SCROLL_INTERVAL));
			this.world.scrollSpeed = F.SCROLL_SPEED + stage * F.SCROLL_ACCEL;
			if (stage > this.hurryStage) {
				this.hurryStage = stage;
				if (stage > 0) {
					const local = this.local();
					this.audio.hurry();
					this.punch(.5);
					if (local) this.popups.push({
						x: local.x,
						y: local.y + 80,
						text: t(this.lang).hurryUp,
						life: 1.4,
						color: "#ff4d8a"
					});
				}
			}
		}
	}
	updateCamera(dt: any) {
		const local = this.local();
		const viewH = this.viewH;
		let target = this.cam.y;
		if (local && !local.alive) {
			if (this.pitHit && this.pitY != null) target = this.pitY - viewH * .2;
			else target = local.y - viewH * .62;
			const lead = this.players.filter((p) => p.alive).sort((a, b) => b.y - a.y)[0];
			if (lead && this.mode !== "solo" && this.mode !== "train") target = lead.y - viewH * .48;
		} else if (local) {
			const look = this.attract ? .62 : local.combo >= 8 ? .42 : .48;
			target = local.y - viewH * look + Math.max(0, local.vy) * F.CAM_LOOKAHEAD;
		}
		if (this.mode === "laststand" && this.time > 4) {
			const view = Math.max(this.viewH, 560);
			const top = Math.max(...this.players.filter((p) => p.alive).map((p) => p.y), 40);
			const t = this.time - 4;
			const rise = t * (10 + t * .22);
			this.killY = Math.max(this.killY, Math.min(top - view * .92, rise - 60));
			target = Math.max(target, this.killY);
		}
		const k = 1 - Math.exp(-F.CAM_FOLLOW * dt);
		const next = this.cam.y + (target - this.cam.y) * k;
		this.cam.y = this.attract || this.mode === "train" || local && !local.alive ? next : Math.max(this.cam.y, next);
		const mag = this.trauma;
		this.cam.shakeX = this.shakeOn ? (Math.random() * 2 - 1) * (8 + 26 * mag) * mag : 0;
		this.cam.shakeY = this.shakeOn ? (Math.random() * 2 - 1) * (6 + 18 * mag) * mag : 0;
		this.trauma = Math.max(0, this.trauma - dt * 2.6);
	}
	hurt(p: any, dmg: any) {
		if (!p.alive || p.effects.invulnT > 0) return;
		if (p.effects.shield) {
			p.effects.shield = false;
			p.effects.invulnT = .6;
			return;
		}
		p.hp -= dmg;
		p.hurtT = .4;
		if (p.hp <= 0) this.kill(p);
	}
	hitCreep(c: any, dmg: any, by: any) {
		c.hp -= dmg;
		c.hurtT = .2;
		c.vx += (by ? Math.sign(c.x - by.x) : 1) * (c.kind === "raider" ? 70 : 120);
		if (c.hp > 0) return;
		c.alive = false;
		this.burst(c.x, c.y, 10, "#ff4d8a", "spark");
		if (by) {
			by.score += 60;
			this.hooks.onCoins?.(8 + (c.kind === "bat" ? 4 : c.kind === "raider" ? 10 : 0));
			this.world.pickups.push({
				id: this.world.nextPickupId++,
				x: c.x,
				y: c.y + 10,
				power: null,
				kind: Math.random() > .65 ? "ammo" : "pill",
				taken: false
			});
			this.popups.push({
				x: c.x,
				y: c.y + 36,
				text: "+LOOT",
				life: .7,
				color: "#ffd36a"
			});
		}
	}
	tickCreeps(dt: any) {
		if (this.attract) return;
		const top = this.highestFloor();
		if (top > this.spawnedTo) {
			for (let n = Math.max(this.spawnedTo + 1, top); n <= top + 2; n++) {
				if (n >= 2 && n % 2 === 0) {
					const c = spawnCreep(this.world, n);
					if (c) this.creeps.push(c);
				}
				if (n >= 6 && n % 3 === 0) {
					const c = spawnCreep(this.world, n);
					if (c) this.creeps.push(c);
				}
			}
			this.spawnedTo = top + 2;
		}
		const prey = this.local();
		for (const c of this.creeps) {
			if (!c.alive) continue;
			stepCreep(c, this.world, dt, prey);
			if (c.y < this.cam.y - 40) c.alive = false;
			if (!prey?.alive) continue;
			if (Math.abs(c.x - prey.x) < (c.kind === "raider" ? 32 : 26) && Math.abs(c.y - prey.y) < (c.kind === "raider" ? 48 : 40) && c.hurtT <= 0) {
				const dmg = c.kind === "raider" ? 28 : c.kind === "ember" ? 20 : c.kind === "bat" ? 12 : 16;
				const knock = c.kind === "raider" ? 220 : 110;
				this.hurt(prey, dmg);
				c.vx = -c.vx;
				c.hurtT = c.kind === "raider" ? .55 : .45;
				prey.vx += Math.sign(prey.x - c.x) * knock;
				if (c.kind === "raider") prey.vy += 80;
			}
		}
		if (this.creeps.length > 16) this.creeps = this.creeps.filter((c) => c.alive).slice(-14);
	}
	punch(n: any) {
		this.trauma = Math.min(1, this.trauma + n);
	}
	checkDeath() {
		if (this.mode === "train") {
			for (const p of this.players) if (p.y < -40) {
				p.y = 22;
				p.vy = 0;
				p.grounded = true;
			}
			return;
		}
		if (this.time < (this.mode === "solo" ? F.SPAWN_PROTECT : 2.2)) return;
		const line = this.mode === "laststand" ? Math.max(this.killY, this.cam.y) : this.cam.y;
		for (const p of this.players) {
			if (!p.alive) continue;
			if (line - p.y > 28 && p.id === this.localId && !this.screamOn) {
				this.screamOn = true;
				this.audio.scream();
			}
			if (p.y < line - 210) this.kill(p);
		}
	}
	kill(p: any) {
		if (!p.alive) return;
		p.alive = false;
		p.deadAt = this.time;
		p.spin = Math.PI;
		if (p.id === this.localId) {
			this.audio.scream();
			this.screamOn = true;
			this.pitY = this.cam.y - 140;
			this.pitHit = false;
			this.waitingContinue = false;
		} else {
			this.audio.die();
			this.corpses.push({
				x: p.x,
				y: p.y,
				facing: p.facing,
				color: p.color
			});
		}
		this.punch(1);
		this.shakeOn && buzz([
			40,
			30,
			70
		]);
		this.hooks.sendEvent?.({
			t: "dead",
			who: p.id,
			floor: p.floor,
			score: p.score
		});
	}
	splat(p: any) {
		const slot = 50 + this.corpses.length % 5 * 56;
		this.corpses.push({
			x: Math.max(54, Math.min(336, slot + p.x % 20)),
			y: (this.pitY ?? p.y) + 2,
			facing: p.facing,
			color: p.color
		});
		this.burst(p.x, (this.pitY ?? p.y) + 4, 16, "#6b121c", "blood");
		this.audio.splat();
		this.punch(.55);
		this.shakeOn && buzz([
			30,
			20,
			40
		]);
		this.waitingContinue = true;
		this.continueT = 5.5;
	}
	revive() {
		const p = this.local();
		if (!p || p.alive || !this.waitingContinue) return false;
		p.alive = true;
		p.y = this.cam.y + this.viewH * .38;
		p.vy = jumpImpulse(200);
		p.vx *= .35;
		p.grounded = false;
		p.effects.invulnT = 2.2;
		p.effects.shield = true;
		p.hp = Math.max(p.hp, Math.floor(p.maxHp * .55));
		this.pitY = null;
		this.pitHit = false;
		this.screamOn = false;
		p.combo = 0;
		this.waitingContinue = false;
		this.continueT = 0;
		this.screamOn = false;
		this.audio.startFanfare();
		this.popups.push({
			x: p.x,
			y: p.y + 70,
			text: "BACK!",
			life: 1.1,
			color: "#7cffb2"
		});
		return true;
	}
	skipContinue() {
		this.continueT = 0;
		this.waitingContinue = false;
		const p = this.local();
		if (p && !p.alive && (this.mode === "solo" || this.mode === "train") && this.pitHit) this.finish(p.id, p.name);
	}
	checkWin() {
		if (this.over) return;
		if (this.mode === "solo" || this.mode === "train") {
			const p = this.local();
			if (p && !p.alive && this.pitHit && !this.waitingContinue) this.finish(p.id, p.name);
			return;
		}
		if (this.mode === "race") {
			const winner = this.players.find((p) => p.alive && p.floor >= this.raceFloor);
			if (winner) this.finish(winner.id, winner.name);
			return;
		}
		const live = this.players.filter((p) => p.alive);
		if (this.time < 3) return;
		if (this.players.length > 1 && live.length <= 1) {
			const w = live[0];
			this.finish(w?.id ?? "", w?.name ?? "");
		}
	}
	finish(id: any, name: any) {
		if (this.over) return;
		this.over = true;
		const local = this.local();
		if (this.mode !== "solo" && this.mode !== "train" && id === this.localId) this.audio.win();
		const ranks = [...this.players].sort((a, b) => b.score - a.score || b.floor - a.floor).map((p) => ({
			id: p.id,
			name: p.name,
			floor: p.floor,
			score: p.score,
			alive: p.alive
		}));
		this.hooks.onOver({
			mode: this.mode,
			floor: local?.floor ?? 0,
			score: local?.score ?? 0,
			combo: local?.bestCombo ?? 0,
			winnerId: id,
			winnerName: name,
			ranks
		});
	}
	tryPickup(p: any) {
		const hb = hitbox(p);
		const reach = p.effects.magnetT > 0 ? 48 : 26;
		for (const pk of this.world.pickups) {
			if (pk.taken) continue;
			if (Math.abs(pk.x - p.x) < reach && pk.y > hb.y - 8 && pk.y < hb.y + 56) {
				pk.taken = true;
				let voice = pk.kind;
				if (pk.kind === "pill") {
					p.hp = Math.min(p.maxHp, p.hp + 28);
					this.popups.push({
						x: p.x,
						y: p.y + 50,
						text: "+HP",
						life: .8,
						color: "#ff4d8a",
						scale: 1.15
					});
				} else if (pk.kind === "elixir") {
					p.maxHp = Math.min(160, p.maxHp + 20);
					p.hp = Math.min(p.maxHp, p.hp + 70);
					this.popups.push({
						x: p.x,
						y: p.y + 50,
						text: "ELIXIR",
						life: .9,
						color: "#ffd36a",
						scale: 1.2
					});
				} else if (pk.kind === "ammo") {
					p.weaponT = Math.min(12, p.weaponT + 8);
					p.ammo = Math.min(12, p.ammo + 6);
					p.blade = Math.min(8, p.blade + 3);
					this.popups.push({
						x: p.x,
						y: p.y + 50,
						text: "ARMED",
						life: .85,
						color: "#7ee7ff",
						scale: 1.15
					});
				} else if (pk.power === "blade") {
					p.weaponT = Math.min(12, p.weaponT + 6);
					p.power = "blade";
					voice = "ammo";
				} else if (pk.power) {
					p.power = pk.power;
					voice = "power";
				}
				if (p.id === this.localId) this.audio.pickup(voice === "power" ? "power" : voice);
			}
		}
	}
	cast(p: any) {
		if (!p.power) return;
		const id = p.power;
		p.power = null;
		if (p.id === this.localId) this.audio.power();
		const others = this.players.filter((o) => o.alive && o.id !== p.id);
		if (id === "spring") p.effects.springT = 6;
		else if (id === "shield") {
			p.effects.shield = true;
			p.effects.invulnT = 6;
		} else if (id === "glide") p.effects.glideT = 5;
		else if (id === "magnet") p.effects.magnetT = 6;
		else if (id === "freeze") {
			this.audio.freeze();
			this.iceFlash = 1;
			this.worldFreezeT = 3.2;
			this.punch(.55);
			this.burst(p.x, p.y + 20, 18, "#b8f0ff", "ice");
			this.popups.push({
				x: p.x,
				y: p.y + 70,
				text: others.length ? "FROZEN!" : "TOWER FROZE!",
				life: 1.3,
				color: "#b8f0ff"
			});
			for (const o of others) o.effects.frozenT = 2.8;
		} else if (id === "gust") {
			if (others.length) for (const o of others) o.vx += Math.sign(o.x - p.x || 1) * 260;
			else {
				p.vx = Math.sign(p.vx || p.facing) * F.MAX_SPEED;
				p.vy = Math.max(p.vy, jumpImpulse(p.vx) * .4);
			}
			this.popups.push({
				x: p.x,
				y: p.y + 64,
				text: "GUST!",
				life: .9,
				color: "#c9e8ff"
			});
		} else if (id === "swap") {
			const t = others[0];
			if (t) {
				const x = p.x;
				const y = p.y;
				p.x = t.x;
				p.y = t.y;
				t.x = x;
				t.y = y;
			} else {
				const up = this.world.floorByN(p.floor + 3);
				if (up) {
					p.x = up.x + up.w / 2;
					p.y = floorTop(up);
					p.vy = jumpImpulse(p.vx) * .5;
				}
			}
			this.popups.push({
				x: p.x,
				y: p.y + 64,
				text: "WARP!",
				life: .9,
				color: "#ffd36a"
			});
		} else if (id === "slick") {
			for (const f of this.world.nearby(p.y, 140)) f.slickT = 5;
			p.vx = Math.sign(p.vx || p.facing) * Math.max(Math.abs(p.vx), F.MAX_SPEED * .85);
		} else if (id === "quake") {
			this.trauma = 1;
			p.vy = jumpImpulse(p.vx) * 1.15;
			for (const o of others) o.vy = Math.min(o.vy, -80);
			this.popups.push({
				x: p.x,
				y: p.y + 70,
				text: "QUAKE!",
				life: 1,
				color: "#ff4d8a"
			});
		} else if (id === "shrink") {
			if (others.length) for (const o of others) o.effects.shrinkT = 5;
			else {
				p.effects.springT = Math.max(p.effects.springT, 4);
				p.effects.glideT = Math.max(p.effects.glideT, 3);
			}
		} else if (id === "blade") {
			this.slash(p);
			if (p.blade > 0) p.power = "blade";
		}
		if (isAttack(id)) this.hooks.sendEvent?.({
			t: "power",
			who: p.id,
			power: id
		});
	}
	slash(p: any) {
		if (p.weaponT <= 0) return;
		p.weaponT = Math.max(0, p.weaponT - .7);
		p.slashT = .28;
		p.vy = Math.max(p.vy, jumpImpulse(p.vx) * .62);
		p.anim = "spin";
		p.animT = 0;
		this.punch(.32);
		this.burst(p.x, p.y + 18, 12, "#e8f4ff", "spark");
		this.popups.push({
			x: p.x,
			y: p.y + 58,
			text: "SLASH!",
			life: .7,
			color: "#e8f4ff"
		});
		if (p.id === this.localId) {
			this.audio.hit();
			this.audio.slash();
		}
		for (const o of this.players) {
			if (o.id === p.id || !o.alive) continue;
			if (Math.hypot(o.x - p.x, o.y - p.y) < 90) {
				o.vx += Math.sign(o.x - p.x || p.facing) * 280;
				o.vy += 80;
				this.hurt(o, 24);
			}
		}
		for (const c of this.creeps) {
			if (!c.alive) continue;
			if (Math.hypot(c.x - p.x, c.y - p.y) < 88) this.hitCreep(c, 34, p);
		}
	}
	arm(p: any, w: any) {
		p.weapon = w;
		p.weaponT = 7;
		if (w === "blade") p.blade = 4;
		if (w === "gun") p.ammo = 6;
	}
	useWeapon(p: any) {
		if (p.weaponT <= 0) return;
		if (p.slashT > .05) return;
		if (p.weapon === "gun") {
			if (p.ammo <= 0) return;
			p.ammo -= 1;
			p.slashT = .22;
			p.weaponT = Math.max(0, p.weaponT - .45);
			this.shots.push({
				x: p.x + p.facing * 18,
				y: p.y + 22,
				vx: p.facing * 420,
				vy: Math.max(40, p.vy * .2),
				life: .7,
				owner: p.id
			});
			this.audio.hit();
			this.burst(p.x, p.y + 20, 6, "#ffd36a", "spark");
			return;
		}
		this.slash(p);
	}
	tickShots(dt: any) {
		for (const s of this.shots) {
			s.life -= dt;
			s.x += s.vx * dt;
			s.y += s.vy * dt;
			for (const o of this.players) {
				if (!o.alive || o.id === s.owner) continue;
				if (Math.abs(o.x - s.x) < 18 && Math.abs(o.y + 16 - s.y) < 28) {
					o.vx += Math.sign(s.vx) * 240;
					o.vy += 60;
					s.life = 0;
					this.hurt(o, 18);
					this.burst(o.x, o.y + 20, 8, "#ffd36a", "spark");
				}
			}
			for (const c of this.creeps) {
				if (!c.alive) continue;
				if (Math.abs(c.x - s.x) < 16 && Math.abs(c.y + 10 - s.y) < 22) {
					s.life = 0;
					const owner = this.players.find((pl) => pl.id === s.owner);
					this.hitCreep(c, 22, owner);
				}
			}
		}
		this.shots = this.shots.filter((s) => s.life > 0 && s.x > 0 && s.x < 390);
	}
	tickFx(dt: any) {
		for (const q of this.particles) {
			q.life -= dt;
			q.x += q.vx * dt;
			q.y += q.vy * dt;
			q.vy -= 240 * dt;
		}
		this.particles = this.particles.filter((q) => q.life > 0);
		if (this.particles.length > 48) this.particles.splice(0, this.particles.length - 48);
		for (const u of this.popups) u.life -= dt;
		this.popups = this.popups.filter((u) => u.life > 0);
		if (this.particles.length < 24 && Math.random() < .04) this.particles.push({
			x: Math.random() * 390,
			y: this.cam.y + Math.random() * this.viewH,
			vx: -12,
			vy: -30,
			life: 3,
			max: 3,
			size: 1.2,
			color: "rgba(232,244,255,0.7)",
			kind: "snow"
		});
		// Cheap ambient ledge juice: crumble dust while failing, ice drips.
		if (this.particles.length < 40) {
			const mid = this.cam.y + this.viewH * 0.5;
			for (const f of this.world.nearby(mid, this.viewH + 40)) {
				if (f.gone) continue;
				const top = floorTop(f);
				if (f.kind === "crumble" && f.crumbleT > 0 && Math.random() < 0.28) {
					this.particles.push({
						x: f.x + Math.random() * f.w,
						y: top + 2,
						vx: (Math.random() - 0.5) * 40,
						vy: -20 - Math.random() * 50,
						life: 0.35 + Math.random() * 0.35,
						max: 0.7,
						size: 1.2 + Math.random() * 2,
						color: "#c4a882",
						kind: "dust",
					});
				} else if (f.kind === "ice" && Math.random() < 0.012) {
					this.particles.push({
						x: f.x + 6 + Math.random() * Math.max(8, f.w - 12),
						y: top,
						vx: (Math.random() - 0.5) * 8,
						vy: -10 - Math.random() * 20,
						life: 0.5 + Math.random() * 0.4,
						max: 0.9,
						size: 1.1 + Math.random(),
						color: "rgba(200,236,255,0.85)",
						kind: "ice",
					});
				}
			}
		}
	}
	burst(x: any, y: any, n: any, color: any, kind: any) {
		const count = kind === "blood" ? n : Math.min(n, 8);
		for (let i = 0; i < count; i++) this.particles.push({
			x: x + (Math.random() - .5) * (kind === "blood" ? 40 : 8),
			y,
			vx: (Math.random() - .5) * (kind === "blood" ? 260 : 180),
			vy: kind === "blood" ? 40 + Math.random() * 180 : Math.random() * 160 - 20,
			life: kind === "blood" ? .8 + Math.random() * .7 : .35 + Math.random() * .4,
			max: kind === "blood" ? 1.5 : .7,
			size: kind === "blood" ? 3 + Math.random() * 6 : 1.5 + Math.random() * 2.5,
			color,
			kind
		});
	}
	draw() {
		const canvas = this.canvas;
		const parent = canvas.parentElement;
		const cssW = parent?.clientWidth || 390;
		const cssH = parent?.clientHeight || 780;
		const dpr = Math.min(1.25, window.devicePixelRatio || 1);
		const scale = cssW / 390;
		const viewW = 390;
		const viewH = cssH / scale;
		this.viewH = Math.max(560, cssH / scale);
		const bw = Math.round(cssW * dpr);
		const bh = Math.round(cssH * dpr);
		if (canvas.width !== bw || canvas.height !== bh) {
			canvas.width = bw;
			canvas.height = bh;
		}
		canvas.style.width = `${cssW}px`;
		canvas.style.height = `${cssH}px`;
		const ctx = this.ctx;
		ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
		ctx.clearRect(0, 0, viewW, viewH);
		drawFrame(ctx, this.world, this.players, this.particles, this.popups, this.cam, this.sprites, viewW, viewH, performance.now(), this.lang, this.localId, this.local()?.floor ?? 0, this.iceFlash, this.shots, this.attract, this.creeps, this.pitY, this.corpses);
	}
	emitHud() {
		const p = this.local();
		if (p) writeLivePose({
			x: p.x,
			y: p.y,
			vx: p.vx,
			combo: p.combo,
			score: p.score,
			alive: p.alive,
			floor: p.floor
		});
		const copy = t(this.lang);
		const showCoach = !!p && p.alive && p.combo < 2 && this.time < this.coachUntil && this.time > .6;
		const dist = p ? p.y - this.cam.y : 200;
		const r = p ? speedRatio(p.vx) : 0;
		this.hooks.onHud({
			floor: p?.floor ?? 0,
			combo: p?.combo ?? 0,
			comboLeft: p && p.combo > 0 ? p.comboT / F.COMBO_TIMEOUT : 0,
			score: p?.score ?? 0,
			power: p?.power ?? null,
			blade: p?.blade ?? 0,
			weapon: p?.weapon ?? "blade",
			ammo: p?.ammo ?? 0,
			alive: p?.alive ?? false,
			paused: this.paused,
			others: this.players.filter((o) => o.id !== this.localId).map((o) => {
				const sy = this.viewH - (o.y - this.cam.y);
				return {
					id: o.id,
					name: o.name,
					floor: o.floor,
					alive: o.alive,
					color: o.color,
					off: sy < 48 ? "up" : sy > this.viewH - 96 ? "down" : "on"
				};
			}),
			killIn: Math.max(0, dist),
			hint: showCoach ? copy.hintCoach : null,
			danger: !!p && p.alive && this.time > F.SPAWN_PROTECT && dist < this.viewH * .22,
			downed: !!p && !p.alive && this.waitingContinue,
			continueLeft: this.continueT,
			reviveCost: 50 + Math.floor((p?.floor ?? 0) * 2),
			hp: p?.hp ?? 100,
			maxHp: p?.maxHp ?? 100,
			weaponT: p?.weaponT ?? 0,
			comboKey: this.comboKey,
			comboYell: p && p.combo >= 2 ? this.comboYell || comboYellOf(p.combo) : "",
			lastGain: this.lastGain,
			story: this.attract ? null : this.storyLine,
			debug: this.debugOn && p ? `vx ${p.vx.toFixed(0)}  vy ${p.vy.toFixed(0)}  ${bandOf(p.vx)}  jump ${jumpImpulse(p.vx).toFixed(0)}  r ${r.toFixed(2)}  scroll ${this.world.scrollSpeed.toFixed(0)}  comboT ${p.comboT.toFixed(1)}` : ""
		});
	}
	snapshot(p: any) {
		return {
			id: p.id,
			x: p.x,
			y: p.y,
			vx: p.vx,
			vy: p.vy,
			facing: p.facing,
			combo: p.combo,
			floor: p.floor,
			score: p.score,
			alive: p.alive,
			anim: p.anim,
			spin: p.spin,
			power: p.power,
			frozenT: p.effects.frozenT,
			shrinkT: p.effects.shrinkT,
			shield: p.effects.shield
		};
	}
	attractActions(p: any) {
		if (p.x < 74) this.attractDir = 1;
		if (p.x > 316) this.attractDir = -1;
		return {
			moveX: this.attractDir,
			jumpHeld: true,
			jumpPressed: false,
			powerPressed: false,
			weaponPressed: false,
			pausePressed: false
		};
	}
	local() {
		return this.players.find((p) => p.id === this.localId);
	}
	seedRivals() {
		this.players = this.players.filter((p) => p.id === this.localId || this.ghostIds.has(p.id));
		const names = RAID_NAMES[this.lang];
		for (let i = 0; i < 3; i++) {
			const floorN = 1 + i * 2;
			const f = this.world.floorByN(floorN);
			const bot = makePlayer(`raid-${i}`, names[i] ?? botName(i, this.lang), (i + 1) % 4, f ? f.x + f.w * .5 : 195, true);
			bot.faction = "ember";
			bot.floor = floorN;
			bot.takeoffFloor = floorN;
			bot.y = f ? floorTop(f) : 22;
			bot.vx = i % 2 === 0 ? 120 : -120;
			this.arm(bot, i % 2 === 0 ? "gun" : "blade");
			this.players.push(bot);
		}
	}
	restock(dt: any) {
		if (this.attract) return;
		const p = this.local();
		if (!p?.alive) return;
		this.lastDrop += dt;
		const near = this.world.pickups.filter((pk) => !pk.taken && Math.abs(pk.y - p.y) < 280).length;
		const hungry = p.weaponT < 2.2 || p.hp < 55 || !p.power;
		if (this.lastDrop < (hungry ? 2.8 : 5.5)) return;
		if (near >= 4 && !hungry) return;
		this.lastDrop = 0;
		const up = this.world.floorByN(p.floor + 2) ?? this.world.floorByN(p.floor + 1);
		if (!up) return;
		const kind = p.weaponT < 2.2 ? "ammo" : p.hp < 55 ? "pill" : this.world.rng() < .5 ? "power" : "ammo";
		this.world.pickups.push({
			id: this.world.nextPickupId++,
			x: up.x + up.w * (.3 + this.world.rng() * .4),
			y: up.y + 22 + 24,
			power: kind === "power" ? randomPower(this.world.rng) : null,
			kind,
			taken: false
		});
	}
	highestFloor() {
		return this.players.reduce((m, p) => Math.max(m, p.floor), 0);
	}
	wireControlsTest() {
		window.__controlsTest = {
			getYaw: () => 0,
			getSpeed: () => Math.abs(this.local()?.vx ?? 0),
			getX: () => this.local()?.x ?? 0,
			getY: () => this.local()?.y ?? 0,
			getCombo: () => this.local()?.combo ?? 0,
			getFloor: () => this.local()?.floor ?? 0,
			setKeys: (codes: string[]) => this.input.setKeys(codes)
		};
	}
}
function spawnSlots(n: number) {
	const mid = (INNER_L + INNER_R) / 2;
	if (n === 1) return [mid];
	const span = 90;
	const out: number[] = [];
	for (let i = 0; i < n; i++) out.push(mid - span / 2 + span / Math.max(1, n - 1) * i);
	return out;
}
function comboYellOf(n: number) {
	if (n >= 4) return "COMBO!!";
	if (n >= 3) return "X3";
	if (n >= 2) return "X2";
	return "";
}