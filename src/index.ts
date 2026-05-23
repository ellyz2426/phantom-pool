// Phantom Pool VR - Main Entry Point
// Holodeck billiards with physics-based cue stick mechanics, spin/english, and achievements

import {
  World,
  PanelUI,
  ScreenSpace,
  Follower,
  FollowBehavior,
  PanelDocument,
  UIKitDocument,
  InputComponent,
  Mesh,
  Group,
  BoxGeometry,
  SphereGeometry,
  CylinderGeometry,
  PlaneGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  LineBasicMaterial,
  Color,
  Vector3,
  Quaternion,
  Fog,
  AmbientLight,
  PointLight,
  DirectionalLight,
  EdgesGeometry,
  LineSegments,
  AdditiveBlending,
  Float32BufferAttribute,
  BufferGeometry,
  RingGeometry,
  TorusGeometry,
  ConeGeometry,
} from '@iwsdk/core';

import { createEnvironment, updateEnvironment } from './environment';
import { createTable, TABLE_WIDTH, TABLE_LENGTH, TABLE_HEIGHT, RAIL_HEIGHT, POCKET_RADIUS } from './table';
import { BallManager, CUE_BALL_ID } from './balls';
import { CueStick } from './cue';
import { PhysicsEngine } from './physics';
import { GameManager, GameMode } from './game';
import { AudioManager } from './audio';
import { setupUI } from './ui';
import { XRInputHandler } from './xrinput';
import { EffectsManager } from './effects';
import { CameraController } from './camera';
import { PocketedBallTray } from './tray';
import { SpinSystem } from './spin';
import { ThemeManager, ThemeColors } from './themes';

