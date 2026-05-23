// AI Opponent - Computer player for 8-ball and 9-ball
import { Vector3 } from '@iwsdk/core';
import { BallManager, PoolBall, CUE_BALL_ID } from './balls';
import { CueStick } from './cue';
import { GameManager, PlayerAssignment } from './game';
import { TABLE_WIDTH, TABLE_LENGTH, TABLE_HEIGHT, BALL_RADIUS, POCKET_POSITIONS, POCKET_RADIUS } from './table';
import { AudioManager } from './audio';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

interface ShotCandidate {
  targetBall: PoolBall;
  pocketIndex: number;
  aimAngle: number;
  power: number;
  score: number; // Higher is better
  distance: number;
}

const HW = TABLE_WIDTH / 2;
const HL = TABLE_LENGTH / 2;

export class AIOpponent {
  difficulty: AIDifficulty;
  isThinking: boolean = false;
  thinkTimer: number = 0;
  thinkDuration: number = 0;
  pendingShot: ShotCandidate | null = null;
  chargeTimer: number = 0;
  isCharging: boolean = false;

  // Difficulty parameters
  private accuracyNoise: number;     // Angle noise in radians
  private powerNoise: number;        // Power noise multiplier
  private thinkTimeMin: number;      // Min thinking time (seconds)
  private thinkTimeMax: number;      // Max thinking time
  private maxCandidateEval: number;  // How many shots to evaluate

  constructor(difficulty: AIDifficulty = 'medium') {
    this.difficulty = difficulty;
    this.setDifficultyParams(difficulty);
  }

  setDifficultyParams(difficulty: AIDifficulty): void {
    this.difficulty = difficulty;
    switch (difficulty) {
      case 'easy':
        this.accuracyNoise = 0.12;     // ~7 degrees error
        this.powerNoise = 0.25;
        this.thinkTimeMin = 2.0;
        this.thinkTimeMax = 3.5;
        this.maxCandidateEval = 6;
        break;
      case 'medium':
        this.accuracyNoise = 0.06;     // ~3.4 degrees error
        this.powerNoise = 0.12;
        this.thinkTimeMin = 1.5;
        this.thinkTimeMax = 2.5;
        this.maxCandidateEval = 12;
        break;
      case 'hard':
        this.accuracyNoise = 0.02;     // ~1.1 degrees error
        this.powerNoise = 0.05;
        this.thinkTimeMin = 0.8;
        this.thinkTimeMax = 1.5;
        this.maxCandidateEval = 24;
        break;
    }
  }

  // Start AI thinking process
  startThinking(game: GameManager): void {
    this.isThinking = true;
    this.thinkDuration = this.thinkTimeMin + Math.random() * (this.thinkTimeMax - this.thinkTimeMin);
    this.thinkTimer = 0;
    this.pendingShot = null;
    this.isCharging = false;
    this.chargeTimer = 0;

    // Evaluate shots
    this.pendingShot = this.evaluateBestShot(game);
  }

  // Update AI state (call each frame)
  update(dt: number, game: GameManager, cue: CueStick, audio: AudioManager): boolean {
    if (!this.isThinking && !this.isCharging) return false;

    if (this.isThinking) {
      this.thinkTimer += dt;

      // Rotate cue to aim at target while "thinking"
      if (this.pendingShot && this.thinkTimer > this.thinkDuration * 0.3) {
        const targetAngle = this.pendingShot.aimAngle;
        // Smooth rotation toward target
        let diff = targetAngle - cue.aimAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        cue.setAimAngle(cue.aimAngle + diff * Math.min(dt * 3, 1));
      }

      if (this.thinkTimer >= this.thinkDuration) {
        this.isThinking = false;

        if (this.pendingShot) {
          // Apply aim noise
          const noiseAngle = (Math.random() - 0.5) * 2 * this.accuracyNoise;
          cue.setAimAngle(this.pendingShot.aimAngle + noiseAngle);

          // Start charging
          this.isCharging = true;
          this.chargeTimer = 0;
          cue.startCharge();
        } else {
          // Safety shot — just hit forward with low power
          cue.setAimAngle(Math.PI + (Math.random() - 0.5) * 0.5);
          this.isCharging = true;
          this.chargeTimer = 0;
          cue.startCharge();
          this.pendingShot = {
            targetBall: game.ballManager.getActiveBalls()[0],
            pocketIndex: 0,
            aimAngle: cue.aimAngle,
            power: 1.5,
            score: 0,
            distance: 0,
          };
        }
      }
      return true;
    }

    if (this.isCharging && this.pendingShot) {
      this.chargeTimer += dt;

      // Charge to target power (with noise)
      const targetPower = this.pendingShot.power * (1 + (Math.random() - 0.5) * this.powerNoise);
      const chargeTime = Math.max(0.2, targetPower / 4.0); // ~4 power per second charge rate

      if (this.chargeTimer >= chargeTime) {
        // Release!
        cue.release(game, audio);
        this.isCharging = false;
        this.pendingShot = null;
        return false;
      }
      return true;
    }

    return false;
  }

