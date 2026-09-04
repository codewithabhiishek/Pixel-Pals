import { useEffect, useRef, useState } from "react";
import GameCanvas from "./components/GameCanvas";
import { AudioEngine } from "./game/audio";
import { LEVELS, THEMES } from "./game/levels";
import { CHARACTERS, getCharacter, type CharacterDef } from "./game/characters";

/* ---------------- save data ---------------- */
interface SaveData { high: number; unlocked: number; cleared: boolean[]; sfx: boolean; music: boolean; char: string }
const SAVE_KEY = "emberfox_save_v2";
const defaultSave: SaveData = { high: 0, unlocked: 1, cleared: [false, false, false, false, false], sfx: true, music: true, char: "ember" };

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
    };
  } catch {
    return defaultSave;
  }
}

/* ---------------- tiny SVG icons ---------------- */
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
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M2 6 H5 L9 2.5 V13.5 L5 10 H2 Z" fill="currentColor" />
    {on ? (
      <path d="M11 5 C12.6 6.6 12.6 9.4 11 11 M13 3.4 C15.4 5.8 15.4 10.2 13 12.6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    ) : (
      <path d="M11 6 L15 10 M15 6 L11 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    )}
  </svg>
);

const FoxMascot = () => (
  <svg width="210" height="190" viewBox="0 0 210 190" className="anim-float drop-shadow-[0_14px_0_rgba(0,0,0,0.35)]">
    {/* tail */}
    <path d="M30 150 Q4 138 10 112 Q26 122 40 118 Q34 138 44 148 Z" fill="#e0702a" />
    <circle cx="13" cy="117" r="9" fill="#fdf3e3" />
    {/* body */}
    <rect x="40" y="106" width="86" height="62" rx="26" fill="#ff8c3b" />
    <ellipse cx="88" cy="146" rx="26" ry="17" fill="#fdf3e3" />
    {/* head */}
    <circle cx="120" cy="78" r="46" fill="#ff8c3b" />
    {/* ears */}
    <path d="M84 48 L74 6 L110 34 Z" fill="#ff8c3b" />
    <path d="M156 48 L166 6 L130 34 Z" fill="#ff8c3b" />
    <path d="M82 40 L77 16 L99 33 Z" fill="#3c1c0c" />
    <path d="M158 40 L163 16 L141 33 Z" fill="#3c1c0c" />
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
    {/* flame tail tip */}
    <path d="M14 112 Q6 100 14 90 Q16 102 24 104 Q18 108 14 112 Z" fill="#ff7a2f" />
  </svg>
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
    // clicking a button releases keyboard focus so SPACE never re-triggers it mid-game
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

  const clearedCount = save.cleared.filter(Boolean).length;

  return (
    <div className="w-full h-full overflow-hidden font-body">
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
          onStart={gotoLevels}
          onHeroes={() => gotoSelect("menu")}
          onHelp={() => setShowHelp(true)}
          onToggleSfx={() => setSave((s) => ({ ...s, sfx: !s.sfx }))}
          onToggleMusic={() => setSave((s) => ({ ...s, music: !s.music }))}
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
}

/* ---------------- menu ---------------- */
function MenuScreen(props: {
  save: SaveData; hero: CharacterDef; clearedCount: number; audio: AudioEngine;
  onStart: () => void; onHeroes: () => void; onHelp: () => void; onToggleSfx: () => void; onToggleMusic: () => void;
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  return (
    <div
      className="relative w-full h-full overflow-y-auto no-scrollbar"
      style={{ background: "linear-gradient(180deg,#0b1f2c 0%,#123043 62%,#1d4258 100%)" }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setTilt({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 });
      }}
    >
      {/* stars */}
      {Array.from({ length: 26 }).map((_, i) => (
        <div key={i} className="absolute rounded-full bg-cream/70" style={{
          left: `${(i * 37 + 11) % 100}%`, top: `${(i * 23 + 5) % 46}%`, width: i % 4 === 0 ? 3 : 2, height: i % 4 === 0 ? 3 : 2,
          animation: `blinkStep ${2 + (i % 4)}s ease-in-out ${(i % 5) * 0.4}s infinite`,
        }} />
      ))}
      {/* moon */}
      <div className="absolute rounded-full transition-transform duration-500 ease-out" style={{
        right: "12%", top: "9%", width: 92, height: 92, background: "#ffc94d",
        boxShadow: "0 0 60px 18px rgba(255,201,77,0.3), inset -14px -8px 0 rgba(232,169,47,0.6)",
        transform: `translate(${tilt.x * 10}px, ${tilt.y * 6}px)`,
      }} />
      {/* drifting clouds */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="absolute rounded-full bg-cream/12" style={{
          width: 180 + i * 60, height: 34 + i * 8, top: `${18 + i * 16}%`,
          animation: `drift ${52 + i * 20}s linear ${-i * 18}s infinite`,
        }} />
      ))}
      {/* hill silhouettes — pointer parallax */}
      <svg className="absolute bottom-0 w-full transition-transform duration-500 ease-out" viewBox="0 0 1440 240" preserveAspectRatio="none" style={{ height: "34%", width: "112%", left: "-6%", transform: `translateX(${tilt.x * -14}px)` }}>
        <path d="M0 240 L0 150 Q240 60 480 140 Q720 220 960 120 Q1200 40 1440 130 L1440 240 Z" fill="#0e2a3a" />
      </svg>
      <svg className="absolute bottom-0 w-full transition-transform duration-500 ease-out" viewBox="0 0 1440 240" preserveAspectRatio="none" style={{ height: "26%", width: "112%", left: "-6%", transform: `translateX(${tilt.x * -26}px)` }}>
        <path d="M0 240 L0 190 Q300 120 640 185 Q980 245 1240 175 Q1360 145 1440 165 L1440 240 Z" fill="#071620" />
      </svg>


      {/* content */}
      <div className="relative z-10 min-h-full max-w-6xl mx-auto px-4 sm:px-8 py-6 flex flex-col justify-center">
        <div className="flex items-end justify-between gap-6 lg:gap-8 flex-wrap m-auto w-full py-4">
          <div className="max-w-xl w-full lg:w-auto">
            <div className="px-font text-[8px] sm:text-[10px] text-mint tracking-[0.3em] mb-2 sm:mb-3">A FIVE-WORLD PLATFORM ADVENTURE</div>
            <h1 className="px-font text-ember title-shadow leading-none" style={{ fontSize: "clamp(1.9rem,6.5vw,4.2rem)", animation: "titlePulse 3.2s ease-in-out infinite" }}>
              PIXEL PALS
            </h1>
            <div className="px-font text-gold text-[11px] sm:text-[14px] tracking-[0.25em] mt-2 mb-3">
              ADVENTURE RUN
            </div>
            <p className="font-body text-cream/80 text-base sm:text-lg mt-2 max-w-md">
              Run, jump and blaze a trail through meadows, caverns, dunes and ice —
              then face <span className="text-ember font-semibold">Magmor, the Ember King</span>, in his forge.
            </p>
            <div className="flex gap-4 mt-8 flex-wrap">
              <button className="btn8 !text-[13px] !px-7 !py-4" onClick={props.onStart}>
                <PlayIcon /> Start Adventure
              </button>
              <button className="btn8 dark" onClick={props.onHeroes}>Choose Hero</button>
              <button className="btn8 blue" onClick={props.onHelp}>How to Play</button>
            </div>
            <div className="flex items-center gap-5 mt-6">
              <button className="flex items-center gap-2 font-body text-sm text-cream/70 hover:text-gold cursor-pointer" onClick={props.onToggleSfx}>
                <SoundIcon on={props.save.sfx} /> SFX {props.save.sfx ? "on" : "off"}
              </button>
              <button className="flex items-center gap-2 font-body text-sm text-cream/70 hover:text-gold cursor-pointer" onClick={props.onToggleMusic}>
                <SoundIcon on={props.save.music} /> Music {props.save.music ? "on" : "off"}
              </button>
            </div>
          </div>
          <div className="hidden lg:block shrink-0 transition-transform duration-500 ease-out" style={{ transform: `translate(${tilt.x * 16}px, ${tilt.y * 10}px)` }}>
            <FoxMascot />
          </div>
        </div>

        {/* save plate */}
        <div className="panel8 mt-6 sm:mt-10 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-4 sm:gap-8 flex-wrap w-fit max-w-full">
          <button className="flex items-center gap-3 cursor-pointer group" onClick={props.onHeroes} title="Change hero">
            <span className="w-11 h-11 rounded-full border-[3px] border-[#0b1f2c] shadow-[0_3px_0_#071620] overflow-hidden bg-[#1d4258] transition-transform group-hover:-translate-y-0.5">
              <CharPortrait char={props.hero} />
            </span>
            <span className="text-left">
              <span className="px-font text-[8px] text-mint tracking-widest block mb-0.5">HERO</span>
              <span className="px-font text-[10px] text-cream group-hover:text-gold">{props.hero.name.toUpperCase()}</span>
            </span>
          </button>
          <div className="w-px h-9 bg-[#0b1f2c]" />
          <div>
            <div className="px-font text-[8px] text-mint tracking-widest mb-1">HIGH SCORE</div>
            <div className="px-font text-[16px] text-gold">{String(props.save.high).padStart(6, "0")}</div>
          </div>
          <div className="w-px h-9 bg-[#0b1f2c]" />
          <div>
            <div className="px-font text-[8px] text-mint tracking-widest mb-1">WORLDS CLEARED</div>
            <div className="flex gap-1.5 mt-1">
              {LEVELS.map((_, i) => (
                <div key={i} className={`w-4 h-4 rounded-sm border-2 border-[#0b1f2c] ${props.save.cleared[i] ? "bg-gold" : "bg-[#1d4258]"}`} />
              ))}
            </div>
          </div>
          <div className="w-px h-9 bg-[#0b1f2c]" />
          <div className="font-body text-[13px] text-cream/60 max-w-[210px]">
            Progress is saved on this device. Pick up where you left off.
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 inset-x-0 text-center font-body text-[12px] text-cream/35 z-10">
        No sprites were borrowed — every pixel of Pixel Pals is original. Keyboard recommended.
      </div>
    </div>
  );
}

