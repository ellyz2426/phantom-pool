# 🎱 Phantom Pool VR

**Holodeck-style billiards for WebXR and browser** — built with [IWSDK 0.4.1](https://iwsdk.dev).

Play pool in a neon-lit holodeck environment, complete with physics-based ball mechanics, multiple game modes, and full VR controller support.

🌐 **[Play Now](https://ellyz2426.github.io/phantom-pool/)**

---

## ✨ Features

### 🎮 Game Modes
- **8-Ball** — Full rules: solids/stripes assignment on first pocket, must clear your group then sink the 8
- **9-Ball** — Must hit lowest-numbered ball first; pocket the 9 to win
- **Free Play** — Practice shots with no rules or pressure
- **Trick Shots** — 12 precision challenges: Straight Shot, Bank Shot, Combo Shot, Three Ball Run, Double Kiss, Long Rail, Cluster Break, Corner Sniper, Cross Table, Frozen Rail, Draw Back, Gauntlet
- **🏆 Tournament** — 8-player single-elimination bracket with escalating AI difficulty (Easy → Medium → Hard)

### 🕹️ Dual Input
- **VR Controllers** — Trigger to charge/shoot, right thumbstick to aim, B to pause, A to confirm, left thumbstick for ball-in-hand & spin
- **Browser Mouse/Keyboard** — Click+hold to charge, release to shoot, right-drag to orbit camera, scroll to zoom, arrow keys for spin, ESC to pause

### 🌌 Holodeck Environment
- Neon grid floor, ceiling, and walls
- **6 table themes**: Neon Cyan, Neon Pink, Golden Classic, Purple Haze, Blood Moon, Arctic Frost — each with unique palette for felt, lights, fog, and UI
- 16 animated floating wireframe decorations (torus, cube, sphere, cone)
- 50 drifting ambient particles with pulse effects
- Neon "PHANTOM POOL" sign above the table
- Dramatic 3-point colored lighting with fog

### 🎯 Physics Engine
- Custom 2D billiards physics with 4 substeps per frame
- Ball-to-ball elastic collisions with realistic restitution
- Ball-to-rail bounces with pocket proximity detection
- Rolling friction, angular velocity, ball rotation visuals
- Spin/english system: backspin, topspin, side english with visual indicator
- First-hit tracking and foul detection

### ✨ Visual Effects
- Collision sparks on ball-to-ball impacts (pooled for performance)
- Rail sparkle effects — diamond-shaped particles on cushion bounces
- Pocket flash animations with upward spark bursts
- Cue ball ghost trails on high-speed shots
- Chalk dust puff on cue strike
- Ball-in-hand pulsing indicator ring
- Camera shake on powerful shots
- Neon glow on all balls with speed-reactive intensity
- Stripe bands on balls 9–15, number indicators on all object balls

### 🔊 Audio
- Procedural Web Audio — no audio files needed
- Ball hit clacks with impact-scaled volume/pitch
- Rail bounce thuds, pocket plonk + chime
- Scratch buzz, cue hit tap + woody thud
- Power break rumble, turn change pip
- Game start/win/lose fanfares, achievement unlock arpeggio
- Ambient drone + triangle pad with LFO

### 🏆 Progression
- **20 achievements** with toast notifications and dedicated panel
- **📊 Statistics panel** with comprehensive gameplay stats (win rate, combos, spin usage, etc.)
- Leaderboard with localStorage persistence (top 20 by shots)
- Shot quality feedback system (INCREDIBLE, COMBO, HOT HAND, ON FIRE, GREAT BREAK)
- **Shot replay** — press V to watch slow-motion replay with orbiting camera
- Quick Rematch button for instant rematches

### 🖥️ Spatial UI (17 PanelUI Templates)
- **17 PanelUI `.uikitml` templates — zero HTML DOM overlays**
- Head-following HUD: player name, mode, shot count, power bar, ball counts, streak counter
- Head-following message toast for game events
- Head-following spin indicator and camera mode indicator
- World-space panels: title, mode select, difficulty, pause, game over, settings, leaderboard, achievements, help, themes, tournament bracket, statistics
- Interactive settings with volume +/− controls for Master, SFX, and Music
- Tournament bracket display with live match results
- All panels interactive via XR laser pointer

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥20.19.0

### Install & Run
```bash
npm install
npm run dev
```

### Build & Deploy
```bash
npm run build
# Deploy dist/ to any static host, or push to gh-pages
```

---

## 🎨 Tech Stack
- **IWSDK 0.4.1** — WebXR framework with ECS, PanelUI, XR input
- **Three.js** (via `super-three`) — 3D rendering
- **@pmndrs/uikit** — Spatial UI panels compiled from `.uikitml`
- **Web Audio API** — Procedural sound synthesis
- **Vite** — Build tooling

---

## 📁 Structure
```
phantom-pool/
├── src/
│   ├── index.ts        # Entry point, world setup, input, game loop
│   ├── game.ts         # Game state machine, rules (8-ball, 9-ball, trick shots)
│   ├── physics.ts      # 2D billiards physics engine
│   ├── balls.ts        # Ball creation, rack layouts, visual updates
│   ├── cue.ts          # Cue stick with charge/release mechanics
│   ├── table.ts        # Pool table geometry (surface, rails, pockets, diamonds)
│   ├── environment.ts  # Holodeck environment, neon sign, animated decorations
│   ├── effects.ts      # Visual effects (sparks, rail sparkles, trails, chalk dust)
│   ├── audio.ts        # Procedural Web Audio sound manager
│   ├── ui.ts           # PanelUI system setup and runtime updates
│   ├── xrinput.ts      # VR controller input handler
│   ├── ai.ts           # AI opponent with 3 difficulty levels
│   ├── camera.ts       # Camera controller (4 modes: orbit, top-down, behind, follow)
│   ├── tray.ts         # Pocketed ball tray display
│   ├── spin.ts         # Spin/English system (backspin, topspin, side english)
│   ├── achievements.ts # 20 achievements with progress tracking
│   ├── themes.ts       # 6 neon table themes with color palettes
│   ├── tournament.ts   # 8-player bracket tournament mode
│   └── replay.ts       # Shot replay with slow-motion cinematic camera
├── ui/                 # 17 .uikitml panel templates (compiled to JSON)
├── public/ui/          # Compiled UI JSON
├── dist/               # Production build output
└── vite.config.ts      # Vite + IWSDK + UIKitML plugin config
```

---

Built with ❤️ by Kit for the IWSDK daily build pipeline.
