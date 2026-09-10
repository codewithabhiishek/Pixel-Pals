import { useState, useEffect, useRef, useCallback } from "react";
import confetti from "canvas-confetti";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  context?: {
    world?: string;
    score?: number;
    levelIdx?: number;
    heroName?: string;
    note?: string;
  };
}

interface Category {
  id: "idea" | "bug" | "praise";
  icon: string;
  label: string;
  badge: string;
  hint: string;
  placeholder: string;
  subjectPrefix: string;
  chips: { label: string; text: string }[];
}

const CATEGORIES: Category[] = [
  {
    id: "idea",
    icon: "💡",
    label: "Game Idea",
    badge: "NEW MECHANIC / WORLD",
    hint: "Got a cool idea for a new hero, mechanic, or retro power-up?",
    placeholder: "Pitch your suggestion or feature idea here...",
    subjectPrefix: "💡 Pixel Pals Idea",
    chips: [
      { label: "🦉 Flying Hero", text: "Add a flying hero (like an owl or bat) with glide mechanics!" },
      { label: "❄️ Ice Power-up", text: "Add an ice shield or speed-dash booster fruit in blocks!" },
      { label: "🌌 Space World", text: "Add a low-gravity Space/Cosmic world with alien foes!" },
      { label: "⚡ Speed-run Mode", text: "Add a speed-run timer mode with medals for beating levels fast!" },
    ],
  },
  {
    id: "bug",
    icon: "🐛",
    label: "Bug Report",
    badge: "GLITCH / ISSUE",
    hint: "Spotted collision bugs, touch control delays, or audio issues?",
    placeholder: "What went wrong? (e.g. mobile button lag, stomp missed, audio cut off)...",
    subjectPrefix: "🐛 Pixel Pals Bug",
    chips: [
      { label: "📱 Touch D-pad Delay", text: "On mobile browsers, there is a slight touch responsiveness lag." },
      { label: "🔊 Audio Stutter", text: "Chiptune music or SFX occasionally cut out during fast restarts." },
      { label: "👾 Enemy Hitbox", text: "Stomping enemies near the edge of a pipe felt slightly misaligned." },
      { label: "🔄 Viewport Shift", text: "The layout shifted when rotating between portrait and landscape." },
    ],
  },
  {
    id: "praise",
    icon: "★",
    label: "Review & Like",
    badge: "FEEDBACK / PRAISE",
    hint: "Did you love the game? Flex your score, drop a rating, or say hi to Abhishek!",
    placeholder: "Tell Abhishek what you enjoyed or what to build next...",
    subjectPrefix: "💬 Pixel Pals Review",
    chips: [
      { label: "❤️ Loved It!", text: "This game is incredible! The pixel physics and animations feel like classic SNES games." },
      { label: "👑 Boss Battle", text: "The Magmor boss fight in World 5 was super fun and creative!" },
      { label: "🏆 High Score Flex", text: "Just cleared the game with a massive high score! Beautiful retro vibes." },
      { label: "🤝 Connect with Abhishek", text: "Hey Abhishek, loved playing Pixel Pals! Would love to connect about web development." },
    ],
  },
];

const COOLDOWN_SECONDS = 60;
const MAX_HOURLY_DISPATCHES = 5;
const WEB3FORMS_KEY =
  (import.meta as any).env?.VITE_WEB3FORMS_KEY || "8a1e06e5-be91-4200-8d77-df95f527bcd9";

function getRecentDispatchesCount(): number {
  try {
    const raw = JSON.parse(localStorage.getItem("pixel_pals:feedback_history") || "[]");
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const valid = Array.isArray(raw) ? raw.filter((ts: number) => ts > oneHourAgo) : [];
    return valid.length;
  } catch {
    return 0;
  }
}

function recordDispatchTimestamp(): void {
  try {
    const raw = JSON.parse(localStorage.getItem("pixel_pals:feedback_history") || "[]");
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const valid = Array.isArray(raw) ? raw.filter((ts: number) => ts > oneHourAgo) : [];
    valid.push(Date.now());
    localStorage.setItem("pixel_pals:feedback_history", JSON.stringify(valid));
  } catch {}
}

