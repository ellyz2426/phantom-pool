// Pocketed Ball Tray - 3D display of pocketed balls along table sides
import {
  World,
  Mesh,
  Group,
  SphereGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  LineBasicMaterial,
  EdgesGeometry,
  LineSegments,
  Color,
  Vector3,
  AdditiveBlending,
} from '@iwsdk/core';

import { BallManager, PoolBall, CUE_BALL_ID } from './balls';
import { TABLE_WIDTH, TABLE_LENGTH, TABLE_HEIGHT, BALL_RADIUS, RAIL_WIDTH } from './table';

// Ball colors (matching balls.ts)
const BALL_COLORS: { [key: number]: number } = {
  1: 0xff3300, 2: 0x0066ff, 3: 0xff0066, 4: 0x9900ff,
  5: 0xff6600, 6: 0x00cc44, 7: 0xaa0022, 8: 0x111111,
  9: 0xff3300, 10: 0x0066ff, 11: 0xff0066, 12: 0x9900ff,
  13: 0xff6600, 14: 0x00cc44, 15: 0xaa0022,
};

interface TrayBall {
  mesh: Mesh;
  glow: Mesh;
  targetPos: Vector3;
  currentScale: number;
}

export class PocketedBallTray {
  world: World;
  trayGroup: Group;
  player1Tray: Group;
  player2Tray: Group;
  trayBalls: Map<number, TrayBall> = new Map();
  private displayedBalls: Set<number> = new Set();

  // Tray rail (visual groove for balls to sit in)
  private trayRail1: Mesh;
  private trayRail2: Mesh;

  constructor(world: World) {
    this.world = world;
    this.trayGroup = new Group();
    this.trayGroup.name = 'pocketed-tray';

    // Player 1 tray (left side of table)
    this.player1Tray = new Group();
    this.player1Tray.name = 'p1-tray';
    this.trayGroup.add(this.player1Tray);

    // Player 2 tray (right side of table)
    this.player2Tray = new Group();
    this.player2Tray.name = 'p2-tray';
    this.trayGroup.add(this.player2Tray);

    const HW = TABLE_WIDTH / 2;
    const HL = TABLE_LENGTH / 2;

    // Create tray rails (narrow grooves along the table sides)
    const railLen = TABLE_LENGTH * 0.6;
    const railGeo = new CylinderGeometry(0.008, 0.008, railLen, 8);
    const railMat = new MeshStandardMaterial({
      color: 0x0a1520,
      metalness: 0.8,
      roughness: 0.3,
      emissive: new Color(0x002233),
      emissiveIntensity: 0.3,
    });

    // Player 1 tray rail
    this.trayRail1 = new Mesh(railGeo, railMat);
    this.trayRail1.rotation.x = Math.PI / 2;
    this.trayRail1.position.set(-(HW + RAIL_WIDTH + 0.12), TABLE_HEIGHT - 0.02, 0);
    this.trayGroup.add(this.trayRail1);

    // Player 1 tray rail edge glow
    const edgeGeo = new EdgesGeometry(railGeo);
    const edgeMat = new LineBasicMaterial({ color: 0x00aadd, transparent: true, opacity: 0.3 });
    const edge1 = new LineSegments(edgeGeo, edgeMat);
    edge1.rotation.copy(this.trayRail1.rotation);
    edge1.position.copy(this.trayRail1.position);
    this.trayGroup.add(edge1);

    // Player 2 tray rail
    this.trayRail2 = new Mesh(railGeo.clone(), railMat.clone());
    this.trayRail2.rotation.x = Math.PI / 2;
    this.trayRail2.position.set(HW + RAIL_WIDTH + 0.12, TABLE_HEIGHT - 0.02, 0);
    this.trayGroup.add(this.trayRail2);

    const edge2 = new LineSegments(edgeGeo.clone(), edgeMat.clone());
    edge2.rotation.copy(this.trayRail2.rotation);
    edge2.position.copy(this.trayRail2.position);
    this.trayGroup.add(edge2);

    world.scene.add(this.trayGroup);
  }