async function main() {
  const container = document.getElementById('scene-container') as HTMLDivElement;

  const world = await World.create(container, {
    xr: { offer: 'once' },
    ...({ input: { canvasPointerEvents: true } } as any),
    features: {
      grabbing: true,
      locomotion: false,
      physics: false,
      spatialUI: true,
    },
    render: {
      near: 0.01,
      far: 200,
      ...({ camera: {
        position: [0, TABLE_HEIGHT + 0.8, TABLE_LENGTH * 0.6 + 0.5],
        lookAt: [0, TABLE_HEIGHT, 0],
      }} as any),
    },
  });

  // Create environment
  createEnvironment(world);

  // Create pool table
  const tableGroup = createTable(world);

  // Create ball manager
  const ballManager = new BallManager(world);

  // Create physics engine
  const physics = new PhysicsEngine(ballManager);

  // Create cue stick
  const cueStick = new CueStick(world, ballManager);

  // Create audio manager
  const audioManager = new AudioManager();

  // Create effects manager
  const effects = new EffectsManager(world);

  // Create game manager
  const gameManager = new GameManager(ballManager, physics, cueStick, audioManager, effects);

  // Create camera controller
  const cameraCtrl = new CameraController();

  // Create pocketed ball tray
  const tray = new PocketedBallTray(world);

  // Create spin system
  const spinSystem = new SpinSystem(world);
  gameManager.setSpinSystem(spinSystem);
  cueStick.setSpinSystem(spinSystem);
  cueStick.setEffects(effects);
  cueStick.setCameraController(cameraCtrl);

  // Create theme manager
  const themeManager = new ThemeManager();
  themeManager.loadTheme();

  // Setup UI (all PanelUI, zero HTML DOM)
  const ui = setupUI(world, gameManager, audioManager, cameraCtrl, spinSystem, themeManager);

  // Wire achievement notifications to UI
  gameManager.onAchievementUnlock = (ach) => {
    ui.showAchievement(ach);
    audioManager.playAchievement();
  };

  // Wire theme changes
  themeManager.onChange((theme: ThemeColors) => {
    ui.updateThemeLabel(theme.name);
    applyTheme(world, theme);
  });
  // Apply initial theme
  applyTheme(world, themeManager.current);

  // XR input handler
  const xrInput = new XRInputHandler(world, gameManager, cueStick, ballManager, spinSystem);

  // Browser mouse input
  let isDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;

  const canvas = container;
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      e.preventDefault();
    } else if (e.button === 0 && gameManager.state === 'aiming' && !gameManager.isCurrentPlayerAI()) {
      cueStick.startCharge();
    } else if (e.button === 0 && gameManager.state === 'ball_in_hand' && !gameManager.isCurrentPlayerAI()) {
      gameManager.placeCueBall();
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      cameraCtrl.handleDrag(dx, dy);
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    } else if (gameManager.state === 'aiming' && !gameManager.isCurrentPlayerAI()) {
      const rect = canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      cueStick.updateAimFromMouse(nx, ny, world);
    } else if (gameManager.state === 'ball_in_hand' && !gameManager.isCurrentPlayerAI()) {
      // Move cue ball with mouse in ball-in-hand mode
      const cueBall = ballManager.getCueBall();
      if (cueBall) {
        const rect = canvas.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        cueBall.position.x += nx * 0.01;
        const hw = TABLE_WIDTH / 2 - 0.03;
        cueBall.position.x = Math.max(-hw, Math.min(hw, cueBall.position.x));
      }
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (e.button === 2) {
      isDragging = false;
    } else if (e.button === 0 && cueStick.isCharging) {
      cueStick.release(gameManager, audioManager);
    }
  });

  canvas.addEventListener('wheel', (e) => {
    cameraCtrl.handleZoom(e.deltaY);
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (gameManager.state === 'playing' || gameManager.state === 'aiming' || gameManager.state === 'watching') {
        gameManager.togglePause();
        ui.updatePause(gameManager.isPaused);
      }
    } else if (e.key === ' ' && gameManager.state === 'aiming' && !gameManager.isCurrentPlayerAI()) {
      cueStick.startCharge();
    } else if (e.key === 'r' && gameManager.state === 'ball_in_hand' && !gameManager.isCurrentPlayerAI()) {
      gameManager.placeCueBall();
    } else if (e.key === 'c' || e.key === 'C') {
      // Cycle camera mode
      cameraCtrl.cycleMode();
      ui.updateCameraMode(cameraCtrl.getModeName());
    } else if (e.key === 'v' || e.key === 'V') {
      // Replay last shot
      if (gameManager.state === 'aiming' && gameManager.replay.hasReplay) {
        gameManager.startReplay();
      } else if (gameManager.state === 'replay' as any) {
        gameManager.stopReplay();
      }
    } else if (e.key === 't' || e.key === 'T') {
      // Cycle theme
      if (gameManager.state === 'aiming' || gameManager.state === 'title') {
        themeManager.cycleTheme();
      }
    } else if (e.key === '1') {
      cameraCtrl.setMode('orbit');
      ui.updateCameraMode(cameraCtrl.getModeName());
    } else if (e.key === '2') {
      cameraCtrl.setMode('topdown');
      ui.updateCameraMode(cameraCtrl.getModeName());
    } else if (e.key === '3') {
      cameraCtrl.setMode('behind');
      ui.updateCameraMode(cameraCtrl.getModeName());
    } else if (e.key === '4') {
      cameraCtrl.setMode('follow');
      ui.updateCameraMode(cameraCtrl.getModeName());
    }

    // Spin controls (arrow keys)
    if (gameManager.state === 'aiming' && !gameManager.isCurrentPlayerAI()) {
      const spinStep = 0.15;
      if (e.key === 'ArrowLeft') {
        spinSystem.adjustSpin(-spinStep, 0);
        ui.updateSpin(spinSystem.getSpinLabel());
      } else if (e.key === 'ArrowRight') {
        spinSystem.adjustSpin(spinStep, 0);
        ui.updateSpin(spinSystem.getSpinLabel());
      } else if (e.key === 'ArrowUp') {
        spinSystem.adjustSpin(0, spinStep);
        ui.updateSpin(spinSystem.getSpinLabel());
      } else if (e.key === 'ArrowDown') {
        spinSystem.adjustSpin(0, -spinStep);
        ui.updateSpin(spinSystem.getSpinLabel());
      } else if (e.key === 'x' || e.key === 'X') {
        spinSystem.reset();
        ui.updateSpin(spinSystem.getSpinLabel());
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === ' ' && cueStick.isCharging) {
      cueStick.release(gameManager, audioManager);
    }
  });

  // Reset tray on game start (hook into game manager)
  const origStartGame = gameManager.startGame.bind(gameManager);
  gameManager.startGame = (mode: GameMode) => {
    tray.reset();
    origStartGame(mode);
  };

  // Main update loop
  let lastTime = performance.now();

  const update = () => {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;

    if (!gameManager.isPaused) {
      // Update physics
      physics.update(dt, gameManager, audioManager, effects);

      // Record replay frames during shot
      if (gameManager.replay.recording) {
        gameManager.replay.recordFrame(
          ballManager.balls.map(b => ({
            id: b.id,
            position: b.position.clone(),
            pocketed: b.pocketed,
          }))
        );
      }

      // Update replay playback
      if (gameManager.replay.playing) {
        const frame = gameManager.replay.update(dt);
        if (frame) {
          // Apply replay ball positions
          for (const bf of frame.balls) {
            const ball = ballManager.getBall(bf.id);
            if (ball) {
              ball.position.set(bf.x, bf.y, bf.z);
              ball.pocketed = bf.pocketed;
            }
          }
        }
      }

      // Update cue stick
      cueStick.update(dt, world);

      // Update ball visuals
      ballManager.update(dt, gameManager.state === 'ball_in_hand');

      // Update game state
      gameManager.update(dt);

      // Update XR input
      xrInput.update(dt);

      // Update effects (sparks, trails, etc.)
      effects.update(dt);

      // Update pocketed ball tray
      tray.update(dt, ballManager, gameManager.currentPlayerIndex);

      // Update spin indicator position
      if (gameManager.state === 'aiming') {
        const cueBall = ballManager.getCueBall();
        if (cueBall && !cueBall.pocketed) {
          spinSystem.show();
          spinSystem.updatePosition(cueBall.position, cueStick.aimDir);
        }
      } else {
        spinSystem.hide();
      }

      // Update cue ball trail
      const cueBall = ballManager.getCueBall();
      if (cueBall && !cueBall.pocketed && cueBall.velocity.length() > 1.5) {
        effects.spawnCueTrail(cueBall.position);
      }

      // Update UI
      ui.update(gameManager, ballManager, cueStick);
    }

    // Update animated environment (always, even when paused)
    updateEnvironment(dt);

    // Update camera (browser mode — only if not in XR)
    if (!(world.input as any).xr?.gamepads?.right) {
      const cam = (world as any).render?.camera || (world as any).scene?.userData?.camera;
      if (cam) {
        cameraCtrl.update(dt, ballManager, cueStick, cam);
      }
    }

    requestAnimationFrame(update);
  };

  requestAnimationFrame(update);

  // Start at title screen
  gameManager.showTitle();
}

