// Environment - Holodeck neon aesthetic
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

  // Floating wireframe decorations
  const shapes = [
    new TorusGeometry(0.4, 0.08, 8, 16),
    new BoxGeometry(0.5, 0.5, 0.5),
    new SphereGeometry(0.3, 8, 8),
    new ConeGeometry(0.25, 0.5, 6),
  ];
  const colors = [0x00ffcc, 0xff00aa, 0x00aaff, 0xffaa00, 0xaa00ff];

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
    line.position.set(
      Math.sin(angle) * radius,
      1.0 + Math.random() * 2.5,
      Math.cos(angle) * radius
    );
    line.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    line.userData.rotSpeed = {
      x: (Math.random() - 0.5) * 0.3,
      y: (Math.random() - 0.5) * 0.3,
      z: (Math.random() - 0.5) * 0.3,
    };
    env.add(line);
  }

  // Ambient floating particles
  const particleCount = 50;
  const particleGeo = new BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = Math.random() * 3.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
  }
  particleGeo.setAttribute('position', new Float32BufferAttribute(positions, 3));

  // Use small sphere meshes for particles since Points may not be available
  for (let i = 0; i < particleCount; i++) {
    const particleMesh = new Mesh(
      new SphereGeometry(0.01, 4, 4),
      new MeshBasicMaterial({
        color: colors[i % colors.length],
        transparent: true,
        opacity: 0.5,
      })
    );
    particleMesh.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    env.add(particleMesh);
  }

  world.scene.add(env);
  return env;
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
