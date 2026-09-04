/* Emberfox audio — everything synthesized with WebAudio. No external assets. */

export type MusicTheme = "menu" | "meadow" | "cave" | "dunes" | "frost" | "forge" | "boss" | null;

interface ThemeDef {
  tempo: number;
  bass: number[]; // 32 sixteenth steps, 0 = rest (midi note)
  lead: number[];
  hat: number[]; // 1 = tick
  leadType: OscillatorType;
  leadVol: number;
  bassType: OscillatorType;
  bassVol: number;
}

const N = 0;
const THEMES: Record<string, ThemeDef> = {
  menu: {
    tempo: 112, leadType: "triangle", leadVol: 0.16, bassType: "triangle", bassVol: 0.3,
    bass: [48,N,N,N, 55,N,N,N, 45,N,N,N, 52,N,N,N, 41,N,N,N, 48,N,N,N, 43,N,N,N, 50,N,55,N],
    lead: [76,N,79,N, 81,N,79,N, 76,N,72,N, 74,N,76,N, 79,N,81,N, 84,N,81,N, 79,N,76,N, 74,N,72,N],
    hat: [N,N,1,N, N,N,1,N, N,N,1,N, N,N,1,N, N,N,1,N, N,N,1,N, N,N,1,N, N,N,1,1],
  },
  meadow: {
    tempo: 138, leadType: "square", leadVol: 0.09, bassType: "triangle", bassVol: 0.34,
    bass: [48,N,55,N, 48,N,55,N, 45,N,52,N, 45,N,52,N, 41,N,48,N, 41,N,48,N, 43,N,50,N, 43,N,55,N],
    lead: [76,N,79,81, N,79,N,76, 74,N,76,N, 72,N,74,N, 76,N,79,81, N,84,N,81, 79,N,76,N, 79,N,76,N],
    hat: [N,N,1,N, N,N,1,N, N,N,1,N, N,N,1,N, N,N,1,N, N,N,1,N, N,N,1,N, N,N,1,1],
  },
  cave: {
    tempo: 92, leadType: "sine", leadVol: 0.2, bassType: "triangle", bassVol: 0.3,
    bass: [45,N,N,N, N,N,N,N, 41,N,N,N, N,N,N,N, 43,N,N,N, N,N,N,N, 40,N,N,N, N,N,47,N],
    lead: [69,N,N,N, N,N,72,N, N,N,N,N, 76,N,N,N, N,N,N,N, 74,N,72,N, N,N,N,N, 67,N,N,N],
    hat: [N,N,N,N, N,N,N,1, N,N,N,N, N,N,N,1, N,N,N,N, N,N,N,1, N,N,N,N, N,N,N,1],
  },
  dunes: {
    tempo: 122, leadType: "square", leadVol: 0.08, bassType: "triangle", bassVol: 0.32,
    bass: [50,N,50,N, 53,N,50,N, 48,N,48,N, 52,N,48,N, 46,N,46,N, 50,N,46,N, 45,N,45,N, 48,N,53,N],
    lead: [77,N,80,N, 82,N,80,77, N,75,N,77, N,73,N,75, 77,N,80,N, 84,N,82,N, 80,N,77,N, 75,N,73,N],
    hat: [N,N,1,N, N,N,1,N, N,N,1,N, N,N,1,1, N,N,1,N, N,N,1,N, N,N,1,N, N,N,1,1],
  },
  frost: {
    tempo: 84, leadType: "sine", leadVol: 0.22, bassType: "triangle", bassVol: 0.26,
    bass: [41,N,N,N, N,N,N,N, N,N,N,N, 48,N,N,N, 45,N,N,N, N,N,N,N, N,N,N,N, 43,N,N,N],
    lead: [81,N,N,83, N,N,85,N, N,N,N,N, 88,N,N,N, N,86,N,N, 85,N,83,N, N,N,N,N, 79,N,N,N],
    hat: [N,N,N,N, N,N,N,1, N,N,N,N, N,N,N,N, N,N,N,N, N,N,N,1, N,N,N,N, N,N,N,N],
  },
  forge: {
    tempo: 146, leadType: "sawtooth", leadVol: 0.05, bassType: "triangle", bassVol: 0.36,
    bass: [40,N,40,40, N,40,N,43, 45,N,45,N, 43,N,40,N, 40,N,40,40, N,40,N,43, 47,N,45,N, 43,N,40,N],
    lead: [64,N,N,67, N,N,71,N, N,67,N,N, 72,N,71,N, 64,N,N,67, N,N,71,N, 74,N,72,N, 71,N,67,N],
    hat: [1,N,1,N, 1,N,1,N, 1,N,1,N, 1,N,1,1, 1,N,1,N, 1,N,1,N, 1,N,1,N, 1,1,1,1],
  },
  boss: {
    tempo: 158, leadType: "sawtooth", leadVol: 0.06, bassType: "square", bassVol: 0.16,
    bass: [38,38,N,38, N,38,N,41, 43,43,N,43, N,43,N,46, 38,38,N,38, N,38,N,41, 48,N,46,N, 44,N,41,N],
    lead: [62,N,65,N, 69,N,65,N, 62,N,65,N, 70,N,69,N, 62,N,65,N, 69,N,65,N, 74,N,72,N, 69,N,65,N],
    hat: [1,N,1,1, N,1,N,1, 1,N,1,1, N,1,1,1, 1,N,1,1, N,1,N,1, 1,N,1,1, 1,1,1,1],
  },
};

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private seqTimer: number | null = null;
  private step = 0;
  private nextTime = 0;
  private theme: MusicTheme = null;
  sfxOn = true;
  musicOn = true;

  unlock() {
    if (!this.ctx) {
      const AC: typeof AudioContext | undefined =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.sfxOn ? 1 : 0;
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.musicOn ? 0.5 : 0;
      this.musicBus.connect(this.master);
      const len = Math.floor(this.ctx.sampleRate * 0.5);
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setSfx(on: boolean) { this.sfxOn = on; if (this.sfxBus) this.sfxBus.gain.value = on ? 1 : 0; }
  setMusic(on: boolean) { this.musicOn = on; if (this.musicBus) this.musicBus.gain.value = on ? 0.5 : 0; }
  current(): MusicTheme { return this.theme; }

  private tone(o: { type?: OscillatorType; f0: number; f1?: number; dur: number; vol?: number; at?: number; bus?: GainNode | null }) {
    if (!this.ctx || !this.sfxBus) return;
    const t0 = this.ctx.currentTime + (o.at ?? 0);
    const osc = this.ctx.createOscillator();
    osc.type = o.type ?? "square";
    osc.frequency.setValueAtTime(o.f0, t0);
    if (o.f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t0 + o.dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol ?? 0.2, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g).connect((o.bus ?? this.sfxBus)!);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.05);
  }

  private noise(o: { dur: number; vol?: number; f?: number; q?: number; at?: number; slide?: number }) {
    if (!this.ctx || !this.sfxBus || !this.noiseBuf) return;
    const t0 = this.ctx.currentTime + (o.at ?? 0);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const flt = this.ctx.createBiquadFilter();
    flt.type = "bandpass";
    flt.frequency.setValueAtTime(o.f ?? 800, t0);
    if (o.slide) flt.frequency.exponentialRampToValueAtTime(o.slide, t0 + o.dur);
    flt.Q.value = o.q ?? 1;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol ?? 0.2, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(flt).connect(g).connect(this.sfxBus);
    src.start(t0);
    src.stop(t0 + o.dur + 0.05);
  }

  /* ------- SFX ------- */
  jump() { this.tone({ type: "square", f0: 300, f1: 640, dur: 0.14, vol: 0.16 }); }
  coin() { this.tone({ type: "sine", f0: 1046, dur: 0.07, vol: 0.16 }); this.tone({ type: "sine", f0: 1568, dur: 0.14, vol: 0.16, at: 0.055 }); }
  stomp() { this.noise({ dur: 0.12, f: 700, vol: 0.25 }); this.tone({ type: "triangle", f0: 220, f1: 60, dur: 0.16, vol: 0.25 }); }
  bump() { this.tone({ type: "triangle", f0: 140, f1: 70, dur: 0.09, vol: 0.22 }); }
  hurt() { this.tone({ type: "sawtooth", f0: 380, f1: 90, dur: 0.34, vol: 0.2 }); }
  powerup() { [523, 659, 784, 1047].forEach((f, i) => this.tone({ type: "square", f0: f, dur: 0.1, vol: 0.14, at: i * 0.07 })); }
  oneUp() { [660, 880, 990, 1320, 1760].forEach((f, i) => this.tone({ type: "square", f0: f, dur: 0.12, vol: 0.13, at: i * 0.08 })); }
  checkpoint() { this.tone({ type: "sine", f0: 880, f1: 1760, dur: 0.35, vol: 0.18 }); this.tone({ type: "sine", f0: 1318, f1: 2637, dur: 0.4, vol: 0.1, at: 0.08 }); }
  fire() { this.noise({ dur: 0.22, f: 400, slide: 1800, vol: 0.16 }); }
  bossHit() { this.tone({ type: "square", f0: 210, f1: 50, dur: 0.22, vol: 0.22 }); this.noise({ dur: 0.18, f: 1200, slide: 300, vol: 0.2 }); }
  roar() { this.tone({ type: "sawtooth", f0: 90, f1: 38, dur: 0.6, vol: 0.26 }); this.noise({ dur: 0.5, f: 200, slide: 90, vol: 0.18 }); }
  spring() { this.tone({ type: "square", f0: 200, f1: 900, dur: 0.18, vol: 0.15 }); }
  win() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone({ type: "square", f0: f, dur: i === 6 ? 0.5 : 0.12, vol: 0.14, at: i * 0.11 })); }
  lose() { [392, 330, 262, 196].forEach((f, i) => this.tone({ type: "sawtooth", f0: f, f1: f * 0.94, dur: 0.24, vol: 0.14, at: i * 0.17 })); this.tone({ type: "sawtooth", f0: 131, f1: 65, dur: 0.7, vol: 0.16, at: 0.7 }); }
  select() { this.tone({ type: "square", f0: 740, dur: 0.06, vol: 0.1 }); }
  pauseBlip() { this.tone({ type: "square", f0: 500, f1: 320, dur: 0.09, vol: 0.1 }); }

  /* ------- music sequencer ------- */
  playMusic(theme: MusicTheme) {
    if (theme === this.theme) return;
    this.theme = theme;
    this.stopSeq();
    if (!theme || !this.ctx) return;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.seqTimer = window.setInterval(() => this.tick(), 30);
  }

  stopMusic() { this.theme = null; this.stopSeq(); }
  private stopSeq() { if (this.seqTimer !== null) { clearInterval(this.seqTimer); this.seqTimer = null; } }

  private tick() {
    if (!this.ctx || !this.theme) return;
    const def = THEMES[this.theme];
    if (!def) return;
    const spb = 60 / def.tempo / 4;
    while (this.nextTime < this.ctx.currentTime + 0.14) {
      this.schedule(def, this.step, this.nextTime);
      this.nextTime += spb;
      this.step = (this.step + 1) % 32;
    }
  }

  private schedule(def: ThemeDef, s: number, t: number) {
    if (!this.ctx || !this.musicBus) return;
    const at = t - this.ctx.currentTime;
    const bass = def.bass[s];
    if (bass) this.tone({ type: def.bassType, f0: mtof(bass), dur: 0.24, vol: def.bassVol, at: Math.max(0, at), bus: this.musicBus });
    const lead = def.lead[s];
    if (lead) this.tone({ type: def.leadType, f0: mtof(lead), dur: def.leadType === "sine" ? 0.42 : 0.17, vol: def.leadVol, at: Math.max(0, at), bus: this.musicBus });
    if (def.hat[s] && this.noiseBuf) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const g = this.ctx.createGain();
      const hp = this.ctx.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.value = 6000;
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
      src.connect(hp).connect(g).connect(this.musicBus);
      src.start(t); src.stop(t + 0.05);
    }
  }

  destroy() { this.stopSeq(); if (this.ctx) void this.ctx.close(); this.ctx = null; }
}