  // Evaluate all possible shots and pick the best one
  private evaluateBestShot(game: GameManager): ShotCandidate | null {
    const ballManager = game.ballManager;
    const cueBall = ballManager.getCueBall();
    if (!cueBall || cueBall.pocketed) return null;

    // Determine which balls the AI should target
    const targetBalls = this.getTargetBalls(game);
    if (targetBalls.length === 0) return null;

    const candidates: ShotCandidate[] = [];

    for (const ball of targetBalls) {
      for (let pi = 0; pi < POCKET_POSITIONS.length; pi++) {
        const candidate = this.evaluateShot(cueBall, ball, pi, game);
        if (candidate) {
          candidates.push(candidate);
        }
      }
    }

    if (candidates.length === 0) return null;

    // Sort by score (descending) and pick best
    candidates.sort((a, b) => b.score - a.score);

    // For lower difficulty, sometimes pick a suboptimal shot
    if (this.difficulty === 'easy' && candidates.length > 1 && Math.random() < 0.3) {
      const idx = Math.min(1 + Math.floor(Math.random() * 2), candidates.length - 1);
      return candidates[idx];
    }

    return candidates[0];
  }

  // Get which balls AI should be targeting
  private getTargetBalls(game: GameManager): PoolBall[] {
    const bm = game.ballManager;
    const aiPlayer = game.players[game.currentPlayerIndex];

    if (game.mode === '9ball') {
      // Must hit lowest numbered ball first
      const activeBalls = bm.getActiveBalls().filter(b => b.id !== CUE_BALL_ID);
      activeBalls.sort((a, b) => a.id - b.id);
      // Can pocket any ball, but must hit lowest first
      // For simplicity, target the lowest ball toward any pocket
      return activeBalls.slice(0, Math.min(3, activeBalls.length));
    }

    if (game.mode === '8ball') {
      if (!game.assignmentsDone) {
        // No assignment yet — target any ball
        return bm.getActiveBalls().filter(b => b.id !== CUE_BALL_ID && b.id !== 8);
      }

      const targetGroup = aiPlayer.assignment === 'solids'
        ? bm.getSolids()
        : bm.getStripes();

      if (targetGroup.length === 0) {
        // All own balls pocketed — target 8-ball
        const eight = bm.getEightBall();
        return eight && !eight.pocketed ? [eight] : [];
      }

      return targetGroup;
    }

    // Freeplay — target anything
    return bm.getActiveBalls().filter(b => b.id !== CUE_BALL_ID);
  }

