// Visual Effects - collision sparks, pocket animations, ball trails, rail sparkles
// Uses object pooling for performance
import {
  World,
  Mesh,
  Group,
  SphereGeometry,
  ConeGeometry,
  MeshBasicMaterial,
  Color,
  Vector3,
  AdditiveBlending,
} from '@iwsdk/core';

// Shared geometries (pooled)
const SPARK_GEO = new SphereGeometry(0.004, 4, 4);
const TRAIL_GEO = new SphereGeometry(0.006, 4, 4);
const CONE_GEO = new ConeGeometry(0.005, 0.012, 4);

interface Particle {
  mesh: Mesh;
  velocity: Vector3;
  life: number;
  maxLife: number;
}

interface TrailPoint {
  mesh: Mesh;
  life: number;
}

export class EffectsManager {
  world: World;
  particles: Particle[] = [];
  trails: TrailPoint[] = [];
  pocketFlashes: { mesh: Mesh; life: number }[] = [];
  effectsGroup: Group;
  private particlePool: Mesh[] = [];
  private readonly MAX_PARTICLES = 80;
  private readonly MAX_TRAILS = 30;

  constructor(world: World) {
    this.world = world;
    this.effectsGroup = new Group();
    this.effectsGroup.name = 'effects';
    world.scene.add(this.effectsGroup);
  }

