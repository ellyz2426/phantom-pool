// Environment - Holodeck neon aesthetic with animated decorations
import {
  World,
  Mesh,
  Group,
  PlaneGeometry,
  BoxGeometry,
  SphereGeometry,
  TorusGeometry,
  CylinderGeometry,
  ConeGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  LineBasicMaterial,
  EdgesGeometry,
  LineSegments,
  Color,
  Vector3,
  AmbientLight,
  PointLight,
  DirectionalLight,
  Fog,
  AdditiveBlending,
  Float32BufferAttribute,
  BufferGeometry,
} from '@iwsdk/core';

const GRID_SIZE = 30;
const GRID_DIVISIONS = 60;

interface FloatingShape {
  mesh: LineSegments;
  rotSpeed: { x: number; y: number; z: number };
  bobOffset: number;
  bobSpeed: number;
  baseY: number;
}

interface AmbientParticle {
  mesh: Mesh;
  basePos: Vector3;
  driftSpeed: Vector3;
  pulsePhase: number;
  pulseSpeed: number;
}

let floatingShapes: FloatingShape[] = [];
let ambientParticles: AmbientParticle[] = [];
let neonSignGlow: Mesh | null = null;
let environmentTime = 0;

export function createEnvironment(world: World): Group {
  const env = new Group();
  env.name = 'environment';

  // Fog
  world.scene.fog = new Fog(0x000510, 8, 30);

  // Ambient light - dim for dramatic table lighting
  const ambient = new AmbientLight(0x152030, 0.3);
  world.scene.add(ambient);

  // Main table light (overhead)
  const tableLight = new PointLight(0x00ddff, 2.5, 8, 1.5);
  tableLight.position.set(0, 2.5, 0);
  world.scene.add(tableLight);

  // Secondary table lights
  const light2 = new PointLight(0x00ff88, 1.0, 6, 1.5);
  light2.position.set(-0.8, 2.2, 0);
  world.scene.add(light2);

  const light3 = new PointLight(0x8800ff, 1.0, 6, 1.5);
  light3.position.set(0.8, 2.2, 0);
  world.scene.add(light3);

  // Floor grid
  const floorGrid = createGrid(GRID_SIZE, GRID_DIVISIONS, 0x003344);
  floorGrid.rotation.x = -Math.PI / 2;
  floorGrid.position.y = 0;
  env.add(floorGrid);

  // Ceiling grid
  const ceilGrid = createGrid(GRID_SIZE, GRID_DIVISIONS, 0x001a2a);
  ceilGrid.rotation.x = Math.PI / 2;
  ceilGrid.position.y = 4.0;
  env.add(ceilGrid);

  // Wall grids (4 walls)
  for (let i = 0; i < 4; i++) {
    const wallGrid = createGrid(GRID_SIZE, 8, 0x002233);
    const angle = (i * Math.PI) / 2;
    wallGrid.position.set(
      Math.sin(angle) * GRID_SIZE / 2,
      2.0,
      Math.cos(angle) * GRID_SIZE / 2
    );
    wallGrid.rotation.y = angle;
    env.add(wallGrid);
  }

  // Floating wireframe decorations (animated)
  const shapes = [
    new TorusGeometry(0.4, 0.08, 8, 16),
    new BoxGeometry(0.5, 0.5, 0.5),
    new SphereGeometry(0.3, 8, 8),
    new ConeGeometry(0.25, 0.5, 6),
  ];
  const colors = [0x00ffcc, 0xff00aa, 0x00aaff, 0xffaa00, 0xaa00ff];

  floatingShapes = [];
  for (let i = 0; i < 16; i++) {
    const geo = shapes[i % shapes.length];
    const color = colors[i % colors.length];
    const edges = new EdgesGeometry(geo);
    const line = new LineSegments(edges, new LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3,
    }));

    const angle = (i / 16) * Math.PI * 2;
    const radius = 5 + Math.random() * 6;
    const baseY = 1.0 + Math.random() * 2.5;
    line.position.set(
      Math.sin(angle) * radius,
      baseY,
      Math.cos(angle) * radius
    );
    line.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    env.add(line);

    floatingShapes.push({
      mesh: line,
      rotSpeed: {
        x: (Math.random() - 0.5) * 0.3,
        y: (Math.random() - 0.5) * 0.3,
        z: (Math.random() - 0.5) * 0.3,
      },
      bobOffset: Math.random() * Math.PI * 2,
      bobSpeed: 0.3 + Math.random() * 0.4,
      baseY,
    });
  }

  // Ambient floating particles (animated with drift and pulse)
  const particleCount = 50;
  ambientParticles = [];
  for (let i = 0; i < particleCount; i++) {
    const particleMesh = new Mesh(
      new SphereGeometry(0.01, 4, 4),
      new MeshBasicMaterial({
        color: colors[i % colors.length],
        transparent: true,
        opacity: 0.5,
        blending: AdditiveBlending,
      })
    );
    const basePos = new Vector3(
      (Math.random() - 0.5) * 20,
      Math.random() * 3.5,
      (Math.random() - 0.5) * 20
    );
    particleMesh.position.copy(basePos);
    env.add(particleMesh);

    ambientParticles.push({
      mesh: particleMesh,
      basePos: basePos.clone(),
      driftSpeed: new Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.3
      ),
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: 1 + Math.random() * 2,
    });
  }

  // Neon sign above table
  createNeonSign(env);

  world.scene.add(env);
  return env;
}

