import { useEffect, useRef, useState, useCallback } from "react";
import { Engine, type GameEvent, type HudData } from "../game/engine";
import type { LevelDef } from "../game/levels";
import type { CharacterDef } from "../game/characters";
import type { AudioEngine } from "../game/audio";

type Overlay = "none" | "pause" | "clear" | "gameover" | "victory";

interface Props {
  level: LevelDef;
  levelIdx: number;
  initialScore: number;
  initialLives: number;
  char: CharacterDef;
  highScore: number;
  audio: AudioEngine;
  onNext: (score: number, lives: number, coins: number) => void;
  onExit: () => void;
  onRestartRun: () => void;
  onScore: (score: number) => void;
  onVictory: () => void;
}

const HeartIcon = ({ on }: { on: boolean }) => (
  <svg width="16" height="15" viewBox="0 0 16 15" className={on ? "" : "opacity-25"}>
    <path
      d="M8 14 L1.5 7.5 C-0.5 5.5 -0.5 2 2 0.8 C4 0 6 0.8 8 3 C10 0.8 12 0 14 0.8 C16.5 2 16.5 5.5 14.5 7.5 Z"
      fill={on ? "#ff5a5f" : "#fdf3e3"}
      stroke="#0b1f2c"
      strokeWidth="1"
    />
  </svg>
);

const CoinIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15">
    <circle cx="7.5" cy="7.5" r="7" fill="#b8860b" />
    <circle cx="7.5" cy="7.5" r="5.6" fill="#ffc94d" />
    <rect x="6.5" y="4" width="2" height="7" fill="#fff3c4" />
  </svg>
);

const PauseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14">
    <rect x="2" y="1" width="4" height="12" fill="currentColor" />
    <rect x="8" y="1" width="4" height="12" fill="currentColor" />
  </svg>
);

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="3" y="7" width="12" height="9" rx="2" fill="#8d9aa5" />
    <path d="M5.5 7 V5 a3.5 3.5 0 0 1 7 0 V7" stroke="#8d9aa5" strokeWidth="2.4" />
    <circle cx="9" cy="11.5" r="1.6" fill="#0b1f2c" />
  </svg>
);

