import {
  World,
  Mesh,
  Group,
  CylinderGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  LineBasicMaterial,
  Color,
  Vector3,
  Quaternion,
  BufferGeometry,
  Float32BufferAttribute,
  LineSegments,
  AdditiveBlending,
  SphereGeometry,
} from '@iwsdk/core';

import { BallManager, CUE_BALL_ID, PoolBall } from './balls';
import { TABLE_HEIGHT, BALL_RADIUS, TABLE_WIDTH, TABLE_LENGTH } from './table';
import { GameManager } from './game';
import { AudioManager } from './audio';
import type { SpinSystem } from './spin';

const CUE_LENGTH = 1.4;
const CUE_THICK_RADIUS = 0.012;
const CUE_TIP_RADIUS = 0.006;
const MAX_POWER = 8.0;
const CHARGE_RATE = 4.0; // power per second
const GUIDE_LINE_LEN = 2.0;

export class CueStick {
  group: Group;
  shaft: Mesh;
  tip: Mesh;
  tipGlow: Mesh;
  guideLine: LineSegments;
  reflectedLine: LineSegments; // Shows predicted bounce direction
  ghostBallIndicator: Mesh; // Shows where cue ball will be at impact
  powerIndicator: Mesh;
  world: World;
  ballManager: BallManager;
  spinSystem: SpinSystem | null = null;

  aimAngle: number = 0;        // Radians around Y axis
  power: number = 0;
  isCharging: boolean = false;
  isVisible: boolean = false;

  // Aim direction (unit vector on XZ plane)
  aimDir: Vector3 = new Vector3(0, 0, -1);

