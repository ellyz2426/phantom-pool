// Ball Manager - 16 pool balls with neon holodeck style
import {
  World,
  Mesh,
  Group,
  SphereGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Color,
  Vector3,
  EdgesGeometry,
  LineSegments,
  LineBasicMaterial,
  CylinderGeometry,
  RingGeometry,
  AdditiveBlending,
} from '@iwsdk/core';

import { BALL_RADIUS, TABLE_HEIGHT, TABLE_WIDTH, TABLE_LENGTH } from './table';

export const CUE_BALL_ID = 0;

// Ball colors (holodeck neon palette)
const BALL_COLORS: { [key: number]: number } = {
  0: 0xffffff,   // Cue ball - bright white
  1: 0xff3300,   // 1 - neon red
  2: 0x0066ff,   // 2 - neon blue
  3: 0xff0066,   // 3 - neon magenta
  4: 0x9900ff,   // 4 - neon purple
  5: 0xff6600,   // 5 - neon orange
  6: 0x00cc44,   // 6 - neon green
  7: 0xaa0022,   // 7 - deep crimson
  8: 0x111111,   // 8 - black
  9: 0xff3300,   // 9-15 are stripes (same base colors)
  10: 0x0066ff,
  11: 0xff0066,
  12: 0x9900ff,
  13: 0xff6600,
  14: 0x00cc44,
  15: 0xaa0022,
};

export interface PoolBall {
  id: number;
  mesh: Mesh;
  glow: Mesh;
  shadow: Mesh;
  wireframe: LineSegments;
  stripe: Mesh | null;
  position: Vector3;
  velocity: Vector3;
  angularVelocity: Vector3;
  pocketed: boolean;
  isMoving: boolean;
}

export class BallManager {
  balls: PoolBall[] = [];
  world: World;
  ballGroup: Group;
  ballInHandRing: Mesh | null = null;
  private ballInHandTime: number = 0;

