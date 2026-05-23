// XR Input Handler - VR controller support for pool
import {
  World,
  InputComponent,
  Vector3,
} from '@iwsdk/core';

import { GameManager } from './game';
import { CueStick } from './cue';
import { BallManager } from './balls';

export class XRInputHandler {
  world: World;
  game: GameManager;
  cue: CueStick;
  ballManager: BallManager;

  private triggerWasDown: boolean = false;
  private aWasDown: boolean = false;
  private bWasDown: boolean = false;
  private thumbstickCooldown: number = 0;

  constructor(world: World, game: GameManager, cue: CueStick, ballManager: BallManager) {
    this.world = world;
    this.game = game;
    this.cue = cue;
    this.ballManager = ballManager;
  }

  update(dt: number): void {
    const rightGamepad = (this.world.input as any).xr?.gamepads?.right;
    const leftGamepad = (this.world.input as any).xr?.gamepads?.left;
    if (!rightGamepad) return;

    // Cooldowns
    if (this.thumbstickCooldown > 0) this.thumbstickCooldown -= dt;

    // Read inputs
    const triggerDown = rightGamepad.getButtonDown?.(InputComponent.Trigger) ?? false;
    const triggerPressed = rightGamepad.getButtonPressed?.(InputComponent.Trigger) ?? false;
    const triggerUp = !triggerPressed && this.triggerWasDown;
    const squeezePressed = rightGamepad.getButtonPressed?.(InputComponent.Squeeze) ?? false;
    const aDown = rightGamepad.getButtonDown?.(InputComponent.A_Button) ?? false;
    const bDown = rightGamepad.getButtonDown?.(InputComponent.B_Button) ?? false;

    const thumbstick = rightGamepad.getAxesValues?.(InputComponent.Thumbstick) ?? { x: 0, y: 0 };
    const leftThumbstick = leftGamepad?.getAxesValues?.(InputComponent.Thumbstick) ?? { x: 0, y: 0 };

    // State-based input routing
    switch (this.game.state) {
      case 'title':
        if (triggerDown || aDown) {
          this.game.showModeSelect();
        }
        break;

      case 'mode_select':
        this.handleMenuNavigation(thumbstick, triggerDown, aDown, bDown);
        break;

      case 'aiming':
        // Aim with right thumbstick
        if (Math.abs(thumbstick.x) > 0.15) {
          this.cue.updateAimFromController(thumbstick.x);
        }

        // Trigger to charge
        if (triggerDown && !this.triggerWasDown) {
          this.cue.startCharge();
        }

        // Release trigger to shoot
        if (triggerUp && this.cue.isCharging) {
          this.cue.release(this.game, this.game.audio);
        }

        // B to pause
        if (bDown && !this.bWasDown) {
          this.game.togglePause();
        }
        break;

      case 'ball_in_hand':
        // Move cue ball with left thumbstick
        if (leftThumbstick) {
          const cueBall = this.ballManager.getCueBall();
          if (cueBall) {
            cueBall.position.x += leftThumbstick.x * dt * 0.5;
            cueBall.position.z -= leftThumbstick.y * dt * 0.5;
            // Clamp to table
            const hw = 1.27 / 2 - 0.03;
            const hl = 2.54 / 2 - 0.03;
            cueBall.position.x = Math.max(-hw, Math.min(hw, cueBall.position.x));
            cueBall.position.z = Math.max(-hl, Math.min(hl, cueBall.position.z));
          }
        }

        // A to confirm placement
        if (aDown && !this.aWasDown) {
          this.game.placeCueBall();
        }
        break;

      case 'game_over':
        if (triggerDown || aDown) {
          this.game.showTitle();
        }
        break;

      case 'settings':
      case 'leaderboard':
        if (bDown && !this.bWasDown) {
          this.game.showTitle();
        }
        break;
    }

    // Update previous state
    this.triggerWasDown = triggerPressed;
    this.aWasDown = aDown;
    this.bWasDown = bDown;
  }

  private handleMenuNavigation(thumbstick: { x: number; y: number }, triggerDown: boolean, aDown: boolean, bDown: boolean): void {
    if (this.thumbstickCooldown > 0) return;

    // Navigate modes with thumbstick
    if (Math.abs(thumbstick.y) > 0.5) {
      this.thumbstickCooldown = 0.3;
      // Menu navigation handled by PanelUI pointer events
    }

    // A or trigger to select
    if ((aDown && !this.aWasDown) || triggerDown) {
      // Selection handled by PanelUI pointer events (laser pointer)
    }

    // B to go back
    if (bDown && !this.bWasDown) {
      this.game.showTitle();
    }
  }
}
