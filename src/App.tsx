import { useEffect, useRef, useState, useCallback } from "react";
import GameCanvas from "./components/GameCanvas";
import { AudioEngine } from "./game/audio";
import { LEVELS, THEMES } from "./game/levels";
import { CHARACTERS, getCharacter, type CharacterDef } from "./game/characters";

/* ---------------- save data ---------------- */
interface SaveData {
  high: number;
  unlocked: number;
  cleared: boolean[];
  sfx: boolean;
  music: boolean;
  char: string;
  scanlines: boolean;
  touchMode: "auto" | "on" | "off";
}

const SAVE_KEY = "emberfox_save_v2";
const defaultSave: SaveData = {
  high: 0,
  unlocked: 1,
  cleared: [false, false, false, false, false],
  sfx: true,
  music: true,
  char: "ember",
  scanlines: true,
  touchMode: "auto",
};

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY) ?? localStorage.getItem("emberfox_save_v1");
    if (!raw) return defaultSave;
    const p = JSON.parse(raw) as Partial<SaveData>;
    return {
      high: typeof p.high === "number" ? p.high : 0,
      unlocked: typeof p.unlocked === "number" ? Math.min(5, Math.max(1, p.unlocked)) : 1,
      cleared: Array.isArray(p.cleared) && p.cleared.length === 5 ? p.cleared.map(Boolean) : defaultSave.cleared,
      sfx: p.sfx !== false,
      music: p.music !== false,
      char: typeof p.char === "string" && CHARACTERS.some((c) => c.id === p.char) ? p.char : "ember",
      scanlines: p.scanlines !== false,
      touchMode: p.touchMode === "on" || p.touchMode === "off" ? p.touchMode : "auto",
    };
  } catch {
    return defaultSave;
  }
}

/* ---------------- SVG icons ---------------- */
const PlayIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 1 L11 6 L2 11 Z" fill="currentColor" /></svg>
);
const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1.5 6.5 L4.5 9.5 L10.5 2.5" stroke="#241505" strokeWidth="2.4" fill="none" strokeLinecap="round" /></svg>
);
const BackIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12"><path d="M8 1 L3 6 L8 11" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" /></svg>
);
const SoundIcon = ({ on }: { on: boolean }) => (
  <svg width="15" height="15" viewBox="0 0 16 16">
    <path d="M2 6 H5 L9 2.5 V13.5 L5 10 H2 Z" fill="currentColor" />
    {on ? (
      <path d="M11 5 C12.6 6.6 12.6 9.4 11 11 M13 3.4 C15.4 5.8 15.4 10.2 13 12.6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    ) : (
      <path d="M11 6 L15 10 M15 6 L11 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    )}
  </svg>
);
const CrtIcon = ({ on }: { on: boolean }) => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="3" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M6 14 L10 14 M8 12 L8 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    {on && <line x1="4" y1="6" x2="12" y2="6" stroke="currentColor" strokeWidth="1" strokeDasharray="1 1" />}
  </svg>
);
const GamepadIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="4.5" width="13" height="8" rx="3" stroke="currentColor" strokeWidth="1.5" />
    <path d="M4 8.5 H6 M5 7.5 V9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="10.5" cy="8.5" r="0.8" fill="currentColor" />
    <circle cx="12" cy="7.5" r="0.8" fill="currentColor" />
  </svg>
);
const FullscreenIcon = ({ isFull }: { isFull: boolean }) => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    {isFull ? (
      <path d="M5 1 V5 H1 M11 1 V5 H15 M5 15 V11 H1 M11 15 V11 H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <path d="M1 5 V1 H5 M15 5 V1 H11 M1 11 V15 H5 M15 11 V15 H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    )}
  </svg>
);

const FoxMascot = () => (
  <svg width="220" height="200" viewBox="0 0 210 190" className="drop-shadow-[0_12px_0_rgba(0,0,0,0.3)] select-none pointer-events-none">
    {/* tail with flame flicker */}
    <g className="origin-[40px_148px] animate-[flameFlicker_3.2s_ease-in-out_infinite]">
      <path d="M30 150 Q4 138 10 112 Q26 122 40 118 Q34 138 44 148 Z" fill="#e0702a" />
      <circle cx="13" cy="117" r="9" fill="#fdf3e3" />
      <path d="M14 112 Q6 100 14 90 Q16 102 24 104 Q18 108 14 112 Z" fill="#ff7a2f" />
    </g>
    {/* body */}
    <rect x="40" y="106" width="86" height="62" rx="26" fill="#ff8c3b" />
    <ellipse cx="88" cy="146" rx="26" ry="17" fill="#fdf3e3" />
    {/* head */}
    <circle cx="120" cy="78" r="46" fill="#ff8c3b" />
    {/* ears with subtle twitch */}
    <g className="origin-[120px_78px]">
      <path d="M84 48 L74 6 L110 34 Z" fill="#ff8c3b" />
      <path d="M156 48 L166 6 L130 34 Z" fill="#ff8c3b" />
      <path d="M82 40 L77 16 L99 33 Z" fill="#3c1c0c" />
      <path d="M158 40 L163 16 L141 33 Z" fill="#3c1c0c" />
    </g>
    {/* muzzle */}
    <ellipse cx="138" cy="92" rx="20" ry="14" fill="#fdf3e3" />
    <circle cx="150" cy="87" r="5" fill="#3c1c0c" />
    {/* eyes */}
    <circle cx="106" cy="72" r="9" fill="#fdf3e3" />
    <circle cx="140" cy="72" r="9" fill="#fdf3e3" />
    <circle cx="109" cy="73" r="4.6" fill="#12262e" />
    <circle cx="143" cy="73" r="4.6" fill="#12262e" />
    <circle cx="110.6" cy="71" r="1.6" fill="#ffffff" />
    <circle cx="144.6" cy="71" r="1.6" fill="#ffffff" />
    {/* scarf */}
    <path d="M88 108 Q120 122 152 108 L152 120 Q120 134 88 120 Z" fill="#ff5a5f" />
    <path d="M92 116 Q76 132 68 148 L82 150 Q88 134 98 124 Z" fill="#ff5a5f" />
    {/* feet */}
    <rect x="54" y="160" width="20" height="14" rx="6" fill="#c65f22" />
    <rect x="94" y="160" width="20" height="14" rx="6" fill="#c65f22" />
  </svg>
);

