type Scene = "menu" | "game" | "off";
type KidLine = "hop" | "x2" | "x3" | "combo" | "pill" | "ammo" | "power" | "slash" | "yeah" | "go";
type StemId = "lobby" | "climb" | "heat" | "rush";

interface Stem {
  id: StemId;
  el: HTMLAudioElement;
  src: MediaElementAudioSourceNode | null;
  gain: GainNode | null;
  target: number;
}

const STEM_SRC: Record<StemId, string> = {
  lobby: "/music/lobby.mp3",
  climb: "/music/climb.mp3",
  heat: "/music/heat.mp3",
  rush: "/music/rush.mp3",
};

export class AudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private music: GainNode | null = null;
  private muted = false;
  private pageHidden = false;
  private scene: Scene = "off";
  private nextNote = 0;
  private step = 0;
  private loopRaf = 0;
  private htmlJump: HTMLAudioElement | null = null;
  private htmlPing: HTMLAudioElement | null = null;
  private lang: "he" | "en" = "en";
  private heat = 0;
  private lastTalk = 0;
  private lastVoice = 0;
  private bound = false;
  private stems: Partial<Record<StemId, Stem>> = {};
  private stemsReady = false;
  private usingStems = false;
  private filter: BiquadFilterNode | null = null;
  unlocked = false;

  unlock(): void {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) {
      this.primeHtml();
      this.primeSpeech();
      this.bootStemsHtmlOnly();
      return;
    }
    if (!this.ctx) {
      try {
        this.ctx = new AC({ latencyHint: "interactive" });
      } catch {
        this.primeHtml();
        this.primeSpeech();
        this.bootStemsHtmlOnly();
        return;
      }
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.music = this.ctx.createGain();
      this.sfx.gain.value = 0.55;
      this.music.gain.value = 0.28;
      this.sfx.connect(this.master);
      this.music.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.unlocked = true;
      this.applyMute();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    this.kickGraph();
    this.primeSpeech();
    this.primeHtml();
    this.bindUnlock();
    this.bootStems();
    this.publishTest();
    if (this.scene !== "off") this.startLoop();
  }

  arm(): void {
    this.bindUnlock();
  }

  private bindUnlock(): void {
    if (this.bound || typeof window === "undefined") return;
    this.bound = true;
    const go = () => this.unlock();
    window.addEventListener("pointerdown", go, { capture: true });
    window.addEventListener("keydown", go, { capture: true });
    window.addEventListener("touchstart", go, { capture: true });
    window.addEventListener("touchend", go, { capture: true });
    window.addEventListener("focus", () => {
      if (!document.hidden) this.resume();
    });
    document.addEventListener("visibilitychange", () => this.handleVisibility());
  }

  handleVisibility(): void {
    if (document.hidden) this.suspendForBackground();
    else this.resume();
  }

  suspendForBackground(): void {
    this.pageHidden = true;
    this.pauseStems();
    try {
      this.htmlJump?.pause();
    } catch {
      /* ignore */
    }
    try {
      this.htmlPing?.pause();
    } catch {
      /* ignore */
    }
    for (const s of Object.values(this.stems)) {
      if (!s?.el) continue;
      try {
        s.el.pause();
      } catch {
        /* ignore */
      }
      s.el.muted = true;
    }
    if (this.master && this.ctx) {
      this.master.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    this.silenceVoice();
    if (this.ctx?.state === "running") void this.ctx.suspend();
  }

  setLang(lang: "he" | "en"): void {
    this.lang = lang;
  }

  setHeat(n: number): void {
    this.heat = Math.max(0, n);
    this.applyStemMix();
  }

  private kickGraph(): void {
    if (!this.ctx) return;
    try {
      const buf = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.ctx.destination);
      src.start(0);
    } catch {
      /* ignore */
    }
  }

  private makeHtml(src: string, vol: number): HTMLAudioElement {
    const a = new Audio(src);
    a.preload = "auto";
    a.setAttribute("playsinline", "true");
    a.volume = vol;
    try {
      document.body.appendChild(a);
    } catch {
      /* ignore */
    }
    return a;
  }

  private playHtml(a: HTMLAudioElement | null, vol: number): void {
    if (!a || this.muted) return;
    try {
      a.pause();
      a.currentTime = 0;
      a.volume = vol;
      const p = a.play();
      if (p) void p.catch(() => {});
    } catch {
      /* ignore */
    }
  }

  private primeSpeech(): void {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      const warm = new SpeechSynthesisUtterance(" ");
      warm.volume = 0;
      synth.speak(warm);
      synth.cancel();
      void synth.getVoices();
    } catch {
      /* ignore */
    }
  }

  private primeHtml(): void {
    if (!this.htmlJump) {
      this.htmlJump = this.makeHtml(JUMP_WAV, 0.55);
      this.playHtml(this.htmlJump, 0.0001);
    }
    if (!this.htmlPing) this.htmlPing = this.makeHtml(PING_WAV, 0.9);
  }

  private bootStems(): void {
    if (!this.ctx || !this.music) {
      this.bootStemsHtmlOnly();
      return;
    }
    if (!this.filter) {
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.frequency.value = 14000;
      this.filter.Q.value = 0.7;
      this.filter.connect(this.music);
    }
    this.stemsReady = true;
    this.usingStems = true;
    this.applyStemMix(true);
    this.publishTest();
  }

  private bootStemsHtmlOnly(): void {
    this.stemsReady = true;
    this.usingStems = true;
    this.applyStemMix(true);
    this.publishTest();
  }

  private ensureStem(id: StemId): Stem | null {
    const existing = this.stems[id];
    if (existing) return existing;
    try {
      const el = new Audio(STEM_SRC[id]);
      el.loop = true;
      el.preload = "auto";
      el.setAttribute("playsinline", "true");
      el.crossOrigin = "anonymous";
      el.volume = 1;
      try {
        el.style.display = "none";
        document.body.appendChild(el);
      } catch {
        /* ignore */
      }
      let src: MediaElementAudioSourceNode | null = null;
      let gain: GainNode | null = null;
      if (this.ctx && this.filter) {
        gain = this.ctx.createGain();
        gain.gain.value = 0.0001;
        try {
          src = this.ctx.createMediaElementSource(el);
          src.connect(gain);
          gain.connect(this.filter);
        } catch {
          /* already used */
        }
      } else {
        el.volume = 0;
      }
      const stem: Stem = { id, el, src, gain, target: 0 };
      this.stems[id] = stem;
      return stem;
    } catch {
      return null;
    }
  }

  private publishTest(): void {
    (window as unknown as { __musicTest?: () => unknown }).__musicTest = () => ({
      scene: this.scene,
      heat: this.heat,
      using: this.usingStems,
      unlocked: this.unlocked,
      muted: this.muted,
      ctx: this.ctx?.state ?? "none",
      stems: (Object.keys(STEM_SRC) as StemId[]).map((id) => {
        const s = this.stems[id];
        if (!s) return { id, missing: true };
        return {
          id,
          paused: s.el.paused,
          t: Number(s.el.currentTime.toFixed(2)),
          loop: s.el.loop,
          target: Number(s.target.toFixed(2)),
          ready: s.el.readyState,
          err: s.el.error?.message ?? null,
        };
      }),
    });
  }

  private resumeStems(): void {
    if (this.muted || this.pageHidden) return;
    for (const s of Object.values(this.stems)) {
      if (!s?.el || s.target <= 0.02) continue;
      if (s.el.paused) {
        const p = s.el.play();
        if (p) void p.catch(() => {});
      }
    }
  }

  private pauseStems(): void {
    for (const s of Object.values(this.stems)) {
      try {
        s?.el.pause();
      } catch {
        /* ignore */
      }
    }
  }

  private applyStemMix(snap = false): void {
    if (!this.usingStems) return;
    const h = this.heat;
    let lobby = 0;
    let climb = 0;
    let heat = 0;
    let rush = 0;
    if (!this.muted && this.scene === "menu") {
      lobby = 0.36;
    } else if (!this.muted && this.scene === "game") {
      const heatAmt = Math.max(0, Math.min(1, h / 8));
      const rushAmt = h >= 6 ? Math.max(0, Math.min(1, (h - 5) / 7)) : 0;
      climb = 0.32 * (1 - rushAmt * 0.28);
      heat = h >= 3 ? 0.06 + heatAmt * 0.28 : 0;
      rush = rushAmt * 0.32;
    }
    if (lobby > 0.02) this.ensureStem("lobby");
    if (climb > 0.02) this.ensureStem("climb");
    if (heat > 0.02) this.ensureStem("heat");
    if (rush > 0.02) this.ensureStem("rush");
    const mix = climb + heat + rush;
    if (mix > 0.38) {
      const k = 0.38 / mix;
      climb *= k;
      heat *= k;
      rush *= k;
    }
    this.setStemVol("lobby", lobby, snap);
    this.setStemVol("climb", climb, snap);
    this.setStemVol("heat", heat, snap);
    this.setStemVol("rush", rush, snap);

    const rate = this.scene === "game" ? 1 + Math.min(0.14, h * 0.012) : 1;
    for (const id of ["climb", "heat", "rush"] as StemId[]) {
      const el = this.stems[id]?.el;
      if (el) {
        try {
          el.playbackRate = rate;
        } catch {
          /* ignore */
        }
      }
    }
    if (this.filter && this.ctx) {
      const freq =
        this.scene === "menu"
          ? 11000
          : 2200 + Math.min(16000, Math.max(0, h) * 1600);
      this.filter.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.18);
    }
    if (!this.muted && this.scene !== "off") this.resumeStems();
  }

  private setStemVol(id: StemId, vol: number, snap: boolean): void {
    const s = this.stems[id];
    if (!s) return;
    s.target = vol;
    s.el.muted = this.muted || vol <= 0.02;
    const throughGraph = !!(s.src && s.gain && this.ctx);
    if (throughGraph && this.ctx && s.gain) {
      const g = Math.max(0.0001, this.muted ? 0 : vol);
      if (snap) s.gain.gain.setValueAtTime(g, this.ctx.currentTime);
      else s.gain.gain.setTargetAtTime(g, this.ctx.currentTime, 0.18);
      s.el.volume = 1;
    } else {
      s.el.volume = this.muted ? 0 : Math.max(0, Math.min(1, vol));
    }
    if (vol > 0.02 && !this.muted) {
      if (s.el.paused) {
        const p = s.el.play();
        if (p) void p.catch(() => {});
      }
    } else if (!s.el.paused) {
      try {
        s.el.pause();
      } catch {
        /* ignore */
      }
    }
  }

  setMute(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setValueAtTime(m ? 0 : 1, this.ctx.currentTime);
    }
    if (this.htmlJump) {
      this.htmlJump.muted = m;
      if (m) this.htmlJump.pause();
    }
    if (this.htmlPing) {
      this.htmlPing.muted = m;
      if (m) this.htmlPing.pause();
    }
    for (const s of Object.values(this.stems)) {
      if (!s) continue;
      s.el.muted = m;
      if (m) {
        s.el.volume = 0;
        try {
          s.el.pause();
        } catch {
          /* ignore */
        }
      }
    }
    if (m) this.silenceVoice();
    else if (this.unlocked) {
      this.applyStemMix(true);
      this.resumeStems();
    }
  }

  resume(): void {
    if (typeof document !== "undefined" && document.hidden) return;
    this.pageHidden = false;
    if (this.muted) {
      this.applyMute();
      return;
    }
    if (this.ctx?.state === "suspended") void this.ctx.resume();
    if (this.master && this.ctx) {
      this.master.gain.setValueAtTime(1, this.ctx.currentTime);
    }
    this.applyStemMix(true);
    this.resumeStems();
  }

  setScene(scene: Scene): void {
    this.scene = scene;
    this.step = 0;
    if (scene !== "game") this.heat = 0;
    if (this.ctx) this.nextNote = this.ctx.currentTime + 0.05;
    if (scene === "off") {
      this.stopLoop();
      this.pauseStems();
    } else {
      this.startLoop();
      if (this.unlocked) this.resumeStems();
    }
    if (this.unlocked) this.applyStemMix(false);
  }

  jump(combo: number): void {
    const n = Math.min(40, combo);
    const start = 180 + n * 8;
    const peak = 420 + n * 16;
    this.slide(start, peak, 0.1, "sine", 0.16);
    this.slide(peak * 0.5, start * 0.6, 0.18, "triangle", 0.07);
  }

  land(): void {
    this.slide(120, 48, 0.1, "sine", 0.1);
  }

  wall(): void {
    this.slide(380, 160, 0.09, "sine", 0.1);
    this.blip(520, 0.05, "triangle", 0.06);
  }

  combo(n: number): void {
    this.heat = n;
    this.applyStemMix();
    const root = 280 + Math.min(18, n) * 8;
    this.blip(root, 0.14, "sine", 0.1);
    this.blip(root * 1.5, 0.18, "sine", 0.07, 0.05);
    this.blip(root * 2, 0.2, "triangle", 0.05, 0.1);
    if (n >= 4) this.kid("combo");
    else if (n >= 3) this.kid("x3");
    else if (n >= 2) this.kid("x2");
  }

  startFanfare(): void {
    [392, 494, 587, 784].forEach((f, i) => this.blip(f, 0.22, "sine", 0.08, i * 0.09));
    this.kid("go");
    this.applyStemMix();
  }

  ping(): void {
    this.unlock();
    this.kickGraph();
    this.blip(392, 0.16, "sine", 0.22);
    this.blip(523, 0.2, "triangle", 0.16, 0.05);
    this.blip(784, 0.26, "sine", 0.12, 0.1);
    this.kid("yeah");
    this.playHtml(this.htmlPing ?? this.htmlJump, 0.95);
  }

  clickOff(): void {
    this.unlock();
    this.slide(360, 90, 0.14, "sine", 0.14);
    this.playHtml(this.htmlJump, 0.45);
  }

  hurry(): void {
    this.blip(620, 0.12, "sine", 0.08);
    this.blip(740, 0.16, "triangle", 0.06, 0.1);
  }

  comboBreak(): void {
    this.heat = 0;
    this.applyStemMix();
    this.slide(320, 110, 0.28, "sine", 0.07);
  }

  power(): void {
    this.blip(520, 0.12, "sine", 0.07);
    this.blip(780, 0.16, "triangle", 0.05, 0.07);
    this.kid("power");
  }

  freeze(): void {
    this.slide(980, 280, 0.36, "sine", 0.06);
  }

  hit(): void {
    this.slide(180, 70, 0.1, "sine", 0.1);
  }

  die(): void {
    this.scream();
  }

  scream(): void {
    if (!this.ctx || !this.sfx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc2.type = "triangle";
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 1.1);
    osc2.frequency.setValueAtTime(210, t);
    osc2.frequency.exponentialRampToValueAtTime(50, t + 1.2);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.25);
    osc.connect(g);
    osc2.connect(g);
    g.connect(this.sfx);
    osc.start(t);
    osc2.start(t);
    osc.stop(t + 1.3);
    osc2.stop(t + 1.3);
  }

  splat(): void {
    this.slide(90, 40, 0.22, "sine", 0.12);
  }

  win(): void {
    [523, 659, 784, 1046].forEach((f, i) => this.blip(f, 0.24, "sine", 0.06, i * 0.1));
    this.kid("yeah");
  }

  pickup(kind: "pill" | "elixir" | "ammo" | "power" = "power"): void {
    this.blip(660, 0.08, "sine", 0.07);
    this.blip(880, 0.12, "triangle", 0.05, 0.06);
    if (kind === "pill" || kind === "elixir") this.kid("pill");
    else if (kind === "ammo") this.kid("ammo");
    else this.kid("power");
  }

  slash(): void {
    this.kid("slash");
  }

  tickMusic(): void {
    this.scheduleAhead();
  }

  kid(line: KidLine): void {
    if (this.muted) return;
    const now = performance.now();
    if (now - this.lastTalk < 90) return;
    this.lastTalk = now;
    const word = KID_WORDS[this.lang][line];
    this.yell(YELL_FOR[line], line === "combo" ? 0.28 : line === "pill" || line === "power" ? 0.22 : 0.18);
    if (now - this.lastVoice < 280) return;
    this.lastVoice = now;
    this.shout(word);
  }

  private shout(word: string): void {
    if (this.muted) return;
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = this.lang === "he" ? "he-IL" : "en-US";
      u.rate = word.length > 10 ? 1.1 : 1.28;
      u.pitch = 1.45;
      u.volume = 1;
      const voices = synth.getVoices();
      const prefer = this.lang === "he" ? /he/i : /en/i;
      const kid =
        voices.find((v) => prefer.test(v.lang) && /child|kid|samantha|google|female|zira|heami/i.test(v.name)) ??
        voices.find((v) => prefer.test(v.lang)) ??
        voices.find((v) => /^en/i.test(v.lang));
      if (kid) u.voice = kid;
      synth.speak(u);
    } catch {
      /* no speech */
    }
  }

  private yell(kind: YellKind, gain: number): void {
    if (!this.ctx || !this.sfx || this.muted) return;
    const now = this.ctx.currentTime;
    const p = YELLS[kind];
    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(p.p0, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, p.p1), now + p.dur);
    const bp1 = this.ctx.createBiquadFilter();
    bp1.type = "bandpass";
    bp1.frequency.setValueAtTime(p.f1, now);
    bp1.Q.value = 6;
    const bp2 = this.ctx.createBiquadFilter();
    bp2.type = "bandpass";
    bp2.frequency.setValueAtTime(p.f2, now);
    bp2.frequency.exponentialRampToValueAtTime(Math.max(200, p.f2 * 0.7), now + p.dur);
    bp2.Q.value = 5;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + p.dur);
    osc.connect(bp1);
    osc.connect(bp2);
    bp1.connect(g);
    bp2.connect(g);
    g.connect(this.sfx);
    osc.start(now);
    osc.stop(now + p.dur + 0.02);
  }

  private silenceVoice(): void {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
  }

  private startLoop(): void {
    if (this.loopRaf) return;
    const pulse = () => {
      this.scheduleAhead();
      this.loopRaf = requestAnimationFrame(pulse);
    };
    this.loopRaf = requestAnimationFrame(pulse);
  }

  private stopLoop(): void {
    if (this.loopRaf) cancelAnimationFrame(this.loopRaf);
    this.loopRaf = 0;
  }

  private scheduleAhead(): void {
    if (!this.ctx || this.muted || this.scene === "off") return;
    if (this.ctx.state !== "running") {
      void this.ctx.resume();
      return;
    }
    if (this.usingStems) return;
    const bpm = this.scene === "menu" ? 100 : 118 + Math.min(16, this.heat);
    const stepDur = 60 / bpm / 2;
    if (this.nextNote < this.ctx.currentTime) this.nextNote = this.ctx.currentTime + 0.02;
    while (this.nextNote < this.ctx.currentTime + 0.16) {
      this.playStep(this.step, this.nextNote);
      this.nextNote += stepDur;
      this.step += 1;
    }
  }

  private playStep(step: number, when: number): void {
    const s = step % 16;
    const bar = Math.floor(step / 16);
    if (this.scene === "menu") this.menuStep(s, bar, when);
    else this.gameStep(s, bar, when);
  }

  private gameStep(s: number, bar: number, when: number): void {
    const heat = 0.85 + Math.min(0.45, this.heat * 0.035);
    if (s === 0 || s === 8) this.kick(when, 0.22 * heat);
    if (s === 4 || s === 12) this.snare(when, 0.1 * heat);
    if (s % 2 === 0) this.hat(when, s % 4 === 2 ? 0.05 : 0.028);
    const bass = [110, 0, 0, 110, 82.4, 0, 98, 0, 110, 0, 0, 146.8, 82.4, 0, 98, 0];
    const bf = bass[s]!;
    if (bf) this.toneAt(bf, 0.42, "sine", 0.11 * heat, this.music!, when, bf * 0.7);
    const leadA = [0, 220, 0, 261.6, 0, 0, 329.6, 0, 261.6, 0, 220, 0, 196, 0, 164.8, 0];
    const leadB = [0, 329.6, 0, 392, 0, 329.6, 261.6, 0, 293.7, 0, 261.6, 0, 220, 0, 196, 0];
    const lead = bar % 4 < 2 ? leadA : leadB;
    const lf = lead[s]!;
    if (lf) this.toneAt(lf, 0.26, "triangle", 0.075 * heat, this.music!, when, lf * 1.01);
    if (s === 0) {
      this.toneAt(220, 0.9, "sine", 0.045, this.music!, when, 220);
      this.toneAt(330, 0.9, "sine", 0.032, this.music!, when, 330);
    }
  }

  private menuStep(s: number, bar: number, when: number): void {
    if (s === 0) this.kick(when, 0.09);
    if (s === 8) this.hat(when, 0.035);
    const pad = [164.8, 0, 0, 0, 196, 0, 0, 0, 174.6, 0, 0, 0, 130.8, 0, 0, 0];
    const f = pad[s]!;
    if (f) this.toneAt(f, 0.55, "sine", 0.07, this.music!, when);
    const lead = [0, 0, 329.6, 0, 0, 392, 0, 0, 349.2, 0, 0, 261.6, 0, 0, 329.6, 0];
    const lf = bar % 2 === 0 ? lead[s]! : 0;
    if (lf) this.toneAt(lf, 0.28, "triangle", 0.05, this.music!, when);
  }

  private kick(when: number, gain: number): void {
    this.toneAt(150, 0.12, "sine", gain, this.music!, when, 42);
  }

  private snare(when: number, gain: number): void {
    this.noiseAt(0.08, gain, 1800, when, this.music!);
    this.toneAt(220, 0.06, "triangle", gain * 0.4, this.music!, when);
  }

  private hat(when: number, gain: number): void {
    this.noiseAt(0.03, gain, 7000, when, this.music!);
  }

  private applyMute(): void {
    if (!this.master || !this.ctx) return;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.02);
  }

  private blip(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0): void {
    if (!this.ctx || !this.sfx) return;
    this.toneAt(freq, dur, type, gain, this.sfx, this.ctx.currentTime + delay);
  }

  private slide(from: number, to: number, dur: number, type: OscillatorType, gain: number): void {
    if (!this.ctx || !this.sfx) return;
    this.toneAt(from, dur, type, gain, this.sfx, this.ctx.currentTime, to);
  }

  private toneAt(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    dest: GainNode,
    when: number,
    endFreq?: number,
  ): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), when);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq ?? freq * 0.85), when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    g.connect(dest);
    osc.start(when);
    osc.stop(when + dur + 0.03);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  private noiseAt(dur: number, gain: number, freq: number, when: number, dest: GainNode): void {
    if (!this.ctx) return;
    const n = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = freq > 2000 ? "highpass" : "bandpass";
    filter.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(dest);
    src.start(when);
    src.stop(when + dur + 0.02);
  }
}

