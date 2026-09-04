/* Emberfox game engine — canvas renderer + fixed-step platformer simulation. */

import { TILE, ROWS, THEMES, type LevelDef, type Theme, type MoverDef } from "./levels";
import type { CharacterDef } from "./characters";
import type { AudioEngine } from "./audio";

export interface HudData {
  score: number; coins: number; lives: number; time: number;
  progress: number; power: number; bossHp: number; bossMax: number;
}
export interface GameEvent {
  type: "clear" | "gameover" | "victory" | "boss" | "death";
  score?: number; coins?: number; lives?: number; timeBonus?: number; clearBonus?: number;
}
export interface EngineOpts {
  levelIdx: number; score: number; lives: number;
  char: CharacterDef;
  audio: AudioEngine;
  onHud: (h: HudData) => void;
  onEvent: (e: GameEvent) => void;
}

const VIEW_W = 960;
const VIEW_H = 540;
const GRAV_UP = 1450;
const GRAV_DOWN = 2450;
const JUMP_V = 565;
const WALK = 258;
const RUN = 372;

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/* tile ids: 0 empty 1 solid 2 brick 3 ?block 4 Qblock 5 one-way 6 spike 7 lava 8 used */
interface Cell { t: number; bump: number }
interface Enemy {
  kind: "walker" | "flyer" | "spiker" | "bouncer" | "chomper" | "boss";
  x: number; y: number; w: number; h: number; vx: number; vy: number;
  dir: number; t: number; alive: boolean; squish: number;
  ax: number; ay: number; speed: number;
  hp: number; mode: string; timer: number; invuln: number; pipeTop: number;
  nextAction: "spit" | "leap";
}
interface Particle { x: number; y: number; vx: number; vy: number; g: number; life: number; max: number; size: number; color: string; add: boolean }
interface Popup { x: number; y: number; text: string; life: number; color: string }
interface CoinFx { x: number; y: number; t: number }
interface Fruit { x: number; y: number; vx: number; vy: number; w: number; h: number; walking: boolean }
interface Shot { x: number; y: number; vx: number; vy: number; kind: "arc" | "slide"; life: number }
interface Mover { x: number; y: number; w: number; h: number; bx: number; by: number; axis: "x" | "y"; range: number; speed: number; ph: number; dx: number; dy: number }

export class Engine {
  private cv: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private level: LevelDef;
  private theme: Theme;
  private opts: EngineOpts;
  private audio: AudioEngine;
  private char: CharacterDef;

  private grid: Cell[] = [];
  private cols = 0;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private destroyed = false;
  paused = false;

  state: "play" | "dying" | "clear" | "won" | "over" = "play";
  private stateTimer = 0;

  private keys = { left: false, right: false, jump: false, run: false, down: false };
  private jumpBuf = 0;
  private jumpHeld = false;
  private dropTimer = 0;

  private p = {
    x: 0, y: 0, w: 30, h: 38, vx: 0, vy: 0, dir: 1,
    grounded: false, coyote: 0, power: 0, invuln: 0,
    legPhase: 0, squash: 0, stretch: 0, onMover: -1, prevBottom: 0,
  };

  score: number; coins = 0; lives: number; timeLeft: number;
  private enemies: Enemy[] = [];
  private fruits: Fruit[] = [];
  private shots: Shot[] = [];
  private particles: Particle[] = [];
  private popups: Popup[] = [];
  private coinFx: CoinFx[] = [];
  private movers: Mover[] = [];
  private coinsOnMap: { x: number; y: number; taken: boolean }[] = [];
  private hearts: { x: number; y: number; taken: boolean }[] = [];
  private checkpoints: { x: number; y: number; active: boolean }[] = [];
  private goal: { x: number; y: number } | null = null;
  private respawn = { x: 0, y: 0 };
  private camX = 0; private camY = 0; private shake = 0; private flash = 0; private flashColor = "#ff5a5f";
  private combo = 0;
  private boss: Enemy | null = null;
  private bossTriggerX = Infinity;
  private weather: { x: number; y: number; s: number; v: number }[] = [];
  private elapsed = 0;
  private hudAcc = 0;
  private dustAcc = 0;
  private sparkAcc = 0;
  private bubbleAcc = 0;
  private pollenAcc = 0;
  private hitstop = 0;
  private camDip = 0;
  private rings: { x: number; y: number; t: number }[] = [];
  private patterns: { ground: CanvasPattern | null; brick: CanvasPattern | null } = { ground: null, brick: null };

  constructor(canvas: HTMLCanvasElement, level: LevelDef, opts: EngineOpts) {
    this.cv = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.level = level;
    this.theme = THEMES[level.theme];
    this.opts = opts;
    this.audio = opts.audio;
    this.char = opts.char;
    this.score = opts.score;
    this.lives = opts.lives;
    this.timeLeft = level.time;
    this.cols = level.cols;
  }

  /* ---------------- setup ---------------- */
  private buildPatterns() {
    const mk = (base: string, dark: string) => {
      const c = document.createElement("canvas");
      c.width = 40; c.height = 40;
      const x = c.getContext("2d")!;
      x.fillStyle = base; x.fillRect(0, 0, 40, 40);
      for (let i = 0; i < 52; i++) {
        x.globalAlpha = 0.1 + rnd(i) * 0.18;
        x.fillStyle = i % 4 === 0 ? "#ffffff" : dark;
        const s = 1 + rnd(i * 3) * 2.2;
        x.fillRect(rnd(i * 7 + 1) * 38, rnd(i * 11 + 2) * 38, s, s);
      }
      x.globalAlpha = 1;
      return this.ctx.createPattern(c, "repeat");
    };
    this.patterns.ground = mk(this.theme.tile, this.theme.tileDark);
    this.patterns.brick = mk(this.theme.brick, this.theme.brickDark);
  }

  start() {
    this.cv.width = VIEW_W;
    this.cv.height = VIEW_H;
    this.buildPatterns();
    this.parse();
    this.audio.playMusic(this.theme.music);
    this.last = performance.now();
    const loop = (now: number) => {
      if (this.destroyed) return;
      this.raf = requestAnimationFrame(loop);
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (dt > 0.1) dt = 0.1;
      if (!this.paused && this.state !== "over") {
        this.acc += dt;
        const step = 1 / 120;
        let n = 0;
        while (this.acc >= step && n < 10) { this.update(step); this.acc -= step; n++; }
      }
      this.draw(now / 1000);
      this.hudAcc += dt;
      if (this.hudAcc > 0.05) { this.hudAcc = 0; this.pushHud(); }
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    // only silence the music if nothing else (e.g. the map screen) queued a new track
    if (this.audio.current() === this.theme.music) this.audio.stopMusic();
  }

  setKey(k: keyof Engine["keys"], v: boolean) {
    const cut = -this.char.jump * 0.33;
    if (k === "jump" && v && !this.keys.jump) {
      this.jumpBuf = 0.12;
      this.jumpHeld = true;
      if (this.p.grounded && this.keys.down) this.dropTimer = 0.22;
    }
    if (k === "jump" && !v) {
      this.jumpHeld = false;
      if (this.p.vy < cut) this.p.vy = cut;
    }
    this.keys[k] = v;
  }

  clearKeys() {
    this.keys = { left: false, right: false, jump: false, run: false, down: false };
    this.jumpHeld = false;
    this.jumpBuf = 0;
  }

  retry() {
    this.paused = false;
    this.clearKeys();
    this.score = this.opts.score;
    this.lives = this.char.lives;
    this.coins = 0;
    this.enemies = []; this.fruits = []; this.shots = []; this.particles = [];
    this.popups = []; this.coinFx = []; this.movers = []; this.coinsOnMap = [];
    this.hearts = []; this.checkpoints = []; this.goal = null; this.boss = null;
    this.combo = 0; this.camX = 0; this.camY = 0; this.shake = 0; this.flash = 0;
    this.state = "play"; this.stateTimer = 0;
    this.timeLeft = this.level.time;
    this.weather = [];
    this.rings = [];
    this.hitstop = 0;
    const p = this.p;
    p.vx = 0; p.vy = 0; p.power = 0; p.h = 38; p.invuln = 1.2;
    p.grounded = false; p.coyote = 0; p.onMover = -1; p.dir = 1;
    this.parse();
    this.audio.playMusic(this.theme.music);
  }

  /* ---------------- parsing ---------------- */
  private parse() {
    const g: Cell[] = new Array(this.cols * ROWS);
    for (let i = 0; i < g.length; i++) g[i] = { t: 0, bump: 0 };
    this.grid = g;
    const T = TILE;
    const put = (c: number, r: number, t: number) => { if (c >= 0 && c < this.cols && r >= 0 && r < ROWS) g[r * this.cols + c].t = t; };
    const rows = this.level.rows;
    for (let r = 0; r < ROWS; r++) {
      const row = rows[r] ?? "";
      for (let c = 0; c < this.cols; c++) {
        const ch = row[c] ?? " ";
        if (ch === "#") put(c, r, 1);
        else if (ch === "B") put(c, r, 2);
        else if (ch === "?") put(c, r, 3);
        else if (ch === "Q") put(c, r, 4);
        else if (ch === "=") put(c, r, 5);
        else if (ch === "^") put(c, r, 6);
        else if (ch === "~") put(c, r, 7);
        else if (ch === "o") this.coinsOnMap.push({ x: c * T + T / 2, y: r * T + T / 2, taken: false });
        else if (ch === "H") this.hearts.push({ x: c * T + T / 2, y: r * T + T / 2, taken: false });
        else if (ch === "P") { this.p.x = c * T + 5; this.p.y = (r + 1) * T - this.p.h; this.respawn = { x: this.p.x, y: this.p.y }; }
        else if (ch === "C") this.checkpoints.push({ x: c * T + T / 2, y: (r + 1) * T, active: false });
        else if (ch === "G") this.goal = { x: c * T + T / 2, y: (r + 1) * T };
        else if (ch === "w") this.spawnEnemy("walker", c, r);
        else if (ch === "f") this.spawnEnemy("flyer", c, r);
        else if (ch === "s") this.spawnEnemy("spiker", c, r);
        else if (ch === "b") this.spawnEnemy("bouncer", c, r);
        else if (ch === "c") {
          put(c, r + 1, 1); put(c + 1, r + 1, 1); put(c, r + 2, 1); put(c + 1, r + 2, 1);
          const e = this.spawnEnemy("chomper", c, r);
          e.pipeTop = (r + 1) * T;
          e.y = e.pipeTop - e.h + 8;
        } else if (ch === "z") {
          this.bossTriggerX = (c - 9) * T;
          this.boss = this.spawnEnemy("boss", c, r);
        }
      }
    }
    this.movers = this.level.movers.map((m: MoverDef) => ({
      x: m.c * T, y: m.r * T + 12, w: m.w * T, h: 16, bx: m.c * T, by: m.r * T + 12,
      axis: m.axis, range: m.dist * T, speed: m.speed, ph: rnd(m.c) * Math.PI * 2, dx: 0, dy: 0,
    }));
    for (let i = 0; i < 70; i++) {
      this.weather.push({ x: rnd(i * 3) * VIEW_W * 2, y: rnd(i * 7 + 1) * VIEW_H, s: 1 + rnd(i * 13 + 2) * 2.4, v: 12 + rnd(i * 17 + 3) * 30 });
    }
    this.camX = clamp(this.p.x - VIEW_W * 0.4, 0, this.levelWidth() - VIEW_W);
  }

  private spawnEnemy(kind: Enemy["kind"], c: number, r: number): Enemy {
    const T = TILE;
    const mul = this.level.speed;
    const base: Enemy = {
      kind, x: c * T + 3, y: r * T, w: 34, h: 30, vx: 0, vy: 0, dir: -1, t: rnd(c * 31 + r) * 4,
      alive: true, squish: 0, ax: c * T + T / 2, ay: r * T + T / 2, speed: 50 * mul,
      hp: 6, mode: "walk", timer: 2.4, invuln: 0, pipeTop: 0, nextAction: "leap",
    };
    if (kind === "walker") { base.w = 34; base.h = 28; base.y = (r + 1) * T - base.h; base.vx = -base.speed; }
    if (kind === "spiker") { base.w = 36; base.h = 26; base.y = (r + 1) * T - base.h; base.vx = -38 * mul; base.speed = 38 * mul; }
    if (kind === "flyer") { base.w = 30; base.h = 24; base.y = r * T; base.speed = 1.35 * mul; }
    if (kind === "bouncer") { base.w = 32; base.h = 30; base.y = (r + 1) * T - base.h; base.speed = 80 * mul; base.vx = -base.speed; base.timer = 1.0 + rnd(c) * 0.9; }
    if (kind === "chomper") { base.w = 36; base.h = 38; base.x = c * T + 2; base.speed = mul; }
    if (kind === "boss") { base.w = 104; base.h = 96; base.y = (r + 1) * T - base.h; base.mode = "sleep"; base.x = c * T - 34; }
    this.enemies.push(base);
    return base;
  }

  private levelWidth() { return this.cols * TILE; }
  private cell(c: number, r: number): Cell | null {
    if (c < 0 || c >= this.cols) return null;
    if (r < 0 || r >= ROWS) return null;
    return this.grid[r * this.cols + c];
  }
  private solid(c: number, r: number): boolean {
    if (c < 0 || c >= this.cols) return true;
    if (r < 0 || r >= ROWS) return false;
    const t = this.grid[r * this.cols + c].t;
    return t === 1 || t === 2 || t === 3 || t === 4 || t === 8;
  }
  private oneWay(c: number, r: number): boolean {
    const cell = this.cell(c, r);
    return !!cell && cell.t === 5;
  }

  /* ---------------- update ---------------- */
  private update(dt: number) {
    this.elapsed += dt;
    this.stateTimer += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 26);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 1.6);
    if (this.camDip > 0) this.camDip = Math.max(0, this.camDip - dt * 34);