export default function FeedbackModal({ open, onClose, context }: FeedbackModalProps) {
  const [activeCategory, setActiveCategory] = useState<"idea" | "bug" | "praise">("idea");
  const [rating, setRating] = useState<"love" | "good" | "needs_work" | null>("love");
  const [name, setName] = useState<string>(() => {
    try {
      return localStorage.getItem("pixel_pals:feedback_name") || "";
    } catch {
      return "";
    }
  });
  const [email, setEmail] = useState<string>(() => {
    try {
      return localStorage.getItem("pixel_pals:feedback_email") || "";
    } catch {
      return "";
    }
  });
  const [message, setMessage] = useState<string>("");

  // Strix Honeypots & Anti-Spam States
  const [botcheck, setBotcheck] = useState<boolean>(false);
  const [decoyGotcha, setDecoyGotcha] = useState<string>("");
  const formOpenedAtRef = useRef<number>(Date.now());

  // Cooldown & Status States
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Reset/sync on open
  useEffect(() => {
    if (!open) return;
    formOpenedAtRef.current = Date.now();
    setStatus("idle");
    setErrorMessage("");

    try {
      const lastTs = parseInt(localStorage.getItem("pixel_pals:feedback_last_ts") || "0", 10);
      const diff = Math.floor((Date.now() - lastTs) / 1000);
      if (diff < COOLDOWN_SECONDS) {
        setCooldownRemaining(COOLDOWN_SECONDS - diff);
      } else {
        setCooldownRemaining(0);
      }
    } catch {
      setCooldownRemaining(0);
    }
  }, [open]);

  // Cooldown countdown interval
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const currentCat = CATEGORIES.find((c) => c.id === activeCategory) || CATEGORIES[0];

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // 1. Strix Honeypot Defense
      if (botcheck || decoyGotcha.trim().length > 0) {
        // Silently drop bot submission
        setStatus("success");
        return;
      }

      // 2. Strix Speed-Trap Defense (< 1.8 seconds)
      const elapsedMs = Date.now() - formOpenedAtRef.current;
      if (elapsedMs < 1800) {
        setErrorMessage("Submission too fast! Please take a moment to write your suggestion.");
        setStatus("error");
        return;
      }

      // 3. Strix Cooldown Enforcement
      if (cooldownRemaining > 0) {
        setErrorMessage(`⏳ Cooldown active: Please wait ${cooldownRemaining}s before sending another.`);
        setStatus("error");
        return;
      }

      // 4. Strix Hourly Rate Limit Defense
      const hourlyDispatches = getRecentDispatchesCount();
      if (hourlyDispatches >= MAX_HOURLY_DISPATCHES) {
        setErrorMessage(`⚠️ Hourly limit reached (${MAX_HOURLY_DISPATCHES}/hr). Please try again later.`);
        setStatus("error");
        return;
      }

      // 5. Input Validation & Sanitization (Strip HTML tags)
      const cleanMessage = message.replace(/<[^>]*>?/gm, "").trim().slice(0, 500);
      if (!cleanMessage) {
        setErrorMessage("Please enter your suggestion or feedback.");
        setStatus("error");
        return;
      }

      const cleanName = name.replace(/<[^>]*>?/gm, "").trim().slice(0, 60);
      const cleanEmail = email.replace(/<[^>]*>?/gm, "").trim().slice(0, 80);

      // Save user identity in localStorage
      try {
        if (cleanName) localStorage.setItem("pixel_pals:feedback_name", cleanName);
        if (cleanEmail) localStorage.setItem("pixel_pals:feedback_email", cleanEmail);
      } catch {}

      setStatus("submitting");
      setErrorMessage("");

      // Compose full payload
      let finalBody = `Category: ${currentCat.label}\n`;
      if (rating) {
        finalBody += `Vibe / Rating: ${rating === "love" ? "🔥 10/10 Loved it!" : rating === "good" ? "👍 Good game" : "💡 Needs work"}\n`;
      }
      finalBody += `\nMessage:\n${cleanMessage}\n\n`;

      if (context) {
        finalBody += `--- Pixel Pals Game Context ---\n`;
        if (context.world) finalBody += `World: ${context.world}\n`;
        if (typeof context.levelIdx === "number") finalBody += `Level Index: ${context.levelIdx + 1}\n`;
        if (typeof context.score === "number") finalBody += `Score: ${context.score}\n`;
        if (context.heroName) finalBody += `Active Hero: ${context.heroName}\n`;
        if (context.note) finalBody += `Context: ${context.note}\n`;
      }
      finalBody += `Device: ${window.innerWidth}x${window.innerHeight} (${navigator.userAgent.slice(0, 90)})\n`;

      try {
        const res = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            access_key: WEB3FORMS_KEY,
            subject: `${currentCat.subjectPrefix}: ${cleanName || "Anonymous Player"}`,
            from_name: cleanName || "Pixel Pals Player",
            replyto: cleanEmail || undefined,
            name: cleanName || "Anonymous Player",
            email: cleanEmail || "noreply@pixel-pals.local",
            message: finalBody,
            botcheck: false,
          }),
        });

        const data = await res.json();
        if (data.success) {
          recordDispatchTimestamp();
          try {
            localStorage.setItem("pixel_pals:feedback_last_ts", Date.now().toString());
          } catch {}
          setCooldownRemaining(COOLDOWN_SECONDS);
          setStatus("success");
          setMessage("");

          // Celebration confetti burst
          try {
            confetti({
              particleCount: 55,
              spread: 70,
              origin: { y: 0.5 },
              colors: ["#ff8c3b", "#ffc94d", "#7be0c3", "#ff5a5f"],
            });
          } catch {}
        } else {
          throw new Error(data.message || "Failed to dispatch feedback.");
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Could not send. Please check your internet connection.");
        setStatus("error");
      }
    },
    [botcheck, decoyGotcha, cooldownRemaining, message, name, email, currentCat, rating, context]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#071620]/85 backdrop-blur-[3px] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="panel8 anim-pop relative w-full max-w-xl max-h-[92vh] overflow-y-auto no-scrollbar p-4 sm:p-6 my-auto text-left shadow-2xl bg-[#0b1f2c] border-2 border-[#1d4258]"
        style={{ borderWidth: 3 }}
      >
        {/* Header with Title and Retro Close Button */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-[#123043] gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-[1px] bg-mint animate-pulse" />
            <h3 className="px-font text-[11px] sm:text-[13px] text-gold tracking-wide">
              SUGGESTIONS & FEEDBACK
            </h3>
          </div>
          <button
            onClick={onClose}
            className="panel8 !px-2.5 !py-1 text-xs text-cream/70 hover:text-gold hover:border-gold cursor-pointer transition-colors focus-arcade active:translate-y-0.5"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Success State */}
        {status === "success" ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-mint/20 border-2 border-mint flex items-center justify-center text-xl">
              ✓
            </div>
            <div className="px-font text-[14px] text-mint title-shadow">THANK YOU!</div>
            <p className="font-body text-cream/80 text-sm max-w-md mx-auto leading-relaxed">
              Your suggestion has been sent directly to <strong className="text-gold">Abhishek</strong>. Thanks for helping make Pixel Pals even better!
            </p>
            {cooldownRemaining > 0 && (
              <div className="font-body text-xs text-cream/50">
                Cooldown active: Next submission in {cooldownRemaining}s
              </div>
            )}
            <div className="pt-2">
              <button className="btn8 primary-arcade !px-6 !py-2.5 !text-[10px]" onClick={onClose}>
                Back to Game
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-3 space-y-3.5">
            {/* Category Switcher Tabs */}
            <div>
              <div className="px-font text-[7px] text-mint tracking-widest mb-1.5">
                SELECT CATEGORY
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setActiveCategory(cat.id);
                        setErrorMessage("");
                      }}
                      className={`panel8 !px-2 !py-2 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        isActive
                          ? "!bg-[#1d4258] !border-gold shadow-[0_0_12px_rgba(255,201,77,0.3)]"
                          : "opacity-75 hover:opacity-100 hover:border-[#27556f]"
                      }`}
                    >
                      <span className="text-sm">{cat.icon}</span>
                      <span className="px-font text-[7px] sm:text-[8px] text-cream whitespace-nowrap">
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hint Badge */}
            <div className="p-2 rounded bg-[#071620] border border-[#123043] flex items-center justify-between gap-2 text-left">
              <div className="font-body text-[11.5px] text-cream/70 leading-tight">
                <span className="text-gold font-bold mr-1">✦</span>
                {currentCat.hint}
              </div>
              <span className="px-font text-[6.5px] text-mint/80 bg-[#123043] px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
                {currentCat.badge}
              </span>
            </div>

            {/* Quick Suggestion Chips */}
            <div>
              <div className="px-font text-[6.5px] sm:text-[7px] text-mint/75 tracking-wider mb-1 flex items-center gap-1">
                <span>QUICK IDEAS (TAP TO INSERT):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {currentCat.chips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setMessage(chip.text)}
                    className="panel8 !px-2 !py-1 !text-[7px] sm:!text-[7.5px] text-cream/80 hover:text-gold hover:border-gold transition-colors cursor-pointer active:translate-y-0.5 text-left"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating Pills (for praise/reviews) */}
            {activeCategory === "praise" && (
              <div>
                <div className="px-font text-[6.5px] sm:text-[7px] text-mint/75 tracking-wider mb-1">
                  OVERALL VIBE
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { id: "love" as const, label: "🔥 10/10 Loved It" },
                    { id: "good" as const, label: "👍 Good Run" },
                    { id: "needs_work" as const, label: "💡 Needs Polish" },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRating(r.id)}
                      className={`panel8 !px-2.5 !py-1 text-[8px] font-bold cursor-pointer transition-all ${
                        rating === r.id
                          ? "!bg-[#1d4258] !border-gold text-gold"
                          : "text-cream/70 hover:text-cream"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="px-font text-[7px] sm:text-[8px] text-cream/90">
                  YOUR MESSAGE / SUGGESTION <span className="text-coral">*</span>
                </label>
                <span className="font-body text-[10px] text-cream/40">
                  {message.length} / 500
                </span>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                placeholder={currentCat.placeholder}
                rows={3}
                required
                maxLength={500}
                className="w-full p-2.5 rounded bg-[#071620] border-2 border-[#123043] focus:border-gold focus:outline-none text-cream font-body text-xs sm:text-sm resize-none leading-relaxed transition-colors placeholder:text-cream/30"
              />
            </div>

            {/* Optional Name & Email for reply */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block px-font text-[6.5px] sm:text-[7px] text-cream/80 mb-1">
                  YOUR NAME (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 60))}
                  placeholder="e.g. RetroFan99"
                  maxLength={60}
                  className="w-full px-2.5 py-1.5 rounded bg-[#071620] border-2 border-[#123043] focus:border-gold focus:outline-none text-cream font-body text-xs transition-colors placeholder:text-cream/30"
                />
              </div>
              <div>
                <label className="block px-font text-[6.5px] sm:text-[7px] text-cream/80 mb-1">
                  EMAIL FOR REPLY (OPTIONAL)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.slice(0, 80))}
                  placeholder="e.g. player@arcade.dev"
                  maxLength={80}
                  className="w-full px-2.5 py-1.5 rounded bg-[#071620] border-2 border-[#123043] focus:border-gold focus:outline-none text-cream font-body text-xs transition-colors placeholder:text-cream/30"
                />
              </div>
            </div>

            {/* Honeypots (Invisible to humans, caught by bots) */}
            <input
              type="checkbox"
              name="botcheck"
              checked={botcheck}
              onChange={(e) => setBotcheck(e.target.checked)}
              className="hidden"
              style={{ display: "none" }}
              tabIndex={-1}
              autoComplete="off"
            />
            <input
              type="text"
              name="_gotcha"
              value={decoyGotcha}
              onChange={(e) => setDecoyGotcha(e.target.value)}
              className="hidden"
              style={{ display: "none" }}
              tabIndex={-1}
              autoComplete="off"
            />

            {/* Game Context Tag (if provided) */}
            {context && (
              <div className="font-body text-[10.5px] text-cream/40 flex items-center gap-1.5 flex-wrap">
                <span className="text-mint">ℹ Context:</span>
                {context.world && <span>World: {context.world}</span>}
                {context.score !== undefined && <span>• Score: {context.score}</span>}
                {context.heroName && <span>• Hero: {context.heroName}</span>}
              </div>
            )}

            {/* Error Message Feedback */}
            {errorMessage && (
              <div className="p-2 rounded bg-coral/15 border border-coral text-coral font-body text-xs">
                {errorMessage}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-1 flex items-center justify-between gap-3 flex-wrap">
              <div className="font-body text-[10.5px] text-cream/45">
                Protected by Strix anti-spam & Web3Forms
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn8 dark !px-3 !py-2 !text-[8.5px] focus-arcade"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={status === "submitting" || cooldownRemaining > 0}
                  className="btn8 primary-arcade !px-5 !py-2 !text-[9px] focus-arcade flex items-center gap-1.5"
                >
                  {status === "submitting" ? (
                    <span>DISPATCHING…</span>
                  ) : cooldownRemaining > 0 ? (
                    <span>COOLDOWN ({cooldownRemaining}s)</span>
                  ) : (
                    <>
                      <span>SEND SUGGESTION</span>
                      <span>➤</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
