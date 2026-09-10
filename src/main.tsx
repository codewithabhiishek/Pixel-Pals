import React from "react";
import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import "./index.css";
import App from "./App";

/* Prevent iOS Safari double-tap-to-zoom and gesture zooming on fast tapping */
if (typeof window !== "undefined") {
  let lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 320) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );

  document.addEventListener("gesturestart", (e) => e.preventDefault());
  document.addEventListener("gesturechange", (e) => e.preventDefault());
  document.addEventListener("gestureend", (e) => e.preventDefault());
}

class BootBoundary extends React.Component<{ children: React.ReactNode }, { err: string | null }> {
  state = { err: null as string | null };
  static getDerivedStateFromError(e: unknown) {
    return { err: e instanceof Error ? e.message : String(e) };
  }
  componentDidCatch(e: unknown) {
    try { console.error("[pixel-pals] render error:", e); } catch { /* noop */ }
    fail("Render error: " + (e instanceof Error ? e.message : String(e)));
  }
  render() {
    if (this.state.err) {
      return (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 10000, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 16,
            background: "#0b1f2c", color: "#fdf3e3", fontFamily: "monospace", padding: 24, textAlign: "center",
          }}
        >
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 16, color: "#ffc94d" }}>
            GAME PAUSED UNEXPECTEDLY
          </div>
          <div style={{ fontSize: 13, color: "#fdf3e3", opacity: 0.75, maxWidth: 460 }}>
            Something went wrong while running the game:
            <br />
            <span style={{ color: "#ff5a5f" }}>{this.state.err}</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              fontFamily: '"Press Start 2P", monospace', fontSize: 11, cursor: "pointer",
              background: "#ff8c3b", color: "#fdf3e3", border: "3px solid #0b1f2c",
              borderRadius: 6, padding: "12px 18px", boxShadow: "0 4px 0 #071620",
            }}
          >
            RESTART
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function fail(msg: string) {
  const el = document.getElementById("boot");
  const text = document.getElementById("boot-msg");
  if (el) el.classList.add("err");
  if (text) text.textContent = msg;
}

try {
  const container = document.getElementById("root");
  if (!container) throw new Error("Missing #root element.");
  ReactDOM.createRoot(container).render(
    <BootBoundary>
      <App />
      <Analytics />
    </BootBoundary>
  );
  (window as unknown as { __booted: boolean }).__booted = true;
} catch (err) {
  try { console.error("[pixel-pals] boot failure:", err); } catch { /* noop */ }
  fail("Failed to start the game: " + (err instanceof Error ? err.message : String(err)));
}