    // hitstop: brief world freeze for impact feedback
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      this.updateParticles(dt * 0.35);
      return;
    }

    this.updateMovers(dt);

    if (this.state === "play") {
      this.timeLeft -= dt;
      if (this.timeLeft <= 10.5 && this.timeLeft > 0 && Math.floor((this.timeLeft + dt) * 2) !== Math.floor(this.timeLeft * 2)) {
        this.audio.bump();
      }
      if (this.timeLeft <= 0) { this.timeLeft = 0; this.killPlayer(); }
      this.updatePlayer(dt);
      // ambient coin sparkles
      this.sparkAcc += dt;
      if (this.sparkAcc > 0.11) {
        this.sparkAcc = 0;
        const vis = this.coinsOnMap.filter((c) => !c.taken && c.x > this.camX - 20 && c.x < this.camX + VIEW_W + 20);
        if (vis.length) {
          const c = vis[Math.floor(Math.random() * vis.length)];
          this.particles.push({
            x: c.x + (Math.random() - 0.5) * 12, y: c.y - 7, vx: 0, vy: -24, g: -26,
            life: 0.45, max: 0.45, size: 2.4, color: "#fff3c4", add: true,
          });
        }
      }
    } else if (this.state === "dying") {
      const p = this.p;
      const dts = this.stateTimer < 0.28 ? dt * 0.32 : dt; // slow-mo pop
      p.vy += GRAV_DOWN * dts;
      p.y += p.vy * dts;
      if (this.stateTimer > 1.25) this.afterDeath();
    } else if (this.state === "clear" || this.state === "won") {
      if (this.stateTimer > 1.15 && !this.clearSent) {
        this.clearSent = true;
        const timeBonus = Math.ceil(this.timeLeft) * 10;
        const clearBonus = 1000 * (this.opts.levelIdx + 1);
        this.score += timeBonus + clearBonus;
        if (this.state === "clear") this.opts.onEvent({ type: "clear", score: this.score, coins: this.coins, lives: this.lives, timeBonus, clearBonus });
        else this.opts.onEvent({ type: "victory", score: this.score, coins: this.coins });
      }
    }

    this.updateEnemies(dt);
    this.updateFruits(dt);
    this.updateShots(dt);
    this.updatePickups();
    this.updateParticles(dt);

    const lw = this.levelWidth();
    const p = this.p;
    const lookX = p.x + p.dir * 70 - VIEW_W * 0.44;
    this.camX = lerp(this.camX, clamp(lookX, 0, Math.max(0, lw - VIEW_W)), 1 - Math.exp(-dt * 7));
    const lookY = p.y - VIEW_H * 0.56;
    this.camY = lerp(this.camY, clamp(lookY, 0, Math.max(0, ROWS * TILE - VIEW_H)), 1 - Math.exp(-dt * 6));
  }
  private clearSent = false;

  private updateMovers(dt: number) {
    for (const m of this.movers) {
      const ph = m.ph + this.elapsed * m.speed;
      const k = (Math.sin(ph) + 1) / 2;
      const nx = m.axis === "x" ? m.bx + k * m.range : m.bx;
      const ny = m.axis === "y" ? m.by + k * m.range : m.by;
      m.dx = nx - m.x; m.dy = ny - m.y;
      m.x = nx; m.y = ny;
    }
    void dt;
  }

  private updatePlayer(dt: number) {
    const p = this.p;
    const icy = !!this.theme.icy;
    const ch = this.char;
    const max = this.keys.run ? ch.run : ch.walk;
    const acc = p.grounded ? ch.accel : ch.airAccel;
    const frict = p.grounded ? (icy ? ch.friction * 0.15 : ch.friction) : 480;

    const dirIn = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
    if (dirIn !== 0) {
      p.vx += dirIn * acc * dt;
      p.dir = dirIn;
      if (Math.abs(p.vx) > max) p.vx = clamp(p.vx, -max, max);
    } else {
      const s = Math.sign(p.vx);
      p.vx -= s * Math.min(Math.abs(p.vx), frict * dt);
    }

    p.coyote = p.grounded ? 0.09 : Math.max(0, p.coyote - dt);
    this.jumpBuf = Math.max(0, this.jumpBuf - dt);
    this.dropTimer = Math.max(0, this.dropTimer - dt);

    if (this.jumpBuf > 0 && (p.grounded || p.coyote > 0) && this.dropTimer <= 0) {
      p.vy = -this.char.jump;
      p.grounded = false;
      p.coyote = 0;
      this.jumpBuf = 0;
      p.stretch = 1;
      this.audio.jump();
      this.dust(p.x + p.w / 2, p.y + p.h, 5, "#ffffff");
    }

    p.vy += (p.vy < 0 ? GRAV_UP : GRAV_DOWN) * dt;
    const cutV = -this.char.jump * 0.33;
    if (!this.jumpHeld && p.vy < cutV) p.vy = cutV;
    p.vy = Math.min(p.vy, 980);

    p.prevBottom = p.y + p.h;

    // carry on mover
    p.onMover = -1;
    for (let i = 0; i < this.movers.length; i++) {
      const m = this.movers[i];
      if (p.x + p.w > m.x + 2 && p.x < m.x + m.w - 2 && Math.abs(p.y + p.h - m.y) < 6 && p.vy >= 0) {
        p.x += m.dx; p.y += m.dy; p.onMover = i;
      }
    }

    // X move + collide
    p.x += p.vx * dt;
    this.collideX();
    // Y move + collide
    const wasAir = !p.grounded;
    const fallV = p.vy;
    p.y += p.vy * dt;
    this.collideY();

    if (wasAir && p.grounded) {
      p.squash = 1;
      this.dust(p.x + p.w / 2, p.y + p.h, 4, "#ffffff");
      if (fallV > 330) {
        this.rings.push({ x: p.x + p.w / 2, y: p.y + p.h, t: 0 });
        // landing weight: brief camera dip scaled by impact
        this.camDip = clamp(fallV / 90, 2, 9);
      }
      if (p.vy > 0) this.combo = 0;
    }
    if (p.grounded && Math.abs(p.vx) > 40) {
      p.legPhase += Math.abs(p.vx) * dt * 0.09;
      if (Math.abs(p.vx) > 150) {
        this.dustAcc += dt;
        if (this.dustAcc > 0.09) {
          this.dustAcc = 0;
          this.particles.push({
            x: p.x + p.w / 2 - p.dir * 12, y: p.y + p.h - 3,
            vx: -p.dir * (30 + Math.random() * 40), vy: -(20 + Math.random() * 40), g: 260,
            life: 0.35, max: 0.35, size: 2.6, color: "rgba(240,232,214,0.9)", add: false,
          });
        }
      }
    }
    p.squash = Math.max(0, p.squash - dt * 6);
    p.stretch = Math.max(0, p.stretch - dt * 6);
    p.invuln = Math.max(0, p.invuln - dt);

    // hazards + bounds
    if (p.y > ROWS * TILE + 60) { this.killPlayer(); return; }
    this.checkHazards();

    // goal
    if (this.goal && p.x + p.w > this.goal.x - 14 && p.x < this.goal.x + 14 && p.y + p.h > this.goal.y - 130) {
      this.reachGoal();
    }
    // boss trigger
    if (this.boss && this.boss.mode === "sleep" && p.x > this.bossTriggerX) this.wakeBoss();
  }

  private collideX() {
    const p = this.p;
    const r0 = Math.floor(p.y / TILE);
    const r1 = Math.floor((p.y + p.h - 1) / TILE);
    if (p.vx > 0) {
      const c = Math.floor((p.x + p.w) / TILE);
      for (let r = r0; r <= r1; r++) if (this.solid(c, r)) { p.x = c * TILE - p.w - 0.01; p.vx = 0; break; }
    } else if (p.vx < 0) {
      const c = Math.floor(p.x / TILE);
      for (let r = r0; r <= r1; r++) if (this.solid(c, r)) { p.x = (c + 1) * TILE + 0.01; p.vx = 0; break; }
    }
    // mover sides
    for (const m of this.movers) {
      if (p.y + p.h > m.y + 6 && p.y < m.y + m.h && p.x + p.w > m.x && p.x < m.x + m.w) {
        if (p.vx > 0 && p.x + p.w - m.x < 14) { p.x = m.x - p.w - 0.01; p.vx = 0; }
        else if (p.vx < 0 && m.x + m.w - p.x < 14) { p.x = m.x + m.w + 0.01; p.vx = 0; }
      }
    }
  }

  private collideY() {
    const p = this.p;
    const c0 = Math.floor((p.x + 2) / TILE);
    const c1 = Math.floor((p.x + p.w - 2) / TILE);
    p.grounded = false;
    if (p.vy >= 0) {
      const r = Math.floor((p.y + p.h) / TILE);
      for (let c = c0; c <= c1; c++) {
        const solidHere = this.solid(c, r);
        const oneWayHere = this.oneWay(c, r) && this.dropTimer <= 0 && p.prevBottom <= r * TILE + 6;
        if (solidHere || oneWayHere) {
          p.y = r * TILE - p.h - 0.01;
          p.vy = 0;
          p.grounded = true;
          break;
        }
      }
    } else {
      const r = Math.floor(p.y / TILE);
      let hit: { c: number; cell: Cell } | null = null;
      for (let c = c0; c <= c1; c++) {
        if (this.solid(c, r)) { const cell = this.cell(c, r)!; if (!hit || cell.t === 3 || cell.t === 4) hit = { c, cell }; }
      }
      if (hit) {
        p.y = (r + 1) * TILE + 0.01;
        p.vy = 0;
        this.bumpBlock(hit.c, r, hit.cell);
      }
    }
    // mover tops
    for (let i = 0; i < this.movers.length; i++) {
      const m = this.movers[i];
      if (p.x + p.w > m.x + 2 && p.x < m.x + m.w - 2) {
        if (p.vy >= 0 && p.prevBottom <= m.y + 8 && p.y + p.h >= m.y) {
          p.y = m.y - p.h - 0.01;
          p.vy = 0;
          p.grounded = true;
          p.onMover = i;
        }
      }
    }
  }

  private bumpBlock(c: number, r: number, cell: Cell) {
    cell.bump = 1;
    if (cell.t === 3 || cell.t === 4) {
      const isQ = cell.t === 4;
      cell.t = 8;
      const cx = c * TILE + TILE / 2;
      const cy = r * TILE;
      if (isQ) {
        this.fruits.push({ x: cx - 14, y: cy - 30, vx: 62, vy: -170, w: 28, h: 28, walking: false });
        this.audio.spring();
      } else {
        this.coinFx.push({ x: cx, y: cy - 10, t: 0 });
        this.addCoin();
        this.audio.coin();
      }
    } else {
      this.audio.bump();
      this.dust(c * TILE + TILE / 2, r * TILE, 3, "#d8c9a8");
    }
  }

  private addCoin() {
    this.coins++;
    this.score += 50;
    if (this.coins >= 100) {
      this.coins -= 100;
      this.lives = Math.min(6, this.lives + 1);
      this.audio.oneUp();
      this.popups.push({ x: this.p.x, y: this.p.y - 20, text: "1UP!", life: 1, color: "#7be0c3" });
    }
  }

  private checkHazards() {
    const p = this.p;
    const c0 = Math.floor(p.x / TILE);
    const c1 = Math.floor((p.x + p.w) / TILE);
    const r0 = Math.floor(p.y / TILE);
    const r1 = Math.floor((p.y + p.h) / TILE);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const cell = this.cell(c, r);
        if (!cell) continue;
        if (cell.t === 7) { this.killPlayer(); return; }
        if (cell.t === 6) {
          const top = r * TILE + 18;
          if (p.y + p.h > top && p.y < (r + 1) * TILE) { this.killPlayer(); return; }
        }
      }
    }
  }

  /* ---------------- death / respawn / goal ---------------- */
  private killPlayer() {
    if (this.state !== "play") return;
    this.state = "dying";
    this.stateTimer = 0;
    this.p.vy = -430;
    this.p.vx = 0;
    this.flash = 0.5;
    this.flashColor = "#ff5a5f";
    this.audio.hurt();
    this.opts.onEvent({ type: "death" });
  }

  private afterDeath() {
    this.lives--;
    this.combo = 0;
    if (this.lives <= 0) {
      this.state = "over";
      this.audio.stopMusic();
      this.audio.lose();
      this.opts.onEvent({ type: "gameover", score: this.score, coins: this.coins, lives: 0 });
      return;
    }
    const p = this.p;
    p.x = this.respawn.x;
    p.y = this.respawn.y;
    p.vx = 0; p.vy = 0;
    if (p.power) { p.power = 0; p.h = 38; }
    p.invuln = 2.2;
    this.state = "play";
    this.stateTimer = 0;
    this.shots = [];
    this.timeLeft = this.level.time;
    this.camX = clamp(p.x - VIEW_W * 0.4, 0, this.levelWidth() - VIEW_W);
    this.camY = 0;
    if (this.boss && this.boss.mode !== "sleep") this.audio.playMusic("boss");
  }

  private reachGoal() {
    if (this.state !== "play") return;
    this.state = "clear";
    this.stateTimer = 0;
    this.clearSent = false;
    this.score += 500;
    this.audio.stopMusic();
    this.audio.win();
    this.confetti();
    this.shake = 6;
  }

  private winGame() {
    if (this.state !== "play") return;
    this.state = "won";
    this.stateTimer = 0;
    this.clearSent = false;
    this.audio.stopMusic();
    this.audio.win();
    this.confetti();
    this.shake = 14;
  }

  private confetti() {
    const colors = ["#ff8c3b", "#ffc94d", "#7be0c3", "#ff5a5f", "#fdf3e3"];
    for (let i = 0; i < 90; i++) {
      this.particles.push({
        x: this.camX + Math.random() * VIEW_W, y: this.camY - 20 - Math.random() * 160,
        vx: (Math.random() - 0.5) * 120, vy: 120 + Math.random() * 200, g: 240,
        life: 2.2 + Math.random(), max: 3, size: 3 + Math.random() * 4,
        color: colors[i % colors.length], add: false,
      });
    }
  }

  /* ---------------- enemies ---------------- */
  private wakeBoss() {
    const b = this.boss!;
    b.mode = "walk";
    b.timer = 1.4;
    this.audio.playMusic("boss");
    this.audio.roar();
    this.shake = 12;
    this.opts.onEvent({ type: "boss" });
    this.popups.push({ x: b.x + b.w / 2 - 60, y: b.y - 46, text: "MAGMOR", life: 1.6, color: "#ff8c3b" });
  }

  private updateEnemies(dt: number) {
    const p = this.p;
    const T = TILE;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.t += dt;
      if (e.invuln > 0) e.invuln -= dt;
      if (e.squish > 0) {
        e.squish -= dt;
        if (e.squish <= 0) e.alive = false;
        continue;
      }
      const onScreen = e.x > this.camX - 200 && e.x < this.camX + VIEW_W + 200;

      if (e.kind === "walker" || e.kind === "spiker") {
        if (onScreen || e.kind === "spiker") {
          e.vy = Math.min(e.vy + GRAV_DOWN * dt, 900);
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          // wall turn
          const aheadC = Math.floor((e.vx > 0 ? e.x + e.w + 2 : e.x - 2) / T);
          const midR = Math.floor((e.y + e.h / 2) / T);
          if (this.solid(aheadC, midR)) e.vx = -e.vx;
          // floor check
          const footC = Math.floor((e.vx > 0 ? e.x + e.w - 4 : e.x + 4) / T);
          const footR = Math.floor((e.y + e.h + 4) / T);
          if (!this.solid(footC, footR) && e.vy === 0) e.vx = -e.vx;
          if (this.solid(Math.floor((e.x + e.w / 2) / T), Math.floor((e.y + e.h + 2) / T))) {
            e.y = Math.floor((e.y + e.h) / T) * T - e.h - 0.01;
            e.vy = 0;
          }
        }
      } else if (e.kind === "flyer") {
        e.x = e.ax + Math.sin(e.t * e.speed) * 88 - e.w / 2;
        e.y = e.ay + Math.sin(e.t * e.speed * 2.3) * 30 - e.h / 2;
      } else if (e.kind === "bouncer") {
        e.vy = Math.min(e.vy + GRAV_DOWN * dt, 900);
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        const footR = Math.floor((e.y + e.h + 2) / T);
        const cc = Math.floor((e.x + e.w / 2) / T);
        if (this.solid(cc, footR) && e.vy >= 0) {
          e.y = footR * T - e.h - 0.01;
          e.vy = 0;
          e.timer -= dt;
          if (e.timer <= 0 && onScreen) {
            e.vy = -440;
            e.vx = (p.x > e.x ? 1 : -1) * e.speed;
            e.timer = 1.1 + rnd(e.t * 7) * 0.8;
          }
        } else {
          e.timer = Math.max(e.timer, 0.4);
        }
        const aheadC = Math.floor((e.vx > 0 ? e.x + e.w + 2 : e.x - 2) / T);
        if (this.solid(aheadC, Math.floor((e.y + e.h / 2) / T))) e.vx = -e.vx;
      } else if (e.kind === "chomper") {
        const period = 3.4 / Math.max(0.7, e.speed);
        const ph = e.t % period;
        const rise = 0.5, hold = 1.5, fall = 0.5;
        let off = 0;
        if (ph < rise) off = (ph / rise) * 48;
        else if (ph < rise + hold) off = 48;
        else if (ph < rise + hold + fall) off = 48 * (1 - (ph - rise - hold) / fall);
        e.y = e.pipeTop - 4 - off;
        e.vy = off; // remember how far the head is out (gates contact damage)
      } else if (e.kind === "boss") {
        this.updateBoss(e, dt);
      }

      // contact with player
      if (this.state === "play" && this.overlapsPlayer(e)) this.resolveEnemyTouch(e);
    }
    this.enemies = this.enemies.filter((e) => e.alive || e.squish > 0);
  }

  private updateBoss(b: Enemy, dt: number) {
    const p = this.p;
    const T = TILE;
    if (b.mode === "sleep") return;
    const phase = 1 + Math.floor((b.hp <= 0 ? 6 : 6 - b.hp) / 2);
    const speed = [0, 42, 58, 76][phase];
    b.timer -= dt;

    if (b.mode !== "leap") {
      b.vy = Math.min(b.vy + 1650 * dt, 1000);
      b.y += b.vy * dt;
      const fr = Math.floor((b.y + b.h + 2) / T);
      const cc = Math.floor((b.x + b.w / 2) / T);
      const floorCell = this.cell(cc, fr);
      if (b.vy >= 0 && floorCell && (this.solid(cc, fr) || floorCell.t === 7)) {
        b.y = fr * T - b.h - 0.01;
        b.vy = 0;
      }
    }

    if (b.mode === "walk") {
      b.dir = p.x + p.w / 2 > b.x + b.w / 2 ? 1 : -1;
      b.x += b.dir * speed * dt;
      if (b.timer <= 0) {
        const dx = Math.abs(p.x - b.x);
        b.mode = "tele";
        b.nextAction = dx > 240 || Math.random() < 0.42 ? "spit" : "leap";
        b.timer = 0.5;
        this.audio.bump();
      }
    } else if (b.mode === "tele") {
      if (b.timer <= 0) {
        if (b.nextAction === "leap") {
          b.mode = "leap";
          b.vy = -660;
          const dx = p.x + p.w / 2 - (b.x + b.w / 2);
          b.vx = clamp(dx / 0.92, -320, 320);
          this.audio.jump();
        } else {
          b.mode = "walk";
          const n = phase;
          const bx = b.x + b.w / 2, by = b.y + 26;
          for (let i = 0; i < n; i++) {
            const dx = p.x + p.w / 2 - bx;
            this.shots.push({
              x: bx, y: by, vx: clamp(dx / 0.85 + (i - (n - 1) / 2) * 70, -340, 340),
              vy: -300 + (i - (n - 1) / 2) * 40, kind: "arc", life: 4,
            });
          }
          this.audio.fire();
          b.timer = [0, 2.7, 2.25, 1.8][phase];
        }
      }
    } else if (b.mode === "leap") {
      b.vy = Math.min(b.vy + 1650 * dt, 1000);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const footR = Math.floor((b.y + b.h + 2) / T);
      const leapCell = this.cell(Math.floor((b.x + b.w / 2) / T), footR);
      if (b.vy > 0 && leapCell && (this.solid(Math.floor((b.x + b.w / 2) / T), footR) || leapCell.t === 7)) {
        b.y = footR * T - b.h - 0.01;
        b.vy = 0; b.vx = 0;
        b.mode = "walk";
        b.timer = [0, 2.7, 2.25, 1.8][phase];
        this.shake = 11;
        this.audio.stomp();
        this.dust(b.x + b.w / 2, b.y + b.h, 12, "#ff8c3b");
        if (phase >= 2) {
          this.shots.push({ x: b.x + 10, y: b.y + b.h - 14, vx: -180, vy: 0, kind: "slide", life: 2.4 });
          this.shots.push({ x: b.x + b.w - 10, y: b.y + b.h - 14, vx: 180, vy: 0, kind: "slide", life: 2.4 });
          this.audio.fire();
        }
      }
    } else if (b.mode === "hurt") {
      if (b.timer <= 0) { b.mode = "walk"; b.timer = 1.2; }
    }

    b.x = clamp(b.x, 138 * T, 188 * T - b.w);
    if (b.y > ROWS * T) b.y = 11 * T - b.h;
  }

  private overlapsPlayer(e: Enemy): boolean {
    const p = this.p;
    return p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y;
  }

  private resolveEnemyTouch(e: Enemy) {
    const p = this.p;
    const stompable = e.kind === "walker" || e.kind === "flyer" || e.kind === "bouncer" || e.kind === "boss";
    const falling = p.vy > 60;
    const fromAbove = p.prevBottom <= e.y + 16;
    if (stompable && falling && fromAbove) {
      if (e.kind === "boss") {
        if (e.invuln > 0 || e.mode === "sleep") { p.vy = -380; return; }
        e.hp--;
        e.invuln = 1.1;
        e.mode = "hurt";
        e.timer = 0.6;
        p.vy = -480;
        this.audio.bossHit();
        this.shake = 9;
        this.hitstop = Math.max(this.hitstop, 0.11);
        this.score += 500;
        this.popups.push({ x: e.x + e.w / 2, y: e.y - 10, text: "+500", life: 0.9, color: "#ffc94d" });
        this.dust(e.x + e.w / 2, e.y + 10, 10, "#ff8c3b");
        if (e.hp <= 0) {
          e.alive = false;
          this.explode(e.x + e.w / 2, e.y + e.h / 2, 46);
          this.audio.roar();
          this.winGame();
        }
        return;
      }
      e.squish = 0.45;
      e.vx = 0;
      this.combo++;
      const pts = Math.min(800, 100 * Math.pow(2, this.combo - 1));
      this.score += pts;
      this.popups.push({ x: e.x + e.w / 2, y: e.y - 6, text: `+${pts}`, life: 0.8, color: "#ffc94d" });
      p.vy = this.jumpHeld ? -470 : -330;
      p.y = e.y - p.h - 1;
      this.audio.stomp();
      this.dust(e.x + e.w / 2, e.y + e.h / 2, 8, "#fdf3e3");
      this.rings.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, t: 0 });
      this.shake = Math.min(6, 2 + this.combo);
      this.hitstop = Math.max(this.hitstop, 0.055);
    } else if (e.kind === "chomper" && e.vy < 14) {
      // head is tucked inside the pipe — harmless
      return;
    } else {
      this.damagePlayer();
    }
  }

  private damagePlayer() {
    const p = this.p;
    if (p.invuln > 0 || this.state !== "play") return;
    if (p.power > 0) {
      p.power = 0;
      p.h = 38;
      p.invuln = 1.7;
      this.flash = 0.35;
      this.flashColor = "#ff5a5f";
      this.audio.hurt();
      this.shake = 6;
    } else {
      this.killPlayer();
    }
  }

  /* ---------------- fruits / shots / pickups ---------------- */
  private updateFruits(dt: number) {
    const T = TILE;
    for (const f of this.fruits) {
      f.vy = Math.min(f.vy + GRAV_DOWN * 0.6 * dt, 700);
      f.y += f.vy * dt;
      if (f.walking) {
        f.x += f.vx * dt;
        const c = Math.floor((f.vx > 0 ? f.x + f.w : f.x) / T);
        const r = Math.floor((f.y + f.h / 2) / T);
        if (this.solid(c, r)) f.vx = -f.vx;
      }
      const cr = Math.floor((f.y + f.h) / T);
      const cc = Math.floor((f.x + f.w / 2) / T);
      if (this.solid(cc, cr) && f.vy > 0) {
        f.y = cr * T - f.h - 0.01;
        f.vy = 0;
        f.walking = true;
      }
      const p = this.p;
      if (this.state === "play" && p.x < f.x + f.w && p.x + p.w > f.x && p.y < f.y + f.h && p.y + p.h > f.y) {
        f.walking = false; f.x = -9999; f.vy = 9999;
        if (p.power === 0) {
          p.power = 1;
          p.y -= 20;
          p.h = 58;
          this.popups.push({ x: p.x, y: p.y - 14, text: "EMBER POWER!", life: 1.1, color: "#ff8c3b" });
        } else {
          this.popups.push({ x: p.x, y: p.y - 14, text: "+1000", life: 0.9, color: "#ffc94d" });
        }
        this.score += 1000;
        this.audio.powerup();
        this.flash = 0.22;
        this.flashColor = "#ffc94d";
        this.dust(p.x + p.w / 2, p.y + p.h / 2, 12, "#ff8c3b");
      }
    }
    this.fruits = this.fruits.filter((f) => f.x > -999 && f.y < ROWS * T + 200);
  }

  private updateShots(dt: number) {
    const T = TILE;
    for (const s of this.shots) {
      s.life -= dt;
      if (s.kind === "arc") {
        s.vy += 820 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        const c = Math.floor(s.x / T);
        const r = Math.floor(s.y / T);
        if (this.solid(c, r)) { s.life = 0; this.dust(s.x, s.y, 5, "#ff8c3b"); }
      } else {
        s.x += s.vx * dt;
        const c = Math.floor((s.vx > 0 ? s.x + 8 : s.x - 8) / T);
        const r = Math.floor(s.y / T);
        if (this.solid(c, r)) { s.life = 0; this.dust(s.x, s.y, 5, "#ff8c3b"); }
      }
      if (Math.random() < 0.3) this.particles.push({ x: s.x, y: s.y, vx: (Math.random() - 0.5) * 30, vy: -30, g: -60, life: 0.3, max: 0.3, size: 2.5, color: "#ffc94d", add: true });
      const p = this.p;
      if (this.state === "play" && s.life > 0 && p.x < s.x + 10 && p.x + p.w > s.x - 10 && p.y < s.y + 10 && p.y + p.h > s.y - 10) {
        s.life = 0;
        this.damagePlayer();
      }
    }
    this.shots = this.shots.filter((s) => s.life > 0 && s.y < ROWS * T + 100);
  }

  private updatePickups() {
    const p = this.p;
    if (this.state !== "play") return;
    const px = p.x + p.w / 2, py = p.y + p.h / 2;
    for (const c of this.coinsOnMap) {
      if (c.taken) continue;
      if (Math.abs(c.x - px) < 26 && Math.abs(c.y - py) < 32) {
        c.taken = true;
        this.addCoin();
        this.audio.coin();
        this.dust(c.x, c.y, 4, "#ffc94d");
      }
    }
    for (const h of this.hearts) {
      if (h.taken) continue;
      if (Math.abs(h.x - px) < 28 && Math.abs(h.y - py) < 34) {
        h.taken = true;
        this.lives = Math.min(6, this.lives + 1);
        this.score += 200;
        this.audio.oneUp();
        this.popups.push({ x: h.x, y: h.y - 14, text: "1UP!", life: 1.1, color: "#7be0c3" });
        this.dust(h.x, h.y, 10, "#ff5a5f");
      }
    }
    for (const c of this.checkpoints) {
      if (c.active) continue;
      if (Math.abs(c.x - px) < 26 && p.y + p.h > c.y - 92) {
        c.active = true;
        this.respawn = { x: c.x - p.w / 2, y: c.y - p.h - 2 };
        this.audio.checkpoint();
        this.popups.push({ x: c.x, y: c.y - 96, text: "CHECKPOINT", life: 1.1, color: "#7be0c3" });
        this.flash = 0.18;
        this.flashColor = "#7be0c3";
        this.dust(c.x, c.y - 60, 12, "#7be0c3");
      }
    }
  }

  /* ---------------- particles ---------------- */
  private findLavaTop(x: number): number {
    const c = Math.floor(x / TILE);
    for (let r = 0; r < ROWS; r++) {
      if (this.cell(c, r)?.t === 7) return r * TILE;
    }
    return ROWS * TILE;
  }

  /* nearest floor top below a point (for soft shadows); returns null if too far away */
  private floorBelow(x: number, y: number, maxDist: number): number | null {
    const c = Math.floor(x / TILE);
    const rStart = Math.max(0, Math.floor(y / TILE));
    for (let r = rStart; r < ROWS; r++) {
      const t = this.cell(c, r)?.t ?? 0;
      if (t === 1 || t === 2 || t === 3 || t === 4 || t === 5 || t === 8) {
        const top = r * TILE;
        return top - y <= maxDist ? top : null;
      }
      if (t === 7) return null;
    }
    return null;
  }

  private drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    const floor = this.floorBelow(x, y, 150);
    if (floor === null) return;
    const dist = floor - (y + h);
    const k = clamp(1 - dist / 150, 0.15, 1);
    ctx.globalAlpha = 0.22 * k;
    ctx.fillStyle = "#071620";
    ctx.beginPath();
    ctx.ellipse(x, floor - 2, (w / 2) * (0.55 + 0.45 * k), 4.5 * k + 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private dust(x: number, y: number, n: number, color: string) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x, y, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 120, g: 380,
        life: 0.4 + Math.random() * 0.3, max: 0.7, size: 2 + Math.random() * 3, color, add: false,
      });
    }
  }

  private explode(x: number, y: number, n: number) {
    const colors = ["#ff8c3b", "#ffc94d", "#ff5a3c", "#fdf3e3"];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 120 + Math.random() * 380;
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, g: 500,
        life: 0.7 + Math.random() * 0.8, max: 1.5, size: 3 + Math.random() * 5,
        color: colors[i % colors.length], add: i % 3 === 0,
      });
    }
  }

  private updateParticles(dt: number) {
    for (const pa of this.particles) {
      pa.life -= dt;
      pa.vy += pa.g * dt;
      pa.x += pa.vx * dt;
      pa.y += pa.vy * dt;
    }
    this.particles = this.particles.filter((pa) => pa.life > 0);
    for (const rg of this.rings) rg.t += dt;
    this.rings = this.rings.filter((rg) => rg.t < 0.3);

    // ambient lava bubbles
    this.bubbleAcc += dt;
    if (this.bubbleAcc > 0.16) {
      this.bubbleAcc = 0;
      const c0 = Math.max(0, Math.floor(this.camX / TILE) - 1);
      const c1 = Math.min(this.cols - 1, Math.floor((this.camX + VIEW_W) / TILE) + 1);
      const lavaCells: number[] = [];
      for (let r = 0; r < ROWS; r++) for (let c = c0; c <= c1; c++) {
        if (this.grid[r * this.cols + c].t === 7) lavaCells.push(c * TILE + TILE / 2);
      }
      if (lavaCells.length && Math.random() < 0.85) {
        const bx = lavaCells[Math.floor(Math.random() * lavaCells.length)] + (Math.random() - 0.5) * 26;
        this.particles.push({
          x: bx, y: this.findLavaTop(bx) + 2, vx: (Math.random() - 0.5) * 14, vy: -34 - Math.random() * 40,
          g: -30, life: 0.7 + Math.random() * 0.5, max: 1.2, size: 2.5 + Math.random() * 3,
          color: Math.random() < 0.5 ? "#ffc94d" : "#ff7a2f", add: true,
        });
      }
    }
    // ambient pollen / firefly motes (meadow, dunes, cave)
    this.pollenAcc += dt;
    if (this.pollenAcc > 0.3 && (this.theme.ambient === "cloud" || this.theme.ambient === "sand" || this.theme.ambient === "dust")) {
      this.pollenAcc = 0;
      const isCave = this.theme.ambient === "dust";
      this.particles.push({
        x: this.camX + Math.random() * VIEW_W, y: this.camY + Math.random() * VIEW_H * 0.8,
        vx: 8 + Math.random() * 16, vy: isCave ? -6 - Math.random() * 8 : 4 + Math.random() * 8, g: 0,
        life: 1.6 + Math.random() * 1.2, max: 2.8, size: isCave ? 2.2 : 1.8,
        color: isCave ? "#7be0c3" : "#fff3c4", add: true,
      });
    }

    for (const c of this.coinFx) c.t += dt;
    this.coinFx = this.coinFx.filter((c) => c.t < 0.5);
    for (const pp of this.popups) { pp.life -= dt; pp.y -= 34 * dt; }
    this.popups = this.popups.filter((pp) => pp.life > 0);
    // weather wrap
    for (const w of this.weather) {
      if (this.theme.ambient === "snow" || this.theme.ambient === "ember" || this.theme.ambient === "dust") {
        w.y += (this.theme.ambient === "ember" || this.theme.ambient === "dust" ? -w.v * 0.5 : w.v) * dt;
        w.x += Math.sin(this.elapsed * 1.4 + w.y * 0.02) * 14 * dt;
        if (w.y > VIEW_H + 10) { w.y = -10; w.x = Math.random() * VIEW_W * 1.4; }
        if (w.y < -12) { w.y = VIEW_H + 8; w.x = Math.random() * VIEW_W * 1.4; }
      } else {
        w.x -= w.v * dt;
        if (w.x < -30) { w.x = VIEW_W * 1.4; w.y = Math.random() * VIEW_H * 0.7; }
      }
    }
  }

  private pushHud() {
    const b = this.boss;
    this.opts.onHud({
      score: this.score, coins: this.coins, lives: this.lives,
      time: Math.max(0, Math.ceil(this.timeLeft)),
      progress: clamp(this.p.x / this.levelWidth(), 0, 1),
      power: this.p.power,
      bossHp: b && b.mode !== "sleep" ? Math.max(0, b.hp) : -1,
      bossMax: 6,
    });
  }

  /* ================= rendering ================= */
  private draw(t: number) {
    const ctx = this.ctx;
    const th = this.theme;
    const ox = Math.round(this.camX + (this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0));
    const oy = Math.round(this.camY + this.camDip + (this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0));

    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    sky.addColorStop(0, th.sky[0]);
    sky.addColorStop(1, th.sky[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    if (th.sun) {
      ctx.fillStyle = th.sun.color;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(VIEW_W * 0.74, th.sun.y, th.sun.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(VIEW_W * 0.74, th.sun.y, th.sun.size * 1.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    this.drawParallax(ctx, ox, oy, th, t);
    this.drawWeather(ctx, th);

    // horizon haze seats the world in depth
    const fog = ctx.createLinearGradient(0, VIEW_H - 150, 0, VIEW_H);
    fog.addColorStop(0, "rgba(0,0,0,0)");
    fog.addColorStop(1, `${th.farAlt}4d`);
    ctx.fillStyle = fog;
    ctx.fillRect(0, VIEW_H - 150, VIEW_W, 150);

    ctx.save();
    ctx.translate(-ox, -oy);

    this.drawTiles(ctx, ox, th, t);
    this.drawCheckpoints(ctx, t);
    this.drawGoal(ctx, t);
    for (const m of this.movers) this.drawMover(ctx, m, th);
    for (const c of this.coinsOnMap) if (!c.taken) this.drawCoin(ctx, c.x, c.y, t);
    for (const h of this.hearts) if (!h.taken) this.drawHeart(ctx, h.x, h.y, t);
    for (const f of this.fruits) this.drawFruit(ctx, f, t);
    for (const e of this.enemies) this.drawEnemy(ctx, e, th, t);
    for (const s of this.shots) this.drawShot(ctx, s);
    for (const c of this.coinFx) this.drawCoin(ctx, c.x, c.y - c.t * 90, t);
    this.drawPlayer(ctx, t);

    for (const pa of this.particles) {
      ctx.globalAlpha = clamp(pa.life / pa.max, 0, 1);
      if (pa.add) ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = pa.color;
      ctx.fillRect(pa.x - pa.size / 2, pa.y - pa.size / 2, pa.size, pa.size);
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.globalAlpha = 1;

    // impact rings
    for (const rg of this.rings) {
      const k = rg.t / 0.3;
      ctx.globalAlpha = 0.55 * (1 - k);
      ctx.strokeStyle = "#fdf3e3";
      ctx.lineWidth = 1 + 3 * (1 - k);
      ctx.beginPath();
      ctx.ellipse(rg.x, rg.y, 8 + k * 46, (8 + k * 46) * 0.42, 0, Math.PI, 0, true);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = "center";
    for (const pp of this.popups) {
      ctx.globalAlpha = clamp(pp.life, 0, 1);
      ctx.font = '11px "Press Start 2P", monospace';
      ctx.fillStyle = "#0b1f2c";
      ctx.fillText(pp.text, pp.x + 2, pp.y + 2);
      ctx.fillStyle = pp.color;
      ctx.fillText(pp.text, pp.x, pp.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // cinematic vignette
    const vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H * 0.45, VIEW_H * 0.45, VIEW_W / 2, VIEW_H * 0.5, VIEW_H * 0.95);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(3,10,16,0.38)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    if (this.flash > 0) {
      ctx.globalAlpha = this.flash * 0.5;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
  }

  private drawParallax(ctx: CanvasRenderingContext2D, ox: number, oy: number, th: Theme, t: number) {
    const f1 = ox * 0.18;
    const f2 = ox * 0.42;
    const base = VIEW_H;
    if (th.skyline === "hills") {
      for (let i = -1; i < 9; i++) {
        const x = i * 240 - (f1 % 240);
        const h = 90 + rnd(i + Math.floor(f1 / 240)) * 60;
        ctx.fillStyle = th.far;
        ctx.beginPath();
        ctx.arc(x + 120, base + 26 - oy * 0.1, h, Math.PI, 0);
        ctx.fill();
      }
      for (let i = -1; i < 10; i++) {
        const x = i * 190 - (f2 % 190);
        const h = 60 + rnd(i * 3 + 7 + Math.floor(f2 / 190)) * 50;
        ctx.fillStyle = th.farAlt;
        ctx.beginPath();
        ctx.arc(x + 90, base + 30 - oy * 0.2, h, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = th.farAlt;
        ctx.beginPath();
        ctx.arc(x + 40, base - h * 0.5 - oy * 0.2, 26, 0, Math.PI * 2);
        ctx.arc(x + 66, base - h * 0.5 - 14 - oy * 0.2, 30, 0, Math.PI * 2);
        ctx.arc(x + 94, base - h * 0.5 - oy * 0.2, 24, 0, Math.PI * 2);
        ctx.fill();
      }
      // clouds
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      for (let i = 0; i < 5; i++) {
        const cx = ((i * 260 + t * 14 + i * 37) % (VIEW_W + 200)) - 100;
        const cy = 60 + rnd(i * 11) * 110;
        ctx.beginPath();
        ctx.arc(cx, cy, 20, 0, Math.PI * 2);
        ctx.arc(cx + 24, cy - 10, 26, 0, Math.PI * 2);
        ctx.arc(cx + 52, cy, 20, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (th.skyline === "cave") {
      ctx.fillStyle = th.far;
      for (let i = -1; i < 14; i++) {
        const x = i * 130 - (f1 % 130);
        const h = 70 + rnd(i + Math.floor(f1 / 130)) * 130;
        ctx.beginPath();
        ctx.moveTo(x, -4);
        ctx.lineTo(x + 60, h - oy * 0.1);
        ctx.lineTo(x + 120, -4);
        ctx.fill();
      }
      for (let i = -1; i < 12; i++) {
        const x = i * 170 - (f2 % 170);
        const h = 50 + rnd(i * 5 + 3 + Math.floor(f2 / 170)) * 90;
        ctx.fillStyle = th.farAlt;
        ctx.beginPath();
        ctx.moveTo(x, VIEW_H + 4);
        ctx.lineTo(x + 70, VIEW_H - h + oy * 0.1);
        ctx.lineTo(x + 140, VIEW_H + 4);
        ctx.fill();
        // glowing crystals
        ctx.fillStyle = th.glow;
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 2 + i);
        ctx.beginPath();
        ctx.moveTo(x + 60, VIEW_H - h + oy * 0.1);
        ctx.lineTo(x + 70, VIEW_H - h - 16 + oy * 0.1);
        ctx.lineTo(x + 80, VIEW_H - h + oy * 0.1);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    } else if (th.skyline === "dunes") {
      ctx.fillStyle = th.far;
      for (let i = -1; i < 8; i++) {
        const x = i * 300 - (f1 % 300);
        const h = 70 + rnd(i + Math.floor(f1 / 300)) * 50;
        ctx.beginPath();
        ctx.ellipse(x + 150, base + 40 - oy * 0.08, 200, h, 0, Math.PI, 0);
        ctx.fill();
      }
      ctx.fillStyle = th.farAlt;
      for (let i = -1; i < 9; i++) {
        const x = i * 240 - (f2 % 240);
        const h = 55 + rnd(i * 7 + 1 + Math.floor(f2 / 240)) * 45;
        ctx.beginPath();
        ctx.ellipse(x + 120, base + 44 - oy * 0.16, 160, h, 0, Math.PI, 0);
        ctx.fill();
      }
    } else if (th.skyline === "peaks") {
      ctx.fillStyle = th.far;
      for (let i = -1; i < 9; i++) {
        const x = i * 250 - (f1 % 250);
        const h = 170 + rnd(i + Math.floor(f1 / 250)) * 120;
        ctx.beginPath();
        ctx.moveTo(x, base + 20);
        ctx.lineTo(x + 120, base - h - oy * 0.06);
        ctx.lineTo(x + 240, base + 20);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(x + 96, base - h * 0.78 - oy * 0.06);
        ctx.lineTo(x + 120, base - h - oy * 0.06);
        ctx.lineTo(x + 144, base - h * 0.78 - oy * 0.06);
        ctx.lineTo(x + 120, base - h * 0.86 - oy * 0.06);
        ctx.fill();
        ctx.fillStyle = th.far;
      }
      ctx.fillStyle = th.farAlt;
      for (let i = -1; i < 10; i++) {
        const x = i * 180 - (f2 % 180);
        const h = 110 + rnd(i * 9 + 4 + Math.floor(f2 / 180)) * 80;
        ctx.beginPath();
        ctx.moveTo(x, base + 26);
        ctx.lineTo(x + 88, base - h - oy * 0.14);
        ctx.lineTo(x + 176, base + 26);
        ctx.fill();
        // pines
        ctx.fillStyle = "#3f7d6e";
        for (let k = 0; k < 3; k++) {
          const px = x + 30 + k * 52;
          ctx.beginPath();
          ctx.moveTo(px, base - 10);
          ctx.lineTo(px + 13, base - 52 - rnd(i + k) * 20);
          ctx.lineTo(px + 26, base - 10);
          ctx.fill();
        }
        ctx.fillStyle = th.farAlt;
      }
    } else {
      // forge
      const glowG = ctx.createLinearGradient(0, VIEW_H - 130, 0, VIEW_H);
      glowG.addColorStop(0, "rgba(255,90,40,0)");
      glowG.addColorStop(1, "rgba(255,110,40,0.4)");
      ctx.fillStyle = glowG;
      ctx.fillRect(0, VIEW_H - 130, VIEW_W, 130);
      ctx.fillStyle = th.far;
      for (let i = -1; i < 10; i++) {
        const x = i * 200 - (f1 % 200);
        const h = 120 + rnd(i + Math.floor(f1 / 200)) * 160;
        ctx.beginPath();
        ctx.moveTo(x, base + 20);
        ctx.lineTo(x + 50, base - h);
        ctx.lineTo(x + 90, base - h * 0.6);
        ctx.lineTo(x + 130, base - h * 0.9);
        ctx.lineTo(x + 200, base + 20);
        ctx.fill();
      }
      ctx.fillStyle = th.farAlt;
      for (let i = -1; i < 11; i++) {
        const x = i * 160 - (f2 % 160);
        const h = 80 + rnd(i * 13 + 5 + Math.floor(f2 / 160)) * 110;
        ctx.beginPath();
        ctx.moveTo(x, base + 26);
        ctx.lineTo(x + 60, base - h - oy * 0.1);
        ctx.lineTo(x + 160, base + 26);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,140,59,0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 60, base - h - oy * 0.1);
        ctx.lineTo(x + 66, base - h * 0.5);
        ctx.lineTo(x + 58, base - h * 0.2);
        ctx.stroke();
      }
    }
  }

  private drawWeather(ctx: CanvasRenderingContext2D, th: Theme) {
    const amb = th.ambient;
    if (amb === "cloud") return;
    for (const w of this.weather) {
      const x = w.x % (VIEW_W * 1.4);
      if (amb === "snow") { ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.beginPath(); ctx.arc(x, w.y, w.s, 0, Math.PI * 2); ctx.fill(); }
      else if (amb === "sand") { ctx.fillStyle = "rgba(255,224,176,0.4)"; ctx.fillRect(x, w.y, w.s * 2.4, 1.6); }
      else if (amb === "dust") { ctx.fillStyle = "rgba(123,224,195,0.35)"; ctx.beginPath(); ctx.arc(x, w.y, w.s * 0.8, 0, Math.PI * 2); ctx.fill(); }
      else {
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "rgba(255,150,60,0.7)";
        ctx.beginPath();
        ctx.arc(x, w.y, w.s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
      }
    }
  }

  private drawTiles(ctx: CanvasRenderingContext2D, ox: number, th: Theme, t: number) {
    const T = TILE;
    const c0 = Math.max(0, Math.floor(ox / T) - 1);
    const c1 = Math.min(this.cols - 1, Math.floor((ox + VIEW_W) / T) + 1);
    for (let r = 0; r < ROWS; r++) {
      for (let c = c0; c <= c1; c++) {
        const cell = this.grid[r * this.cols + c];
        const x = c * T;
        let y = r * T;
        if (cell.t === 0) continue;
        if (cell.bump > 0) {
          cell.bump = Math.max(0, cell.bump - 0.08);
          y -= Math.sin(cell.bump * Math.PI) * 9;
        }
        if (cell.t === 1 || cell.t === 2 || cell.t === 3 || cell.t === 4 || cell.t === 8) {
          const isBlock = cell.t >= 2;
          if (cell.t === 1) ctx.fillStyle = this.patterns.ground ?? th.tile;
          else if (cell.t === 2) ctx.fillStyle = this.patterns.brick ?? th.brick;
          else if (cell.t === 8) ctx.fillStyle = th.tileDark;
          else if (cell.t === 4) ctx.fillStyle = "#ff8c3b";
          else ctx.fillStyle = "#e8a92f";
          ctx.fillRect(x, y, T, T);
          // shading
          ctx.fillStyle = "rgba(0,0,0,0.16)";
          ctx.fillRect(x, y + T - 6, T, 6);
          ctx.fillRect(x + T - 5, y, 5, T);
          const above = this.cell(c, r - 1);
          const topExposed = !above || (above.t !== 1 && above.t !== 2 && above.t !== 3 && above.t !== 4 && above.t !== 8);
          if (topExposed && cell.t === 1) {
            // scalloped grass cap
            ctx.fillStyle = th.rim;
            ctx.fillRect(x, y, T, 7);
            for (let i = 0; i < 4; i++) {
              ctx.beginPath();
              ctx.arc(x + 5 + i * 10, y + 7, 5, 0, Math.PI);
              ctx.fill();
            }
            ctx.fillStyle = "rgba(255,255,255,0.28)";
            ctx.fillRect(x, y, T, 2.5);
            // grass blades
            ctx.fillStyle = th.rim;
            const seed = c * 7.13;
            for (let i = 0; i < 3; i++) {
              const gx = x + 4 + i * 12 + rnd(seed + i) * 6;
              const gh = 4 + rnd(seed + i * 3) * 5;
              const lean = (rnd(seed + i * 5) - 0.5) * 5 + Math.sin(t * 2.1 + seed + i * 1.9) * 2.4;
              ctx.beginPath();
              ctx.moveTo(gx, y + 1);
              ctx.lineTo(gx + 1.6 + lean, y - gh);
              ctx.lineTo(gx + 3.4, y + 1);
              ctx.closePath();
              ctx.fill();
            }
          } else if (topExposed || isBlock) {
            ctx.fillStyle = "rgba(255,255,255,0.28)";
            ctx.fillRect(x, y, T, 4);
          }
          if (cell.t === 2) {
            ctx.strokeStyle = th.brickDark;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, y + 1, T - 2, T - 2);
            ctx.beginPath();
            ctx.moveTo(x, y + T / 2); ctx.lineTo(x + T, y + T / 2);
            ctx.moveTo(x + T / 2, y); ctx.lineTo(x + T / 2, y + T / 2);
            ctx.moveTo(x + T * 0.25, y + T / 2); ctx.lineTo(x + T * 0.25, y + T);
            ctx.moveTo(x + T * 0.75, y + T / 2); ctx.lineTo(x + T * 0.75, y + T);
            ctx.stroke();
          }
          if (cell.t === 3 || cell.t === 4) {
            ctx.strokeStyle = "rgba(60,25,5,0.7)";
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 2.5, y + 2.5, T - 5, T - 5);
            ctx.fillStyle = "#fdf3e3";
            ctx.font = '15px "Press Start 2P", monospace';
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("?", x + T / 2, y + T / 2 + 2);
            ctx.textBaseline = "alphabetic";
          }
          if (cell.t === 8) {
            ctx.strokeStyle = "rgba(0,0,0,0.35)";
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 3, y + 3, T - 6, T - 6);
          }
        } else if (cell.t === 5) {
          ctx.fillStyle = th.plat;
          rr(ctx, x + 1, y + 2, T - 2, 11, 4);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.fillRect(x + 2, y + 2, T - 4, 3);
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.fillRect(x + 6, y + 13, 4, 5);
          ctx.fillRect(x + T - 10, y + 13, 4, 5);
        } else if (cell.t === 6) {
          ctx.fillStyle = "#cfd8dc";
          ctx.strokeStyle = "#5b6b73";
          ctx.lineWidth = 2;
          for (let i = 0; i < 3; i++) {
            const sx = x + 3 + i * 12.5;
            ctx.beginPath();
            ctx.moveTo(sx, y + T);
            ctx.lineTo(sx + 6, y + 14);
            ctx.lineTo(sx + 12, y + T);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        } else if (cell.t === 7) {
          ctx.fillStyle = "#e8491f";
          ctx.fillRect(x, y, T, T);
          ctx.fillStyle = "#ff7a2f";
          ctx.beginPath();
          ctx.moveTo(x, y + 8);
          for (let i = 0; i <= 4; i++) {
            ctx.lineTo(x + (i / 4) * T, y + 6 + Math.sin(t * 4 + x * 0.1 + i * 1.7) * 4);
          }
          ctx.lineTo(x + T, y + 14);
          ctx.lineTo(x, y + 14);
          ctx.fill();
          ctx.fillStyle = "#ffc94d";
          ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 6 + x);
          ctx.fillRect(x + 8, y + 3, 5, 4);
          ctx.globalAlpha = 1;
          // rising heat glow
          ctx.globalCompositeOperation = "lighter";
          const lg = ctx.createRadialGradient(x + T / 2, y + 2, 2, x + T / 2, y + 2, 34);
          lg.addColorStop(0, `rgba(255,122,47,${0.2 + 0.1 * Math.sin(t * 5 + x * 0.3)})`);
          lg.addColorStop(1, "rgba(255,122,47,0)");
          ctx.fillStyle = lg;
          ctx.fillRect(x - 14, y - 30, T + 28, 44);
          ctx.globalCompositeOperation = "source-over";
        }
      }
    }
  }

  private drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
    const s = Math.abs(Math.sin(t * 4.5 + x * 0.05));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(Math.max(0.18, s), 1);
    ctx.fillStyle = "#b8860b";
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffc94d";
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff3c4";
    ctx.fillRect(-2, -5, 4, 10);
    ctx.restore();
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
    const bob = Math.sin(t * 3 + x) * 4;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.fillStyle = "#ff5a5f";
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.bezierCurveTo(-14, -2, -8, -14, 0, -6);
    ctx.bezierCurveTo(8, -14, 14, -2, 0, 10);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath(); ctx.arc(-4, -5, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  private drawFruit(ctx: CanvasRenderingContext2D, f: Fruit, t: number) {
    const cx = f.x + f.w / 2, cy = f.y + f.h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(255,140,59,0.25)";
    ctx.beginPath(); ctx.arc(0, 0, 22 + Math.sin(t * 6) * 3, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#ff7a2f";
    ctx.beginPath(); ctx.arc(0, 2, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffc94d";
    ctx.beginPath(); ctx.arc(-3, -1, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#5cc257";
    ctx.beginPath();
    ctx.ellipse(4, -12, 7, 3.4, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawMover(ctx: CanvasRenderingContext2D, m: Mover, th: Theme) {
    ctx.fillStyle = th.plat;
    rr(ctx, m.x, m.y, m.w, m.h, 6);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(m.x + 4, m.y + 2, m.w - 8, 4);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(m.x + 4, m.y + m.h - 5, m.w - 8, 3);
    ctx.fillStyle = th.tileDark;
    ctx.beginPath();
    ctx.arc(m.x + 14, m.y + m.h / 2 + 1, 3.4, 0, Math.PI * 2);
    ctx.arc(m.x + m.w - 14, m.y + m.h / 2 + 1, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawCheckpoints(ctx: CanvasRenderingContext2D, t: number) {
    for (const c of this.checkpoints) {
      const x = c.x, y = c.y;
      ctx.fillStyle = "#8d9aa5";
      ctx.fillRect(x - 3, y - 84, 6, 84);
      ctx.fillStyle = "#cfd8dc";
      ctx.beginPath(); ctx.arc(x, y - 84, 5, 0, Math.PI * 2); ctx.fill();
      const wave = Math.sin(t * 6 + x) * 4;
      ctx.fillStyle = c.active ? "#7be0c3" : "#5b7284";
      ctx.beginPath();
      ctx.moveTo(x + 3, y - 82);
      ctx.lineTo(x + 36, y - 74 + wave);
      ctx.lineTo(x + 3, y - 60);
      ctx.closePath();
      ctx.fill();
      if (c.active) {
        ctx.fillStyle = "rgba(123,224,195,0.6)";
        ctx.beginPath(); ctx.arc(x, y - 84, 8 + Math.sin(t * 5) * 2, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  private drawGoal(ctx: CanvasRenderingContext2D, t: number) {
    const g = this.goal;
    if (!g) return;
    const x = g.x, y = g.y;
    ctx.fillStyle = "#8d9aa5";
    ctx.fillRect(x - 4, y - 148, 8, 148);
    ctx.fillStyle = "#ffc94d";
    ctx.beginPath(); ctx.arc(x, y - 152, 8, 0, Math.PI * 2); ctx.fill();
    const wave = Math.sin(t * 5) * 6;
    ctx.fillStyle = "#ff8c3b";
    ctx.beginPath();
    ctx.moveTo(x + 4, y - 146);
    ctx.lineTo(x + 62, y - 130 + wave);
    ctx.lineTo(x + 4, y - 104);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fdf3e3";
    ctx.save();
    ctx.translate(x + 26, y - 127 + wave * 0.4);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const a2 = a + Math.PI / 5;
      ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9);
      ctx.lineTo(Math.cos(a2) * 4, Math.sin(a2) * 4);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#cfd8dc";
    rr(ctx, x - 16, y - 10, 32, 10, 3);
    ctx.fill();
    // orbiting sparkles
    for (let i = 0; i < 3; i++) {
      const a = t * 1.2 + i * 2.1;
      const gx = x + Math.cos(a) * 22;
      const gy = y - 152 + Math.sin(a * 1.6) * 13;
      ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 5 + i * 2.4));
      ctx.fillStyle = "#fff3c4";
      ctx.fillRect(gx - 1.2, gy - 4, 2.4, 8);
      ctx.fillRect(gx - 4, gy - 1.2, 8, 2.4);
    }
    ctx.globalAlpha = 1;
  }

  private drawShot(ctx: CanvasRenderingContext2D, s: Shot) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(255,122,47,0.5)";
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ff7a2f";
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffc94d";
    ctx.beginPath(); ctx.arc(-2, -2, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /* ---------------- entity rendering ---------------- */
  private drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, th: Theme, t: number) {
    if (!e.alive && e.squish <= 0) return;
    const cx = e.x + e.w / 2;
    if (e.squish <= 0 && (e.kind === "walker" || e.kind === "spiker" || e.kind === "bouncer" || e.kind === "boss")) {
      this.drawShadow(ctx, cx, e.y, e.w, e.h);
    }
    ctx.save();
    if (e.squish > 0) {
      ctx.globalAlpha = e.squish / 0.45;
      ctx.translate(cx, e.y + e.h);
      ctx.scale(1.3, 0.25);
      ctx.translate(-cx, -(e.y + e.h));
    }
    if (e.kind === "walker") {
      const wob = Math.sin(e.t * 10) * 2;
      ctx.fillStyle = "#3f9e7e";
      rr(ctx, e.x, e.y + 4 + wob * 0.4, e.w, e.h - 8, 12);
      ctx.fill();
      ctx.fillStyle = "#2c755c";
      const step = Math.sin(e.t * 12) * 4;
      ctx.beginPath();
      ctx.ellipse(e.x + 9, e.y + e.h - 3 + step * 0.4, 7, 4, 0, 0, Math.PI * 2);
      ctx.ellipse(e.x + e.w - 9, e.y + e.h - 3 - step * 0.4, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fdf3e3";
      ctx.beginPath();
      ctx.arc(cx - 7 + e.dir * 2, e.y + 13, 5, 0, Math.PI * 2);
      ctx.arc(cx + 7 + e.dir * 2, e.y + 13, 5, 0, Math.PI * 2);
      ctx.fill();
      const bl = Math.sin(e.t * 1.9 + e.ax * 0.05) > 0.985 ? 0.15 : 1;
      ctx.fillStyle = "#12262e";
      ctx.beginPath();
      ctx.ellipse(cx - 7 + e.dir * 4, e.y + 14, 2.4, 2.4 * bl, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 7 + e.dir * 4, e.y + 14, 2.4, 2.4 * bl, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#12262e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 12, e.y + 6); ctx.lineTo(cx - 3, e.y + 9);
      ctx.moveTo(cx + 12, e.y + 6); ctx.lineTo(cx + 3, e.y + 9);
      ctx.stroke();
    } else if (e.kind === "flyer") {
      const flap = Math.sin(e.t * 18);
      ctx.fillStyle = "#f2b25c";
      ctx.save();
      ctx.translate(cx, e.y + e.h / 2);
      ctx.scale(1, 0.5 + 0.5 * Math.abs(flap));
      ctx.beginPath(); ctx.ellipse(-16, -4, 13, 8, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(16, -4, 13, 8, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#d95f76";
      ctx.beginPath(); ctx.arc(cx, e.y + e.h / 2, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fdf3e3";
      ctx.beginPath();
      ctx.arc(cx - 4, e.y + e.h / 2 - 2, 3.6, 0, Math.PI * 2);
      ctx.arc(cx + 4, e.y + e.h / 2 - 2, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#12262e";
      ctx.beginPath();
      ctx.arc(cx - 4, e.y + e.h / 2 - 1, 1.8, 0, Math.PI * 2);
      ctx.arc(cx + 4, e.y + e.h / 2 - 1, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === "spiker") {
      ctx.fillStyle = "#fdf3e3";
      for (let i = 0; i < 5; i++) {
        const sx = e.x + 3 + i * 7.4;
        ctx.beginPath();
        ctx.moveTo(sx, e.y + 10);
        ctx.lineTo(sx + 3.6, e.y - 6);
        ctx.lineTo(sx + 7.2, e.y + 10);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#c04a44";
      ctx.beginPath();
      ctx.moveTo(e.x, e.y + e.h);
      ctx.quadraticCurveTo(e.x, e.y + 2, cx, e.y + 2);
      ctx.quadraticCurveTo(e.x + e.w, e.y + 2, e.x + e.w, e.y + e.h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fdf3e3";
      ctx.beginPath();
      ctx.arc(cx - 7 + e.dir * 2, e.y + 15, 4, 0, Math.PI * 2);
      ctx.arc(cx + 7 + e.dir * 2, e.y + 15, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#12262e";
      ctx.beginPath();
      ctx.arc(cx - 7 + e.dir * 3.4, e.y + 16, 2, 0, Math.PI * 2);
      ctx.arc(cx + 7 + e.dir * 3.4, e.y + 16, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === "bouncer") {
      const stretch = clamp(-e.vy / 900, -0.3, 0.4);
      ctx.save();
      ctx.translate(cx, e.y + e.h);
      ctx.scale(1 - stretch * 0.5, 1 + stretch);
      ctx.fillStyle = "#e5a13f";
      ctx.beginPath(); ctx.arc(0, -e.h / 2, e.w / 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#9c6a1f";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.moveTo(-10 + i * 6, -4);
        ctx.lineTo(-7 + i * 6, -1);
      }
      ctx.stroke();
      ctx.fillStyle = "#fdf3e3";
      ctx.beginPath();
      ctx.arc(-6 + e.dir * 2, -e.h / 2 - 3, 4.4, 0, Math.PI * 2);
      ctx.arc(6 + e.dir * 2, -e.h / 2 - 3, 4.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#12262e";
      ctx.beginPath();
      ctx.arc(-6 + e.dir * 3.6, -e.h / 2 - 2, 2.2, 0, Math.PI * 2);
      ctx.arc(6 + e.dir * 3.6, -e.h / 2 - 2, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (e.kind === "chomper") {
      const pipeY = e.pipeTop;
      // head
      ctx.fillStyle = "#ff6b4a";
      ctx.beginPath(); ctx.arc(cx, e.y + 18, 17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fdf3e3";
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const tx = cx - 14 + i * 7;
        ctx.moveTo(tx, e.y + 20);
        ctx.lineTo(tx + 3.5, e.y + 27);
        ctx.lineTo(tx + 7, e.y + 20);
      }
      ctx.fill();
      ctx.fillStyle = "#12262e";
      ctx.beginPath(); ctx.arc(cx - 6, e.y + 10, 2.6, 0, Math.PI * 2); ctx.arc(cx + 6, e.y + 10, 2.6, 0, Math.PI * 2); ctx.fill();
      // pipe
      ctx.fillStyle = th.pipe;
      ctx.fillRect(cx - 22, pipeY, 44, ROWS * TILE - pipeY);
      ctx.fillStyle = th.pipeDark;
      ctx.fillRect(cx + 12, pipeY, 10, ROWS * TILE - pipeY);
      ctx.fillStyle = th.pipe;
      rr(ctx, cx - 26, pipeY - 4, 52, 16, 4);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillRect(cx - 24, pipeY - 2, 8, 12);
    } else if (e.kind === "boss") {
      this.drawBoss(ctx, e, t);
    }
    ctx.restore();
  }

  private drawBoss(ctx: CanvasRenderingContext2D, b: Enemy, t: number) {
    const cx = b.x + b.w / 2;
    const flash = b.invuln > 0 && Math.floor(t * 14) % 2 === 0;
    const squish = b.mode === "tele" ? 0.86 : b.mode === "leap" ? 1.08 : 1;
    ctx.save();
    ctx.translate(cx, b.y + b.h);
    ctx.scale(1 / squish, squish);
    ctx.translate(-cx, -(b.y + b.h));
    if (flash) ctx.globalAlpha = 0.55;

    // flame crown
    const flames = [-30, 0, 30];
    for (let i = 0; i < 3; i++) {
      const fx = cx + flames[i];
      const fh = 20 + Math.sin(t * 11 + i * 2) * 7;
      ctx.fillStyle = i === 1 ? "#ffc94d" : "#ff7a2f";
      ctx.beginPath();
      ctx.moveTo(fx - 9, b.y + 8);
      ctx.quadraticCurveTo(fx, b.y - fh, fx + 9, b.y + 8);
      ctx.fill();
    }
    // horns
    ctx.fillStyle = "#d8c9a8";
    ctx.beginPath();
    ctx.moveTo(b.x + 8, b.y + 22); ctx.lineTo(b.x - 8, b.y - 8); ctx.lineTo(b.x + 26, b.y + 10);
    ctx.moveTo(b.x + b.w - 8, b.y + 22); ctx.lineTo(b.x + b.w + 8, b.y - 8); ctx.lineTo(b.x + b.w - 26, b.y + 10);
    ctx.fill();
    // body
    ctx.fillStyle = "#3c2226";
    rr(ctx, b.x, b.y, b.w, b.h, 26);
    ctx.fill();
    ctx.fillStyle = "#4d2c30";
    rr(ctx, b.x + 8, b.y + 8, b.w - 16, b.h - 24, 20);
    ctx.fill();
    // glowing cracks
    const pulse = 0.6 + 0.4 * Math.sin(t * 5);
    ctx.strokeStyle = `rgba(255,122,47,${pulse})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(b.x + 20, b.y + 30); ctx.lineTo(b.x + 34, b.y + 46); ctx.lineTo(b.x + 26, b.y + 62);
    ctx.moveTo(b.x + b.w - 20, b.y + 34); ctx.lineTo(b.x + b.w - 36, b.y + 50); ctx.lineTo(b.x + b.w - 24, b.y + 66);
    ctx.moveTo(b.x + 40, b.y + b.h - 22); ctx.lineTo(b.x + 58, b.y + b.h - 34);
    ctx.stroke();
    // belly glow
    ctx.fillStyle = `rgba(255,140,59,${0.25 + 0.15 * Math.sin(t * 5)})`;
    ctx.beginPath(); ctx.ellipse(cx, b.y + b.h - 26, 30, 16, 0, 0, Math.PI * 2); ctx.fill();
    // eyes
    const look = this.p.x > b.x ? 3 : -3;
    ctx.fillStyle = "#ffc94d";
    ctx.beginPath();
    ctx.arc(cx - 20 + look, b.y + 34, 9, 0, Math.PI * 2);
    ctx.arc(cx + 20 + look, b.y + 34, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3c1010";
    ctx.beginPath();
    ctx.arc(cx - 20 + look * 1.6, b.y + 35, 4, 0, Math.PI * 2);
    ctx.arc(cx + 20 + look * 1.6, b.y + 35, 4, 0, Math.PI * 2);
    ctx.fill();
    // mouth
    ctx.fillStyle = "#ff7a2f";
    rr(ctx, cx - 22, b.y + 56, 44, 10, 5);
    ctx.fill();
    ctx.fillStyle = "#fdf3e3";
    for (let i = 0; i < 5; i++) {
      const tx = cx - 18 + i * 9;
      ctx.beginPath();
      ctx.moveTo(tx, b.y + 56); ctx.lineTo(tx + 4, b.y + 63); ctx.lineTo(tx + 8, b.y + 56);
      ctx.fill();
    }
    // feet
    ctx.fillStyle = "#2c171a";
    ctx.beginPath();
    ctx.ellipse(b.x + 24, b.y + b.h - 4, 18, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(b.x + b.w - 24, b.y + b.h - 4, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // telegraph marker
    if (b.mode === "tele") {
      ctx.fillStyle = "#ffc94d";
      ctx.font = '22px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      ctx.fillText("!", cx, b.y - 18 + Math.sin(t * 20) * 3);
    }
    ctx.restore();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, t: number) {
    const p = this.p;
    if (this.state === "over") return;
    if (p.invuln > 0 && this.state === "play" && Math.floor(t * 16) % 2 === 0) return;

    const cx = p.x + p.w / 2;
    const bottom = p.y + p.h;
    const sq = p.squash * 0.18;
    const st = p.stretch * 0.16;
    const sx = 1 + sq - st;
    const sy = 1 - sq + st;

    this.drawShadow(ctx, cx, p.y, p.w + 8, p.h);

    ctx.save();
    ctx.translate(cx, bottom);
    if (this.state === "dying") ctx.rotate(this.stateTimer * 9);
    ctx.scale(p.dir * sx, sy);
    ctx.translate(-cx, -bottom);

    const h = p.h;
    const bodyW = p.w + (p.power ? 6 : 0);
    const bx = cx - bodyW / 2;
    const bodyH = h * 0.62;
    const headH = h - bodyH;
    const bodyY = bottom - bodyH;

    // tail
    const wag = Math.sin(t * 9 + p.legPhase) * 0.35;
    ctx.save();
    ctx.translate(bx + 2, bodyY + bodyH * 0.3);
    ctx.rotate(-0.5 + wag);
    ctx.fillStyle = this.char.bodyDark;
    if (this.char.tail === "bush") {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-22, -6, -26, -22);
      ctx.quadraticCurveTo(-12, -18, -2, -10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = this.char.belly;
      ctx.beginPath(); ctx.arc(-23, -19, 6, 0, Math.PI * 2); ctx.fill();
    } else if (this.char.tail === "stub") {
      ctx.beginPath(); ctx.arc(-6, -6, 8, 0, Math.PI * 2); ctx.fill();
    } else if (this.char.tail === "puff") {
      ctx.beginPath(); ctx.arc(-8, -8, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = this.char.belly;
      ctx.beginPath(); ctx.arc(-10, -10, 5, 0, Math.PI * 2); ctx.fill();
    }
    if (p.power) {
      const fl = 6 + Math.sin(t * 22) * 3;
      ctx.fillStyle = "#ff7a2f";
      ctx.beginPath();
      ctx.moveTo(-28, -24); ctx.quadraticCurveTo(-30 - fl, -32, -24, -36 - fl); ctx.quadraticCurveTo(-20, -28, -18, -22);
      ctx.fill();
      ctx.fillStyle = "#ffc94d";
      ctx.beginPath();
      ctx.moveTo(-26, -25); ctx.quadraticCurveTo(-27, -32, -23, -33 - fl * 0.6); ctx.quadraticCurveTo(-20, -27, -19, -23);
      ctx.fill();
    }
    ctx.restore();

    // legs
    const moving = p.grounded && Math.abs(p.vx) > 40;
    const legA = moving ? Math.sin(p.legPhase * 2.4) * 6 : 0;
    const legB = moving ? -Math.sin(p.legPhase * 2.4) * 6 : 0;
    ctx.fillStyle = this.char.bodyDark;
    rr(ctx, bx + 4 + legA * 0.4, bottom - 8, 9, 8, 3); ctx.fill();
    rr(ctx, bx + bodyW - 13 + legB * 0.4, bottom - 8, 9, 8, 3); ctx.fill();

    // body
    ctx.fillStyle = this.char.body;
    rr(ctx, bx, bodyY - headH * 0.25, bodyW, bodyH + headH * 0.25, 12);
    ctx.fill();
    // belly
    ctx.fillStyle = this.char.belly;
    ctx.beginPath();
    ctx.ellipse(cx + 2, bodyY + bodyH * 0.55, bodyW * 0.32, bodyH * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    // head
    const headY = p.y + headH * 0.55;
    ctx.fillStyle = this.char.body;
    ctx.beginPath(); ctx.arc(cx + 2, headY, headH * 0.62, 0, Math.PI * 2); ctx.fill();
    const lookY = clamp(p.vy / 400, -1.6, 1.6);
    // ears / features per species
    if (this.char.ears === "fox") {
      ctx.fillStyle = this.char.bodyDark;
      ctx.beginPath();
      ctx.moveTo(cx - 8, headY - headH * 0.35);
      ctx.lineTo(cx - 14, headY - headH * 0.95);
      ctx.lineTo(cx - 1, headY - headH * 0.55);
      ctx.closePath();
      ctx.moveTo(cx + 10, headY - headH * 0.35);
      ctx.lineTo(cx + 14, headY - headH * 0.95);
      ctx.lineTo(cx + 3, headY - headH * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = this.char.earTip;
      ctx.beginPath();
      ctx.moveTo(cx - 12, headY - headH * 0.85);
      ctx.lineTo(cx - 14, headY - headH * 0.95);
      ctx.lineTo(cx - 8, headY - headH * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = this.char.belly;
      ctx.beginPath(); ctx.ellipse(cx + 8, headY + 4, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#3c1c0c";
      ctx.beginPath(); ctx.arc(cx + 13, headY + 2, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = this.char.belly;
      ctx.beginPath(); ctx.arc(cx + 3, headY - 3, 4.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#12262e";
      ctx.beginPath(); ctx.arc(cx + 4.4, headY - 3 + lookY, 2.3, 0, Math.PI * 2); ctx.fill();
    } else if (this.char.ears === "bear") {
      ctx.fillStyle = this.char.bodyDark;
      ctx.beginPath();
      ctx.arc(cx - 9, headY - headH * 0.42, 6.4, 0, Math.PI * 2);
      ctx.arc(cx + 11, headY - headH * 0.42, 6.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = this.char.earTip;
      ctx.beginPath();
      ctx.arc(cx - 9, headY - headH * 0.42, 3, 0, Math.PI * 2);
      ctx.arc(cx + 11, headY - headH * 0.42, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = this.char.belly;
      ctx.beginPath(); ctx.ellipse(cx + 7, headY + 4, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#3c1c0c";
      ctx.beginPath(); ctx.arc(cx + 12, headY + 2, 2.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = this.char.belly;
      ctx.beginPath(); ctx.arc(cx + 2, headY - 4, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#12262e";
      ctx.beginPath(); ctx.arc(cx + 3.4, headY - 4 + lookY, 2.2, 0, Math.PI * 2); ctx.fill();
    } else if (this.char.ears === "bunny") {
      ctx.fillStyle = this.char.bodyDark;
      rr(ctx, cx - 11, headY - headH * 1.45, 8, headH * 1.05, 4); ctx.fill();
      rr(ctx, cx + 5, headY - headH * 1.5, 8, headH * 1.1, 4); ctx.fill();
      ctx.fillStyle = this.char.earTip;
      rr(ctx, cx - 9, headY - headH * 1.35, 4, headH * 0.8, 2); ctx.fill();
      rr(ctx, cx + 7, headY - headH * 1.4, 4, headH * 0.85, 2); ctx.fill();
      ctx.fillStyle = this.char.belly;
      ctx.beginPath(); ctx.ellipse(cx + 8, headY + 4, 7.5, 5.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#e2708a";
      ctx.beginPath(); ctx.arc(cx + 12, headY + 2, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = this.char.belly;
      ctx.beginPath(); ctx.arc(cx + 2, headY - 3, 4.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#12262e";
      ctx.beginPath(); ctx.arc(cx + 3.4, headY - 3 + lookY, 2.3, 0, Math.PI * 2); ctx.fill();
    } else {
      // frog — bulging top eyes, wide smile
      ctx.fillStyle = this.char.body;
      ctx.beginPath();
      ctx.arc(cx - 5, headY - headH * 0.5, 6.5, 0, Math.PI * 2);
      ctx.arc(cx + 9, headY - headH * 0.5, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = this.char.belly;
      ctx.beginPath();
      ctx.arc(cx - 5, headY - headH * 0.5, 4.4, 0, Math.PI * 2);
      ctx.arc(cx + 9, headY - headH * 0.5, 4.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#12262e";
      ctx.beginPath();
      ctx.arc(cx - 4 + lookY * 0.4, headY - headH * 0.5, 2.2, 0, Math.PI * 2);
      ctx.arc(cx + 10 + lookY * 0.4, headY - headH * 0.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#2e7d32";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(cx + 4, headY + 2, 8, 0.25, Math.PI - 0.55);
      ctx.stroke();
      ctx.fillStyle = "#ff8fa3";
      ctx.beginPath(); ctx.arc(cx - 8, headY + 2, 2.6, 0, Math.PI * 2); ctx.fill();
    }
    // scarf
    ctx.fillStyle = p.power ? "#ffc94d" : this.char.scarf;
    const sc = Math.sin(t * 10 + p.legPhase) * 3 - clamp(p.vx * p.dir / 30, 0, 10);
    ctx.beginPath();
    ctx.moveTo(cx - 9, bodyY - 4);
    ctx.quadraticCurveTo(cx, bodyY + 4, cx + 11, bodyY - 4);
    ctx.lineTo(cx + 11, bodyY + 2);
    ctx.quadraticCurveTo(cx, bodyY + 10, cx - 9, bodyY + 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 8, bodyY);
    ctx.quadraticCurveTo(cx - 16, bodyY + 8 + sc * 0.4, cx - 20 - Math.abs(sc) * 0.4, bodyY + 4 + sc);
    ctx.lineTo(cx - 16, bodyY + 10 + sc);
    ctx.quadraticCurveTo(cx - 12, bodyY + 8, cx - 8, bodyY + 6);
    ctx.closePath();
    ctx.fill();

    if (p.power) {
      ctx.strokeStyle = "rgba(255,201,77,0.6)";
      ctx.lineWidth = 3;
      rr(ctx, bx - 3, p.y - 3, bodyW + 6, h + 6, 14);
      ctx.stroke();
    }
    ctx.restore();
  }
}


