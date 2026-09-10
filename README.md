# 🐾 Pixel Pals: Adventure Run

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live_Demo-pixelpals--game.vercel.app-ff8c3b?style=for-the-badge&logo=vercel&logoColor=white)](https://pixelpals-game.vercel.app/)
[![Portfolio](https://img.shields.io/badge/Developer-Abhishek-5cc257?style=for-the-badge&logo=safari&logoColor=white)](https://abhiishek.is-a.dev/)
[![License](https://img.shields.io/badge/License-MIT-ffd23f?style=for-the-badge)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

**A vibrant, fast-paced retro-modern 2D animal platformer built with HTML5 Canvas, TypeScript, React, and a procedural Web Audio API synthesizer.**

[🕹️ Play Game Now](https://pixelpals-game.vercel.app/) • [✨ Features](#-key-features) • [🦊 Heroes](#-playable-heroes) • [🗺️ Worlds](#️-5-handcrafted-worlds) • [🕹️ Controls](#️-controls) • [🛠️ Setup](#️-getting-started-locally)

</div>

---

## 🌟 Overview

**Pixel Pals: Adventure Run** is a modern love letter to 16-bit golden-era platformers (*Super Mario World*, *Sonic the Hedgehog*, and *Celeste*). Built from scratch without bloated game engines, it features sub-pixel delta physics, dynamic camera tracking, interactive character eye physics, handcrafted levels, responsive mobile touch decks, and a completely procedural chiptune audio synthesizer.

Traverse 5 distinct worlds, bounce off stompers, uncover hidden power fruits, and confront **Magmor, the Ember King** in an intense 3-phase final boss battle.

---

## ✨ Key Features

* **⚡ Pure HTML5 Canvas 2D Engine**: Built from the ground up with 60/120 FPS sub-pixel physics, velocity dampening, variable jump heights, coyote-time forgiveness, and jump buffering.
* **👀 Dynamic Eye Tracking**:
  * **Ember the Fox** tracks your mouse cursor across the desktop and follows touch drags on mobile screens in real time.
  * **Living Foes**: Bouncers, walkers, flyers, and spikers actively turn their eyes and track the player across 360° coordinates.
* **🎵 100% Procedural Web Audio API Synthesizer**: Zero external MP3 or WAV audio assets. Every music melody, bassline, jump sound, fireball, and coin chime is procedurally synthesized in real time using Web Audio oscillators and noise nodes.
* **🔥 Thrilling 3-Phase Final Boss (Magmor the Ember King)**:
  * High-speed pursuit (`125 → 175 → 235 px/s`) across 3 escalating phases.
  * Targeted charging rushes with emergency skid-brakes and ground shockwaves.
  * Dual ground fire waves and falling volcanic stalactites targeted at the player.
  * Anti-camping volcano eruption mechanics and blazing charge armor.
  * Raging Berserk mode with crimson aura and flame minions.
* **📱 Adaptive Cross-Device Controls**:
  * Desktop keyboard controls with pause shortcut guides.
  * Ergonomic mobile and tablet touch deck with safe-area inset protection, comfortable thumb spacing, and landscape arcade support.
* **📺 Retro Polish**: CRT scanlines toggle, camera zoom options, parallax scrolling backgrounds, weather particle systems, and confetti celebrations.
* **💾 High Score Persistence**: Local storage save state tracks highest scores, best completion times, coins collected, and unlocked worlds.

---

## 🦊 Playable Heroes

Switch heroes anytime in the Field Guide or Level Select to match your playstyle:

| Hero | Species | Passive Trait | Speed | Jump | Power | Playstyle |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **Ember** | Fox | **Heart of Cinders** | ★★★☆☆ | ★★★☆☆ | ★★★☆☆ | **Balanced Trailblazer** — Reliable all-around physics, no weaknesses, all heart. |
| **Bramble** | Bear | **Grizzly Fortitude** | ★★★☆☆ | ★★☆☆☆ | ★★★★★ | **Heavy Juggernaut** — Starts every world with 4 lives and heavy traction. |
| **Pip** | Frog | **Lilypad Spring** | ★★☆☆☆ | ★★★★★ | ★★☆☆☆ | **High Jumper** — Maximum jump clearance and floaty mid-air precision. |
| **Zip** | Hare | **Sonic Sprint** | ★★★★★ | ★★★☆☆ | ★★☆☆☆ | **Speed Demon** — Blistering top running velocity for speedrunners. |

---

## 🗺️ 5 Handcrafted Worlds

Every world features unique color palettes, custom terrain tiles, atmospheric weather particles, and procedural chiptune soundtracks:

1. **🌿 World 1: Jade Grove** (*Whispering Canopy*)
   * Gentle rolling hills, floating brick secrets, and introductory platforming mechanics.
2. **💎 World 2: Sunken Grotto** (*Luminous Depths*)
   * Bioluminescent underground cavern with moving platforms, pipe chompers, and narrow shafts.
3. **🏜️ World 3: Ember Dunes** (*Sunset Sands Over Molten Seams*)
   * High stone mesas, bouncing sand creatures with eye-tracking gaze, and lava pits.
4. **❄️ World 4: Frost Peak** (*Glacial Spires in the Blizzard*)
   * Slippery ice physics, diving airborne predators, and treacherous vertical leaps.
5. **🌋 World 5: Magmor's Forge** (*The Ember King Awaits*)
   * Molten lava lakes, collapsing bridges, fire hazards, and the final boss arena showdown with **Magmor**.

---

## 🕹️ Controls

### Desktop & Laptop Keyboard

| Action | Primary Key | Alternate Key |
| :--- | :---: | :---: |
| **Move Left / Right** | `←` / `→` | `A` / `D` |
| **Jump** (Hold for higher leap) | `SPACE` | `Z` |
| **Run / Sprint** | `SHIFT` | `X` |
| **Drop Through One-Way Planks** | `↓` + `Jump` | `S` + `Jump` |
| **Pause Menu** | `ESC` | `P` |
| **Fullscreen Toggle** | `F` | — |
| **Zoom Viewport** | `Z` *(in Pause)* | — |

### Mobile & Tablet Touch Deck
* **Left D-Pad**: Comfortable horizontal thumb buttons (`[ ← ]` and `[ → ]`).
* **Right Action Cluster**: Dedicated **Jump** (`[ ↑ ]`) and **Run** (`[ ⚡ ]`) tactile buttons.
* **Auto-Orientation Hint**: Automatically suggests rotating sideways for widescreen arcade view.

---

## 🚀 Tech Stack & Architecture

```
Pixel-Pals-Adventure-Run/
├── src/
│   ├── components/
│   │   ├── GameCanvas.tsx       # Canvas render loop, HUD, touch controls, pause menu
│   │   └── FeedbackModal.tsx    # In-game feedback modal & suggestions
│   ├── game/
│   │   ├── engine.ts            # Core physics, collision, entity manager, boss AI, rendering
│   │   ├── audio.ts             # Web Audio API procedural synthesizer (music & SFX)
│   │   ├── characters.ts        # Hero roster stats, passives, and color palettes
│   │   └── levels.ts            # Tile grid definitions, themes, and builder DSL
│   ├── App.tsx                  # Screen management (Menu, Select, Levels, Game)
│   ├── index.css                # Retro typography, retro animations, CRT scanlines
│   └── main.tsx                 # Application entry point
├── public/                      # Icons and static web manifests
└── package.json
```

- **Framework**: React 18, TypeScript, Vite 6
- **Styling**: Tailwind CSS v4 + Vanilla CSS animations
- **Physics**: Custom AABB collision with sub-pixel delta stepping
- **Audio Engine**: Real-time synthesized Web Audio API (Square, Triangle, Sawtooth, White Noise)
- **Analytics**: Vercel Analytics integration

---

## 🛠️ Getting Started Locally

### Prerequisites
* [Node.js](https://nodejs.org/) (version 18 or higher recommended)
* `npm` (or `pnpm` / `yarn`)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/codewithabhiishek/Pixel-Pals.git

# 2. Navigate into the project folder
cd Pixel-Pals

# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser to play!

### Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts local development server with HMR |
| `npm run build` | Builds optimized production bundle |
| `npm run typecheck` | Validates TypeScript types (`tsc --noEmit`) |

---

## 👨‍💻 Author

Crafted with passion by **Abhishek**

* 🌐 **Portfolio**: [abhiishek.is-a.dev](https://abhiishek.is-a.dev/)
* 🐙 **GitHub**: [@codewithabhiishek](https://github.com/codewithabhiishek)
* 🎨 **Project Gallery**: [Abhishek's Project Gallery](https://abhishek-project-gallery.vercel.app/)

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