  // Get a mesh from pool or create new
  private getPooledMesh(geo: SphereGeometry | ConeGeometry, color: number, opacity: number): Mesh {
    let mesh = this.particlePool.pop();
    if (mesh) {
      (mesh.material as MeshBasicMaterial).color.setHex(color);
      (mesh.material as MeshBasicMaterial).opacity = opacity;
      mesh.visible = true;
      mesh.scale.setScalar(1);
      mesh.geometry = geo;
    } else {
      const mat = new MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: AdditiveBlending,
      });
      mesh = new Mesh(geo, mat);
    }
    return mesh;
  }

  // Return mesh to pool
  private recycleMesh(mesh: Mesh): void {
    mesh.visible = false;
    if (this.particlePool.length < 50) {
      this.particlePool.push(mesh);
    } else {
      mesh.geometry.dispose();
      (mesh.material as MeshBasicMaterial).dispose();
    }
  }

  // Spawn collision sparks between two balls
  spawnCollisionSparks(position: Vector3, impactSpeed: number): void {
    if (this.particles.length >= this.MAX_PARTICLES) return;
    const count = Math.min(Math.floor(impactSpeed * 4) + 2, 10);
    const intensity = Math.min(impactSpeed / 3.0, 1.0);

    for (let i = 0; i < count && this.particles.length < this.MAX_PARTICLES; i++) {
      const hue = Math.random() > 0.5 ? 0x00ffdd : 0x00aaff;
      const mesh = this.getPooledMesh(SPARK_GEO, hue, 0.8 * intensity);
      mesh.position.copy(position);
      this.effectsGroup.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const upward = 0.5 + Math.random() * 1.5;
      const speed = (0.3 + Math.random() * 0.7) * impactSpeed * 0.3;

      this.particles.push({
        mesh,
        velocity: new Vector3(
          Math.cos(angle) * speed,
          upward * 0.2,
          Math.sin(angle) * speed
        ),
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.3 + Math.random() * 0.3,
      });
    }
  }

  // Flash at pocket when ball is pocketed
  spawnPocketFlash(position: Vector3): void {
    // Ring flash
    const flashGeo = new SphereGeometry(0.06, 12, 12);
    const mat = new MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.9,
      blending: AdditiveBlending,
    });
    const mesh = new Mesh(flashGeo, mat);
    mesh.position.copy(position);
    mesh.position.y += 0.01;
    this.effectsGroup.add(mesh);
    this.pocketFlashes.push({ mesh, life: 0.5 });

    // Spawn upward sparks
    for (let i = 0; i < 8 && this.particles.length < this.MAX_PARTICLES; i++) {
      const sparkMesh = this.getPooledMesh(SPARK_GEO, 0xffaa00, 0.9);
      sparkMesh.position.copy(position);
      this.effectsGroup.add(sparkMesh);

      const angle = (i / 8) * Math.PI * 2;
      this.particles.push({
        mesh: sparkMesh,
        velocity: new Vector3(
          Math.cos(angle) * 0.3,
          1.0 + Math.random() * 0.5,
          Math.sin(angle) * 0.3
        ),
        life: 0.4,
        maxLife: 0.4,
      });
    }
  }

  // Add trail point behind fast-moving ball
  spawnTrailPoint(position: Vector3, color: number): void {
    if (this.trails.length >= this.MAX_TRAILS) return;
    const mat = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3,
      blending: AdditiveBlending,
    });
    const mesh = new Mesh(TRAIL_GEO, mat);
    mesh.position.copy(position);
    this.effectsGroup.add(mesh);
    this.trails.push({ mesh, life: 0.2 });
  }

  // Chalk dust puff when cue strikes ball
  spawnChalkDust(position: Vector3, direction: Vector3, power: number): void {
    if (this.particles.length >= this.MAX_PARTICLES) return;
    const count = Math.min(Math.floor(power * 3) + 4, 16);
    const intensity = Math.min(power / 6.0, 1.0);

    for (let i = 0; i < count && this.particles.length < this.MAX_PARTICLES; i++) {
      const hue = Math.random() > 0.3 ? 0x88ccff : 0xaaddff;
      const mesh = this.getPooledMesh(SPARK_GEO, hue, 0.5 * intensity);
      mesh.position.copy(position);
      this.effectsGroup.add(mesh);

      // Spread in a cone around the shot direction
      const spread = 0.6;
      const speed = (0.1 + Math.random() * 0.3) * (0.5 + power * 0.1);
      const vx = direction.x * speed + (Math.random() - 0.5) * spread * speed;
      const vz = direction.z * speed + (Math.random() - 0.5) * spread * speed;
      const vy = 0.2 + Math.random() * 0.4;

      this.particles.push({
        mesh,
        velocity: new Vector3(vx, vy, vz),
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.4 + Math.random() * 0.4,
      });
    }
  }

  // Turn change flash effect at table center
  spawnTurnFlash(position: Vector3): void {
    const geo = new SphereGeometry(0.03, 8, 8);
    const mat = new MeshBasicMaterial({
      color: 0x00ffdd,
      transparent: true,
      opacity: 0.6,
      blending: AdditiveBlending,
    });
    const mesh = new Mesh(geo, mat);
    mesh.position.copy(position);
    this.effectsGroup.add(mesh);
    this.pocketFlashes.push({ mesh, life: 0.3 });
  }

  // Rail sparkle/diamond effect when ball bounces off cushion
  spawnRailSparkle(position: Vector3, speed: number): void {
    if (this.particles.length >= this.MAX_PARTICLES) return;
    const count = Math.min(Math.floor(speed * 3) + 3, 8);
    const intensity = Math.min(speed / 2.5, 1.0);

    for (let i = 0; i < count && this.particles.length < this.MAX_PARTICLES; i++) {
      const colors = [0x00ffdd, 0xffcc00, 0x00aaff, 0xff8800];
      const hue = colors[Math.floor(Math.random() * colors.length)];
      const mesh = this.getPooledMesh(CONE_GEO, hue, 0.9 * intensity);
      mesh.position.copy(position);
      mesh.position.y += 0.01;
      mesh.rotation.z = Math.random() * Math.PI;
      this.effectsGroup.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const upward = 0.5 + Math.random() * 1.0;
      const spread = (0.2 + Math.random() * 0.4) * intensity;

      this.particles.push({
        mesh,
        velocity: new Vector3(
          Math.cos(angle) * spread,
          upward * 0.15,
          Math.sin(angle) * spread
        ),
        life: 0.2 + Math.random() * 0.25,
        maxLife: 0.2 + Math.random() * 0.25,
      });
    }
  }

  // Cue ball ghost trail for high-speed shots
  spawnCueTrail(position: Vector3): void {
    this.spawnTrailPoint(position, 0x88ccff);
  }

  update(dt: number): void {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.effectsGroup.remove(p.mesh);
        this.recycleMesh(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }

      p.mesh.position.x += p.velocity.x * dt;
      p.mesh.position.y += p.velocity.y * dt;
      p.mesh.position.z += p.velocity.z * dt;
      p.velocity.y -= 3.0 * dt; // Gravity

      const ratio = p.life / p.maxLife;
      (p.mesh.material as MeshBasicMaterial).opacity = ratio * 0.8;
      p.mesh.scale.setScalar(0.5 + ratio * 0.5);
    }

    // Update pocket flashes
    for (let i = this.pocketFlashes.length - 1; i >= 0; i--) {
      const f = this.pocketFlashes[i];
      f.life -= dt;
      if (f.life <= 0) {
        this.effectsGroup.remove(f.mesh);
        f.mesh.geometry.dispose();
        (f.mesh.material as MeshBasicMaterial).dispose();
        this.pocketFlashes.splice(i, 1);
        continue;
      }

      const ratio = f.life / 0.5;
      (f.mesh.material as MeshBasicMaterial).opacity = ratio * 0.9;
      const scale = 1 + (1 - ratio) * 2;
      f.mesh.scale.setScalar(scale);
    }

    // Update trails
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const t = this.trails[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.effectsGroup.remove(t.mesh);
        t.mesh.geometry.dispose();
        (t.mesh.material as MeshBasicMaterial).dispose();
        this.trails.splice(i, 1);
        continue;
      }

      const trailRatio = t.life / 0.2;
      (t.mesh.material as MeshBasicMaterial).opacity = trailRatio * 0.3;
      t.mesh.scale.setScalar(trailRatio);
    }
  }
}