  // Evaluate a specific shot (cue ball -> target ball -> pocket)
  private evaluateShot(cueBall: PoolBall, target: PoolBall, pocketIndex: number, game: GameManager): ShotCandidate | null {
    const pocket = POCKET_POSITIONS[pocketIndex];

    // Vector from target ball to pocket
    const toPocketX = pocket.x - target.position.x;
    const toPocketZ = pocket.z - target.position.z;
    const toPocketDist = Math.sqrt(toPocketX * toPocketX + toPocketZ * toPocketZ);
    if (toPocketDist < 0.01) return null;

    // Normalize
    const toPocketNX = toPocketX / toPocketDist;
    const toPocketNZ = toPocketZ / toPocketDist;

    // Ghost ball position (where cue ball needs to be at impact)
    const ghostX = target.position.x - toPocketNX * BALL_RADIUS * 2;
    const ghostZ = target.position.z - toPocketNZ * BALL_RADIUS * 2;

    // Vector from cue ball to ghost position
    const toGhostX = ghostX - cueBall.position.x;
    const toGhostZ = ghostZ - cueBall.position.z;
    const toGhostDist = Math.sqrt(toGhostX * toGhostX + toGhostZ * toGhostZ);
    if (toGhostDist < BALL_RADIUS * 2) return null;

    // Aim angle
    const aimAngle = Math.atan2(-toGhostX, -toGhostZ);

    // Check if path to ghost ball is clear (no obstructions)
    if (this.isPathBlocked(cueBall.position, ghostX, ghostZ, target.id, game.ballManager)) {
      return null; // Shot is blocked
    }

    // Check if path from target to pocket is reasonably clear
    if (this.isPathBlocked(target.position, pocket.x, pocket.z, -1, game.ballManager, target.id)) {
      return null;
    }

    // Calculate cut angle (angle between cue-to-target and target-to-pocket)
    const cueToTargetX = toGhostX / toGhostDist;
    const cueToTargetZ = toGhostZ / toGhostDist;
    const dotProduct = cueToTargetX * toPocketNX + cueToTargetZ * toPocketNZ;
    const cutAngle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));

    // Score the shot
    let score = 100;

    // Penalize long distances
    score -= toGhostDist * 20;
    score -= toPocketDist * 15;

    // Penalize extreme cut angles (>60 degrees)
    if (cutAngle > Math.PI / 3) {
      score -= (cutAngle - Math.PI / 3) * 100;
    }

    // Bonus for corner pockets (easier in real pool)
    const isCornerPocket = pocketIndex !== 1 && pocketIndex !== 4;
    if (isCornerPocket) score += 5;

    // Bonus for straight shots (low cut angle)
    if (cutAngle < 0.3) score += 15;

    // Penalize shots that could scratch (cue ball toward pocket)
    // Simple check: if ghost ball is very close to a pocket
    for (const pp of POCKET_POSITIONS) {
      const dx = ghostX - pp.x;
      const dz = ghostZ - pp.z;
      if (Math.sqrt(dx * dx + dz * dz) < POCKET_RADIUS * 3) {
        score -= 30;
      }
    }

    if (score < 0) return null;

    // Calculate ideal power
    const totalDist = toGhostDist + toPocketDist * 0.5;
    const power = Math.max(1.5, Math.min(6.0, totalDist * 2.5));

    return {
      targetBall: target,
      pocketIndex,
      aimAngle,
      power,
      score,
      distance: toGhostDist,
    };
  }

  // Check if a ball path is blocked by other balls
  private isPathBlocked(from: Vector3, toX: number, toZ: number, excludeId: number, bm: BallManager, excludeId2?: number): boolean {
    const dx = toX - from.x;
    const dz = toZ - from.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 0.01) return false;

    const nx = dx / dist;
    const nz = dz / dist;

    for (const ball of bm.getActiveBalls()) {
      if (ball.id === CUE_BALL_ID) continue;
      if (ball.id === excludeId) continue;
      if (excludeId2 !== undefined && ball.id === excludeId2) continue;

      // Point-to-line distance
      const bx = ball.position.x - from.x;
      const bz = ball.position.z - from.z;

      // Project onto ray
      const t = bx * nx + bz * nz;
      if (t < BALL_RADIUS || t > dist - BALL_RADIUS) continue;

      // Perpendicular distance
      const perpX = bx - t * nx;
      const perpZ = bz - t * nz;
      const perpDist = Math.sqrt(perpX * perpX + perpZ * perpZ);

      if (perpDist < BALL_RADIUS * 2.2) {
        return true; // Blocked
      }
    }

    return false;
  }

  // AI ball-in-hand: place cue ball in best position
  placeCueBall(game: GameManager): void {
    const bm = game.ballManager;
    const cueBall = bm.getCueBall();
    if (!cueBall) return;

    // Try a few positions and evaluate best shot from each
    const testPositions: Vector3[] = [];
    const gridSteps = 5;

    for (let xi = 0; xi < gridSteps; xi++) {
      for (let zi = 0; zi < gridSteps; zi++) {
        const x = -HW * 0.7 + (xi / (gridSteps - 1)) * HW * 1.4;
        const z = -HL * 0.7 + (zi / (gridSteps - 1)) * HL * 1.4;

        // Check not too close to any ball
        let tooClose = false;
        for (const b of bm.getActiveBalls()) {
          if (b.id === CUE_BALL_ID) continue;
          const dx = x - b.position.x;
          const dz = z - b.position.z;
          if (Math.sqrt(dx * dx + dz * dz) < BALL_RADIUS * 4) {
            tooClose = true;
            break;
          }
        }
        if (!tooClose) {
          testPositions.push(new Vector3(x, TABLE_HEIGHT + BALL_RADIUS, z));
        }
      }
    }

    let bestPos = new Vector3(0, TABLE_HEIGHT + BALL_RADIUS, HL * 0.3);
    let bestScore = -Infinity;

    for (const pos of testPositions) {
      cueBall.position.copy(pos);
      const shot = this.evaluateBestShot(game);
      if (shot && shot.score > bestScore) {
        bestScore = shot.score;
        bestPos.copy(pos);
      }
    }

    cueBall.position.copy(bestPos);
  }
}
