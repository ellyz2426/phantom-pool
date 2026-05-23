// Visual Effects - collision sparks, pocket animations, ball trails
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

  constructor(world: World) {
    this.world = world;
    this.effectsGroup = new Group();
    this.effectsGroup.name = 'effects';
    world.scene.add(this.effectsGroup);
  }

  // Spawn collision sparks between two balls
  spawnCollisionSparks(position: Vector3, impactSpeed: number): void {
    const count = Math.min(Math.floor(impactSpeed * 4) + 2, 12);
    const intensity = Math.min(impactSpeed / 3.0, 1.0);

    for (let i = 0; i < count; i++) {
      const geo = new SphereGeometry(0.003 + Math.random() * 0.003, 4, 4);
      const hue = Math.random() > 0.5 ? 0x00ffdd : 0x00aaff;
      const mat = new MeshBasicMaterial({
        color: hue,
        transparent: true,
        opacity: 0.8 * intensity,
        blending: AdditiveBlending,
      });
      const mesh = new Mesh(geo, mat);
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
    const geo = new SphereGeometry(0.06, 12, 12);
    const mat = new MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.9,
      blending: AdditiveBlending,
    });
    const mesh = new Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.position.y += 0.01;
    this.effectsGroup.add(mesh);
    this.pocketFlashes.push({ mesh, life: 0.5 });

    // Spawn upward sparks
    for (let i = 0; i < 8; i++) {
      const sparkGeo = new SphereGeometry(0.004, 4, 4);
      const sparkMat = new MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.9,
        blending: AdditiveBlending,
      });
      const sparkMesh = new Mesh(sparkGeo, sparkMat);
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
    const geo = new SphereGeometry(0.006, 4, 4);
    const mat = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3,
      blending: AdditiveBlending,
    });
    const mesh = new Mesh(geo, mat);
    mesh.position.copy(position);
    this.effectsGroup.add(mesh);
    this.trails.push({ mesh, life: 0.2 });
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
        p.mesh.geometry.dispose();
        (p.mesh.material as MeshBasicMaterial).dispose();
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

      const ratio = t.life / 0.2;
      (t.mesh.material as MeshBasicMaterial).opacity = ratio * 0.3;
      t.mesh.scale.setScalar(ratio);
    }
  }
}
