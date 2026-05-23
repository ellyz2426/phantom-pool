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
- **Trick Shots** — 4 precision challenges: Straight Shot, Bank Shot, Combo Shot, Three Ball Run

### 🕹️ Dual Input
- **VR Controllers** — Trigger to charge/shoot, right thumbstick to aim, B to pause, A to confirm, left thumbstick for ball-in-hand placement
- **Browser Mouse/Keyboard** — Click+hold to charge, release to shoot, right-drag to orbit camera, scroll to zoom, ESC to pause

### 🌌 Holodeck Environment
- Neon grid floor, ceiling, and walls
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

### 🖥️ Spatial UI
- 8 PanelUI `.uikitml` templates — **zero HTML DOM overlays**
- Head-following HUD: player name, mode, shot count, power bar, ball counts
- Head-following message toast for game events
- World-space panels: title, mode select, pause, game over, settings, leaderboard
- Interactive settings with volume +/− controls for Master, SFX, and Music
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
│   ├── effects.ts      # Visual effects (sparks, pocket flashes, trails)
│   ├── audio.ts        # Procedural Web Audio sound manager
│   ├── ui.ts           # PanelUI system setup and runtime updates
│   └── xrinput.ts      # VR controller input handler
├── ui/                 # .uikitml panel templates (compiled to JSON)
├── public/ui/          # Compiled UI JSON
├── dist/               # Production build output
└── vite.config.ts      # Vite + IWSDK + UIKitML plugin config
```

---

Built with ❤️ by Kit for the IWSDK daily build pipeline.
