# 🎱 Phantom Pool VR

**A physics-based billiards game set in a neon holodeck environment, built with IWSDK (Immersive Web SDK).**

Play in VR headsets or browser. Features realistic ball physics with spin/english, AI opponents, tournaments, achievements, and a fully spatial UI system.

🎮 **[Play Now](https://ellyz2426.github.io/phantom-pool/)**

---

## ✨ Features

### Core Gameplay
- **Physics-based 2D billiards** — ball-ball collisions, rail bounces, pocket detection, friction, substeps
- **4 game modes**: 8-Ball (full rules), 9-Ball, Free Play, Trick Shots (12 challenges)
- **Spin/English system** — backspin, topspin, side english with visual indicators
- **Charge-and-release cue stick** with power bar and trajectory prediction
- **Ghost ball targeting** — see predicted collision point and reflected trajectory
- **Ball pocket animation** — smooth drop + shrink when balls enter pockets

### AI & Competitive
- **AI opponent** with 3 difficulty levels (Easy / Medium / Hard)
- **Shot evaluation system** with ghost-ball targeting and path scoring
- **Tournament mode** — 8-player single-elimination bracket with escalating difficulty
- **Match play** — configurable best-of-3, 5, or 7 series
- **2-player local** — pass and play
- **Quick rematch** from game over screen

### Trick Shots
- 12 trick shots with progressive difficulty
- Progress tracker in HUD (trick #, name, shots remaining)
- Skip (N key) and retry (R key) for any trick
- Challenges: Straight Shot, Bank Shot, Combo, Three Ball Run, Double Kiss, Long Rail, Cluster Break, Corner Pocket Sniper, Cross Table, Frozen Rail, Draw Back, Gauntlet

### Visuals & Environment
- **Neon holodeck aesthetic** — glowing wireframe decorations, ambient particles, grid walls/floor/ceiling
- **6 table themes**: Neon Cyan, Neon Pink, Golden Classic, Purple Haze, Blood Moon, Arctic Frost
- **Animated environment** — floating shapes with rotation/bobbing, drifting particles
- **Neon "PHANTOM POOL" sign** above table with glow pulse
- **Dramatic lighting** — 3 colored point lights, fog, hanging light fixture with shaded bulbs
- **Collision sparks**, pocket flashes, cue ball ghost trails, rail sparkle effects, chalk dust particles
- **Camera shake** on powerful shots
- **Pocketed ball tray** — 3D display of captured balls along table sides

### UI System (100% Spatial — Zero HTML DOM)
- **17 PanelUI `.uikitml` templates** compiled by `@iwsdk/vite-plugin-uikitml`
- Head-following HUD (score, player, mode, shots, power bar, streak, trick progress)
- Head-following spin indicator (left side)
- Head-following message toast (game events)
- Head-following achievement toast (auto-dismiss)
- Head-following camera mode indicator
- World-space panels: title, mode select, difficulty select, pause, game over, settings, leaderboard, achievements, help, themes, tournament bracket, stats

### Audio
- **Procedural Web Audio** — no audio files required
- Ball hit, rail bounce, pocket, scratch, cue strike sounds
- Game start/win/lose fanfares, achievement arpeggio
- Chalk dust puff, power break rumble, turn change pip
- Ambient drone + pad with **per-theme mood shifting**
- Volume controls: Master, SFX, Music (independent)

### Progression & Stats
- **20 achievements** across gameplay, difficulty, modes, and progression
- **Comprehensive stats** — games, wins, win rate, pocketed balls, streaks, combos, clean games, CPU wins by difficulty, spins used, tricks completed
- **Leaderboard** — top 20 by shots (localStorage persistence)
- **Theme persistence** — selected theme saved across sessions

### Camera System
- **4 camera modes**: Orbit, Top-Down, Behind Ball, Follow Shot
- Smooth interpolation between modes
- Browser: right-drag orbit, scroll zoom
- Keyboard shortcuts: C cycle, 1-4 direct select

### Shot Replay
- Records ball positions during shots
- Slow-motion cinematic replay with orbiting camera
- V key to trigger, also available from game over screen

### Input
| Control | Browser | VR |
|---------|---------|-----|
| Charge shot | Click / Space | Right Trigger |
| Shoot | Release | Release Trigger |
| Aim | Mouse move | Right Thumbstick |
| Spin | Arrow keys | Left Thumbstick |
| Reset spin | X | Squeeze |
| Camera | C / 1-4 / Right drag / Scroll | — |
| Replay | V | — |
| Theme | T | — |
| Skip trick | N | — |
| Retry trick | R | — |
| Place ball | Click / R | A Button |
| Pause | ESC | B Button |

---

## 🏗️ Tech Stack

- **IWSDK 0.4.1** (Immersive Web SDK) — WebXR dual-runtime (VR + browser)
- **Three.js** via `@iwsdk/core` — 3D rendering
- **PanelUI** (`@iwsdk/vite-plugin-uikitml`) — spatial UI panels
- **TypeScript** — full type safety, zero type errors
- **Web Audio API** — procedural sound synthesis
- **Vite** — build tooling
- **GitHub Pages** — static deployment

---

## 📁 File Structure

```
phantom-pool/
├── src/
│   ├── index.ts         # Entry point, world creation, input wiring
│   ├── game.ts          # Game state machine, rules, scoring
│   ├── ui.ts            # PanelUI panel creation and runtime updates
│   ├── table.ts         # Pool table geometry, pockets, rails, diamonds
│   ├── balls.ts         # 16 pool balls with glow/wireframe/shadows
│   ├── physics.ts       # 2D billiards physics engine
│   ├── cue.ts           # Cue stick with charge/release, trajectory prediction
│   ├── audio.ts         # Procedural Web Audio sound effects
│   ├── ai.ts            # AI opponent with difficulty levels
│   ├── achievements.ts  # 20 achievements with progress tracking
│   ├── camera.ts        # 4-mode camera controller
│   ├── effects.ts       # Particle effects (sparks, trails, flashes)
│   ├── environment.ts   # Holodeck environment with animated decorations
│   ├── spin.ts          # Spin/english system with 3D indicator
│   ├── themes.ts        # 6 neon color themes
│   ├── tournament.ts    # 8-player tournament bracket
│   ├── tray.ts          # Pocketed ball tray display
│   ├── replay.ts        # Shot replay recording and playback
│   └── xrinput.ts       # VR controller input handling
├── ui/                  # 17 .uikitml spatial UI templates
│   ├── title.uikitml
│   ├── modes.uikitml
│   ├── difficulty.uikitml
│   ├── hud.uikitml
│   ├── spin.uikitml
│   ├── pause.uikitml
│   ├── gameover.uikitml
│   ├── settings.uikitml
│   ├── leaderboard.uikitml
│   ├── achievements.uikitml
│   ├── achievement.uikitml
│   ├── help.uikitml
│   ├── themes.uikitml
│   ├── tournament.uikitml
│   ├── stats.uikitml
│   ├── camera.uikitml
│   └── message.uikitml
├── vite.config.ts
├── tsconfig.json
├── package.json
└── index.html
```

---

## 🎮 Game Modes

### 8-Ball
Standard rules. First ball pocketed determines solids/stripes assignment. Pocket all your group, then the 8-ball to win. Scratching on the 8-ball loses.

### 9-Ball
Must hit the lowest numbered ball first each shot. Pocket the 9-ball to win (legally).

### Free Play
No rules, no opponents. Practice shots and experiment with spin.

### Trick Shots
12 progressive challenges testing specific skills. HUD shows trick progress. Press N to skip, R to retry.

---

## 🎨 Themes

| Theme | Vibe |
|-------|------|
| Neon Cyan | Default holodeck blue-green |
| Neon Pink | Hot magenta nightclub |
| Golden Classic | Warm amber pool hall |
| Purple Haze | Deep violet cosmic |
| Blood Moon | Deep red and orange |
| Arctic Frost | Icy blue winter |

Themes affect table felt, lighting, fog, ambient music mood, and particle colors. Cycle with T key or select from the Themes panel.

---

## 🏆 Achievements (20)

Includes: First Win, First Break Pocket, Combo Master, Perfect Game, Hot Streak, Spin Doctor, Tournament Champion, Run the Table, Speed Demon, Trick Master, Theme Collector, and more.

---

## 🚀 Development

```bash
npm install
npm run dev        # Start dev server with hot reload
npm run build      # Production build to dist/
```

### Deploy to GitHub Pages
```bash
npm run build
cd dist && git init && git checkout -b gh-pages
git add -A && git commit -m "Deploy"
git remote add origin https://github.com/ellyz2426/phantom-pool.git
git push -f origin gh-pages
```

---

## 📊 Build Stats

- **19 TypeScript source files** (7,063 lines)
- **17 PanelUI .uikitml templates** (1,565 lines)
- **8,628 total lines of code**
- **Zero HTML DOM** — 100% spatial PanelUI
- **Zero type errors** — full TypeScript compliance
- Built with IWSDK 0.4.1 dual-runtime (XR + browser)
