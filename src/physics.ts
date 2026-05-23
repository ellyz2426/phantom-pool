// Physics Engine - 2D billiards physics on table surface
import { Vector3 } from '@iwsdk/core';
import { BallManager, PoolBall, CUE_BALL_ID } from './balls';
import { TABLE_WIDTH, TABLE_LENGTH, TABLE_HEIGHT, BALL_RADIUS, POCKET_POSITIONS, POCKET_RADIUS, RAIL_HEIGHT } from './table';
import { GameManager } from './game';
import { AudioManager } from './audio';
import { EffectsManager } from './effects';

const FRICTION = 0.985;        // Rolling friction per frame
const BALL_MASS = 0.17;        // kg (standard pool ball)
const RESTITUTION = 0.95;      // Ball-to-ball
const RAIL_RESTITUTION = 0.7;  // Ball-to-rail
const MIN_VELOCITY = 0.002;    // Below this, stop
const SUB_STEPS = 4;           // Physics substeps per frame

const HW = TABLE_WIDTH / 2;
const HL = TABLE_LENGTH / 2;

export class PhysicsEngine {
  ballManager: BallManager;
  firstHitBallId: number = -1;  // Track first ball hit by cue ball
  pocketedThisShot: number[] = [];
  cueBallPocketed: boolean = false;

  constructor(ballManager: BallManager) {
    this.ballManager = ballManager;
  }

  resetShotTracking(): void {
    this.firstHitBallId = -1;
    this.pocketedThisShot = [];
    this.cueBallPocketed = false;
  }

  update(dt: number, game: GameManager, audio: AudioManager, effects?: EffectsManager): void {
    if (game.state !== 'shooting' && game.state !== 'watching') return;

    const subDt = dt / SUB_STEPS;
    const balls = this.ballManager.getActiveBalls();

    for (let step = 0; step < SUB_STEPS; step++) {
      // Move balls
      for (const ball of balls) {
        if (ball.pocketed) continue;

        ball.position.x += ball.velocity.x * subDt;
        ball.position.z += ball.velocity.z * subDt;

        // Apply friction
        ball.velocity.x *= FRICTION;
        ball.velocity.z *= FRICTION;

        // Angular velocity from rolling
        ball.angularVelocity.set(
          ball.velocity.z / BALL_RADIUS,
          0,
          -ball.velocity.x / BALL_RADIUS
        );

        // Kill tiny velocities
        if (ball.velocity.length() < MIN_VELOCITY) {
          ball.velocity.set(0, 0, 0);
          ball.angularVelocity.set(0, 0, 0);
          ball.spin = { x: 0, y: 0 };
        }

        // Decay spin over time (friction absorbs spin energy)
        if (ball.id === CUE_BALL_ID) {
          ball.spin.x *= 0.998;
          ball.spin.y *= 0.998;
          if (Math.abs(ball.spin.x) < 0.01) ball.spin.x = 0;
          if (Math.abs(ball.spin.y) < 0.01) ball.spin.y = 0;

          // Side spin (english) causes gradual curve
          if (Math.abs(ball.spin.x) > 0.05 && ball.velocity.length() > 0.1) {
            const speed = ball.velocity.length();
            const perpX = -ball.velocity.z / speed;
            const perpZ = ball.velocity.x / speed;
            const curveFactor = ball.spin.x * 0.002 * speed;
            ball.velocity.x += perpX * curveFactor * subDt;
            ball.velocity.z += perpZ * curveFactor * subDt;
          }
        }
      }

      // Ball-to-ball collisions
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const a = balls[i];
          const b = balls[j];
          if (a.pocketed || b.pocketed) continue;
          this.resolveBallCollision(a, b, audio, game, effects);
        }
      }

      // Rail collisions
      for (const ball of balls) {
        if (ball.pocketed) continue;
        this.resolveRailCollision(ball, audio);
      }

