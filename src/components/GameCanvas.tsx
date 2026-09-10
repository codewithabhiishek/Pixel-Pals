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
  scanlines?: boolean;
  touchMode?: "auto" | "on" | "off";
  onToggleScanlines?: () => void;
  onCycleTouchMode?: () => void;
  onNext: (score: number, lives: number, coins: number) => void;
  onExit: () => void;
  onRestartRun: () => void;
  onScore: (score: number) => void;
  onVictory: () => void;
  onOpenFeedback?: (context?: { world?: string; score?: number; levelIdx?: number; heroName?: string; note?: string }) => void;
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

const FullscreenIcon = ({ isFull }: { isFull: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    {isFull ? (
      <path d="M5 1 V5 H1 M11 1 V5 H15 M5 15 V11 H1 M11 15 V11 H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <path d="M1 5 V1 H5 M15 5 V1 H11 M1 11 V15 H5 M15 11 V15 H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    )}
  </svg>
);

export default function GameCanvas(props: Props) {
  const { level, levelIdx, audio, scanlines = true, touchMode = "auto" } = props;
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
  const [isLandscape, setIsLandscape] = useState(false);
  const [isTouchCoarse, setIsTouchCoarse] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Active state visual tracking for touch buttons
  const [activeKeys, setActiveKeys] = useState({ left: false, right: false, down: false, jump: false, run: false });

  const scoreEl = useRef<HTMLSpanElement>(null);
  const coinEl = useRef<HTMLSpanElement>(null);
  const timeEl = useRef<HTMLSpanElement>(null);
  const progEl = useRef<HTMLDivElement>(null);
  const prevHud = useRef({ lives: -1, power: -1, boss: -2 });

  const setOv = useCallback((o: Overlay) => { overlayRef.current = o; setOverlay(o); }, []);

  const toggleFullscreen = useCallback(() => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    } catch {
      /* fullscreen unavailable or blocked */
    }
  }, []);

  // Track orientation, touch capability & fullscreen status
  useEffect(() => {
    const updateEnvironment = () => {
      const coarse = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
      setIsTouchCoarse(!!coarse);
      const vp = window.visualViewport;
      const w = vp ? vp.width : window.innerWidth;
      const h = vp ? vp.height : window.innerHeight;
      setIsLandscape(w > h);
      setIsFullscreen(!!document.fullscreenElement);
    };
    updateEnvironment();
    window.addEventListener("resize", updateEnvironment);
    window.addEventListener("orientationchange", updateEnvironment);
    document.addEventListener("fullscreenchange", updateEnvironment);
    window.visualViewport?.addEventListener("resize", updateEnvironment);
    return () => {
      window.removeEventListener("resize", updateEnvironment);
      window.removeEventListener("orientationchange", updateEnvironment);
      document.removeEventListener("fullscreenchange", updateEnvironment);
      window.visualViewport?.removeEventListener("resize", updateEnvironment);
    };
  }, []);

  // True ONLY for mobile, iPads, iPhones, and Android touch devices
  // On laptops and desktops, this returns false so touch d-pad is NOT shown
  const isMobileOrTabletDevice = () => {
    if (typeof window === "undefined") return false;
    const ua = navigator.userAgent || "";
    const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isCoarseOnly = window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(pointer: fine)").matches;
    return isMobileUA || isCoarseOnly;
  };

  const showTouchControls = touchMode === "on" || (touchMode === "auto" && isMobileOrTabletDevice());

  // Responsive stage sizing with large-screen & fullscreen scaling
  const zoneRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 960, h: 540 });

  useEffect(() => {
    const el = zoneRef.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      const isFs = !!document.fullscreenElement;
      const isNarrow = r.width < 540;
      // On narrow mobile portrait screens, use edge-to-edge canvas width
      const padW = isFs ? 4 : (isNarrow ? 4 : 12);
      const padH = isFs ? 4 : (isNarrow ? 6 : 12);
      const wMax = Math.max(260, r.width - padW);
      const hMax = Math.max(150, r.height - padH);
      const w = Math.min(wMax, (hMax * 16) / 9);
      setBox({ w: Math.floor(w), h: Math.floor((w * 9) / 16) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener("orientationchange", fit);
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", fit);
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
    };
  }, [isFullscreen, isLandscape]);

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

      // 'F' key toggles Fullscreen / zoom for big screens and laptops
      if (code === "KeyF") {
        toggleFullscreen();
        return;
      }

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
  }, [level, levelIdx, toggleFullscreen]);

  const key = (k: "left" | "right" | "jump" | "run" | "down", v: boolean) => {
    audio.unlock();
    setActiveKeys((prev) => ({ ...prev, [k]: v }));
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
    <div className="relative w-full h-full flex flex-col bg-ink select-none overflow-hidden font-body">
      {/* ambient starfield background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 0%, #123043 0%, #0b1f2c 60%, #071620 100%)" }} />
        {Array.from({ length: 22 }).map((_, i) => (
          <div key={i} className="absolute rounded-full bg-cream/45" style={{
            left: `${(i * 47 + 13) % 100}%`, top: `${(i * 31 + 7) % 100}%`, width: 2, height: 2,
            animation: `blinkStep ${2 + (i % 4)}s ease-in-out ${(i % 5) * 0.4}s infinite`,
          }} />
        ))}
      </div>

      {/* ------------ stage zone ------------ */}
      <div
        ref={zoneRef}
        className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center p-1 sm:p-2"
        style={{
          paddingTop: "max(0.25rem, env(safe-area-inset-top))",
          paddingLeft: "max(0.25rem, env(safe-area-inset-left))",
          paddingRight: "max(0.25rem, env(safe-area-inset-right))",
        }}
      >
        {/* Mobile Portrait Rotation Helper */}
        {showTouchControls && !isLandscape && (
          <div className="mb-1 flex items-center gap-1.5 px-3 py-1 bg-[#123043]/90 border border-[#27556f] rounded-full text-cream/80 text-[10px] sm:text-[11px] font-body shadow-sm">
            <span className="text-gold text-xs">🔄</span>
            <span>Tip: Rotate phone sideways for widescreen arcade</span>
          </div>
        )}

        <div
          className={`relative overflow-hidden rounded-md sm:rounded-lg border-[3px] sm:border-4 border-[#071620] shadow-[0_10px_0_#071620,0_24px_60px_rgba(0,0,0,0.6)] ${scanlines ? "scanlines" : ""}`}
          style={{ width: box.w, height: box.h }}
        >
          <canvas ref={canvasRef} className="w-full h-full block touch-none select-none" />

          {/* ------------ HUD ------------ */}
          <div className="absolute top-0 left-0 right-0 pointer-events-none z-30">
            <div className="h-[7px] bg-[#071620]/75">
              <div ref={progEl} className="h-full bg-gradient-to-r from-ember to-gold" style={{ width: "0%" }} />
            </div>
            <div className="flex items-start justify-between px-2 sm:px-3 pt-2 pb-1.5 bg-[#071620]/65 backdrop-blur-[2px]">
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
                    className="px-font text-[7px] text-gold border-2 border-gold/70 rounded px-1 pt-0.5 mt-2 inline-block anim-shimmer"
                  >
                    EMBER
                  </span>
                )}
              </div>
              <div className="text-center pt-0.5">
                <div className="px-font text-[8px] sm:text-[10px] text-cream/95">W{levelIdx + 1}: {level.name.toUpperCase()}</div>
                <div className="font-body text-[10px] sm:text-[11px] text-cream/60 hidden sm:block italic">{level.sub}</div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="text-right">
                  <div className="px-font text-[7px] sm:text-[8px] text-mint tracking-wider">TIME</div>
                  <span ref={timeEl} className="px-font text-[10px] sm:text-[13px] text-cream">{level.time}</span>
                </div>
                <div className="flex items-center gap-1 pt-1.5">
                  <HeartIcon on />
                  <span className="px-font text-[10px] text-cream">×{Math.max(0, lives)}</span>
                </div>

                {/* Fullscreen / Zoom Button */}
                <button
                  onClick={toggleFullscreen}
                  className="pointer-events-auto text-cream/85 hover:text-gold bg-[#071620]/80 border-2 border-[#123043] rounded p-2 sm:p-1.5 cursor-pointer active:translate-y-0.5"
                  aria-label={isFullscreen ? "Exit Zoom / Fullscreen (F)" : "Zoom Screen / Fullscreen (F)"}
                  title={isFullscreen ? "Exit Fullscreen (F)" : "Zoom Screen / Fullscreen (F)"}
                >
                  <FullscreenIcon isFull={isFullscreen} />
                </button>

                {/* Pause Button */}
                <button
                  onClick={togglePause}
                  className="pointer-events-auto text-cream/85 hover:text-gold bg-[#071620]/80 border-2 border-[#123043] rounded p-2 sm:p-1.5 cursor-pointer active:translate-y-0.5"
                  aria-label="Pause game"
                  title="Pause game"
                >
                  <PauseIcon />
                </button>
              </div>
            </div>

            {/* Boss segmented health bar */}
            {bossHud.hp >= 0 && (
              <div className="mt-2 mx-auto w-[82%] sm:w-[50%] anim-slide-down bg-[#123043]/95 border-2 border-ember2 rounded-md p-2 shadow-xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="px-font text-[8px] text-ember tracking-widest flex items-center gap-1">
                    MAGMOR - EMBER KING
                  </span>
                  <span className={`px-font text-[7px] ${bossHud.hp <= 2 ? "text-[#ff3b30] animate-pulse font-bold" : bossHud.hp <= 4 ? "text-gold" : "text-mint"}`}>
                    {bossHud.hp <= 2 ? "⚡ PHASE 3: BERSERK" : bossHud.hp <= 4 ? "🔥 PHASE 2: STEAM CHARGE" : "🛡️ PHASE 1: TITAN"}
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-1.5 h-3.5">
                  {Array.from({ length: bossHud.max }).map((_, idx) => {
                    const isFilled = idx < bossHud.hp;
                    let pipColor = "bg-[#071620]/80";
                    if (isFilled) {
                      if (idx < 2) pipColor = "bg-gradient-to-t from-[#ff3b30] to-[#ff9500] animate-pulse";
                      else if (idx < 4) pipColor = "bg-gradient-to-t from-ember2 to-gold";
                      else pipColor = "bg-gradient-to-t from-[#3fae8c] to-mint";
                    }
                    return (
                      <div
                        key={idx}
                        className={`h-full rounded border border-[#071620] transition-all duration-300 ${pipColor}`}
                        title={`Heart ${idx + 1}`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ------------ intro banner ------------ */}
          {intro && overlay === "none" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
              <div className="anim-slide-down text-center bg-[#071620]/85 border-y-4 border-ember px-4 sm:px-10 py-4 sm:py-5 max-w-[92vw]">
                <div className="px-font text-[8px] sm:text-[10px] text-mint mb-2 tracking-widest">WORLD {levelIdx + 1}</div>
                <div className="px-font text-[14px] sm:text-[22px] text-cream title-shadow">{level.name.toUpperCase()}</div>
                <div className="font-body text-xs sm:text-sm text-cream/75 mt-2 italic">{level.sub}</div>
              </div>
            </div>
          )}

          {/* ------------ boss banner ------------ */}
          {bossBanner && (
            <div className="absolute inset-x-0 top-1/3 flex justify-center px-3 pointer-events-none z-30">
              <div className="anim-pop text-center bg-[#23080d]/92 border-4 border-ember2 rounded px-4 sm:px-8 py-3 sm:py-4 shadow-[0_6px_0_#071620] max-w-full">
                <div className="px-font text-[11px] sm:text-[16px] text-ember" style={{ textShadow: "0 3px 0 #4a1a0a" }}>
                  MAGMOR, THE EMBER KING
                </div>
                <div className="font-body text-xs sm:text-sm text-cream/85 mt-2">Stomp his crown from above. Mind the shockwaves!</div>
              </div>
            </div>
          )}
        </div>

        {/* Floating Landscape Touch Wings (Left & Right) - Visible ONLY on phones/tablets */}
        {showTouchControls && isLandscape && (
          <>
            {/* Left wing: D-Pad */}
            <div
              className="fixed left-3 bottom-5 z-40 flex gap-2.5 pointer-events-auto select-none touch-none"
              style={{ paddingLeft: "env(safe-area-inset-left)", touchAction: "none" }}
              onContextMenu={(e) => e.preventDefault()}
            >
              <button
                className={`touch-btn bg-[#1d4258]/85 text-cream text-[22px] w-15 h-15 select-none touch-none ${activeKeys.left ? "active bg-[#27556f]" : ""}`}
                aria-label="Move left"
                onPointerDown={(e) => { e.preventDefault(); key("left", true); }}
                onPointerUp={(e) => { e.preventDefault(); key("left", false); }}
                onPointerLeave={() => key("left", false)}
                onPointerCancel={() => key("left", false)}
                onContextMenu={(e) => e.preventDefault()}
              >
                &larr;
              </button>
              <button
                className={`touch-btn bg-[#1d4258]/85 text-cream text-[22px] w-15 h-15 select-none touch-none ${activeKeys.right ? "active bg-[#27556f]" : ""}`}
                aria-label="Move right"
                onPointerDown={(e) => { e.preventDefault(); key("right", true); }}
                onPointerUp={(e) => { e.preventDefault(); key("right", false); }}
                onPointerLeave={() => key("right", false)}
                onPointerCancel={() => key("right", false)}
                onContextMenu={(e) => e.preventDefault()}
              >
                &rarr;
              </button>
            </div>

            {/* Right wing: Action Buttons */}
            <div
              className="fixed right-3 bottom-5 z-40 flex gap-3 pointer-events-auto select-none touch-none"
              style={{ paddingRight: "env(safe-area-inset-right)", touchAction: "none" }}
              onContextMenu={(e) => e.preventDefault()}
            >
              <button
                className={`touch-btn bg-[#e04f4f]/85 text-cream text-[10px] px-5 h-14 select-none touch-none ${activeKeys.run ? "active bg-[#ef6161]" : ""}`}
                aria-label="Run"
                onPointerDown={(e) => { e.preventDefault(); key("run", true); }}
                onPointerUp={(e) => { e.preventDefault(); key("run", false); }}
                onPointerLeave={() => key("run", false)}
                onPointerCancel={() => key("run", false)}
                onContextMenu={(e) => e.preventDefault()}
              >
                RUN
              </button>
              <button
                className={`touch-btn bg-[#e8a92f]/90 text-[#241505] text-[11px] px-6 h-14 select-none touch-none ${activeKeys.jump ? "active bg-[#f7bd4a]" : ""}`}
                aria-label="Jump"
                onPointerDown={(e) => { e.preventDefault(); key("jump", true); }}
                onPointerUp={(e) => { e.preventDefault(); key("jump", false); }}
                onPointerLeave={() => key("jump", false)}
                onPointerCancel={() => key("jump", false)}
                onContextMenu={(e) => e.preventDefault()}
              >
                JUMP
              </button>
            </div>
          </>
        )}
      </div>

      {/* ------------ Fullscreen In-Game Overlays (Never cropped by 16:9 canvas box) ------------ */}
      {overlay === "pause" && (
        <div className="fixed inset-0 bg-[#071620]/85 backdrop-blur-[3px] flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="panel8 anim-pop px-5 sm:px-8 py-5 sm:py-6 text-center w-[min(400px,94vw)] max-h-[88vh] overflow-y-auto no-scrollbar my-auto shadow-2xl">
            <div className="px-font text-[18px] sm:text-[22px] text-cream mb-1 title-shadow">PAUSED</div>
            <div className="font-body text-xs sm:text-sm text-cream/60 mb-4 sm:mb-5">Take a breather, hero.</div>
            <div className="flex flex-col gap-2.5">
              <button
                className="btn8 gold w-full !py-2.5 !text-[11px] sm:!text-[12px] flex items-center justify-center gap-2 whitespace-nowrap"
                onClick={() => { engineRef.current!.paused = false; audio.select(); setOv("none"); }}
              >
                <span>▶</span>
                <span>Resume</span>
              </button>
              <button
                className="btn8 w-full !py-2.5 !text-[11px] sm:!text-[12px] flex items-center justify-center gap-2 whitespace-nowrap"
                onClick={toggleFullscreen}
              >
                <span>🖥️</span>
                <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}{!isMobileOrTabletDevice() ? " (F)" : ""}</span>
              </button>
              <button
                className="btn8 blue w-full !py-2.5 !text-[11px] sm:!text-[12px] flex items-center justify-center gap-2 whitespace-nowrap"
                onClick={retryLevel}
              >
                <span>🔄</span>
                <span>Restart World</span>
              </button>
              {props.onToggleScanlines && (
                <button
                  className="btn8 dark w-full !py-2.5 !text-[11px] sm:!text-[12px] flex items-center justify-center gap-2 whitespace-nowrap"
                  onClick={props.onToggleScanlines}
                >
                  <span>📺</span>
                  <span>Scanlines: {scanlines ? "ON" : "OFF"}</span>
                </button>
              )}
              {props.onCycleTouchMode && (
                <button
                  className="btn8 dark w-full !py-2.5 !text-[11px] sm:!text-[12px] flex items-center justify-center gap-2 whitespace-nowrap"
                  onClick={props.onCycleTouchMode}
                >
                  <span>🎮</span>
                  <span>Touch Deck: {touchMode.toUpperCase()}</span>
                </button>
              )}
              <button
                className="btn8 red w-full !py-2.5 !text-[11px] sm:!text-[12px] flex items-center justify-center gap-2 whitespace-nowrap"
                onClick={props.onExit}
              >
                <span>🚪</span>
                <span>Quit to Map</span>
              </button>
            </div>

            {/* Desktop / Laptop Keyboard Shortcuts Guide (Hidden on iPad/tablets/phones where touch is used) */}
            {!isMobileOrTabletDevice() && (
              <div className="mt-4 text-center space-y-1.5 font-body text-[11px] text-cream/75 border-t-2 border-[#0b1f2c] pt-3">
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <span><span className="kbd">←→</span> Move</span>
                  <span><span className="kbd">SPACE</span> Jump</span>
                </div>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <span><span className="kbd">SHIFT</span> Run</span>
                  <span><span className="kbd">F</span> Fullscreen</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {overlay === "clear" && (
        <div className="fixed inset-0 bg-[#071620]/85 backdrop-blur-[3px] flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="panel8 anim-pop px-5 sm:px-8 py-5 sm:py-7 w-[min(420px,94vw)] max-h-[88vh] overflow-y-auto no-scrollbar text-center border-ember my-auto shadow-2xl" style={{ borderWidth: 4 }}>
            <div className="px-font text-[17px] sm:text-[22px] text-gold title-shadow">WORLD CLEAR!</div>
            <div className="font-body text-xs sm:text-sm text-cream/60 mt-1 mb-4">World {levelIdx + 1} — {level.name}</div>
            <div className="space-y-2 font-body text-[14px] sm:text-[15px] text-cream/90 mb-5">
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
            {isNewHigh && <div className="px-font text-[10px] text-ember mb-4 anim-shimmer">NEW HIGH SCORE!</div>}
            <button className="btn8 gold w-full !py-2.5 text-xs sm:text-sm" onClick={() => props.onNext(stats.score, engineRef.current?.lives ?? 1, stats.coins)}>
              Next World →
            </button>
            <div className="mt-3.5 pt-2.5 border-t border-[#123043] flex items-center justify-center">
              <button
                type="button"
                onClick={() =>
                  props.onOpenFeedback?.({
                    world: `${level.name} (World ${levelIdx + 1})`,
                    score: stats.score,
                    levelIdx,
                    heroName: props.char.name,
                    note: "Completed World",
                  })
                }
                className="inline-flex items-center gap-1.5 text-xs text-cream/70 hover:text-gold transition-colors cursor-pointer py-1 px-2.5 rounded hover:bg-[#123043]/70 active:translate-y-0.5"
              >
                <span className="text-mint text-[11px]">💡</span>
                <span className="font-body text-[12px] underline underline-offset-3">
                  Have a suggestion or spotted a bug in World {levelIdx + 1}?
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {overlay === "gameover" && (
        <div className="fixed inset-0 bg-[#23080d]/90 backdrop-blur-[3px] flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="panel8 anim-pop px-5 sm:px-8 py-5 sm:py-7 w-[min(400px,94vw)] max-h-[88vh] overflow-y-auto no-scrollbar text-center my-auto shadow-2xl" style={{ borderColor: "#ff5a5f", borderWidth: 4 }}>
            <div className="px-font text-[18px] sm:text-[24px] text-coral title-shadow mb-2">GAME OVER</div>
            <div className="font-body text-xs sm:text-sm text-cream/60 mb-4">Paws down, but heroes always rise again.</div>
            <div className="flex justify-center gap-8 mb-5 font-body">
              <div>
                <div className="px-font text-[8px] text-mint mb-1">SCORE</div>
                <div className="px-font text-[14px] text-cream">{stats.score}</div>
              </div>
              <div>
                <div className="px-font text-[8px] text-mint mb-1">BEST</div>
                <div className="px-font text-[14px] text-gold">{Math.max(props.highScore, stats.score)}</div>
              </div>
            </div>
            {isNewHigh && <div className="px-font text-[10px] text-ember mb-4 anim-shimmer">NEW HIGH SCORE!</div>}
            <div className="flex flex-col gap-2.5">
              <button className="btn8 gold !py-2.5 text-xs sm:text-sm" onClick={retryLevel}>Retry World {levelIdx + 1}</button>
              <button className="btn8 dark !py-2 text-xs" onClick={props.onExit}>Back to Map</button>
            </div>
          </div>
        </div>
      )}

      {overlay === "victory" && (
        <div className="fixed inset-0 bg-[#071620]/90 backdrop-blur-[3px] flex items-center justify-center overflow-hidden p-3 sm:p-4 z-50">
          {Array.from({ length: 30 }).map((_, i) => (
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
          <div className="panel8 anim-pop px-5 sm:px-8 py-5 sm:py-7 w-[min(460px,94vw)] max-h-[88vh] overflow-y-auto no-scrollbar text-center relative my-auto shadow-2xl" style={{ borderColor: "#ffc94d", borderWidth: 4 }}>
            <div className="px-font text-[9px] sm:text-[11px] text-mint mb-2 tracking-widest">THE FORGE FALLS SILENT</div>
            <div className="px-font text-[18px] sm:text-[26px] text-gold title-shadow mb-2">VICTORY!</div>
            <div className="font-body text-xs sm:text-sm text-cream/80 mb-5 leading-relaxed">
              Magmor crumbles to cold stone. The Pixel Pals' journey blazes into legend — all five worlds are freed!
            </div>
            <div className="flex justify-center gap-8 mb-5 font-body">
              <div>
                <div className="px-font text-[8px] text-mint mb-1">FINAL SCORE</div>
                <div className="px-font text-[15px] text-cream">{stats.score}</div>
              </div>
              <div>
                <div className="px-font text-[8px] text-mint mb-1">BEST</div>
                <div className="px-font text-[15px] text-gold">{Math.max(props.highScore, stats.score)}</div>
              </div>
            </div>
            {isNewHigh && <div className="px-font text-[10px] text-ember mb-4 anim-shimmer">NEW HIGH SCORE!</div>}
            <div className="flex flex-col gap-2.5">
              <button className="btn8 gold !py-2.5 text-xs sm:text-sm" onClick={props.onRestartRun}>Play Adventure Again</button>
              <button
                className="btn8 mint !py-2.5 text-xs sm:text-sm flex items-center justify-center gap-2"
                onClick={() =>
                  props.onOpenFeedback?.({
                    world: "All 5 Worlds Cleared",
                    score: stats.score,
                    levelIdx: 4,
                    heroName: props.char.name,
                    note: "Game Victory!",
                  })
                }
              >
                <span>💡</span>
                <span>Suggestions & Review</span>
              </button>
              <button className="btn8 dark !py-2 text-xs" onClick={props.onExit}>Back to World Map</button>
            </div>
          </div>
        </div>
      )}

      {/* ------------ Portrait Touch Deck - Visible ONLY on phones/tablets ------------ */}
      {showTouchControls && !isLandscape && (
        <div
          className="relative z-30 shrink-0 flex items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-3 border-t-4 border-[#071620] touch-none select-none"
          style={{
            paddingBottom: "max(1.1rem, calc(env(safe-area-inset-bottom) + 0.6rem))",
            background: "linear-gradient(180deg,#123043 0%,#071620 100%)",
            touchAction: "none",
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="flex gap-2.5 sm:gap-3 touch-none select-none">
            <button
              className={`touch-btn bg-[#1d4258] text-cream text-[22px] w-16 h-14 select-none touch-none ${activeKeys.left ? "active bg-[#27556f]" : ""}`}
              aria-label="Move left"
              onPointerDown={(e) => { e.preventDefault(); key("left", true); }}
              onPointerUp={(e) => { e.preventDefault(); key("left", false); }}
              onPointerLeave={() => key("left", false)}
              onPointerCancel={() => key("left", false)}
              onContextMenu={(e) => e.preventDefault()}
            >
              &larr;
            </button>
            <button
              className={`touch-btn bg-[#1d4258] text-cream text-[22px] w-16 h-14 select-none touch-none ${activeKeys.right ? "active bg-[#27556f]" : ""}`}
              aria-label="Move right"
              onPointerDown={(e) => { e.preventDefault(); key("right", true); }}
              onPointerUp={(e) => { e.preventDefault(); key("right", false); }}
              onPointerLeave={() => key("right", false)}
              onPointerCancel={() => key("right", false)}
              onContextMenu={(e) => e.preventDefault()}
            >
              &rarr;
            </button>
          </div>

          <div className="px-font text-[7px] text-cream/40 text-center leading-relaxed hidden sm:block select-none pointer-events-none">
            ROTATE FOR<br />WIDE VIEW
          </div>

          <div className="flex gap-2 sm:gap-3 touch-none select-none">
            <button
              className={`touch-btn bg-[#e04f4f] text-cream text-[10px] px-4 sm:px-5 h-14 select-none touch-none ${activeKeys.run ? "active bg-[#ef6161]" : ""}`}
              aria-label="Run"
              onPointerDown={(e) => { e.preventDefault(); key("run", true); }}
              onPointerUp={(e) => { e.preventDefault(); key("run", false); }}
              onPointerLeave={() => key("run", false)}
              onPointerCancel={() => key("run", false)}
              onContextMenu={(e) => e.preventDefault()}
            >
              RUN
            </button>
            <button
              className={`touch-btn bg-[#e8a92f] text-[#241505] text-[11px] px-6 sm:px-7 h-14 select-none touch-none ${activeKeys.jump ? "active bg-[#f7bd4a]" : ""}`}
              aria-label="Jump"
              onPointerDown={(e) => { e.preventDefault(); key("jump", true); }}
              onPointerUp={(e) => { e.preventDefault(); key("jump", false); }}
              onPointerLeave={() => key("jump", false)}
              onPointerCancel={() => key("jump", false)}
              onContextMenu={(e) => e.preventDefault()}
            >
              JUMP
            </button>
          </div>
        </div>
      )}

      {/* Desktop footer keyboard helper (hidden on coarse touch devices) */}
      {!showTouchControls && (
        <div className="relative z-20 pb-2 text-center pointer-events-none hidden md:block">
          <span className="font-body text-[12px] text-cream/50">
            <span className="kbd mr-1">←→</span> move &nbsp;
            <span className="kbd mx-1">SPACE / Z</span> jump &nbsp;
            <span className="kbd mx-1">SHIFT / X</span> run &nbsp;
            <span className="kbd mx-1">F</span> zoom/fullscreen &nbsp;
            <span className="kbd mx-1">ESC / P</span> pause
          </span>
        </div>
      )}
    </div>
  );
}
