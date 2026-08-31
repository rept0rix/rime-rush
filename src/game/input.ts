export interface Actions {
  moveX: number;
  jumpHeld: boolean;
  jumpPressed: boolean;
  powerPressed: boolean;
  weaponPressed: boolean;
  pausePressed: boolean;
}

const GAME_KEYS = new Set([
  "KeyA",
  "KeyD",
  "KeyW",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "Space",
  "KeyJ",
  "KeyK",
  "KeyX",
  "KeyE",
  "KeyC",
  "MetaLeft",
  "MetaRight",
  "ControlLeft",
  "ControlRight",
  "Escape",
  "KeyP",
]);

export class Input {
  private keys = new Set<string>();
  private prev = new Set<string>();
  private touchMove = 0;
  private touchJump = false;
  private touchPower = false;
  private touchWeapon = false;
  private jumpEdge = false;
  private powerEdge = false;
  private weaponEdge = false;
  private pauseEdge = false;
  private injected: string[] | null = null;
  private attached = false;

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener("keydown", this.onDown);
    window.addEventListener("keyup", this.onUp);
    window.addEventListener("blur", this.clear);
    document.addEventListener("visibilitychange", this.onVis);
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener("keydown", this.onDown);
    window.removeEventListener("keyup", this.onUp);
    window.removeEventListener("blur", this.clear);
    document.removeEventListener("visibilitychange", this.onVis);
    this.keys.clear();
  }

  setTouch(partial: { move?: number; jump?: boolean; power?: boolean; weapon?: boolean }): void {
    if (partial.move !== undefined) this.touchMove = partial.move;
    if (partial.jump !== undefined) {
      if (partial.jump && !this.touchJump) this.jumpEdge = true;
      this.touchJump = partial.jump;
    }
    if (partial.power !== undefined) {
      if (partial.power && !this.touchPower) this.powerEdge = true;
      this.touchPower = partial.power;
    }
    if (partial.weapon !== undefined) {
      if (partial.weapon && !this.touchWeapon) this.weaponEdge = true;
      this.touchWeapon = partial.weapon;
    }
  }

  setKeys(codes: string[]): void {
    this.injected = codes;
  }

  clearInjected(): void {
    this.injected = null;
  }

  sample(): Actions {
    const live = this.injected ? new Set(this.injected) : this.keys;
    const left = live.has("KeyA") || live.has("ArrowLeft") || this.touchMove < -0.2;
    const right = live.has("KeyD") || live.has("ArrowRight") || this.touchMove > 0.2;
    let moveX = 0;
    if (left) moveX -= 1;
    if (right) moveX += 1;
    if (this.injected) {
      // QA path: keep injected keys as the only source
    } else {
      moveX = Math.max(-1, Math.min(1, moveX + this.gamepadX()));
    }

    const jumpHeld = live.has("ArrowUp") || live.has("KeyW") || this.touchJump;
    const jumpPressed =
      this.edge(live, "ArrowUp") ||
      this.edge(live, "KeyW") ||
      this.jumpEdge ||
      this.padEdge(0);

    const powerPressed =
      this.edge(live, "MetaLeft") ||
      this.edge(live, "MetaRight") ||
      this.edge(live, "ControlLeft") ||
      this.edge(live, "ControlRight") ||
      this.edge(live, "KeyJ") ||
      this.edge(live, "KeyE") ||
      this.edge(live, "KeyC") ||
      this.powerEdge ||
      this.padEdge(2);
    const weaponPressed =
      this.edge(live, "Space") ||
      this.edge(live, "KeyK") ||
      this.edge(live, "KeyX") ||
      this.weaponEdge ||
      this.padEdge(1);

    const pausePressed =
      this.edge(live, "Escape") || this.edge(live, "KeyP") || this.pauseEdge || this.padEdge(9);

    this.jumpEdge = false;
    this.powerEdge = false;
    this.weaponEdge = false;
    this.pauseEdge = false;
    this.prev = new Set(live);
    return { moveX, jumpHeld, jumpPressed, powerPressed, weaponPressed, pausePressed };
  }

  private edge(live: Set<string>, code: string): boolean {
    return live.has(code) && !this.prev.has(code);
  }

  private gamepadX(): number {
    const pads = navigator.getGamepads?.() ?? [];
    const g = pads[0];
    if (!g) return 0;
    const x = g.axes[0] ?? 0;
    const dz = 0.18;
    if (g.buttons[14]?.pressed) return -1;
    if (g.buttons[15]?.pressed) return 1;
    if (Math.abs(x) < dz) return 0;
    return (x - Math.sign(x) * dz) / (1 - dz);
  }

  private padEdge(button: number): boolean {
    const pads = navigator.getGamepads?.() ?? [];
    const g = pads[0];
    if (!g) return false;
    const pressed = !!g.buttons[button]?.pressed;
    const key = `pad${button}`;
    const was = this.prev.has(key);
    if (pressed) this.keys.add(key);
    else this.keys.delete(key);
    return pressed && !was;
  }

  private onDown = (e: KeyboardEvent): void => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    this.keys.add(e.code);
  };

  private onUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private clear = (): void => {
    this.keys.clear();
    this.touchJump = false;
    this.touchPower = false;
  };

  private onVis = (): void => {
    if (document.hidden) this.clear();
  };
}