type YellKind = "hup" | "hop" | "yai" | "wow" | "yeah" | "master";

const YELLS: Record<YellKind, { p0: number; p1: number; f1: number; f2: number; dur: number }> = {
  hup: { p0: 210, p1: 140, f1: 520, f2: 980, dur: 0.09 },
  hop: { p0: 180, p1: 110, f1: 560, f2: 1080, dur: 0.13 },
  yai: { p0: 240, p1: 430, f1: 480, f2: 2200, dur: 0.16 },
  wow: { p0: 220, p1: 130, f1: 720, f2: 1300, dur: 0.22 },
  yeah: { p0: 200, p1: 300, f1: 500, f2: 1900, dur: 0.22 },
  master: { p0: 170, p1: 340, f1: 480, f2: 1650, dur: 0.5 },
};

const YELL_FOR: Record<KidLine, YellKind> = {
  hop: "hop",
  x2: "yai",
  x3: "wow",
  combo: "master",
  pill: "yeah",
  ammo: "hup",
  power: "yai",
  slash: "hop",
  yeah: "yeah",
  go: "yai",
};

const KID_WORDS: Record<"he" | "en", Record<KidLine, string>> = {
  en: {
    hop: "Hop!",
    x2: "Ex two!",
    x3: "Ex three!",
    combo: "Combo!",
    pill: "Yeah!",
    ammo: "Locked!",
    power: "Power!",
    slash: "Hyah!",
    yeah: "Yeah!",
    go: "Let's go!",
  },
  he: {
    hop: "הופ!",
    x2: "איקס שתיים!",
    x3: "איקס שלוש!",
    combo: "קומבו!",
    pill: "יאי!",
    ammo: "נשק!",
    power: "יש כוח!",
    slash: "היייה!",
    yeah: "יאי!",
    go: "יאללה!",
  },
};

export const audioBus = new AudioBus();

function makeBeepWav(freq: number, ms: number): string {
  const sr = 22050;
  const n = Math.floor((sr * ms) / 1000);
  const samples = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const env = Math.min(1, i / 180) * Math.min(1, (n - i) / 500);
    const f = freq + t * 900;
    samples[i] = Math.round(Math.sin(2 * Math.PI * f * t) * env * 0.55 * 32767);
  }
  const bytes = samples.length * 2;
  const buf = new ArrayBuffer(44 + bytes);
  const v = new DataView(buf);
  const w = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  w(0, "RIFF");
  v.setUint32(4, 36 + bytes, true);
  w(8, "WAVE");
  w(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, "data");
  v.setUint32(40, bytes, true);
  new Int16Array(buf, 44).set(samples);
  let bin = "";
  const u8 = new Uint8Array(buf);
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]!);
  return `data:audio/wav;base64,${btoa(bin)}`;
}

const JUMP_WAV = makeBeepWav(240, 180);
const PING_WAV = makeBeepWav(620, 160);