  // Update tray based on current game state
  update(dt: number, ballManager: BallManager, currentPlayerIndex: number): void {
    const HW = TABLE_WIDTH / 2;
    const HL = TABLE_LENGTH / 2;
    const startZ = HL * 0.3;
    const spacing = BALL_RADIUS * 2.5;

    // Count pocketed balls per player side
    let p1Count = 0;
    let p2Count = 0;

    for (const ball of ballManager.balls) {
      if (ball.id === CUE_BALL_ID || !ball.pocketed) {
        // Remove from tray if not pocketed
        if (this.displayedBalls.has(ball.id)) {
          this.removeTrayBall(ball.id);
        }
        continue;
      }

      if (this.displayedBalls.has(ball.id)) {
        // Already displayed — just animate
        const trayBall = this.trayBalls.get(ball.id);
        if (trayBall) {
          // Smooth scale-in animation
          trayBall.currentScale = Math.min(1, trayBall.currentScale + dt * 4);
          trayBall.mesh.scale.setScalar(trayBall.currentScale);
          trayBall.glow.scale.setScalar(trayBall.currentScale);

          // Slight hover bob
          const bob = Math.sin(performance.now() * 0.002 + ball.id * 0.7) * 0.003;
          trayBall.mesh.position.y = trayBall.targetPos.y + bob;
          trayBall.glow.position.y = trayBall.targetPos.y + bob;
        }

        // Count which side
        if (ball.id <= 7) p1Count++;
        else p2Count++;
        continue;
      }

      // Determine which side (solids = P1 left, stripes = P2 right, 8-ball = winner side)
      let isP1Side: boolean;
      if (ball.id === 8) {
        isP1Side = currentPlayerIndex === 0;
      } else {
        isP1Side = ball.id <= 7; // Solids left, stripes right
      }

      const count = isP1Side ? p1Count : p2Count;
      const sideX = isP1Side
        ? -(HW + RAIL_WIDTH + 0.12)
        : HW + RAIL_WIDTH + 0.12;
      const z = startZ - count * spacing;

      const targetPos = new Vector3(sideX, TABLE_HEIGHT - 0.01, z);
      this.addTrayBall(ball.id, targetPos);

      if (isP1Side) p1Count++;
      else p2Count++;
    }

    // Animate existing tray balls
    for (const [, trayBall] of this.trayBalls) {
      trayBall.currentScale = Math.min(1, trayBall.currentScale + dt * 4);
      trayBall.mesh.scale.setScalar(trayBall.currentScale);
      trayBall.glow.scale.setScalar(trayBall.currentScale);
    }
  }

  private addTrayBall(ballId: number, targetPos: Vector3): void {
    const color = BALL_COLORS[ballId] || 0xffffff;
    const isStripe = ballId >= 9;
    const isEight = ballId === 8;

    // Small ball mesh
    const r = BALL_RADIUS * 0.8; // Slightly smaller for tray
    const geo = new SphereGeometry(r, 12, 12);
    const mat = new MeshStandardMaterial({
      color: isEight ? 0x080808 : color,
      metalness: 0.5,
      roughness: 0.3,
      emissive: new Color(color),
      emissiveIntensity: 0.5,
    });
    const mesh = new Mesh(geo, mat);
    mesh.position.copy(targetPos);
    mesh.scale.setScalar(0.01); // Start tiny for pop-in animation
    this.trayGroup.add(mesh);

    // Glow
    const glowGeo = new SphereGeometry(r * 1.3, 8, 8);
    const glowMat = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.15,
      blending: AdditiveBlending,
    });
    const glow = new Mesh(glowGeo, glowMat);
    glow.position.copy(targetPos);
    glow.scale.setScalar(0.01);
    this.trayGroup.add(glow);

    this.trayBalls.set(ballId, {
      mesh,
      glow,
      targetPos: targetPos.clone(),
      currentScale: 0.01,
    });
    this.displayedBalls.add(ballId);
  }

  private removeTrayBall(ballId: number): void {
    const trayBall = this.trayBalls.get(ballId);
    if (trayBall) {
      this.trayGroup.remove(trayBall.mesh);
      this.trayGroup.remove(trayBall.glow);
      trayBall.mesh.geometry.dispose();
      (trayBall.mesh.material as MeshStandardMaterial).dispose();
      trayBall.glow.geometry.dispose();
      (trayBall.glow.material as MeshBasicMaterial).dispose();
      this.trayBalls.delete(ballId);
    }
    this.displayedBalls.delete(ballId);
  }

  // Reset tray (new game)
  reset(): void {
    for (const [id] of this.trayBalls) {
      this.removeTrayBall(id);
    }
    this.trayBalls.clear();
    this.displayedBalls.clear();
  }
}
