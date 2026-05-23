// Phantom Pool VR - Main Entry Point
// Holodeck billiards with physics-based cue stick mechanics

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

  // Setup UI (all PanelUI, zero HTML DOM)
  const ui = setupUI(world, gameManager, audioManager, cameraCtrl);

  // XR input handler
  const xrInput = new XRInputHandler(world, gameManager, cueStick, ballManager);

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

main().catch(console.error);
