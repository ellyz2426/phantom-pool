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
- **Trick Shots** — 8 precision challenges: Straight Shot, Bank Shot, Combo Shot, Three Ball Run, Double Kiss, Long Rail, Cluster Break, Corner Sniper
- **🏆 Tournament** — 8-player single-elimination bracket with escalating AI difficulty (Easy → Medium → Hard)

### 🕹️ Dual Input
- **VR Controllers** — Trigger to charge/shoot, right thumbstick to aim, B to pause, A to confirm, left thumbstick for ball-in-hand placement
- **Browser Mouse/Keyboard** — Click+hold to charge, release to shoot, right-drag to orbit camera, scroll to zoom, ESC to pause

### 🌌 Holodeck Environment
- Neon grid floor, ceiling, and walls
- **4 table themes**: Neon Cyan, Neon Pink, Golden Classic, Purple Haze — each with unique palette for felt, lights, fog, and UI
- 16 animated floating wireframe decorations (torus, cube, sphere, cone)
- 50 drifting ambient particles with pulse effects
- Neon "PHANTOM POOL" sign above the table
- Dramatic 3-point colored lighting with fog

### 🎯 Physics Engine
- Custom 2D billiards physics with 4 substeps per frame
- Ball-to-ball elastic collisions with realistic restitution
- Ball-to-rail bounces with pocket proximity detection
- Rolling friction, angular velocity, minimum velocity cutoff
- First-hit tracking and foul detection

### ✨ Visual Effects
- Collision sparks on ball-to-ball impacts
- Pocket flash animations with upward spark bursts
- Cue ball ghost trails on high-speed shots
- Ball-in-hand pulsing indicator ring
- Neon glow on all balls with speed-reactive intensity
- Stripe bands on balls 9–15, number indicators on all object balls

### 🔊 Audio
- Procedural Web Audio — no audio files needed
- Ball hit clacks with impact-scaled volume/pitch
- Rail bounce thuds, pocket plonk + chime
- Scratch buzz, cue hit tap + woody thud
- Game start/win/lose fanfares
- Ambient drone + triangle pad with LFO

### 🏆 Progression
- Leaderboard with localStorage persistence (top 20 by shots)
- Statistics tracking: total games, best streak
- Shot counter per game
- **15 achievements** with toast notifications and dedicated panel
- **Shot replay** — press V to watch slow-motion replay of last shot with orbiting camera

### 🖥️ Spatial UI
- **16 PanelUI `.uikitml` templates — zero HTML DOM overlays**
- Head-following HUD: player name, mode, shot count, power bar, ball counts, streak counter
- Head-following message toast for game events (INCREDIBLE! HOT HAND! etc.)
- Head-following spin indicator and camera mode indicator
- World-space panels: title, mode select, difficulty, pause, game over, settings, leaderboard, achievements, help, themes, tournament bracket
- Interactive settings with volume +/− controls for Master, SFX, and Music
- Tournament bracket display with live match results
- All panels interactive via XR laser pointer

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥20.19.0
- The [IWSDK](https://github.com/facebook/immersive-web-sdk) monorepo cloned alongside this project

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
│   ├── effects.ts      # Visual effects (sparks, pocket flashes, trails, chalk dust)
│   ├── audio.ts        # Procedural Web Audio sound manager
│   ├── ui.ts           # PanelUI system setup and runtime updates
│   ├── xrinput.ts      # VR controller input handler
│   ├── ai.ts           # AI opponent with 3 difficulty levels
│   ├── camera.ts       # Camera controller (4 modes: orbit, top-down, behind, follow)
│   ├── tray.ts         # Pocketed ball tray display
│   ├── spin.ts         # Spin/English system (backspin, topspin, side english)
│   ├── achievements.ts # 15 achievements with progress tracking
│   ├── themes.ts       # 4 neon table themes with color palettes
│   ├── tournament.ts   # 8-player bracket tournament mode
│   └── replay.ts       # Shot replay with slow-motion cinematic camera
├── ui/                 # 16 .uikitml panel templates (compiled to JSON)
├── public/ui/          # Compiled UI JSON
├── dist/               # Production build output
└── vite.config.ts      # Vite + IWSDK + UIKitML plugin config
```

---

Built with ❤️ by Kit for the IWSDK daily build pipeline.
