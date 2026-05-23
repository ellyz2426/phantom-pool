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

import { createEnvironment } from './environment';
import { createTable, TABLE_WIDTH, TABLE_LENGTH, TABLE_HEIGHT, RAIL_HEIGHT, POCKET_RADIUS } from './table';
import { BallManager, CUE_BALL_ID } from './balls';
import { CueStick } from './cue';
import { PhysicsEngine } from './physics';
import { GameManager, GameMode } from './game';
import { AudioManager } from './audio';
import { setupUI } from './ui';
import { XRInputHandler } from './xrinput';

async function main() {
  const container = document.getElementById('scene-container') as HTMLDivElement;

  const world = await World.create(container, {
    xr: { offer: 'once' },
    input: { canvasPointerEvents: true },
    features: {
      grabbing: true,
      locomotion: false,
      physics: false, // We use custom physics for billiards precision
      spatialUI: true,
    },
    render: {
      near: 0.01,
      far: 200,
      camera: {
        position: [0, TABLE_HEIGHT + 0.8, TABLE_LENGTH * 0.6 + 0.5],
        lookAt: [0, TABLE_HEIGHT, 0],
      },
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

  // Create game manager
  const gameManager = new GameManager(ballManager, physics, cueStick, audioManager);

  // Setup UI (all PanelUI, zero HTML DOM)
  const ui = setupUI(world, gameManager, audioManager);

  // XR input handler
  const xrInput = new XRInputHandler(world, gameManager, cueStick, ballManager);

  // Camera orbit state (browser mode)
  let cameraAngle = 0;
  let cameraElevation = 0.6;
  let cameraDist = 2.0;
  let isDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;

  // Browser mouse/keyboard input
  const canvas = container;
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      e.preventDefault();
    } else if (e.button === 0 && gameManager.state === 'aiming') {
      cueStick.startCharge();
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      cameraAngle -= dx * 0.005;
      cameraElevation = Math.max(0.2, Math.min(1.2, cameraElevation - dy * 0.005));
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    } else if (gameManager.state === 'aiming') {
      // Aim cue with mouse position
      const rect = canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      cueStick.updateAimFromMouse(nx, ny, world);
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
    cameraDist = Math.max(1.0, Math.min(4.0, cameraDist + e.deltaY * 0.002));
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (gameManager.state === 'playing' || gameManager.state === 'aiming') {
        gameManager.togglePause();
        ui.updatePause(gameManager.isPaused);
      }
    } else if (e.key === ' ' && gameManager.state === 'aiming') {
      cueStick.startCharge();
    } else if (e.key === 'r' && gameManager.state === 'ball_in_hand') {
      // Place cue ball at current position
      gameManager.placeCueBall();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === ' ' && cueStick.isCharging) {
      cueStick.release(gameManager, audioManager);
    }
  });

  // Main update loop
  let lastTime = performance.now();

  const update = () => {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;

    if (!gameManager.isPaused) {
      // Update physics
      physics.update(dt, gameManager, audioManager);

      // Update cue stick
      cueStick.update(dt, world);

      // Update ball visuals
      ballManager.update(dt);

      // Update game state
      gameManager.update(dt);

      // Update XR input
      xrInput.update(dt);

      // Update UI
      ui.update(gameManager, ballManager, cueStick);
    }

    // Update camera (browser mode)
    if (!world.input.xr?.gamepads?.right) {
      const cam = (world as any).render?.camera || (world as any).scene?.userData?.camera;
      if (cam) {
        const target = ballManager.getCueBall()?.position || new Vector3(0, TABLE_HEIGHT, 0);
        cam.position.set(
          target.x + Math.sin(cameraAngle) * cameraDist,
          target.y + cameraElevation,
          target.z + Math.cos(cameraAngle) * cameraDist
        );
        cam.lookAt(target.x, target.y, target.z);
      }
    }

    requestAnimationFrame(update);
  };

  requestAnimationFrame(update);

  // Start at title screen
  gameManager.showTitle();
}

main().catch(console.error);