const FloatingIsland = () => (
  <div className="relative flex flex-col items-center select-none pointer-events-none">
    {/* Floating Coin near character's shoulder */}
    <div className="absolute -top-3 right-3 flex flex-col items-center anim-float z-20">
      <div className="w-7 h-7 rounded-full bg-gradient-to-b from-[#ffd23f] to-[#e8a92f] border-2 border-[#0b1f2c] shadow-[0_2px_0_#071620] flex items-center justify-center anim-coin-spin">
        <div className="w-3.5 h-3.5 rounded-full border border-[#b8860b] flex items-center justify-center font-bold text-[7px] text-[#8a5a00]">
          ◆
        </div>
      </div>
      <span className="px-font text-[6.5px] text-gold mt-1 drop-shadow">100 PTS</span>
    </div>

    {/* Mascot with gentle breathing */}
    <div className="anim-breathe relative z-10">
      <FoxMascot />
    </div>

    {/* Floating Pixel Island Stage */}
    <div className="relative -mt-6 w-[230px] flex flex-col items-center">
      {/* Ground contact shadow */}
      <div className="w-28 h-3 rounded-full bg-[#071620]/60 -mb-2 z-10 blur-[1px]" />

      {/* Grass Top Layer with jagged pixel overhangs */}
      <div className="w-full h-5 bg-[#5cc257] border-2 border-[#0b1f2c] rounded-t-md relative z-10 shadow-[inset_0_2px_0_rgba(255,255,255,0.4)]">
        <div className="absolute -bottom-2 left-3 w-3.5 h-2 bg-[#5cc257] border-b-2 border-x-2 border-[#0b1f2c]" />
        <div className="absolute -bottom-3 left-12 w-4 h-3 bg-[#5cc257] border-b-2 border-x-2 border-[#0b1f2c]" />
        <div className="absolute -bottom-2.5 left-24 w-3.5 h-2.5 bg-[#5cc257] border-b-2 border-x-2 border-[#0b1f2c]" />
        <div className="absolute -bottom-3 right-10 w-4 h-3 bg-[#5cc257] border-b-2 border-x-2 border-[#0b1f2c]" />
        <div className="absolute -bottom-2 right-22 w-3 h-2 bg-[#5cc257] border-b-2 border-x-2 border-[#0b1f2c]" />
      </div>

      {/* Earth Dirt Block with rock flecks & dangling vine */}
      <div className="w-[92%] h-12 bg-[#a5683f] border-x-2 border-b-2 border-[#0b1f2c] rounded-b-lg relative overflow-hidden shadow-[0_8px_0_#071620,0_16px_24px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-x-0 top-0 h-2.5 bg-[#86512f]" />
        {/* Pixel rock details */}
        <div className="absolute top-4 left-5 w-2.5 h-2 bg-[#86512f] rounded-[1px]" />
        <div className="absolute top-6 left-16 w-3 h-2.5 bg-[#5a341d] rounded-[1px]" />
        <div className="absolute top-4 right-8 w-3 h-2 bg-[#86512f] rounded-[1px]" />
        <div className="absolute bottom-1 right-20 w-2 h-1.5 bg-[#5a341d] rounded-[1px]" />
        {/* Hanging pixel vine */}
        <div className="absolute top-1 left-14 w-2 h-7 bg-[#3fae8c] border-x border-b border-[#0b1f2c] rounded-b-sm" />
      </div>
    </div>
  </div>
);

/* ---------------- screens ---------------- */
type Screen = "menu" | "select" | "levels" | "game";