/* ---------------- level select ---------------- */
function LevelSelect(props: { save: SaveData; hero: CharacterDef; denied: number; onBack: () => void; onHeroes: () => void; onPick: (i: number) => void }) {
  return (
    <div className="relative w-full h-full overflow-y-auto no-scrollbar flex flex-col" style={{ background: "linear-gradient(180deg,#0b1f2c 0%,#123043 70%,#1d4258 100%)" }}>
      <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 200" preserveAspectRatio="none" style={{ height: "26%" }}>
        <path d="M0 200 L0 120 Q360 40 720 110 Q1080 180 1440 90 L1440 200 Z" fill="#0e2a3a" />
      </svg>

      <div className="relative z-10 max-w-6xl w-full mx-auto px-3 sm:px-8 pt-5 sm:pt-8 flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
        <div className="flex items-center gap-2 sm:gap-3">
          <button className="btn8 dark !text-[9px] sm:!text-[10px] !px-3 sm:!px-4" onClick={props.onBack}><BackIcon /> Menu</button>
          <button
            className="flex items-center gap-2 panel8 !py-1.5 !px-2.5 cursor-pointer hover:-translate-y-0.5 transition-transform"
            onClick={props.onHeroes}
            title="Change hero"
          >
            <span className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#0b1f2c]">
              <CharPortrait char={props.hero} />
            </span>
            <span className="px-font text-[8px] text-gold">{props.hero.name.toUpperCase()}</span>
          </button>
        </div>
        <h2 className="px-font text-[13px] sm:text-[20px] text-cream title-shadow text-center">WORLD MAP</h2>
        <div className="text-right">
          <div className="px-font text-[8px] text-mint tracking-widest hidden sm:block">BEST</div>
          <div className="px-font text-[11px] sm:text-[13px] text-gold">{String(props.save.high).padStart(6, "0")}</div>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center px-3 sm:px-6 min-h-[540px] sm:min-h-0 py-4">
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:flex md:items-start md:justify-center md:gap-3 lg:gap-6">
          {LEVELS.map((lv, i) => {
            const th = THEMES[lv.theme];
            const unlocked = i < props.save.unlocked;
            const cleared = props.save.cleared[i];
            return (
              <div key={i} className="flex items-start justify-self-center">
                <div className="flex flex-col items-center w-[150px] max-w-[44vw] md:max-w-none">
                  <button
                    onClick={() => props.onPick(i)}
                    className={`relative w-[104px] h-[104px] rounded-full border-4 border-[#071620] shadow-[0_7px_0_#071620] cursor-pointer transition-transform duration-150 ${props.denied === i ? "anim-denied" : ""} ${unlocked ? "hover:-translate-y-2 hover:shadow-[0_11px_0_#071620]" : "opacity-90"}`}
                    style={{ background: `linear-gradient(160deg, ${th.sky[0]}, ${th.sky[1]} 55%, ${th.farAlt})` }}
                    aria-label={`World ${i + 1}: ${lv.name}`}
                  >
                    {unlocked ? (
                      <span className="px-font text-[26px] text-[#0b1f2c]/80">{i + 1}</span>
                    ) : (
                      <span className="flex items-center justify-center"><span className="bg-[#071620]/70 rounded-full p-2.5"><LockIconSvg /></span></span>
                    )}
                    {cleared && (
                      <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-gold border-3 border-[#071620] flex items-center justify-center shadow-[0_3px_0_#071620]">
                        <CheckIcon />
                      </span>
                    )}
                  </button>
                  <div className="mt-4 text-center">
                    <div className="px-font text-[9px] text-cream leading-relaxed">{lv.name.toUpperCase()}</div>
                    <div className="font-body text-[12px] text-cream/55 mt-1 italic">{lv.sub}</div>
                    <div className="mt-2 flex items-center justify-center gap-1.5">
                      {lv.hasBoss && <span className="px-font text-[7px] text-ember border-2 border-ember2 rounded px-1.5 py-0.5 bg-[#23080d]/60">BOSS</span>}
                      {th.icy && <span className="px-font text-[7px] text-[#9fe8ff] border-2 border-[#9fe8ff]/60 rounded px-1.5 py-0.5 bg-[#0b1f2c]/60">ICY</span>}
                      {!unlocked && <span className="px-font text-[7px] text-cream/50 border-2 border-cream/30 rounded px-1.5 py-0.5 bg-[#0b1f2c]/60">LOCKED</span>}
                    </div>
                  </div>
                </div>
                {i < LEVELS.length - 1 && (
                  <div className="hidden md:block mt-[46px] w-6 lg:w-10 border-t-4 border-dashed border-cream/25" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 pb-6 text-center font-body text-[13px] text-cream/45">
        Clear a world to unlock the next. Your best score and unlocks are kept on this device.
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

/* ---------------- character portrait ---------------- */
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

/* ---------------- hero select ---------------- */
function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="px-font text-[7px] text-cream/60 w-8">{label}</span>
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

function HeroSelect(props: { charId: string; audio: AudioEngine; onBack: () => void; onPick: (id: string) => void; onContinue: () => void }) {
  return (
    <div className="relative w-full h-full overflow-y-auto no-scrollbar flex flex-col" style={{ background: "linear-gradient(180deg,#0b1f2c 0%,#123043 62%,#1d4258 100%)" }}>
      {Array.from({ length: 22 }).map((_, i) => (
        <div key={i} className="absolute rounded-full bg-cream/60" style={{
          left: `${(i * 43 + 9) % 100}%`, top: `${(i * 29 + 4) % 52}%`, width: 2, height: 2,
          animation: `blinkStep ${2 + (i % 3)}s ease-in-out ${(i % 5) * 0.5}s infinite`,
        }} />
      ))}
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={`e${i}`} className="absolute rounded-full" style={{
          left: `${(i * 61 + 20) % 100}%`, bottom: "-4%", width: 4, height: 4,
          background: i % 2 ? "#ff8c3b" : "#ffc94d", opacity: 0.7,
          animation: `confall ${7 + (i % 4) * 2}s linear ${i * 0.8}s infinite reverse`,
        }} />
      ))}

      <div className="relative z-10 max-w-6xl w-full mx-auto px-3 sm:px-8 pt-5 sm:pt-7 flex items-center justify-between gap-2">
        <button className="btn8 dark !text-[9px] sm:!text-[10px] !px-3 sm:!px-4" onClick={props.onBack}><BackIcon /> Back</button>
        <h2 className="px-font text-[12px] sm:text-[18px] md:text-[22px] text-cream title-shadow text-center">CHOOSE YOUR HERO</h2>
        <div className="text-right hidden sm:block">
          <div className="px-font text-[8px] text-mint tracking-widest">ROSTER</div>
          <div className="px-font text-[13px] text-gold">4 READY</div>
        </div>
      </div>
      <p className="relative z-10 text-center font-body text-[14px] text-cream/60 italic mt-2">
        Every hero runs the same worlds their own way — speed, spring or stubbornness.
      </p>

      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-4 overflow-y-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 w-full max-w-5xl">
          {CHARACTERS.map((c) => {
            const active = c.id === props.charId;
            return (
              <button
                key={c.id}
                onClick={() => { props.audio.unlock(); props.audio.coin(); props.onPick(c.id); }}
                className={`panel8 relative text-left px-4 pt-5 pb-4 cursor-pointer transition-all duration-150 hover:-translate-y-1.5 group ${active ? "outline outline-4 outline-gold -translate-y-1" : ""}`}
                style={active ? { boxShadow: "0 6px 0 #071620, 0 0 34px rgba(255,201,77,0.25)" } : undefined}
              >
                {active && (
                  <span key={`badge-${c.id}`} className="anim-pop absolute -top-3 right-3 px-font text-[7px] text-[#241505] bg-gold border-2 border-[#0b1f2c] rounded px-2 py-1 shadow-[0_3px_0_#071620]">
                    ACTIVE
                  </span>
                )}
                <div className="flex justify-center mb-3">
                  <div
                    className={`w-24 h-24 rounded-full border-4 border-[#0b1f2c] shadow-[0_5px_0_#071620] overflow-hidden transition-transform duration-200 group-hover:scale-105 ${active ? "anim-float" : ""}`}
                    style={{ background: `linear-gradient(160deg, ${c.bodyDark}44, #1d4258)` }}
                  >
                    <CharPortrait char={c} />
                  </div>
                </div>
                <div className="text-center mb-3">
                  <div className="px-font text-[13px] text-cream">{c.name.toUpperCase()}</div>
                  <div className="px-font text-[7px] tracking-widest mt-1.5" style={{ color: c.body === "#cfd8dc" ? "#9fe8ff" : c.body }}>{c.species.toUpperCase()}</div>
                  <p className="font-body text-[12px] text-cream/60 leading-snug mt-2 min-h-[42px]">{c.tagline}</p>
                </div>
                <div className="space-y-1.5 mb-3">
                  <StatBar label="SPD" value={c.stats.speed} color="#7be0c3" />
                  <StatBar label="JMP" value={c.stats.jump} color="#ffc94d" />
                  <StatBar label="PWR" value={c.stats.power} color="#ff8c3b" />
                </div>
                <div className="flex items-center justify-between border-t-2 border-[#0b1f2c] pt-2.5">
                  <span className="px-font text-[7px] text-cream/60">LIVES</span>
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

      <div className="relative z-10 pb-6 flex justify-center">
        <button className="btn8 gold !text-[12px] !px-8" onClick={props.onContinue}><PlayIcon /> To the World Map</button>
      </div>
    </div>
  );
}

/* ---------------- help modal ---------------- */
function HelpModal(props: { onClose: () => void }) {
  const Row = ({ k, label }: { k: string[]; label: string }) => (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-cream/85">{label}</span>
      <span className="flex gap-1">{k.map((x) => <span key={x} className="kbd">{x}</span>)}</span>
    </div>
  );
  const Foe = ({ color, name, tip }: { color: string; name: string; tip: string }) => (
    <div className="flex items-start gap-3 py-1.5">
      <span className="mt-1 w-4 h-4 rounded-full border-2 border-[#0b1f2c] shrink-0" style={{ background: color }} />
      <div>
        <span className="font-semibold text-cream">{name}</span>
        <span className="text-cream/65"> — {tip}</span>
      </div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 bg-[#071620]/85 flex items-center justify-center p-4" onClick={props.onClose}>
      <div className="panel8 anim-pop max-w-3xl w-full max-h-[92vh] overflow-y-auto px-8 py-7" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="px-font text-[16px] text-gold title-shadow">FIELD GUIDE</h3>
          <button className="btn8 red !text-[9px] !px-3 !py-2" onClick={props.onClose}>Close</button>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="px-font text-[9px] text-mint mb-2 tracking-widest">CONTROLS</div>
            <div className="font-body text-[14px] divide-y divide-[#0b1f2c]">
              <Row k={["←", "→"]} label="Move" />
              <Row k={["SPACE", "Z"]} label="Jump (hold for higher)" />
              <Row k={["SHIFT", "X"]} label="Run faster" />
              <Row k={["↓", "+", "JUMP"]} label="Drop through planks" />
              <Row k={["ESC", "P"]} label="Pause" />
            </div>
            <div className="px-font text-[9px] text-mint mb-2 mt-6 tracking-widest">GOAL</div>
            <p className="font-body text-[14px] text-cream/75 leading-relaxed">
              Reach the <span className="text-gold font-semibold">star flag</span> at the end of each world.
              Touch <span className="text-mint font-semibold">checkpoint flags</span> to set your respawn.
              Stomp foes from above, grab <span className="text-ember font-semibold">Ember Fruit</span> to grow
              and shrug off one hit, and remember: 100 coins buys an extra life.
            </p>
          </div>
          <div>
            <div className="px-font text-[9px] text-mint mb-2 tracking-widest">KNOW YOUR FOES</div>
            <div className="font-body text-[14px] divide-y divide-[#0b1f2c]">
              <Foe color="#3f9e7e" name="Munchling" tip="wanders back and forth. Stomp it." />
              <Foe color="#d95f76" name="Flutterwing" tip="swoops in waves. Time your stomp." />
              <Foe color="#e5a13f" name="Boinger" tip="springs toward you. Stomp mid-hop." />
              <Foe color="#c04a44" name="Prickler" tip="spiked dome — never stomp. Jump over." />
              <Foe color="#ff6b4a" name="Snapjaw" tip="lurks in pipes. Watch its rhythm." />
              <Foe color="#3c2226" name="Magmor" tip="the Ember King. Six stomps on the crown." />
            </div>
            <div className="px-font text-[9px] text-mint mb-2 mt-6 tracking-widest">HAZARDS</div>
            <p className="font-body text-[14px] text-cream/75 leading-relaxed">
              Spikes, lava and long falls cost a life instantly — even with Ember Power.
              Moving platforms carry you; ice worlds barely grip your paws. The clock is real: run out and the world restarts you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