function createNeonSign(parent: Group): void {
  const signGroup = new Group();
  signGroup.name = 'neon-sign';
  signGroup.position.set(0, 3.2, 0);

  // Backing plate
  const plateGeo = new BoxGeometry(1.6, 0.4, 0.02);
  const plateMat = new MeshBasicMaterial({
    color: 0x020208,
    transparent: true,
    opacity: 0.8,
  });
  const plate = new Mesh(plateGeo, plateMat);
  signGroup.add(plate);

  // Neon border
  const borderGeo = new EdgesGeometry(new BoxGeometry(1.65, 0.45, 0.01));
  const borderLine = new LineSegments(borderGeo, new LineBasicMaterial({
    color: 0x00ffdd,
    transparent: true,
    opacity: 0.7,
  }));
  signGroup.add(borderLine);

  // Glow halo behind sign
  const glowGeo = new BoxGeometry(1.8, 0.6, 0.01);
  const glowMat = new MeshBasicMaterial({
    color: 0x00ddff,
    transparent: true,
    opacity: 0.08,
    blending: AdditiveBlending,
  });
  neonSignGlow = new Mesh(glowGeo, glowMat);
  neonSignGlow.position.z = -0.02;
  signGroup.add(neonSignGlow);

  // Letter shapes using thin box meshes (stylized)
  const letterMat = new MeshBasicMaterial({
    color: 0x00ffdd,
    transparent: true,
    opacity: 0.9,
  });
  const letterGlowMat = new MeshBasicMaterial({
    color: 0x00ffdd,
    transparent: true,
    opacity: 0.3,
    blending: AdditiveBlending,
  });

  // Simple bar-based letters: P H A N T O M
  const letterData = [
    // P
    [[-0.7, 0.08, 0], [0.008, 0.16], [-0.68, 0.13, 0], [0.06, 0.008], [-0.65, 0.08, 0], [0.008, 0.06], [-0.68, 0.04, 0], [0.06, 0.008]],
    // H
    [[-0.56, 0.08, 0], [0.008, 0.16], [-0.48, 0.08, 0], [0.008, 0.16], [-0.52, 0.08, 0], [0.04, 0.008]],
    // A
    [[-0.4, 0.08, 0], [0.008, 0.16], [-0.32, 0.08, 0], [0.008, 0.16], [-0.36, 0.13, 0], [0.04, 0.008], [-0.36, 0.08, 0], [0.04, 0.008]],
    // N
    [[-0.24, 0.08, 0], [0.008, 0.16], [-0.16, 0.08, 0], [0.008, 0.16], [-0.2, 0.13, 0], [0.04, 0.008]],
    // T
    [[-0.08, 0.08, 0], [0.008, 0.16], [-0.08, 0.155, 0], [0.08, 0.008]],
    // O
    [[0.04, 0.08, 0], [0.008, 0.16], [0.12, 0.08, 0], [0.008, 0.16], [0.08, 0.155, 0], [0.06, 0.008], [0.08, 0.005, 0], [0.06, 0.008]],
    // M
    [[0.2, 0.08, 0], [0.008, 0.16], [0.28, 0.08, 0], [0.008, 0.16], [0.24, 0.12, 0], [0.008, 0.06]],
  ];

  // Create colored "POOL" underneath in different color
  const poolMat = new MeshBasicMaterial({
    color: 0xff6600,
    transparent: true,
    opacity: 0.9,
  });

  // Simple decorative bars for "POOL" under "PHANTOM"
  const poolBars = [
    // P
    [[- 0.2, -0.1, 0], [0.006, 0.1], [-0.185, -0.055, 0], [0.035, 0.006], [-0.165, -0.08, 0], [0.006, 0.035], [-0.185, -0.095, 0], [0.035, 0.006]],
    // O
    [[-0.1, -0.1, 0], [0.006, 0.1], [-0.04, -0.1, 0], [0.006, 0.1], [-0.07, -0.055, 0], [0.04, 0.006], [-0.07, -0.145, 0], [0.04, 0.006]],
    // O
    [[0.02, -0.1, 0], [0.006, 0.1], [0.08, -0.1, 0], [0.006, 0.1], [0.05, -0.055, 0], [0.04, 0.006], [0.05, -0.145, 0], [0.04, 0.006]],
    // L
    [[0.14, -0.1, 0], [0.006, 0.1], [0.14, -0.145, 0], [0.06, 0.006]],
  ];

  for (const bars of poolBars) {
    for (let i = 0; i < bars.length; i += 2) {
      const pos = bars[i];
      const size = bars[i + 1];
      const barGeo = new BoxGeometry(size[0], size[1], 0.005);
      const bar = new Mesh(barGeo, poolMat);
      bar.position.set(pos[0], pos[1], pos[2]);
      signGroup.add(bar);
    }
  }

  // Add light source from sign
  const signLight = new PointLight(0x00ddff, 0.5, 3, 2);
  signLight.position.set(0, -0.3, 0.2);
  signGroup.add(signLight);

  parent.add(signGroup);
}