  constructor(world: World) {
    this.world = world;
    this.ballGroup = new Group();
    this.ballGroup.name = 'balls';
    world.scene.add(this.ballGroup);

    // Ball-in-hand indicator ring
    const ringGeo = new RingGeometry(BALL_RADIUS * 1.5, BALL_RADIUS * 2.0, 24);
    const ringMat = new MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.6,
      side: 2,
      blending: AdditiveBlending,
    });
    this.ballInHandRing = new Mesh(ringGeo, ringMat);
    this.ballInHandRing.rotation.x = -Math.PI / 2;
    this.ballInHandRing.visible = false;
    world.scene.add(this.ballInHandRing);
  }

  createBalls(): void {
    this.clearBalls();

    for (let i = 0; i <= 15; i++) {
      const ball = this.createBall(i);
      this.balls.push(ball);
    }
  }

  private createBall(id: number): PoolBall {
    const color = BALL_COLORS[id] || 0xffffff;
    const isStripe = id >= 9;
    const isCue = id === CUE_BALL_ID;
    const isEight = id === 8;

    // Main ball mesh
    const geo = new SphereGeometry(BALL_RADIUS, 16, 16);
    const mat = new MeshStandardMaterial({
      color: isCue ? 0xeeeeff : (isEight ? 0x080808 : color),
      metalness: isCue ? 0.3 : 0.5,
      roughness: isCue ? 0.2 : 0.3,
      emissive: new Color(isCue ? 0x334455 : color),
      emissiveIntensity: isCue ? 0.3 : 0.4,
    });
    const mesh = new Mesh(geo, mat);
    mesh.name = `ball-${id}`;

    // Wireframe overlay
    const edgesGeo = new EdgesGeometry(new SphereGeometry(BALL_RADIUS + 0.0005, 8, 8));
    const wireframe = new LineSegments(edgesGeo, new LineBasicMaterial({
      color: isCue ? 0x88ccff : color,
      transparent: true,
      opacity: 0.25,
    }));

    // Glow sphere (slightly larger, additive)
    const glowGeo = new SphereGeometry(BALL_RADIUS * 1.15, 8, 8);
    const glowMat = new MeshBasicMaterial({
      color: isCue ? 0x4488cc : color,
      transparent: true,
      opacity: 0.12,
      blending: AdditiveBlending,
    });
    const glow = new Mesh(glowGeo, glowMat);

    // Shadow (circle on table surface)
    const shadowGeo = new CylinderGeometry(BALL_RADIUS * 0.8, BALL_RADIUS * 0.8, 0.001, 8);
    const shadowMat = new MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
    });
    const shadow = new Mesh(shadowGeo, shadowMat);

    // Stripe band for balls 9-15
    let stripe: Mesh | null = null;
    if (isStripe) {
      const stripeGeo = new CylinderGeometry(BALL_RADIUS + 0.001, BALL_RADIUS + 0.001, BALL_RADIUS * 0.8, 16, 1, true);
      const stripeMat = new MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.7,
      });
      stripe = new Mesh(stripeGeo, stripeMat);
      mesh.add(stripe);
    }

    // Number indicator (small sphere on top of ball for identification)
    if (!isCue) {
      const numGeo = new SphereGeometry(BALL_RADIUS * 0.25, 6, 6);
      const numMat = new MeshBasicMaterial({ color: 0xffffff });
      const numMesh = new Mesh(numGeo, numMat);
      numMesh.position.y = BALL_RADIUS * 0.85;
      mesh.add(numMesh);
    }

    const group = new Group();
    group.add(mesh);
    group.add(wireframe);
    group.add(glow);
    group.add(shadow);
    this.ballGroup.add(group);

    const position = new Vector3();
    const velocity = new Vector3();
    const angularVelocity = new Vector3();

    return {
      id, mesh, glow, shadow, wireframe, stripe,
      position, velocity, angularVelocity,
      pocketed: false, isMoving: false,
    };
  }

  clearBalls(): void {
    for (const ball of this.balls) {
      ball.mesh.parent?.parent?.removeFromParent();
    }
    this.balls = [];
  }

  rackBalls(): void {
    const HW = TABLE_WIDTH / 2;
    const HL = TABLE_LENGTH / 2;
    const footSpotZ = -HL * 0.5;
    const d = BALL_RADIUS * 2.02; // Slightly larger than touching for visual clarity

    // Standard 8-ball rack (triangle at foot spot)
    // Row by row from apex to base
    const rackOrder = [1, 9, 2, 10, 8, 11, 3, 12, 6, 14, 4, 13, 7, 15, 5];
    let idx = 0;

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col <= row; col++) {
        const ballId = rackOrder[idx++];
        const ball = this.getBall(ballId);
        if (ball) {
          const x = (col - row / 2) * d;
          const z = footSpotZ - row * d * Math.sqrt(3) / 2;
          ball.position.set(x, TABLE_HEIGHT + BALL_RADIUS, z);
          ball.velocity.set(0, 0, 0);
          ball.angularVelocity.set(0, 0, 0);
          ball.pocketed = false;
          ball.isMoving = false;
        }
      }
    }

    // Cue ball at head spot
    const cueBall = this.getCueBall();
    if (cueBall) {
      cueBall.position.set(0, TABLE_HEIGHT + BALL_RADIUS, HL * 0.5);
      cueBall.velocity.set(0, 0, 0);
      cueBall.angularVelocity.set(0, 0, 0);
      cueBall.pocketed = false;
      cueBall.isMoving = false;
    }
  }

  rack9Ball(): void {
    const HL = TABLE_LENGTH / 2;
    const footSpotZ = -HL * 0.5;
    const d = BALL_RADIUS * 2.02;

    // 9-ball diamond rack: 1 at apex, 9 in center, rest random
    const rackOrder = [1, 2, 3, 4, 9, 5, 6, 7, 8];
    let idx = 0;
    const rows = [1, 2, 3, 2, 1]; // Diamond shape

    let currentRow = 0;
    for (let row = 0; row < rows.length; row++) {
      const count = rows[row];
      for (let col = 0; col < count; col++) {
        if (idx >= rackOrder.length) break;
        const ballId = rackOrder[idx++];
        const ball = this.getBall(ballId);
        if (ball) {
          const x = (col - (count - 1) / 2) * d;
          const z = footSpotZ - currentRow * d * Math.sqrt(3) / 2;
          ball.position.set(x, TABLE_HEIGHT + BALL_RADIUS, z);
          ball.velocity.set(0, 0, 0);
          ball.angularVelocity.set(0, 0, 0);
          ball.pocketed = false;
        }
      }
      currentRow++;
    }

    // Hide balls 10-15
    for (let i = 10; i <= 15; i++) {
      const ball = this.getBall(i);
      if (ball) ball.pocketed = true;
    }

    // Cue ball
    const cueBall = this.getCueBall();
    if (cueBall) {
      cueBall.position.set(0, TABLE_HEIGHT + BALL_RADIUS, HL * 0.5);
      cueBall.velocity.set(0, 0, 0);
      cueBall.pocketed = false;
    }
  }

  getBall(id: number): PoolBall | undefined {
    return this.balls.find(b => b.id === id);
  }

  getCueBall(): PoolBall | undefined {
    return this.getBall(CUE_BALL_ID);
  }

  allStopped(): boolean {
    return this.balls.filter(b => !b.pocketed).every(b => b.velocity.length() < 0.001);
  }

  update(dt: number, isBallInHand: boolean = false): void {
    this.ballInHandTime += dt;

    // Update ball-in-hand indicator
    if (this.ballInHandRing) {
      this.ballInHandRing.visible = isBallInHand;
      if (isBallInHand) {
        const cueBall = this.getCueBall();
        if (cueBall && !cueBall.pocketed) {
          this.ballInHandRing.position.set(cueBall.position.x, TABLE_HEIGHT + 0.002, cueBall.position.z);
          // Pulsing scale
          const pulse = 1.0 + 0.15 * Math.sin(this.ballInHandTime * 4);
          this.ballInHandRing.scale.setScalar(pulse);
          // Pulsing opacity
          (this.ballInHandRing.material as MeshBasicMaterial).opacity = 0.4 + 0.2 * Math.sin(this.ballInHandTime * 3);
        }
      }
    }

    for (const ball of this.balls) {
      if (ball.pocketed) {
        // Hide pocketed balls
        ball.mesh.parent!.visible = false;
        continue;
      }
      ball.mesh.parent!.visible = true;

      // Sync mesh position
      const group = ball.mesh.parent!;
      group.position.copy(ball.position);

      // Rotate ball based on angular velocity
      if (ball.angularVelocity.length() > 0.01) {
        const axis = ball.angularVelocity.clone().normalize();
        const angle = ball.angularVelocity.length() * dt;
        ball.mesh.rotateOnWorldAxis(axis, angle);
      }

      // Sync wireframe and glow
      ball.wireframe.position.copy(ball.position);
      ball.glow.position.copy(ball.position);

      // Shadow on table
      ball.shadow.position.set(ball.position.x, TABLE_HEIGHT + 0.001, ball.position.z);

      // Glow intensity based on speed
      const speed = ball.velocity.length();
      const glowMat = ball.glow.material as MeshBasicMaterial;
      glowMat.opacity = 0.12 + Math.min(speed * 0.3, 0.3);

      ball.isMoving = speed > 0.001;
    }
  }

  getActiveBalls(): PoolBall[] {
    return this.balls.filter(b => !b.pocketed);
  }

  getSolids(): PoolBall[] {
    return this.balls.filter(b => b.id >= 1 && b.id <= 7 && !b.pocketed);
  }

  getStripes(): PoolBall[] {
    return this.balls.filter(b => b.id >= 9 && b.id <= 15 && !b.pocketed);
  }

  getEightBall(): PoolBall | undefined {
    return this.getBall(8);
  }
}

