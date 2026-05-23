// Camera Controller - Multiple view modes for browser play
import { Vector3 } from '@iwsdk/core';
import { BallManager, CUE_BALL_ID } from './balls';
import { CueStick } from './cue';
import { TABLE_HEIGHT, TABLE_WIDTH, TABLE_LENGTH } from './table';

export type CameraMode = 'orbit' | 'topdown' | 'behind' | 'follow';

export class CameraController {
  mode: CameraMode = 'orbit';

  // Orbit mode
  orbitAngle: number = 0;
  orbitElevation: number = 0.6;
  orbitDist: number = 2.0;

  // Smooth camera transition
  private currentPos: Vector3 = new Vector3(0, TABLE_HEIGHT + 0.8, 1.5);
  private currentTarget: Vector3 = new Vector3(0, TABLE_HEIGHT, 0);
  private targetPos: Vector3 = new Vector3(0, TABLE_HEIGHT + 0.8, 1.5);
  private targetTarget: Vector3 = new Vector3(0, TABLE_HEIGHT, 0);
  private smoothSpeed: number = 5;

  // Follow mode tracking
  private followBallId: number = CUE_BALL_ID;

  constructor() {}

  setMode(mode: CameraMode): void {
    this.mode = mode;
    // Faster transition for some modes
    this.smoothSpeed = mode === 'topdown' ? 3 : 5;
  }

  cycleMode(): void {
    const modes: CameraMode[] = ['orbit', 'topdown', 'behind', 'follow'];
    const idx = modes.indexOf(this.mode);
    this.setMode(modes[(idx + 1) % modes.length]);
  }

  getModeName(): string {
    switch (this.mode) {
      case 'orbit': return 'FREE ORBIT';
      case 'topdown': return 'TOP DOWN';
      case 'behind': return 'BEHIND BALL';
      case 'follow': return 'FOLLOW SHOT';
    }
  }

  // Handle mouse drag for orbit mode
  handleDrag(dx: number, dy: number): void {
    if (this.mode === 'orbit') {
      this.orbitAngle -= dx * 0.005;
      this.orbitElevation = Math.max(0.2, Math.min(1.2, this.orbitElevation - dy * 0.005));
    }
  }

  // Handle zoom
  handleZoom(delta: number): void {
    if (this.mode === 'orbit') {
      this.orbitDist = Math.max(0.8, Math.min(4.0, this.orbitDist + delta * 0.002));
    } else if (this.mode === 'topdown') {
      this.orbitDist = Math.max(1.5, Math.min(5.0, this.orbitDist + delta * 0.003));
    }
  }

  // Compute camera position and target for current frame
  update(dt: number, ballManager: BallManager, cue: CueStick, cam: any): void {
    if (!cam) return;

    const cueBall = ballManager.getCueBall();
    const cueBallPos = cueBall && !cueBall.pocketed
      ? cueBall.position.clone()
      : new Vector3(0, TABLE_HEIGHT, 0);

    switch (this.mode) {
      case 'orbit': {
        const target = cueBallPos;
        this.targetPos.set(
          target.x + Math.sin(this.orbitAngle) * this.orbitDist,
          target.y + this.orbitElevation,
          target.z + Math.cos(this.orbitAngle) * this.orbitDist
        );
        this.targetTarget.copy(target);
        break;
      }

      case 'topdown': {
        const dist = this.orbitDist;
        const centerX = 0;
        const centerZ = 0;
        this.targetPos.set(centerX, TABLE_HEIGHT + dist * 1.5, centerZ + 0.01);
        this.targetTarget.set(centerX, TABLE_HEIGHT, centerZ);
        break;
      }

      case 'behind': {
        // Camera behind cue ball, looking along aim direction
        const aimDir = cue.aimDir;
        const behindDist = 0.6;
        const height = 0.25;
        this.targetPos.set(
          cueBallPos.x + aimDir.x * behindDist,
          cueBallPos.y + height,
          cueBallPos.z + aimDir.z * behindDist
        );
        // Look ahead of cue ball in aim direction
        this.targetTarget.set(
          cueBallPos.x - aimDir.x * 1.0,
          cueBallPos.y,
          cueBallPos.z - aimDir.z * 1.0
        );
        break;
      }

      case 'follow': {
        // Follow the fastest moving ball
        let fastestBall = cueBall;
        let maxSpeed = cueBall ? cueBall.velocity.length() : 0;
        for (const b of ballManager.getActiveBalls()) {
          if (b.velocity.length() > maxSpeed) {
            maxSpeed = b.velocity.length();
            fastestBall = b;
          }
        }
        if (fastestBall && maxSpeed > 0.05) {
          this.followBallId = fastestBall.id;
        }
        const trackBall = ballManager.getBall(this.followBallId) || cueBall;
        if (trackBall && !trackBall.pocketed) {
          const vel = trackBall.velocity;
          const speed = vel.length();
          // Camera trails behind the ball's movement direction
          if (speed > 0.05) {
            const nx = -vel.x / speed;
            const nz = -vel.z / speed;
            this.targetPos.set(
              trackBall.position.x + nx * 0.7,
              trackBall.position.y + 0.35,
              trackBall.position.z + nz * 0.7
            );
          } else {
            // Ball stopped — orbit view of it
            this.targetPos.set(
              trackBall.position.x + 0.5,
              trackBall.position.y + 0.4,
              trackBall.position.z + 0.5
            );
          }
          this.targetTarget.set(
            trackBall.position.x,
            trackBall.position.y,
            trackBall.position.z
          );
        }
        break;
      }
    }

    // Smooth interpolation
    const t = Math.min(dt * this.smoothSpeed, 1);
    this.currentPos.lerp(this.targetPos, t);
    this.currentTarget.lerp(this.targetTarget, t);

    // Apply to camera
    cam.position.copy(this.currentPos);
    cam.lookAt(this.currentTarget.x, this.currentTarget.y, this.currentTarget.z);
  }
}