// Apply theme colors to scene materials
function applyTheme(world: World, theme: ThemeColors): void {
  const scene = world.scene;

  // Update table materials
  scene.traverse((obj: any) => {
    if (!obj.isMesh && !obj.isLineSegments) return;

    const name = obj.name || obj.parent?.name || '';

    // Pool table surface
    if (obj.material?.color && obj.material instanceof MeshStandardMaterial) {
      if (name === 'pool-table' || (obj.parent?.name === 'pool-table')) {
        // Only update specific parts based on current color
        const hex = obj.material.color.getHex();
        if (hex === 0x004d33 || hex === 0x2a0028 || hex === 0x1a3300 || hex === 0x0d0033) {
          // Felt surface
          obj.material.color.setHex(theme.feltColor);
          obj.material.emissive.setHex(theme.feltEmissive);
          obj.material.emissiveIntensity = theme.feltEmissiveIntensity;
        }
      }
    }
  });

  // Update lights
  scene.traverse((obj: any) => {
    if (obj.isPointLight) {
      const hex = obj.color.getHex();
      // Primary table light
      if (hex === 0x00ddff || hex === 0xff44cc || hex === 0xffdd88 || hex === 0xaa66ff) {
        obj.color.setHex(theme.primaryLight);
      }
      // Secondary lights
      if (hex === 0x00ff88 || hex === 0xff8800 || hex === 0xffaa44 || hex === 0x00ccff) {
        obj.color.setHex(theme.secondaryLight);
      }
      if (hex === 0x8800ff || hex === 0x4400ff || hex === 0x886622 || hex === 0xff44aa) {
        obj.color.setHex(theme.tertiaryLight);
      }
    }
  });

  // Update fog
  if (scene.fog) {
    (scene.fog as any).color.setHex(theme.fogColor);
  }
}

main().catch(console.error);