  constructor(world: World, ballManager: BallManager) {
    this.world = world;
    this.ballManager = ballManager;
    this.group = new Group();
    this.group.name = 'cue-stick';

    // Shaft (tapered cylinder)
    const shaftGeo = new CylinderGeometry(CUE_TIP_RADIUS, CUE_THICK_RADIUS, CUE_LENGTH, 8);
    const shaftMat = new MeshStandardMaterial({
      color: 0x1a0a00,
      metalness: 0.3,
      roughness: 0.6,
      emissive: new Color(0x331100),
      emissiveIntensity: 0.2,
    });
    this.shaft = new Mesh(shaftGeo, shaftMat);
    this.shaft.rotation.x = Math.PI / 2; // Point along Z
    this.shaft.position.z = CUE_LENGTH / 2;
    this.group.add(this.shaft);

    // Tip (bright cyan)
    const tipGeo = new SphereGeometry(CUE_TIP_RADIUS + 0.001, 8, 8);
    const tipMat = new MeshBasicMaterial({
      color: 0x00ffdd,
      transparent: true,
      opacity: 0.9,
    });
    this.tip = new Mesh(tipGeo, tipMat);
    this.tip.position.z = 0;
    this.group.add(this.tip);

    // Tip glow
    const tipGlowGeo = new SphereGeometry(CUE_TIP_RADIUS * 3, 8, 8);
    const tipGlowMat = new MeshBasicMaterial({
      color: 0x00ffdd,
      transparent: true,
      opacity: 0.2,
      blending: AdditiveBlending,
    });
    this.tipGlow = new Mesh(tipGlowGeo, tipGlowMat);
    this.tipGlow.position.z = 0;
    this.group.add(this.tipGlow);

    // Guide line (trajectory preview from cue ball)
    const lineGeo = new BufferGeometry();
    lineGeo.setAttribute('position', new Float32BufferAttribute([
      0, 0, 0, 0, 0, -GUIDE_LINE_LEN
    ], 3));
    this.guideLine = new LineSegments(lineGeo, new LineBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.4,
    }));
    this.group.add(this.guideLine);

    // Reflected trajectory line (after hitting a ball)
    const refLineGeo = new BufferGeometry();
    refLineGeo.setAttribute('position', new Float32BufferAttribute([
      0, 0, 0, 0, 0, 0
    ], 3));
    this.reflectedLine = new LineSegments(refLineGeo, new LineBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.25,
    }));
    this.reflectedLine.visible = false;
    world.scene.add(this.reflectedLine);

    // Ghost ball indicator at predicted impact point
    const ghostGeo = new SphereGeometry(BALL_RADIUS, 8, 8);
    const ghostMat = new MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.15,
      blending: AdditiveBlending,
    });
    this.ghostBallIndicator = new Mesh(ghostGeo, ghostMat);
    this.ghostBallIndicator.visible = false;
    world.scene.add(this.ghostBallIndicator);

    // Power indicator (bar that grows during charge)
    const powerGeo = new CylinderGeometry(0.003, 0.003, 0.001, 8);
    const powerMat = new MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.8,
    });
    this.powerIndicator = new Mesh(powerGeo, powerMat);
    this.powerIndicator.rotation.x = Math.PI / 2;
    this.powerIndicator.position.z = CUE_LENGTH + 0.02;
    this.powerIndicator.visible = false;
    this.group.add(this.powerIndicator);

    world.scene.add(this.group);
    this.hide();
  }

  show(): void {
    this.group.visible = true;
    this.isVisible = true;
  }

  hide(): void {
    this.group.visible = false;
    this.isVisible = false;
    this.isCharging = false;
    this.power = 0;
    this.reflectedLine.visible = false;
    this.ghostBallIndicator.visible = false;
  }

  setAimAngle(angle: number): void {
    this.aimAngle = angle;
    this.aimDir.set(Math.sin(angle), 0, Math.cos(angle));
  }

  startCharge(): void {
    if (!this.isVisible) return;
    this.isCharging = true;
    this.power = 0;
    this.powerIndicator.visible = true;
  }

  setSpinSystem(spin: SpinSystem): void {
    this.spinSystem = spin;
  }

  release(game: GameManager, audio: AudioManager): void {
    if (!this.isCharging || this.power < 0.1) {
      this.isCharging = false;
      this.power = 0;
      this.powerIndicator.visible = false;
      return;
    }

    const cueBall = this.ballManager.getCueBall();
    if (!cueBall || cueBall.pocketed) return;

    // Apply velocity to cue ball in aim direction
    const shotPower = this.power;
    cueBall.velocity.set(
      -this.aimDir.x * shotPower,
      0,
      -this.aimDir.z * shotPower
    );

    // Apply spin forces
    if (this.spinSystem) {
      const spinVel = this.spinSystem.getSpinVelocity(this.aimDir, shotPower);
      cueBall.velocity.x += spinVel.x;
      cueBall.velocity.z += spinVel.z;
      // Store spin for post-collision application
      cueBall.spin = { x: this.spinSystem.spin.x, y: this.spinSystem.spin.y };
    }

    audio.playCueHit(shotPower / MAX_POWER);

    this.isCharging = false;
    this.power = 0;
    this.powerIndicator.visible = false;
    this.hide();

    game.onShot();
  }

  updateAimFromMouse(nx: number, ny: number, world: World): void {
    const cueBall = this.ballManager.getCueBall();
    if (!cueBall || cueBall.pocketed) return;

    // Simple: rotate aim based on mouse X
    this.aimAngle += nx * 0.02;
    this.setAimAngle(this.aimAngle);
  }

  updateAimFromController(thumbstickX: number): void {
    this.aimAngle += thumbstickX * 0.03;
    this.setAimAngle(this.aimAngle);
  }

  // Predict first ball collision along aim trajectory
  private predictCollision(): { hitBall: PoolBall; hitPoint: Vector3; distance: number; reflectDir: Vector3 } | null {
    const cueBall = this.ballManager.getCueBall();
    if (!cueBall || cueBall.pocketed) return null;

    const rayOrigin = cueBall.position.clone();
    const rayDir = new Vector3(-this.aimDir.x, 0, -this.aimDir.z).normalize();

    let closest: { hitBall: PoolBall; hitPoint: Vector3; distance: number; reflectDir: Vector3 } | null = null;
    let closestDist = Infinity;

    for (const ball of this.ballManager.getActiveBalls()) {
      if (ball.id === CUE_BALL_ID || ball.pocketed) continue;

      // Ray-sphere intersection (2D, on table plane)
      const oc = new Vector3(
        rayOrigin.x - ball.position.x,
        0,
        rayOrigin.z - ball.position.z
      );
      const a = rayDir.x * rayDir.x + rayDir.z * rayDir.z;
      const b = 2 * (oc.x * rayDir.x + oc.z * rayDir.z);
      const c = oc.x * oc.x + oc.z * oc.z - (BALL_RADIUS * 2) * (BALL_RADIUS * 2);
      const discriminant = b * b - 4 * a * c;

      if (discriminant >= 0) {
        const t = (-b - Math.sqrt(discriminant)) / (2 * a);
        if (t > 0.01 && t < closestDist) {
          closestDist = t;
          const hitPoint = new Vector3(
            rayOrigin.x + rayDir.x * t,
            rayOrigin.y,
            rayOrigin.z + rayDir.z * t
          );

          // Calculate reflected direction for target ball
          const normal = new Vector3(
            ball.position.x - hitPoint.x,
            0,
            ball.position.z - hitPoint.z
          ).normalize();

          // Target ball goes in the normal direction
          const reflectDir = normal.clone();

          closest = { hitBall: ball, hitPoint, distance: t, reflectDir };
        }
      }
    }

    return closest;
  }

  update(dt: number, world: World): void {
    if (!this.isVisible) return;

    const cueBall = this.ballManager.getCueBall();
    if (!cueBall || cueBall.pocketed) return;

    // Position cue behind cue ball in aim direction
    const pullback = this.isCharging ? 0.05 + (this.power / MAX_POWER) * 0.15 : 0.05;

    this.group.position.set(
      cueBall.position.x + this.aimDir.x * (BALL_RADIUS + pullback),
      cueBall.position.y,
      cueBall.position.z + this.aimDir.z * (BALL_RADIUS + pullback)
    );

    // Rotate to face cue ball
    this.group.rotation.y = -this.aimAngle + Math.PI;

    // Charge power
    if (this.isCharging) {
      this.power = Math.min(MAX_POWER, this.power + CHARGE_RATE * dt);

      // Update power indicator
      const ratio = this.power / MAX_POWER;
      const barLen = ratio * 0.3;
      this.powerIndicator.scale.set(1, Math.max(barLen, 0.01) * 1000, 1);
      this.powerIndicator.position.z = CUE_LENGTH * 0.5 + barLen / 2;

      // Color shift: green -> yellow -> red
      const r = Math.min(1, ratio * 2);
      const g = Math.max(0, 1 - ratio);
      (this.powerIndicator.material as MeshBasicMaterial).color.setRGB(r, g, 0);

      // Tip glow pulses during charge
      (this.tipGlow.material as MeshBasicMaterial).opacity = 0.2 + ratio * 0.5;
    }

    // Update guide line
    const lineLen = GUIDE_LINE_LEN;
    const lineGeo = this.guideLine.geometry;
    const positions = lineGeo.attributes.position;
    const cueBallRelX = cueBall.position.x - this.group.position.x;
    const cueBallRelZ = cueBall.position.z - this.group.position.z;
    (positions.array as Float32Array)[0] = cueBallRelX - this.aimDir.x * BALL_RADIUS;
    (positions.array as Float32Array)[2] = cueBallRelZ - this.aimDir.z * BALL_RADIUS;
    (positions.array as Float32Array)[3] = cueBallRelX - this.aimDir.x * lineLen;
    (positions.array as Float32Array)[5] = cueBallRelZ - this.aimDir.z * lineLen;
    positions.needsUpdate = true;

    // Predict collision and show ghost ball + reflected trajectory
    const prediction = this.predictCollision();
    if (prediction && prediction.distance < GUIDE_LINE_LEN) {
      this.ghostBallIndicator.visible = true;
      this.ghostBallIndicator.position.copy(prediction.hitPoint);

      // Show reflected trajectory (where target ball will go)
      this.reflectedLine.visible = true;
      const refGeo = this.reflectedLine.geometry;
      const refPos = refGeo.attributes.position;
      const refLen = 0.6;
      (refPos.array as Float32Array)[0] = prediction.hitBall.position.x;
      (refPos.array as Float32Array)[1] = prediction.hitBall.position.y;
      (refPos.array as Float32Array)[2] = prediction.hitBall.position.z;
      (refPos.array as Float32Array)[3] = prediction.hitBall.position.x + prediction.reflectDir.x * refLen;
      (refPos.array as Float32Array)[4] = prediction.hitBall.position.y;
      (refPos.array as Float32Array)[5] = prediction.hitBall.position.z + prediction.reflectDir.z * refLen;
      refPos.needsUpdate = true;

      // Shorten guide line to collision point
      const relHitX = prediction.hitPoint.x - this.group.position.x;
      const relHitZ = prediction.hitPoint.z - this.group.position.z;
      (positions.array as Float32Array)[3] = relHitX;
      (positions.array as Float32Array)[5] = relHitZ;
      positions.needsUpdate = true;
    } else {
      this.ghostBallIndicator.visible = false;
      this.reflectedLine.visible = false;
    }
  }
}