export default function GameCanvas(props: Props) {
  const { level, levelIdx, audio } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [overlay, setOverlay] = useState<Overlay>("none");
  const overlayRef = useRef<Overlay>("none");
  const [intro, setIntro] = useState(true);
  const [bossBanner, setBossBanner] = useState(false);
  const [lives, setLives] = useState(props.initialLives);
  const [powered, setPowered] = useState(false);
  const [bossHud, setBossHud] = useState({ hp: -1, max: 6 });
  const [stats, setStats] = useState({ score: 0, coins: 0, timeBonus: 0, clearBonus: 0 });
  const [isNewHigh, setIsNewHigh] = useState(false);

  const scoreEl = useRef<HTMLSpanElement>(null);
  const coinEl = useRef<HTMLSpanElement>(null);
  const timeEl = useRef<HTMLSpanElement>(null);
  const progEl = useRef<HTMLDivElement>(null);
  const prevHud = useRef({ lives: -1, power: -1, boss: -2 });

  const setOv = useCallback((o: Overlay) => { overlayRef.current = o; setOverlay(o); }, []);

  // fit the 16:9 stage to whatever space the device gives us
  const zoneRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 960, h: 540 });
  useEffect(() => {
    const el = zoneRef.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      const wMax = Math.max(280, Math.min(r.width - 8, 1100));
      const hMax = Math.max(158, r.height - 8);
      const w = Math.min(wMax, (hMax * 16) / 9);
      setBox({ w: Math.floor(w), h: Math.floor((w * 9) / 16) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener("orientationchange", fit);
    return () => { ro.disconnect(); window.removeEventListener("orientationchange", fit); };
  }, []);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const engine = new Engine(cv, level, {
      levelIdx,
      score: props.initialScore,
      lives: props.initialLives,
      char: props.char,
      audio,
      onHud: (h: HudData) => {
        if (scoreEl.current) scoreEl.current.textContent = String(h.score).padStart(6, "0");
        if (coinEl.current) coinEl.current.textContent = `×${String(h.coins).padStart(2, "0")}`;
        if (timeEl.current) {
          timeEl.current.textContent = String(h.time);
          timeEl.current.style.color = h.time <= 30 ? "#ff5a5f" : "#fdf3e3";
        }
        if (progEl.current) progEl.current.style.width = `${(h.progress * 100).toFixed(1)}%`;
        const pv = prevHud.current;
        if (h.lives !== pv.lives) { pv.lives = h.lives; setLives(h.lives); }
        if (h.power !== pv.power) { pv.power = h.power; setPowered(h.power > 0); }
        if (h.bossHp !== pv.boss) { pv.boss = h.bossHp; setBossHud({ hp: h.bossHp, max: h.bossMax }); }
      },
      onEvent: (e: GameEvent) => {
        if (e.type === "death") return;
        if (e.type === "boss") {
          setBossBanner(true);
          window.setTimeout(() => setBossBanner(false), 2600);
        } else if (e.type === "clear" || e.type === "victory") {
          setStats({
            score: e.score ?? 0, coins: e.coins ?? 0,
            timeBonus: e.timeBonus ?? 0, clearBonus: e.clearBonus ?? 0,
          });
          const newHigh = (e.score ?? 0) > props.highScore;
          setIsNewHigh(newHigh);
          props.onScore(e.score ?? 0);
          if (e.type === "victory") props.onVictory();
          setOv(e.type === "clear" ? "clear" : "victory");
        } else if (e.type === "gameover") {
          setIsNewHigh((e.score ?? 0) > props.highScore);
          props.onScore(e.score ?? 0);
          setStats({ score: e.score ?? 0, coins: e.coins ?? 0, timeBonus: 0, clearBonus: 0 });
          setOv("gameover");
        }
      },
    });
    engineRef.current = engine;
    engine.start();
    const t = window.setTimeout(() => setIntro(false), 2300);

    const down = (ev: KeyboardEvent) => {
      const code = ev.code;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) ev.preventDefault();
      if (ev.repeat) return;
      if (code === "Escape" || code === "KeyP") {
        if (overlayRef.current === "none") { engine.paused = true; engine.clearKeys(); audio.pauseBlip(); setOv("pause"); }
        else if (overlayRef.current === "pause") { engine.paused = false; engine.clearKeys(); audio.pauseBlip(); setOv("none"); }
        return;
      }
      if (code === "Enter") {
        if (overlayRef.current === "clear") props.onNext(engine.score, engine.lives, 0);
        else if (overlayRef.current === "gameover") { engine.retry(); setOv("none"); }
        else if (overlayRef.current === "pause") { engine.paused = false; setOv("none"); }
        return;
      }
      if (overlayRef.current !== "none") return;
      if (code === "ArrowLeft" || code === "KeyA") engine.setKey("left", true);
      else if (code === "ArrowRight" || code === "KeyD") engine.setKey("right", true);
      else if (code === "ArrowDown" || code === "KeyS") engine.setKey("down", true);
      else if (code === "Space" || code === "ArrowUp" || code === "KeyW" || code === "KeyZ") engine.setKey("jump", true);
      else if (code === "ShiftLeft" || code === "ShiftRight" || code === "KeyX") engine.setKey("run", true);
    };
    const up = (ev: KeyboardEvent) => {
      const code = ev.code;
      if (code === "ArrowLeft" || code === "KeyA") engine.setKey("left", false);
      else if (code === "ArrowRight" || code === "KeyD") engine.setKey("right", false);
      else if (code === "ArrowDown" || code === "KeyS") engine.setKey("down", false);
      else if (code === "Space" || code === "ArrowUp" || code === "KeyW" || code === "KeyZ") engine.setKey("jump", false);
      else if (code === "ShiftLeft" || code === "ShiftRight" || code === "KeyX") engine.setKey("run", false);
    };
    const blur = () => {
      engine.clearKeys();
      if (overlayRef.current === "none") { engine.paused = true; setOv("pause"); }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      engine.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, levelIdx]);

  const key = (k: "left" | "right" | "jump" | "run" | "down", v: boolean) => {
    audio.unlock();
    engineRef.current?.setKey(k, v);
  };

  const togglePause = () => {
    const e = engineRef.current;
    if (!e) return;
    if (overlayRef.current === "none") { e.paused = true; audio.pauseBlip(); setOv("pause"); }
    else if (overlayRef.current === "pause") { e.paused = false; audio.pauseBlip(); setOv("none"); }
  };

  const retryLevel = () => { engineRef.current?.retry(); audio.select(); setOv("none"); };

  return (
    <div className="relative w-full h-full flex flex-col bg-ink select-none overflow-hidden">
      {/* ambient backdrop for letterbox areas */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 0%, #123043 0%, #0b1f2c 60%, #071620 100%)" }} />
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="absolute rounded-full bg-cream/50" style={{
            left: `${(i * 47 + 13) % 100}%`, top: `${(i * 31 + 7) % 100}%`, width: 2, height: 2,
            animation: `blinkStep ${2 + (i % 4)}s ease-in-out ${(i % 5) * 0.4}s infinite`,
          }} />
        ))}
      </div>

      {/* ------------ stage zone ------------ */}
      <div
        ref={zoneRef}
        className="relative z-10 flex-1 min-h-0 flex items-center justify-center"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
      >
        <div className="relative overflow-hidden rounded-md sm:rounded-lg border-[3px] sm:border-4 border-[#071620] shadow-[0_10px_0_#071620,0_24px_60px_rgba(0,0,0,0.6)] scanlines" style={{ width: box.w, height: box.h }}>
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* ------------ HUD ------------ */}
        <div className="absolute top-0 left-0 right-0 pointer-events-none">
          <div className="h-[7px] bg-[#071620]/70">
            <div ref={progEl} className="h-full bg-gradient-to-r from-ember to-gold" style={{ width: "0%" }} />
          </div>
          <div className="flex items-start justify-between px-2 sm:px-3 pt-2 pb-1 bg-[#071620]/55">
            <div className="flex items-center gap-2 sm:gap-4">
              <div>
                <div className="px-font text-[7px] sm:text-[8px] text-mint tracking-wider">SCORE</div>
                <span ref={scoreEl} className="px-font text-[10px] sm:text-[13px] text-cream">000000</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 pt-2">
                <CoinIcon />
                <span ref={coinEl} className="px-font text-[9px] sm:text-[11px] text-gold">×00</span>
              </div>
              {powered && (
                <span
                  className="px-font text-[7px] text-gold border-2 border-gold/70 rounded px-1 pt-0.5 mt-2 hidden max-[620px]:inline-block"
                  style={{ animation: "blinkStep 1s infinite" }}
                >
                  PWR
                </span>
              )}
            </div>
            <div className="text-center pt-1 max-[620px]:hidden">
              <div className="px-font text-[9px] text-cream/90">{levelIdx + 1}-{level.name.toUpperCase()}</div>
              {powered && (
                <div className="px-font text-[7px] text-gold mt-1" style={{ animation: "blinkStep 1s infinite" }}>
                  EMBER POWER
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="text-right">
                <div className="px-font text-[7px] sm:text-[8px] text-mint tracking-wider">TIME</div>
                <span ref={timeEl} className="px-font text-[10px] sm:text-[13px] text-cream">{level.time}</span>
              </div>
              <div className="hidden max-[520px]:flex items-center gap-1 pt-2">
                <HeartIcon on />
                <span className="px-font text-[10px] text-cream">×{Math.max(0, lives)}</span>
              </div>
              <div className="flex items-center gap-0.5 pt-2 max-[520px]:hidden">
                {Array.from({ length: Math.max(3, lives) }).slice(0, 6).map((_, i) => (
                  <HeartIcon key={i} on={i < lives} />
                ))}
              </div>
              <button
                onClick={togglePause}
                className="pointer-events-auto text-cream/85 hover:text-gold bg-[#071620]/60 border-2 border-[#071620] rounded p-2 sm:p-1.5 cursor-pointer"
                aria-label="Pause"
              >
                <PauseIcon />
              </button>
            </div>
          </div>
          {bossHud.hp >= 0 && (
            <div className="mt-2 mx-auto w-[68%] sm:w-[46%] anim-slide-down">
              <div className="px-font text-[8px] text-center text-ember mb-1 tracking-widest">MAGMOR</div>
              <div className="h-[10px] bg-[#071620]/80 border-2 border-[#071620] rounded-sm overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-ember2 to-ember transition-[width] duration-300"
                  style={{ width: `${(bossHud.hp / bossHud.max) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ------------ intro banner ------------ */}
        {intro && overlay === "none" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="anim-slide-down text-center bg-[#071620]/80 border-y-4 border-ember px-4 sm:px-10 py-4 sm:py-5 max-w-full">
              <div className="px-font text-[8px] sm:text-[10px] text-mint mb-2 tracking-widest">WORLD {levelIdx + 1}</div>
              <div className="px-font text-[13px] sm:text-[20px] text-cream title-shadow">{level.name.toUpperCase()}</div>
              <div className="font-body text-xs sm:text-sm text-cream/70 mt-2 italic">{level.sub}</div>
            </div>
          </div>
        )}

        {/* ------------ boss banner ------------ */}
        {bossBanner && (
          <div className="absolute inset-x-0 top-1/3 flex justify-center px-3 pointer-events-none">
            <div className="anim-pop text-center bg-[#23080d]/90 border-4 border-ember2 rounded px-4 sm:px-8 py-3 sm:py-4 shadow-[0_6px_0_#071620] max-w-full">
              <div className="px-font text-[11px] sm:text-[16px] text-ember" style={{ textShadow: "0 3px 0 #4a1a0a" }}>
                MAGMOR, THE EMBER KING
              </div>
              <div className="font-body text-xs sm:text-sm text-cream/80 mt-2">Stomp his crown. Mind the flames.</div>
            </div>
          </div>
        )}

        {/* ------------ landscape touch pads ------------ */}
        <div
          className="touch-landscape absolute bottom-3 justify-between pointer-events-none"
          style={{ left: "max(0.75rem, env(safe-area-inset-left))", right: "max(0.75rem, env(safe-area-inset-right))" }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="flex gap-2 pointer-events-auto">
            <button className="btn8 dark !text-[15px] !px-5 !py-4" style={{ touchAction: "none" }} onPointerDown={(e) => { e.preventDefault(); key("left", true); }} onPointerUp={() => key("left", false)} onPointerLeave={() => key("left", false)} onPointerCancel={() => key("left", false)}>&larr;</button>
            <button className="btn8 dark !text-[15px] !px-5 !py-4" style={{ touchAction: "none" }} onPointerDown={(e) => { e.preventDefault(); key("right", true); }} onPointerUp={() => key("right", false)} onPointerLeave={() => key("right", false)} onPointerCancel={() => key("right", false)}>&rarr;</button>
            <button className="btn8 dark !text-[11px] !px-3.5 !py-4" aria-label="Drop through platform" style={{ touchAction: "none" }} onPointerDown={(e) => { e.preventDefault(); key("down", true); }} onPointerUp={() => key("down", false)} onPointerLeave={() => key("down", false)} onPointerCancel={() => key("down", false)}>&darr;</button>
          </div>
          <div className="flex gap-2 pointer-events-auto">
            <button className="btn8 red !text-[9px] !py-4" style={{ touchAction: "none" }} onPointerDown={(e) => { e.preventDefault(); key("run", true); }} onPointerUp={() => key("run", false)} onPointerLeave={() => key("run", false)} onPointerCancel={() => key("run", false)}>RUN</button>
            <button className="btn8 gold !text-[9px] !py-4 !px-5" style={{ touchAction: "none" }} onPointerDown={(e) => { e.preventDefault(); key("jump", true); }} onPointerUp={() => key("jump", false)} onPointerLeave={() => key("jump", false)} onPointerCancel={() => key("jump", false)}>JUMP</button>
          </div>
        </div>

        {/* ------------ overlays ------------ */}
        {overlay === "pause" && (
          <div className="absolute inset-0 bg-[#071620]/78 flex items-center justify-center p-2">
            <div className="panel8 anim-pop px-6 sm:px-10 py-6 sm:py-8 text-center w-[min(340px,94vw)] max-h-full overflow-y-auto no-scrollbar">
              <div className="px-font text-[20px] text-cream mb-1 title-shadow">PAUSED</div>
              <div className="font-body text-sm text-cream/60 mb-6">The embers wait for you.</div>
              <div className="flex flex-col gap-3">
                <button className="btn8" onClick={() => { engineRef.current!.paused = false; audio.select(); setOv("none"); }}>Resume</button>
                <button className="btn8 blue" onClick={retryLevel}>Restart World</button>
                <button className="btn8 dark" onClick={props.onExit}>Quit to Map</button>
              </div>
              <div className="mt-6 text-left space-y-1.5 font-body text-[13px] text-cream/70 hidden sm:block">
                <div><span className="kbd">←→</span> move &nbsp;<span className="kbd">SPACE</span> jump</div>
                <div><span className="kbd">SHIFT</span> run &nbsp;<span className="kbd">↓+JUMP</span> drop</div>
              </div>
            </div>
          </div>
        )}

        {overlay === "clear" && (
          <div className="absolute inset-0 bg-[#071620]/70 flex items-center justify-center p-2">
            <div className="panel8 anim-pop px-6 sm:px-10 py-6 sm:py-8 w-[min(400px,94vw)] max-h-full overflow-y-auto no-scrollbar text-center border-ember" style={{ borderWidth: 4 }}>
              <div className="px-font text-[17px] sm:text-[22px] text-gold title-shadow">WORLD CLEAR!</div>
              <div className="font-body text-sm text-cream/60 mt-1 mb-5">World {levelIdx + 1} — {level.name}</div>
              <div className="space-y-2 font-body text-[15px] text-cream/90 mb-5">
                <div className="flex justify-between anim-slide-up" style={{ animationDelay: "0.15s" }}>
                  <span>Time bonus</span><span className="px-font text-[11px] text-mint pt-0.5">+{stats.timeBonus}</span>
                </div>
                <div className="flex justify-between anim-slide-up" style={{ animationDelay: "0.35s" }}>
                  <span>Clear bonus</span><span className="px-font text-[11px] text-mint pt-0.5">+{stats.clearBonus}</span>
                </div>
                <div className="flex justify-between anim-slide-up border-t-2 border-[#0b1f2c] pt-2" style={{ animationDelay: "0.55s" }}>
                  <span className="font-semibold">Score</span><span className="px-font text-[13px] text-gold pt-0.5">{stats.score}</span>
                </div>
              </div>
              {isNewHigh && <div className="px-font text-[10px] text-ember mb-4" style={{ animation: "blinkStep 0.8s infinite" }}>NEW HIGH SCORE!</div>}
              <button className="btn8 gold w-full" onClick={() => props.onNext(stats.score, engineRef.current?.lives ?? 1, stats.coins)}>
                Next World →
              </button>
            </div>
          </div>
        )}

        {overlay === "gameover" && (
          <div className="absolute inset-0 bg-[#23080d]/85 flex items-center justify-center p-2">
            <div className="panel8 anim-pop px-6 sm:px-10 py-6 sm:py-8 w-[min(400px,94vw)] max-h-full overflow-y-auto no-scrollbar text-center" style={{ borderColor: "#ff5a5f", borderWidth: 4 }}>
              <div className="px-font text-[18px] sm:text-[24px] text-coral title-shadow mb-2">GAME OVER</div>
              <div className="font-body text-sm text-cream/60 mb-5">The forge claims another wanderer…</div>
              <div className="flex justify-center gap-8 mb-6 font-body">
                <div>
                  <div className="px-font text-[8px] text-mint mb-1">SCORE</div>
                  <div className="px-font text-[14px] text-cream">{stats.score}</div>
                </div>
                <div>
                  <div className="px-font text-[8px] text-mint mb-1">BEST</div>
                  <div className="px-font text-[14px] text-gold">{Math.max(props.highScore, stats.score)}</div>
                </div>
              </div>
              {isNewHigh && <div className="px-font text-[10px] text-ember mb-4" style={{ animation: "blinkStep 0.8s infinite" }}>NEW HIGH SCORE!</div>}
              <div className="flex flex-col gap-3">
                <button className="btn8" onClick={retryLevel}>Retry World {levelIdx + 1}</button>
                <button className="btn8 dark" onClick={props.onExit}>Back to Map</button>
              </div>
            </div>
          </div>
        )}

        {overlay === "victory" && (
          <div className="absolute inset-0 bg-[#071620]/80 flex items-center justify-center overflow-hidden p-2">
            {Array.from({ length: 26 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-2.5 h-2.5 rounded-sm"
                style={{
                  left: `${(i * 41) % 100}%`,
                  top: 0,
                  background: ["#ff8c3b", "#ffc94d", "#7be0c3", "#ff5a5f"][i % 4],
                  animation: `confall ${2.4 + (i % 5) * 0.5}s linear ${(i % 8) * 0.3}s infinite`,
                }}
              />
            ))}
            <div className="panel8 anim-pop px-6 sm:px-10 py-6 sm:py-8 w-[min(440px,94vw)] max-h-full overflow-y-auto no-scrollbar text-center relative" style={{ borderColor: "#ffc94d", borderWidth: 4 }}>
              <div className="px-font text-[9px] sm:text-[11px] text-mint mb-2 tracking-widest">THE FORGE FALLS SILENT</div>
              <div className="px-font text-[19px] sm:text-[26px] text-gold title-shadow mb-2">YOU WIN!</div>
              <div className="font-body text-sm sm:text-[15px] text-cream/75 mb-6">
                Magmor crumbles to cold stone. The Pixel Pals' adventure blazes into legend — all five worlds are free.
              </div>
              <div className="flex justify-center gap-8 mb-6 font-body">
                <div>
                  <div className="px-font text-[8px] text-mint mb-1">FINAL SCORE</div>
                  <div className="px-font text-[16px] text-cream">{stats.score}</div>
                </div>
                <div>
                  <div className="px-font text-[8px] text-mint mb-1">BEST</div>
                  <div className="px-font text-[16px] text-gold">{Math.max(props.highScore, stats.score)}</div>
                </div>
              </div>
              {isNewHigh && <div className="px-font text-[10px] text-ember mb-4" style={{ animation: "blinkStep 0.8s infinite" }}>NEW HIGH SCORE!</div>}
              <div className="flex flex-col gap-3">
                <button className="btn8 gold" onClick={props.onRestartRun}>Play Again</button>
                <button className="btn8 dark" onClick={props.onExit}>Back to Map</button>
              </div>
            </div>
          </div>
        )}
        </div>

        {/* footer hint (desktop keyboards only) */}
        <div className="absolute bottom-1 inset-x-0 text-center pointer-events-none hidden md:block [@media(pointer:coarse)]:hidden">
          <span className="font-body text-[12px] text-cream/40">
            <span className="kbd mr-1">←→</span>move <span className="kbd mx-1">SPACE</span>jump
            <span className="kbd mx-1">SHIFT</span>run <span className="kbd mx-1">ESC</span>pause
          </span>
        </div>
      </div>

      {/* ------------ portrait touch deck ------------ */}
      <div
        className="touch-portrait relative z-10 shrink-0 items-center justify-between gap-2 px-4 sm:px-10 py-3"
        style={{
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
          background: "linear-gradient(180deg,#0e2a3a,#071620)",
          borderTop: "3px solid #071620",
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="flex gap-3">
          <button className="btn8 dark !text-[18px] !px-6 !py-5" style={{ touchAction: "none" }} onPointerDown={(e) => { e.preventDefault(); key("left", true); }} onPointerUp={() => key("left", false)} onPointerLeave={() => key("left", false)} onPointerCancel={() => key("left", false)}>&larr;</button>
          <button className="btn8 dark !text-[18px] !px-6 !py-5" style={{ touchAction: "none" }} onPointerDown={(e) => { e.preventDefault(); key("right", true); }} onPointerUp={() => key("right", false)} onPointerLeave={() => key("right", false)} onPointerCancel={() => key("right", false)}>&rarr;</button>
          <button className="btn8 dark !text-[13px] !px-4 !py-5" aria-label="Drop through platform" style={{ touchAction: "none" }} onPointerDown={(e) => { e.preventDefault(); key("down", true); }} onPointerUp={() => key("down", false)} onPointerLeave={() => key("down", false)} onPointerCancel={() => key("down", false)}>&darr;</button>
        </div>
        <div className="px-font text-[7px] text-cream/30 text-center leading-relaxed hidden min-[430px]:block">
          ROTATE FOR A<br />WIDER VIEW
        </div>
        <div className="flex gap-3">
          <button className="btn8 red !text-[10px] !px-5 !py-5" style={{ touchAction: "none" }} onPointerDown={(e) => { e.preventDefault(); key("run", true); }} onPointerUp={() => key("run", false)} onPointerLeave={() => key("run", false)} onPointerCancel={() => key("run", false)}>RUN</button>
          <button className="btn8 gold !text-[10px] !px-7 !py-5" style={{ touchAction: "none" }} onPointerDown={(e) => { e.preventDefault(); key("jump", true); }} onPointerUp={() => key("jump", false)} onPointerLeave={() => key("jump", false)} onPointerCancel={() => key("jump", false)}>JUMP</button>
        </div>
      </div>

      <span className="hidden"><LockIcon /></span>
    </div>
  );
}
