// Spin/English System — Advanced cue ball control
// Spin is applied as post-collision forces on the cue ball
import {
  World,
  Mesh,
  Group,
  SphereGeometry,
  CylinderGeometry,
  RingGeometry,
  MeshBasicMaterial,
  Color,
  Vector3,
  AdditiveBlending,
} from '@iwsdk/core';

import { BALL_RADIUS, TABLE_HEIGHT } from './table';

export interface SpinState {
  x: number;  // -1 to 1 (left-right english)
  y: number;  // -1 to 1 (backspin to topspin)
}

const SPIN_INDICATOR_RADIUS = 0.05;
const DOT_RADIUS = 0.008;

export class SpinSystem {
  spin: SpinState = { x: 0, y: 0 };
  world: World;
  indicatorGroup: Group;
  cueBallOutline: Mesh;
  spinDot: Mesh;
  spinDotGlow: Mesh;
  crosshairH: Mesh;
  crosshairV: Mesh;

  // 3D indicator shown near the cue ball
  private isVisible: boolean = false;

  constructor(world: World) {
    this.world = world;
    this.indicatorGroup = new Group();
    this.indicatorGroup.name = 'spin-indicator';

    // Cue ball outline (ring)
    const ringGeo = new RingGeometry(SPIN_INDICATOR_RADIUS - 0.002, SPIN_INDICATOR_RADIUS, 24);
    const ringMat = new MeshBasicMaterial({
      color: 0x00ddff,
      transparent: true,
      opacity: 0.6,
      side: 2,
    });
    this.cueBallOutline = new Mesh(ringGeo, ringMat);
    this.indicatorGroup.add(this.cueBallOutline);

    // Inner fill (translucent cue ball face)
    const fillGeo = new SphereGeometry(SPIN_INDICATOR_RADIUS - 0.003, 16, 16);
    const fillMat = new MeshBasicMaterial({
      color: 0x112233,
      transparent: true,
      opacity: 0.35,
    });
    const fill = new Mesh(fillGeo, fillMat);
    this.indicatorGroup.add(fill);

    // Crosshair lines
    const crossMat = new MeshBasicMaterial({
      color: 0x335566,
      transparent: true,
      opacity: 0.3,
    });
    // Horizontal crosshair
    const hGeo = new CylinderGeometry(0.001, 0.001, SPIN_INDICATOR_RADIUS * 1.8, 4);
    this.crosshairH = new Mesh(hGeo, crossMat);
    this.crosshairH.rotation.z = Math.PI / 2;
    this.indicatorGroup.add(this.crosshairH);

    // Vertical crosshair
    this.crosshairV = new Mesh(hGeo.clone(), crossMat.clone());
    this.indicatorGroup.add(this.crosshairV);

    // Spin dot (shows where you're hitting the ball)
    const dotGeo = new SphereGeometry(DOT_RADIUS, 8, 8);
    const dotMat = new MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.9,
    });
    this.spinDot = new Mesh(dotGeo, dotMat);
    this.indicatorGroup.add(this.spinDot);

    // Dot glow
    const dotGlowGeo = new SphereGeometry(DOT_RADIUS * 2.5, 8, 8);
    const dotGlowMat = new MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.25,
      blending: AdditiveBlending,
    });
    this.spinDotGlow = new Mesh(dotGlowGeo, dotGlowMat);
    this.indicatorGroup.add(this.spinDotGlow);

    // Face indicator toward camera (will be positioned in update)
    this.indicatorGroup.rotation.x = -Math.PI / 2;

    world.scene.add(this.indicatorGroup);
    this.hide();
  }

  reset(): void {
    this.spin = { x: 0, y: 0 };
    this.updateDotPosition();
  }

  // Adjust spin with input (-1 to 1 range, clamped to circle)
  adjustSpin(dx: number, dy: number): void {
    this.spin.x = Math.max(-1, Math.min(1, this.spin.x + dx));
    this.spin.y = Math.max(-1, Math.min(1, this.spin.y + dy));

    // Clamp to circle
    const mag = Math.sqrt(this.spin.x * this.spin.x + this.spin.y * this.spin.y);
    if (mag > 1) {
      this.spin.x /= mag;
      this.spin.y /= mag;
    }

    this.updateDotPosition();
  }

  setSpin(x: number, y: number): void {
    this.spin.x = Math.max(-1, Math.min(1, x));
    this.spin.y = Math.max(-1, Math.min(1, y));
    const mag = Math.sqrt(this.spin.x * this.spin.x + this.spin.y * this.spin.y);
    if (mag > 1) {
      this.spin.x /= mag;
      this.spin.y /= mag;
    }
    this.updateDotPosition();
  }

  private updateDotPosition(): void {
    const px = this.spin.x * (SPIN_INDICATOR_RADIUS - DOT_RADIUS - 0.003);
    const py = this.spin.y * (SPIN_INDICATOR_RADIUS - DOT_RADIUS - 0.003);
    this.spinDot.position.set(px, py, 0.005);
    this.spinDotGlow.position.set(px, py, 0.004);

    // Color shifts based on spin type
    const hasSpin = Math.abs(this.spin.x) > 0.05 || Math.abs(this.spin.y) > 0.05;
    if (!hasSpin) {
      (this.spinDot.material as MeshBasicMaterial).color.setHex(0x00ddff);
      (this.spinDotGlow.material as MeshBasicMaterial).color.setHex(0x00ddff);
    } else if (this.spin.y > 0.3) {
      // Topspin — green
      (this.spinDot.material as MeshBasicMaterial).color.setHex(0x00ff66);
      (this.spinDotGlow.material as MeshBasicMaterial).color.setHex(0x00ff66);
    } else if (this.spin.y < -0.3) {
      // Backspin — red
      (this.spinDot.material as MeshBasicMaterial).color.setHex(0xff3300);
      (this.spinDotGlow.material as MeshBasicMaterial).color.setHex(0xff3300);
    } else {
      // English — orange
      (this.spinDot.material as MeshBasicMaterial).color.setHex(0xff8800);
      (this.spinDotGlow.material as MeshBasicMaterial).color.setHex(0xff8800);
    }
  }

  show(): void {
    this.indicatorGroup.visible = true;
    this.isVisible = true;
  }

  hide(): void {
    this.indicatorGroup.visible = false;
    this.isVisible = false;
  }

  // Apply spin forces to cue ball after shot
  // Returns additional velocity components from spin
  getSpinVelocity(aimDir: Vector3, power: number): Vector3 {
    const spinForce = new Vector3();

    // Topspin/backspin: affects forward momentum after first contact
    // Positive y spin = topspin = ball continues forward after collision
    // Negative y spin = backspin = ball slows/reverses after collision
    const spinMagnitude = power * 0.3;

    // Topspin/backspin adds velocity in aim direction
    spinForce.x = -aimDir.x * this.spin.y * spinMagnitude * 0.5;
    spinForce.z = -aimDir.z * this.spin.y * spinMagnitude * 0.5;

    // Side english adds perpendicular velocity (curve)
    // Perpendicular to aim direction on XZ plane
    const perpX = -aimDir.z;
    const perpZ = aimDir.x;
    spinForce.x += perpX * this.spin.x * spinMagnitude * 0.3;
    spinForce.z += perpZ * this.spin.x * spinMagnitude * 0.3;

    return spinForce;
  }

  // Get spin label for HUD
  getSpinLabel(): string {
    const hasSpin = Math.abs(this.spin.x) > 0.05 || Math.abs(this.spin.y) > 0.05;
    if (!hasSpin) return 'CENTER';

    const parts: string[] = [];
    if (this.spin.y > 0.3) parts.push('TOP');
    else if (this.spin.y < -0.3) parts.push('BACK');
    if (this.spin.x < -0.3) parts.push('LEFT');
    else if (this.spin.x > 0.3) parts.push('RIGHT');

    return parts.length > 0 ? parts.join(' ') : 'SLIGHT';
  }

  // Update indicator position (follows cue ball in 3D space)
  updatePosition(cueBallPos: Vector3, aimDir: Vector3): void {
    if (!this.isVisible) return;

    // Position indicator above and to the left of the cue ball
    this.indicatorGroup.position.set(
      cueBallPos.x - aimDir.x * 0.15 + aimDir.z * 0.12,
      cueBallPos.y + 0.12,
      cueBallPos.z - aimDir.z * 0.15 - aimDir.x * 0.12
    );

    // Face upward (visible from above) — already set in constructor
  }
}