      // Pocket detection
      for (const ball of balls) {
        if (ball.pocketed) continue;
        this.checkPocket(ball, audio, game, effects);
      }
    }

    // Keep balls on table surface
    for (const ball of balls) {
      if (!ball.pocketed) {
        ball.position.y = TABLE_HEIGHT + BALL_RADIUS;
      }
    }

    // Check if all balls stopped
    if (game.state === 'watching' && this.ballManager.allStopped()) {
      game.onShotComplete(this);
    }
  }

  private resolveBallCollision(a: PoolBall, b: PoolBall, audio: AudioManager, game: GameManager, effects?: EffectsManager): void {
    const dx = b.position.x - a.position.x;
    const dz = b.position.z - a.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const minDist = BALL_RADIUS * 2;

    if (dist < minDist && dist > 0) {
      // Track first hit
      if (a.id === CUE_BALL_ID && this.firstHitBallId === -1) {
        this.firstHitBallId = b.id;
      } else if (b.id === CUE_BALL_ID && this.firstHitBallId === -1) {
        this.firstHitBallId = a.id;
      }

      // Normal vector
      const nx = dx / dist;
      const nz = dz / dist;

      // Relative velocity along normal
      const dvx = a.velocity.x - b.velocity.x;
      const dvz = a.velocity.z - b.velocity.z;
      const dvn = dvx * nx + dvz * nz;

      // Don't resolve if moving apart
      if (dvn <= 0) return;

      // Impulse
      const impulse = dvn * (1 + RESTITUTION) / 2;

      a.velocity.x -= impulse * nx;
      a.velocity.z -= impulse * nz;
      b.velocity.x += impulse * nx;
      b.velocity.z += impulse * nz;

      // Apply post-collision spin effects on cue ball
      const cueBall = a.id === CUE_BALL_ID ? a : (b.id === CUE_BALL_ID ? b : null);
      if (cueBall && (Math.abs(cueBall.spin.x) > 0.05 || Math.abs(cueBall.spin.y) > 0.05)) {
        // Backspin: reduce cue ball forward momentum after collision (can reverse)
        // Topspin: add forward momentum after collision
        const fwdX = -nx;
        const fwdZ = -nz;
        const spinMag = dvn * 0.35;
        cueBall.velocity.x += fwdX * cueBall.spin.y * spinMag;
        cueBall.velocity.z += fwdZ * cueBall.spin.y * spinMag;

        // Side english: deflect cue ball perpendicular after collision
        const perpX = -nz;
        const perpZ = nx;
        cueBall.velocity.x += perpX * cueBall.spin.x * spinMag * 0.4;
        cueBall.velocity.z += perpZ * cueBall.spin.x * spinMag * 0.4;

        // Decay spin after application
        cueBall.spin.x *= 0.3;
        cueBall.spin.y *= 0.3;
      }

      // Separate balls
      const overlap = minDist - dist;
      a.position.x -= (overlap / 2) * nx;
      a.position.z -= (overlap / 2) * nz;
      b.position.x += (overlap / 2) * nx;
      b.position.z += (overlap / 2) * nz;

      // Sound
      const impactSpeed = Math.abs(dvn);
      audio.playBallHit(impactSpeed);

      // Visual collision sparks
      if (effects && impactSpeed > 0.5) {
        const hitPoint = new Vector3(
          (a.position.x + b.position.x) / 2,
          (a.position.y + b.position.y) / 2,
          (a.position.z + b.position.z) / 2
        );
        effects.spawnCollisionSparks(hitPoint, impactSpeed);
      }
    }
  }

  // Callback for rail sparkle effects
  onRailHit: ((pos: Vector3, speed: number) => void) | null = null;

  private resolveRailCollision(ball: PoolBall, audio: AudioManager): void {
    let hit = false;
    const contactPos = ball.position.clone();

    // Left rail
    if (ball.position.x - BALL_RADIUS < -HW) {
      if (!this.isNearPocket(ball.position)) {
        ball.position.x = -HW + BALL_RADIUS;
        ball.velocity.x = -ball.velocity.x * RAIL_RESTITUTION;
        contactPos.x = -HW;
        hit = true;
      }
    }
    // Right rail
    if (ball.position.x + BALL_RADIUS > HW) {
      if (!this.isNearPocket(ball.position)) {
        ball.position.x = HW - BALL_RADIUS;
        ball.velocity.x = -ball.velocity.x * RAIL_RESTITUTION;
        contactPos.x = HW;
        hit = true;
      }
    }
    // Top rail (negative Z end)
    if (ball.position.z - BALL_RADIUS < -HL) {
      if (!this.isNearPocket(ball.position)) {
        ball.position.z = -HL + BALL_RADIUS;
        ball.velocity.z = -ball.velocity.z * RAIL_RESTITUTION;
        contactPos.z = -HL;
        hit = true;
      }
    }
    // Bottom rail (positive Z end)
    if (ball.position.z + BALL_RADIUS > HL) {
      if (!this.isNearPocket(ball.position)) {
        ball.position.z = HL - BALL_RADIUS;
        ball.velocity.z = -ball.velocity.z * RAIL_RESTITUTION;
        contactPos.z = HL;
        hit = true;
      }
    }

    if (hit) {
      const speed = ball.velocity.length();
      audio.playRailHit(speed);
      if (this.onRailHit) {
        this.onRailHit(contactPos, speed);
      }
    }
  }

  private isNearPocket(pos: Vector3): boolean {
    for (const pp of POCKET_POSITIONS) {
      const dx = pos.x - pp.x;
      const dz = pos.z - pp.z;
      if (Math.sqrt(dx * dx + dz * dz) < POCKET_RADIUS * 1.5) {
        return true;
      }
    }
    return false;
  }

  private checkPocket(ball: PoolBall, audio: AudioManager, game: GameManager, effects?: EffectsManager): void {
    for (const pp of POCKET_POSITIONS) {
      const dx = ball.position.x - pp.x;
      const dz = ball.position.z - pp.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < POCKET_RADIUS) {
        ball.pocketed = true;
        ball.velocity.set(0, 0, 0);
        ball.angularVelocity.set(0, 0, 0);
        this.pocketedThisShot.push(ball.id);

        // Start pocket drop animation
        this.ballManager.startPocketAnimation(ball, pp);

        if (ball.id === CUE_BALL_ID) {
          this.cueBallPocketed = true;
          audio.playScratch();
        } else {
          audio.playPocket();
        }

        // Pocket flash effect
        if (effects) {
          effects.spawnPocketFlash(pp.clone());
        }

        break;
      }
    }
  }
}