export default function App() {
  const [save, setSave] = useState<SaveData>(loadSave);
  const [screen, setScreen] = useState<Screen>("menu");
  const [selectReturn, setSelectReturn] = useState<"menu" | "levels">("menu");
  const [levelIdx, setLevelIdx] = useState(0);
  const [runScore, setRunScore] = useState(0);
  const [runLives, setRunLives] = useState(3);
  const [runKey, setRunKey] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [denied, setDenied] = useState(-1);

  const audioRef = useRef<AudioEngine | null>(null);
  if (!audioRef.current) audioRef.current = new AudioEngine();
  const audio = audioRef.current;
  const hero = getCharacter(save.char);

  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* storage unavailable */ }
  }, [save]);

  useEffect(() => { audio.setSfx(save.sfx); audio.setMusic(save.music); }, [save.sfx, save.music, audio]);
  useEffect(() => () => audio.destroy(), [audio]);

  useEffect(() => {
    const defocus = (ev: MouseEvent) => {
      const t = ev.target as HTMLElement | null;
      const btn = t?.closest?.("button");
      if (btn) (btn as HTMLButtonElement).blur();
    };
    document.addEventListener("click", defocus);
    return () => document.removeEventListener("click", defocus);
  }, []);

  const act = (fn: () => void) => () => { audio.unlock(); audio.select(); fn(); };

  const gotoMenu = act(() => { setScreen("menu"); audio.playMusic("menu"); });
  const gotoLevels = act(() => { setScreen("levels"); audio.playMusic("menu"); });
  const gotoSelect = (from: "menu" | "levels") => { audio.unlock(); audio.select(); setSelectReturn(from); setScreen("select"); };

  const startLevel = (i: number) => {
    audio.unlock();
    audio.select();
    setLevelIdx(i);
    setRunScore(0);
    setRunLives(getCharacter(save.char).lives);
    setRunKey((k) => k + 1);
    setScreen("game");
    audio.playMusic(null);
  };

  const handleNext = (score: number, lives: number) => {
    setSave((s) => {
      const cleared = [...s.cleared];
      cleared[levelIdx] = true;
      return { ...s, cleared, unlocked: Math.max(s.unlocked, Math.min(5, levelIdx + 2)) };
    });
    setRunScore(score);
    setRunLives(Math.max(1, lives));
    setLevelIdx((i) => i + 1);
    setRunKey((k) => k + 1);
  };

  const handleScore = (score: number) => {
    setSave((s) => ({ ...s, high: Math.max(s.high, score) }));
  };

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    const handleKey = (ev: KeyboardEvent) => {
      if (ev.code === "KeyF" && !ev.repeat) {
        toggleFullscreen();
      }
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    window.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      window.removeEventListener("keydown", handleKey);
    };
  }, [toggleFullscreen]);

  const cycleTouchMode = () => {
    audio.unlock();
    audio.select();
    setSave((s) => ({
      ...s,
      touchMode: s.touchMode === "auto" ? "on" : s.touchMode === "on" ? "off" : "auto",
    }));
  };

  const toggleScanlines = () => {
    audio.unlock();
    audio.select();
    setSave((s) => ({ ...s, scanlines: !s.scanlines }));
  };

  const clearedCount = save.cleared.filter(Boolean).length;

  return (
    <div className="w-full h-full overflow-hidden font-body text-cream bg-ink">
      {screen === "game" && (
        <GameCanvas
          key={runKey}
          level={LEVELS[levelIdx]}
          levelIdx={levelIdx}
          initialScore={runScore}
          initialLives={runLives}
          char={hero}
          highScore={save.high}
          audio={audio}
          scanlines={save.scanlines}
          touchMode={save.touchMode}
          onToggleScanlines={toggleScanlines}
          onCycleTouchMode={cycleTouchMode}
          onNext={handleNext}
          onExit={gotoLevels}
          onRestartRun={() => startLevel(0)}
          onScore={handleScore}
          onVictory={() =>
            setSave((s) => ({
              ...s,
              unlocked: 5,
              cleared: s.cleared.map((c, i) => (i === 4 ? true : c)),
            }))
          }
        />
      )}

      {screen === "menu" && (
        <MenuScreen
          save={save}
          hero={hero}
          clearedCount={clearedCount}
          audio={audio}
          isFullscreen={isFullscreen}
          onStart={gotoLevels}
          onHeroes={() => gotoSelect("menu")}
          onHelp={() => setShowHelp(true)}
          onToggleSfx={() => { audio.unlock(); setSave((s) => ({ ...s, sfx: !s.sfx })); }}
          onToggleMusic={() => { audio.unlock(); setSave((s) => ({ ...s, music: !s.music })); }}
          onToggleScanlines={toggleScanlines}
          onCycleTouchMode={cycleTouchMode}
          onToggleFullscreen={toggleFullscreen}
        />
      )}

      {screen === "select" && (
        <HeroSelect
          charId={save.char}
          audio={audio}
          onBack={() => (selectReturn === "menu" ? gotoMenu() : gotoLevels())}
          onPick={(id) => setSave((s) => ({ ...s, char: id }))}
          onContinue={gotoLevels}
        />
      )}

      {screen === "levels" && (
        <LevelSelect
          save={save}
          hero={hero}
          denied={denied}
          onBack={gotoMenu}
          onHeroes={() => gotoSelect("levels")}
          onPick={(i) => {
            audio.unlock();
            if (i < save.unlocked) startLevel(i);
            else { audio.bump(); setDenied(i); window.setTimeout(() => setDenied(-1), 350); }
          }}
        />
      )}

      {showHelp && <HelpModal onClose={act(() => setShowHelp(false))} />}
    </div>
  );
}/* ---------------- menu ---------------- */
function MenuScreen(props: {
  save: SaveData; hero: CharacterDef; clearedCount: number; audio: AudioEngine;
  isFullscreen: boolean;
  onStart: () => void; onHeroes: () => void; onHelp: () => void;
  onToggleSfx: () => void; onToggleMusic: () => void;
  onToggleScanlines: () => void; onCycleTouchMode: () => void;
  onToggleFullscreen: () => void;
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  return (
    <div
      className="relative w-full h-full overflow-y-auto no-scrollbar flex flex-col justify-between"
      style={{ background: "linear-gradient(180deg,#071620 0%,#0b1f2c 30%,#123043 70%,#183a4f 100%)" }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setTilt({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 });
      }}
    >
      {/* starfield */}
      {Array.from({ length: 32 }).map((_, i) => (
        <div key={i} className="absolute rounded-full bg-cream/75 pointer-events-none" style={{
          left: `${(i * 37 + 11) % 100}%`, top: `${(i * 23 + 5) % 52}%`, width: i % 4 === 0 ? 3 : 2, height: i % 4 === 0 ? 3 : 2,
          animation: `blinkStep ${2 + (i % 4)}s ease-in-out ${(i % 5) * 0.4}s infinite`,
        }} />
      ))}

      {/* drifting stardust / fireflies */}
      {[0, 1, 2, 3].map((i) => (
        <div key={`star-${i}`} className="absolute rounded-[1px] bg-gold/50 pointer-events-none" style={{
          width: 3, height: 3, top: `${20 + i * 14}%`, left: `${10 + i * 22}%`,
          boxShadow: "0 0 8px rgba(255,201,77,0.7)",
          animation: `floaty ${3 + i * 1.2}s ease-in-out ${i * 0.7}s infinite`,
        }} />
      ))}

      {/* moon with pixel crater shading - positioned to frame the sky without crowding the mascot */}
      <div className="absolute rounded-full pointer-events-none transition-transform duration-500 ease-out" style={{
        right: "24%", top: "7%", width: 80, height: 80, background: "#ffc94d",
        boxShadow: "0 0 40px 10px rgba(255,201,77,0.2), inset -14px -9px 0 rgba(224,152,38,0.6)",
        transform: `translate(${tilt.x * 8}px, ${tilt.y * 5}px)`,
      }}>
        {/* subtle pixel craters */}
        <div className="absolute top-3.5 left-4.5 w-2.5 h-2.5 rounded-full bg-[#e09826]/40" />
        <div className="absolute top-8 left-9 w-3.5 h-3.5 rounded-full bg-[#e09826]/35" />
        <div className="absolute bottom-5 left-5 w-2 h-2 rounded-full bg-[#e09826]/45" />
      </div>

      {/* drifting clouds */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="absolute rounded-full bg-cream/8 pointer-events-none" style={{
          width: 190 + i * 60, height: 36 + i * 8, top: `${15 + i * 15}%`,
          animation: `drift ${54 + i * 18}s linear ${-i * 18}s infinite`,
        }} />
      ))}

      {/* mountain silhouettes with parallax */}
      <svg className="absolute bottom-0 w-full pointer-events-none transition-transform duration-500 ease-out" viewBox="0 0 1440 240" preserveAspectRatio="none" style={{ height: "30%", width: "112%", left: "-6%", transform: `translateX(${tilt.x * -14}px)` }}>
        <path d="M0 240 L0 150 Q240 60 480 140 Q720 220 960 120 Q1200 40 1440 130 L1440 240 Z" fill="#0c2331" />
      </svg>
      <svg className="absolute bottom-0 w-full pointer-events-none transition-transform duration-500 ease-out" viewBox="0 0 1440 240" preserveAspectRatio="none" style={{ height: "22%", width: "112%", left: "-6%", transform: `translateX(${tilt.x * -26}px)` }}>
        <path d="M0 240 L0 190 Q300 120 640 185 Q980 245 1240 175 Q1360 145 1440 165 L1440 240 Z" fill="#071620" />
      </svg>

      {/* Quick Settings Bar at Top */}
      <div className="relative z-20 w-full max-w-6xl mx-auto px-4 sm:px-8 pt-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 bg-[#071620]/90 border-2 border-[#123043] rounded-md px-3.5 py-1.5 backdrop-blur-[2px] shadow-[0_3px_0_#071620]">
          <span className="w-2 h-2 rounded-[1px] bg-gold animate-pulse" />
          <span className="px-font text-[7px] sm:text-[8px] text-mint tracking-wider">HI-SCORE</span>
          <span className="px-font text-[11px] sm:text-[13px] text-gold tracking-widest">{String(props.save.high).padStart(6, "0")}</span>
        </div>

        {/* Toolbar Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={props.onToggleFullscreen}
            className="panel8 !px-2.5 !py-1.5 flex items-center gap-1.5 text-xs text-cream/80 hover:text-gold cursor-pointer transition-colors focus-arcade active:translate-y-0.5"
            title="Toggle Fullscreen Zoom (Press F)"
          >
            <FullscreenIcon isFull={props.isFullscreen} />
            <span className="px-font text-[7px]">{props.isFullscreen ? "EXIT ZOOM (F)" : "ZOOM / FULL (F)"}</span>
          </button>
          <button
            onClick={props.onToggleSfx}
            className="panel8 !px-2.5 !py-1.5 flex items-center gap-1.5 text-xs text-cream/80 hover:text-gold cursor-pointer transition-colors focus-arcade active:translate-y-0.5"
            title="Toggle Sound Effects"
          >
            <SoundIcon on={props.save.sfx} />
            <span className="px-font text-[7px]">SFX {props.save.sfx ? "ON" : "OFF"}</span>
          </button>
          <button
            onClick={props.onToggleMusic}
            className="panel8 !px-2.5 !py-1.5 flex items-center gap-1.5 text-xs text-cream/80 hover:text-gold cursor-pointer transition-colors focus-arcade active:translate-y-0.5"
            title="Toggle Chiptune Music"
          >
            <SoundIcon on={props.save.music} />
            <span className="px-font text-[7px]">BGM {props.save.music ? "ON" : "OFF"}</span>
          </button>
          <button
            onClick={props.onToggleScanlines}
            className="panel8 !px-2.5 !py-1.5 flex items-center gap-1.5 text-xs text-cream/80 hover:text-gold cursor-pointer transition-colors focus-arcade active:translate-y-0.5"
            title="Toggle CRT Scanline Effect"
          >
            <CrtIcon on={props.save.scanlines} />
            <span className="px-font text-[7px]">CRT {props.save.scanlines ? "ON" : "OFF"}</span>
          </button>
          <button
            onClick={props.onCycleTouchMode}
            className="panel8 !px-2.5 !py-1.5 flex items-center gap-1.5 text-xs text-cream/80 hover:text-gold cursor-pointer transition-colors focus-arcade active:translate-y-0.5"
            title="Cycle Touch Controls: Auto / Force On / Force Off"
          >
            <GamepadIcon />
            <span className="px-font text-[7px]">TOUCH {props.save.touchMode.toUpperCase()}</span>
          </button>
        </div>
      </div>

      {/* Main Title & Hero Composition */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-8 py-5 sm:py-8 my-auto">
        <div className="flex items-center justify-between gap-8 lg:gap-14 flex-col lg:flex-row">
          {/* Left Column: Game Title & Cartridge Actions */}
          <div className="max-w-xl w-full flex flex-col items-center lg:items-start text-center lg:text-left">
            {/* 1. Subtle Retro Arcade Easter Egg Label */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[#071620]/90 border-2 border-[#123043] shadow-[0_2px_0_#071620] mb-4 self-center lg:self-start select-none">
              <span className="w-1.5 h-1.5 rounded-[1px] bg-gold animate-pulse" />
              <span className="px-font text-[7.5px] sm:text-[8.5px] text-mint tracking-[0.24em]">
                INSERT COIN // 0 COINS
              </span>
            </div>

            {/* 2. Dominant Game Title with Crisp Stepped Pixel Shadow */}
            <h1
              className="px-font text-ember retro-title-shadow leading-none tracking-wider select-none"
              style={{ fontSize: "clamp(2.6rem, 6.6vw, 4.4rem)" }}
            >
              PIXEL PALS
            </h1>

            {/* 3. Framed Subtitle Banner (Cartridge Plaque) */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 bg-[#0b1f2c]/90 border-2 border-gold/50 rounded-sm shadow-[0_3px_0_#071620] mt-4 sm:mt-5 self-center lg:self-start select-none">
              <span className="text-gold text-[9px]">◆</span>
              <span className="px-font text-gold text-[10.5px] sm:text-[13px] tracking-[0.24em] retro-sub-shadow font-bold">
                ADVENTURE RUN
              </span>
              <span className="text-gold text-[9px]">◆</span>
            </div>

            {/* 4. Short Nostalgic Description */}
            <p className="font-body text-cream/80 text-sm sm:text-base mt-4 max-w-md leading-relaxed">
              Run, leap, and stomp through 5 handcrafted retro worlds to defeat{" "}
              <span className="text-gold font-semibold">Magmor, the Ember King</span>.
            </p>

            {/* Mobile Mascot Island (centered on tablet/mobile screens) */}
            <div className="block lg:hidden my-6 scale-90 sm:scale-100">
              <FloatingIsland />
            </div>

            {/* Tactile Real-Game Action Buttons */}
            <div className="flex items-center gap-3 sm:gap-4 mt-6 sm:mt-8 flex-wrap justify-center lg:justify-start">
              <button
                className="btn8 primary-arcade !text-[12px] sm:!text-[13px] !px-7 sm:!px-8 !py-4 group focus-arcade flex items-center gap-2.5"
                onClick={props.onStart}
              >
                <span className="transition-transform group-hover:translate-x-1 inline-block text-[10px]">▶</span>
                <span>START ADVENTURE</span>
              </button>
              <button
                className="btn8 dark !text-[10px] sm:!text-[11px] !px-5 !py-3.5 focus-arcade flex items-center gap-1.5"
                onClick={props.onHeroes}
              >
                <span className="text-gold">★</span>
                <span>Choose Hero</span>
              </button>
              <button
                className="btn8 blue !text-[10px] sm:!text-[11px] !px-5 !py-3.5 focus-arcade"
                onClick={props.onHelp}
              >
                Field Guide
              </button>
            </div>
          </div>

          {/* Right Column: Floating Island Hero Stage (Desktop view) */}
          <div
            className="hidden lg:block shrink-0 transition-transform duration-500 ease-out"
            style={{ transform: `translate(${tilt.x * 14}px, ${tilt.y * 10}px)` }}
          >
            <FloatingIsland />
          </div>
        </div>

        {/* Selected Hero Showcase & Save Plate */}
        <div className="panel8 mt-7 sm:mt-8 px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-5 flex-wrap w-full bg-[#0b1f2c]/95 border-2 border-[#123043] shadow-[0_4px_0_#071620]">
          <div className="flex items-center gap-3.5">
            <button
              className="w-12 h-12 rounded border-2 border-[#123043] shadow-[0_2px_0_#071620] overflow-hidden bg-[#183a4f] transition-transform hover:scale-105 active:translate-y-0.5 cursor-pointer relative group block"
              onClick={props.onHeroes}
              title="Change active hero"
            >
              <CharPortrait char={props.hero} />
              <span className="absolute bottom-0 inset-x-0 bg-[#071620]/85 text-[6px] px-font text-gold text-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                EDIT
              </span>
            </button>
            <div className="text-left">
              <div className="px-font text-[7px] text-mint tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-[1px] bg-mint inline-block" />
                ACTIVE HERO • {props.hero.species.toUpperCase()}
              </div>
              <div className="px-font text-[12px] sm:text-[13px] text-cream mt-0.5">
                {props.hero.name.toUpperCase()}
              </div>
              <div className="font-body text-[12px] text-gold/90 font-medium mt-0.5 flex items-center gap-1">
                <span className="text-gold">★</span>
                <span>{props.hero.passive.name}: {props.hero.passive.desc}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 flex-wrap">
            <div>
              <div className="px-font text-[7px] text-mint tracking-widest mb-1.5">
                WORLDS FREED ({props.clearedCount}/5)
              </div>
              <div className="flex gap-1.5">
                {LEVELS.map((lvl, i) => {
                  const isCleared = props.save.cleared[i];
                  return (
                    <div
                      key={i}
                      className={`w-6 h-6 rounded border-2 border-[#0b1f2c] flex items-center justify-center transition-colors ${
                        isCleared
                          ? "bg-gradient-to-b from-[#ffd23f] to-[#e8a92f] shadow-[0_0_8px_rgba(255,201,77,0.5)] text-[#241505]"
                          : "bg-[#183a4f] text-cream/30"
                      }`}
                      title={`${lvl.name}: ${isCleared ? "Cleared!" : "Locked"}`}
                    >
                      {isCleared ? (
                        <CheckIcon />
                      ) : (
                        <span className="px-font text-[8px]">{i + 1}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              className="btn8 dark !px-3.5 !py-2 !text-[9px] focus-arcade active:translate-y-0.5"
              onClick={props.onHeroes}
            >
              Switch Hero
            </button>
          </div>
        </div>
      </div>

      {/* Footer copyright, developer credit, & nostalgic disclaimer */}
      <div className="relative z-10 w-full border-t border-[#123043]/80 bg-[#071620]/95 px-4 sm:px-8 py-2.5 flex items-center justify-between gap-3 flex-wrap text-center sm:text-left">
        <div className="flex items-center gap-2 mx-auto sm:mx-0 flex-wrap justify-center">
          <span className="inline-block w-1.5 h-1.5 rounded-[1px] bg-mint/70" />
          <span className="px-font text-[7.5px] sm:text-[8px] text-cream/65 tracking-wider">
            BUILT BY ABHISHEK
          </span>
          <span className="text-cream/25 text-[10px]">{"//"}</span>
          <span className="font-body text-[11.5px] sm:text-[12px] text-gold/75 italic tracking-wide">
            YOUR CHILDHOOD CALLED. IT WANTS ITS GAME BACK.
          </span>
        </div>
        <div className="font-body text-[11px] text-cream/35 mx-auto sm:mx-0">
          Pixel Pals: Adventure Run • 5 Hand-Crafted Worlds
        </div>
      </div>
    </div>
  );
}

/* ---------------- hero select ---------------- */
function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="px-font text-[7px] text-cream/70 w-8">{label}</span>
      <span className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className="w-3.5 h-2.5 rounded-[2px] border border-[#0b1f2c]"
            style={{ background: i < value ? color : "#0e2a3a" }}
          />
        ))}
      </span>
    </div>
  );
}

function HeroSelect(props: {
  charId: string;
  audio: AudioEngine;
  onBack: () => void;
  onPick: (id: string) => void;
  onContinue: () => void;
}) {
  return (
    <div
      className="relative w-full h-full overflow-y-auto no-scrollbar flex flex-col justify-between"
      style={{ background: "linear-gradient(180deg,#0b1f2c 0%,#123043 62%,#1d4258 100%)" }}
    >
      <div className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-8 pt-5 sm:pt-7 flex items-center justify-between gap-3">
        <button className="btn8 dark !text-[10px] !px-4" onClick={props.onBack}>
          <BackIcon /> Back
        </button>
        <h2 className="px-font text-[14px] sm:text-[22px] text-cream title-shadow text-center">
          CHOOSE YOUR HERO
        </h2>
        <div className="text-right hidden sm:block">
          <div className="px-font text-[8px] text-mint tracking-widest">ROSTER</div>
          <div className="px-font text-[12px] text-gold">4 READY</div>
        </div>
      </div>

      <p className="relative z-10 text-center font-body text-[14px] text-cream/70 italic px-4 mt-2 mb-4">
        Every hero brings unique movement physics and a distinct passive ability to the adventure.
      </p>

      {/* Roster Cards Grid */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-8 py-2">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 w-full max-w-5xl">
          {CHARACTERS.map((c) => {
            const active = c.id === props.charId;
            return (
              <button
                key={c.id}
                onClick={() => { props.audio.unlock(); props.audio.coin(); props.onPick(c.id); }}
                className={`panel8 relative text-left p-4 cursor-pointer transition-all duration-150 hover:-translate-y-1.5 group ${
                  active ? "border-gold shadow-[0_0_24px_rgba(255,201,77,0.35)] -translate-y-1" : ""
                }`}
                style={active ? { borderWidth: 4 } : undefined}
              >
                {active && (
                  <span className="anim-pop absolute -top-3 right-3 px-font text-[7px] text-[#241505] bg-gold border-2 border-[#0b1f2c] rounded px-2 py-0.5 shadow-[0_2px_0_#071620]">
                    READY
                  </span>
                )}
                <div className="flex justify-center mb-3">
                  <div
                    className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-[#0b1f2c] shadow-[0_4px_0_#071620] overflow-hidden transition-transform duration-200 group-hover:scale-105 ${
                      active ? "anim-float" : ""
                    }`}
                    style={{ background: `linear-gradient(160deg, ${c.bodyDark}55, #1d4258)` }}
                  >
                    <CharPortrait char={c} />
                  </div>
                </div>

                <div className="text-center mb-3">
                  <div className="px-font text-[12px] sm:text-[14px] text-cream">{c.name.toUpperCase()}</div>
                  <div
                    className="px-font text-[7px] tracking-widest mt-1"
                    style={{ color: c.body === "#cfd8dc" ? "#9fe8ff" : c.body }}
                  >
                    {c.species.toUpperCase()}
                  </div>
                  <p className="font-body text-[12px] text-cream/70 leading-snug mt-1.5 min-h-[38px]">
                    {c.tagline}
                  </p>
                </div>

                {/* Passive Badge */}
                <div className="mb-3 p-2 bg-[#071620]/70 rounded border border-[#1d4258]">
                  <div className="px-font text-[7px] text-gold mb-0.5">★ {c.passive.name}</div>
                  <div className="font-body text-[11px] text-cream/80 leading-snug">{c.passive.desc}</div>
                </div>

                <div className="space-y-1.5 mb-3">
                  <StatBar label="SPD" value={c.stats.speed} color="#7be0c3" />
                  <StatBar label="JMP" value={c.stats.jump} color="#ffc94d" />
                  <StatBar label="PWR" value={c.stats.power} color="#ff8c3b" />
                </div>

                <div className="flex items-center justify-between border-t-2 border-[#0b1f2c] pt-2.5">
                  <span className="px-font text-[7px] text-cream/70">LIVES</span>
                  <span className="flex gap-1">
                    {Array.from({ length: c.lives }).map((_, i) => (
                      <svg key={i} width="13" height="12" viewBox="0 0 16 15">
                        <path d="M8 14 L1.5 7.5 C-0.5 5.5 -0.5 2 2 0.8 C4 0 6 0.8 8 3 C10 0.8 12 0 14 0.8 C16.5 2 16.5 5.5 14.5 7.5 Z" fill="#ff5a5f" stroke="#0b1f2c" strokeWidth="1.2" />
                      </svg>
                    ))}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 pb-6 pt-3 flex justify-center">
        <button className="btn8 gold !text-[12px] !px-8" onClick={props.onContinue}>
          <PlayIcon /> Confirm &amp; View World Map
        </button>
      </div>
    </div>
  );
}

/* ---------------- world map / level select ---------------- */
function LevelSelect(props: {
  save: SaveData;
  hero: CharacterDef;
  denied: number;
  onBack: () => void;
  onHeroes: () => void;
  onPick: (i: number) => void;
}) {
  return (
    <div
      className="relative w-full h-full overflow-y-auto no-scrollbar flex flex-col justify-between"
      style={{ background: "linear-gradient(180deg,#0b1f2c 0%,#123043 70%,#1d4258 100%)" }}
    >
      <div className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-8 pt-5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button className="btn8 dark !text-[10px] !px-4" onClick={props.onBack}>
            <BackIcon /> Menu
          </button>
          <button
            className="flex items-center gap-2 panel8 !py-1.5 !px-3 cursor-pointer hover:-translate-y-0.5 transition-transform"
            onClick={props.onHeroes}
            title="Change active hero"
          >
            <span className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#0b1f2c]">
              <CharPortrait char={props.hero} />
            </span>
            <span className="px-font text-[8px] text-gold">{props.hero.name.toUpperCase()}</span>
          </button>
        </div>

        <h2 className="px-font text-[16px] sm:text-[22px] text-cream title-shadow text-center">
          WORLD SELECT
        </h2>

        <div className="text-right">
          <div className="px-font text-[7px] sm:text-[8px] text-mint tracking-widest">RECORD SCORE</div>
          <div className="px-font text-[11px] sm:text-[14px] text-gold">
            {String(props.save.high).padStart(6, "0")}
          </div>
        </div>
      </div>

      {/* World Cards */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-8 py-6 my-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full max-w-6xl">
          {LEVELS.map((lv, i) => {
            const th = THEMES[lv.theme];
            const unlocked = i < props.save.unlocked;
            const cleared = props.save.cleared[i];
            const isDenied = props.denied === i;

            return (
              <div
                key={i}
                className={`panel8 relative p-4 flex flex-col items-center justify-between text-center transition-all duration-150 ${
                  isDenied ? "anim-denied" : ""
                } ${unlocked ? "hover:-translate-y-1.5 hover:border-gold" : "opacity-75"}`}
                style={cleared ? { borderColor: "#ffc94d" } : undefined}
              >
                {/* World Portal Orb */}
                <button
                  onClick={() => props.onPick(i)}
                  className={`relative w-24 h-24 rounded-full border-4 border-[#071620] shadow-[0_6px_0_#071620] cursor-pointer transition-transform duration-150 flex items-center justify-center ${
                    unlocked ? "hover:scale-105 active:scale-95" : ""
                  }`}
                  style={{ background: `linear-gradient(160deg, ${th.sky[0]}, ${th.sky[1]} 55%, ${th.farAlt})` }}
                  aria-label={`World ${i + 1}: ${lv.name}`}
                >
                  {unlocked ? (
                    <span className="px-font text-[28px] text-[#0b1f2c]/85 drop-shadow">{i + 1}</span>
                  ) : (
                    <span className="bg-[#071620]/75 rounded-full p-2.5">
                      <LockIconSvg />
                    </span>
                  )}
                  {cleared && (
                    <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-gold border-2 border-[#071620] flex items-center justify-center shadow-[0_2px_0_#071620] anim-pop">
                      <CheckIcon />
                    </span>
                  )}
                </button>

                {/* Info & Badges */}
                <div className="mt-3 w-full">
                  <div className="px-font text-[9px] text-cream leading-tight">{lv.name.toUpperCase()}</div>
                  <div className="font-body text-[12px] text-cream/60 mt-1 italic leading-snug">{lv.sub}</div>

                  <div className="mt-2 flex items-center justify-center gap-1.5 flex-wrap">
                    {lv.hasBoss && (
                      <span className="px-font text-[7px] text-ember border-2 border-ember2 rounded px-1.5 py-0.5 bg-[#23080d]/80">
                        BOSS
                      </span>
                    )}
                    {th.icy && (
                      <span className="px-font text-[7px] text-[#9fe8ff] border-2 border-[#9fe8ff]/60 rounded px-1.5 py-0.5 bg-[#0b1f2c]/80">
                        ICY
                      </span>
                    )}
                    {cleared ? (
                      <span className="px-font text-[7px] text-gold border-2 border-gold rounded px-1.5 py-0.5 bg-[#0b1f2c]/80">
                        CLEARED
                      </span>
                    ) : unlocked ? (
                      <span className="px-font text-[7px] text-mint border-2 border-mint rounded px-1.5 py-0.5 bg-[#0b1f2c]/80">
                        UNLOCKED
                      </span>
                    ) : (
                      <span className="px-font text-[7px] text-cream/40 border-2 border-cream/20 rounded px-1.5 py-0.5 bg-[#0b1f2c]/80">
                        LOCKED
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => props.onPick(i)}
                  className={`btn8 w-full mt-3 !py-2 !text-[9px] ${
                    cleared ? "gold" : unlocked ? "mint" : "dark opacity-60"
                  }`}
                >
                  {cleared ? "Replay" : unlocked ? "Play" : "Locked"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 pb-5 text-center font-body text-[13px] text-cream/50">
        Clear each world to unlock the next. Your best scores and milestones are saved on this device.
      </div>
    </div>
  );
}

const LockIconSvg = () => (
  <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
    <rect x="3" y="7" width="12" height="9" rx="2" fill="#cfd8dc" />
    <path d="M5.5 7 V5 a3.5 3.5 0 0 1 7 0 V7" stroke="#cfd8dc" strokeWidth="2.4" />
    <circle cx="9" cy="11.5" r="1.6" fill="#0b1f2c" />
  </svg>
);

/* ---------------- character portrait SVG ---------------- */
function CharPortrait({ char }: { char: CharacterDef }) {
  const { body, bodyDark, belly, scarf, earTip } = char;
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full block">
      <rect width="120" height="120" fill="#1d4258" />
      <circle cx="60" cy="66" r="46" fill={bodyDark} opacity="0.35" />
      {/* shoulders */}
      <path d="M22 120 Q26 88 60 86 Q94 88 98 120 Z" fill={body} />
      {/* scarf */}
      <path d="M34 96 Q60 108 86 96 L86 108 Q60 120 34 108 Z" fill={scarf} />
      {char.ears === "fox" && (
        <g>
          <path d="M28 44 L22 8 L52 30 Z" fill={body} />
          <path d="M92 44 L98 8 L68 30 Z" fill={body} />
          <path d="M28 36 L25 16 L42 29 Z" fill={earTip} />
          <path d="M92 36 L95 16 L78 29 Z" fill={earTip} />
          <circle cx="60" cy="58" r="34" fill={body} />
          <ellipse cx="60" cy="70" rx="17" ry="12" fill={belly} />
          <circle cx="60" cy="64" r="4.4" fill="#3c1c0c" />
          <circle cx="47" cy="52" r="6.5" fill={belly} />
          <circle cx="73" cy="52" r="6.5" fill={belly} />
          <circle cx="48.5" cy="53" r="3.2" fill="#12262e" />
          <circle cx="71.5" cy="53" r="3.2" fill="#12262e" />
        </g>
      )}
      {char.ears === "bear" && (
        <g>
          <circle cx="32" cy="32" r="11" fill={body} />
          <circle cx="88" cy="32" r="11" fill={body} />
          <circle cx="32" cy="32" r="5" fill={earTip} />
          <circle cx="88" cy="32" r="5" fill={earTip} />
          <circle cx="60" cy="58" r="35" fill={body} />
          <ellipse cx="60" cy="71" rx="18" ry="13" fill={belly} />
          <ellipse cx="60" cy="65" rx="5.4" ry="4.2" fill="#3c1c0c" />
          <circle cx="46" cy="51" r="5.4" fill={belly} />
          <circle cx="74" cy="51" r="5.4" fill={belly} />
          <circle cx="47" cy="52" r="2.8" fill="#12262e" />
          <circle cx="73" cy="52" r="2.8" fill="#12262e" />
          <path d="M52 78 Q60 84 68 78" stroke="#3c1c0c" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </g>
      )}
      {char.ears === "frog" && (
        <g>
          <circle cx="60" cy="60" r="35" fill={body} />
          <circle cx="42" cy="30" r="12" fill={body} />
          <circle cx="78" cy="30" r="12" fill={body} />
          <circle cx="42" cy="30" r="8" fill={belly} />
          <circle cx="78" cy="30" r="8" fill={belly} />
          <circle cx="42" cy="31" r="4" fill="#12262e" />
          <circle cx="78" cy="31" r="4" fill="#12262e" />
          <ellipse cx="60" cy="74" rx="20" ry="12" fill={belly} />
          <path d="M44 70 Q60 82 76 70" stroke="#2e7d32" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="38" cy="62" r="4.4" fill="#ff8fa3" />
          <circle cx="82" cy="62" r="4.4" fill="#ff8fa3" />
        </g>
      )}
      {char.ears === "bunny" && (
        <g>
          <rect x="36" y="2" width="14" height="42" rx="7" fill={body} />
          <rect x="70" y="2" width="14" height="42" rx="7" fill={body} />
          <rect x="40" y="8" width="6" height="30" rx="3" fill={earTip} />
          <rect x="74" y="8" width="6" height="30" rx="3" fill={earTip} />
          <circle cx="60" cy="60" r="34" fill={body} />
          <ellipse cx="60" cy="72" rx="15" ry="11" fill={belly} />
          <circle cx="60" cy="66" r="3.8" fill="#e2708a" />
          <path d="M60 70 L60 76 M60 76 Q54 82 48 78 M60 76 Q66 82 72 78" stroke="#8d9aa5" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="47" cy="52" r="6" fill={belly} />
          <circle cx="73" cy="52" r="6" fill={belly} />
          <circle cx="48.5" cy="53" r="3" fill="#12262e" />
          <circle cx="71.5" cy="53" r="3" fill="#12262e" />
        </g>
      )}
    </svg>
  );
}

/* ---------------- field guide modal ---------------- */
function HelpModal(props: { onClose: () => void }) {
  const [tab, setTab] = useState<"controls" | "heroes" | "foes" | "tips">("controls");

  const Row = ({ k, label }: { k: string[]; label: string }) => (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-[#0b1f2c]/80">
      <span className="text-cream/90 font-medium">{label}</span>
      <span className="flex gap-1">
        {k.map((x) => (
          <span key={x} className="kbd">{x}</span>
        ))}
      </span>
    </div>
  );

  const FoeCard = ({ color, name, tip, danger }: { color: string; name: string; tip: string; danger: string }) => (
    <div className="flex items-start gap-3 p-2.5 bg-[#071620]/60 rounded border border-[#1d4258]">
      <span className="mt-1 w-4 h-4 rounded-full border-2 border-[#0b1f2c] shrink-0" style={{ background: color }} />
      <div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-cream text-[14px]">{name}</span>
          <span className="px-font text-[7px] text-coral bg-[#23080d] px-1 py-0.5 rounded border border-coral/40">{danger}</span>
        </div>
        <div className="text-cream/75 text-[13px] mt-0.5">{tip}</div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#071620]/85 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm" onClick={props.onClose}>
      <div
        className="panel8 anim-pop max-w-3xl w-full max-h-[92vh] overflow-y-auto px-5 sm:px-8 py-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 border-b-2 border-[#0b1f2c] pb-3">
          <h3 className="px-font text-[14px] sm:text-[17px] text-gold title-shadow">
            FIELD GUIDE &amp; MANUAL
          </h3>
          <button className="btn8 red !text-[9px] !px-3 !py-1.5" onClick={props.onClose}>
            ✕ Close
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-5 border-b border-[#0b1f2c] pb-2 flex-wrap">
          <button
            onClick={() => setTab("controls")}
            className={`px-font text-[8px] sm:text-[9px] px-3 py-1.5 rounded cursor-pointer transition-colors ${
              tab === "controls" ? "bg-ember text-cream" : "bg-[#1d4258] text-cream/70 hover:text-cream"
            }`}
          >
            CONTROLS
          </button>
          <button
            onClick={() => setTab("heroes")}
            className={`px-font text-[8px] sm:text-[9px] px-3 py-1.5 rounded cursor-pointer transition-colors ${
              tab === "heroes" ? "bg-ember text-cream" : "bg-[#1d4258] text-cream/70 hover:text-cream"
            }`}
          >
            HEROES &amp; PASSIVES
          </button>
          <button
            onClick={() => setTab("foes")}
            className={`px-font text-[8px] sm:text-[9px] px-3 py-1.5 rounded cursor-pointer transition-colors ${
              tab === "foes" ? "bg-ember text-cream" : "bg-[#1d4258] text-cream/70 hover:text-cream"
            }`}
          >
            FOES &amp; HAZARDS
          </button>
          <button
            onClick={() => setTab("tips")}
            className={`px-font text-[8px] sm:text-[9px] px-3 py-1.5 rounded cursor-pointer transition-colors ${
              tab === "tips" ? "bg-ember text-cream" : "bg-[#1d4258] text-cream/70 hover:text-cream"
            }`}
          >
            PRO TIPS
          </button>
        </div>

        {/* Tab 1: Controls */}
        {tab === "controls" && (
          <div className="space-y-4">
            <div className="px-font text-[9px] text-mint tracking-widest">KEYBOARD &amp; TOUCH LAYOUT</div>
            <div className="font-body text-[14px]">
              <Row k={["←", "→", "A", "D"]} label="Run Left / Right" />
              <Row k={["SPACE", "W", "Z", "↑"]} label="Jump (Hold for higher bounce)" />
              <Row k={["SHIFT", "X"]} label="Sprint / Run Fast" />
              <Row k={["↓ + JUMP", "S + SPACE"]} label="Drop through wooden platforms" />
              <Row k={["ESC", "P"]} label="Pause Game" />
            </div>
            <div className="p-3 bg-[#071620]/60 rounded border border-[#1d4258] mt-4">
              <div className="px-font text-[8px] text-gold mb-1">TOUCH DECK CONTROLS</div>
              <p className="text-cream/80 text-[13px] leading-relaxed">
                On mobile or touchscreen devices, an ergonomic on-screen D-pad and Action buttons will appear.
                In <strong>Landscape mode</strong>, controls sit in the left/right thumb wings so gameplay stays crystal clear.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Heroes */}
        {tab === "heroes" && (
          <div className="space-y-3">
            <div className="px-font text-[9px] text-mint tracking-widest mb-2">PLAYABLE HEROES</div>
            {CHARACTERS.map((c) => (
              <div key={c.id} className="p-3 bg-[#071620]/60 rounded border border-[#1d4258] flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-[#0b1f2c]">
                  <CharPortrait char={c} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-font text-[10px] text-cream">{c.name.toUpperCase()} ({c.species.toUpperCase()})</span>
                    <span className="px-font text-[7px] text-gold bg-[#1d4258] px-1.5 py-0.5 rounded">
                      ★ {c.passive.name}
                    </span>
                  </div>
                  <div className="text-[13px] text-cream/75 mt-0.5 font-medium">{c.passive.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Foes */}
        {tab === "foes" && (
          <div className="space-y-3">
            <div className="px-font text-[9px] text-mint tracking-widest mb-2">FOES &amp; HAZARDS</div>
            <div className="grid sm:grid-cols-2 gap-2.5">
              <FoeCard color="#3f9e7e" name="Munchling" danger="LOW" tip="Wanders back and forth. Easily squished from above." />
              <FoeCard color="#d95f76" name="Flutterwing" danger="MEDIUM" tip="Swoops in sine-wave flight arcs. Time your stomp at its peak." />
              <FoeCard color="#e5a13f" name="Boinger" danger="MEDIUM" tip="Leaps toward your position. Catch it mid-hop from above." />
              <FoeCard color="#c04a44" name="Prickler" danger="HIGH" tip="Spiked metal dome — NEVER stomp. Jump over or run underneath." />
              <FoeCard color="#ff6b4a" name="Snapjaw" danger="HIGH" tip="Lurks inside pipes and lunges upwards periodically." />
              <FoeCard color="#3c2226" name="Magmor, Ember King" danger="BOSS" tip="6 stomps on his crown. Watch for sliding ground shockwaves." />
            </div>
          </div>
        )}

        {/* Tab 4: Tips */}
        {tab === "tips" && (
          <div className="space-y-3">
            <div className="px-font text-[9px] text-mint tracking-widest mb-2">SURVIVAL SECRETS</div>
            <div className="space-y-2 text-cream/80 text-[13px] leading-relaxed font-body">
              <div className="p-2.5 bg-[#071620]/60 rounded border border-[#1d4258]">
                <strong className="text-gold">★ Ember Fruit:</strong> Hit glowing <span className="kbd">?</span> or <span className="kbd">Q</span> blocks to find Ember Fruit. Eating it grants an armored size upgrade that absorbs one lethal hit!
              </div>
              <div className="p-2.5 bg-[#071620]/60 rounded border border-[#1d4258]">
                <strong className="text-gold">★ Extra Lives:</strong> Collect 100 coins across your run to automatically earn an extra heart life.
              </div>
              <div className="p-2.5 bg-[#071620]/60 rounded border border-[#1d4258]">
                <strong className="text-gold">★ Combo Stomps:</strong> Stomping multiple foes in a row without touching the ground multiplies score exponentially (+100, +200, +400, +800)!
              </div>
              <div className="p-2.5 bg-[#071620]/60 rounded border border-[#1d4258]">
                <strong className="text-gold">★ Checkpoint Flags:</strong> Touch the mint star flags halfway through every level to secure your respawn point.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