// Animate environment elements - call every frame
export function updateEnvironment(dt: number): void {
  environmentTime += dt;

  // Rotate and bob floating shapes
  for (const shape of floatingShapes) {
    shape.mesh.rotation.x += shape.rotSpeed.x * dt;
    shape.mesh.rotation.y += shape.rotSpeed.y * dt;
    shape.mesh.rotation.z += shape.rotSpeed.z * dt;

    // Gentle bobbing
    shape.mesh.position.y = shape.baseY + Math.sin(environmentTime * shape.bobSpeed + shape.bobOffset) * 0.15;
  }

  // Drift and pulse ambient particles
  for (const p of ambientParticles) {
    p.mesh.position.x = p.basePos.x + Math.sin(environmentTime * p.driftSpeed.x + p.pulsePhase) * 1.0;
    p.mesh.position.y = p.basePos.y + Math.sin(environmentTime * p.driftSpeed.y + p.pulsePhase * 0.7) * 0.3;
    p.mesh.position.z = p.basePos.z + Math.cos(environmentTime * p.driftSpeed.z + p.pulsePhase * 1.3) * 1.0;

    // Pulse opacity
    const pulse = 0.3 + 0.3 * Math.sin(environmentTime * p.pulseSpeed + p.pulsePhase);
    (p.mesh.material as MeshBasicMaterial).opacity = pulse;
  }

  // Pulse neon sign glow
  if (neonSignGlow) {
    const glowPulse = 0.06 + 0.04 * Math.sin(environmentTime * 1.5);
    (neonSignGlow.material as MeshBasicMaterial).opacity = glowPulse;
  }
}

function createGrid(size: number, divisions: number, color: number): Group {
  const group = new Group();
  const step = size / divisions;
  const half = size / 2;
  const mat = new LineBasicMaterial({ color, transparent: true, opacity: 0.4 });

  for (let i = 0; i <= divisions; i++) {
    const pos = -half + i * step;
    // Horizontal lines
    const hGeo = new BufferGeometry();
    hGeo.setAttribute('position', new Float32BufferAttribute([
      -half, 0, pos, half, 0, pos
    ], 3));
    group.add(new LineSegments(hGeo, mat));

    // Vertical lines
    const vGeo = new BufferGeometry();
    vGeo.setAttribute('position', new Float32BufferAttribute([
      pos, 0, -half, pos, 0, half
    ], 3));
    group.add(new LineSegments(vGeo, mat));
  }

  return group;
}
