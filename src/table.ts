// Pool Table - Holodeck neon wireframe pool table with pockets
import {
  World,
  Mesh,
  Group,
  BoxGeometry,
  SphereGeometry,
  CylinderGeometry,
  PlaneGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  LineBasicMaterial,
  EdgesGeometry,
  LineSegments,
  Color,
  Vector3,
  AdditiveBlending,
  RingGeometry,
} from '@iwsdk/core';

// Standard pool table dimensions (scaled for VR comfort)
// Width = short side (X), Length = long side (Z)
export const TABLE_WIDTH = 1.27;  // ~4.5 feet playing surface
export const TABLE_LENGTH = 2.54; // ~9 feet playing surface
export const TABLE_HEIGHT = 0.85; // Standard table height
export const RAIL_HEIGHT = 0.04;  // Rail above playing surface
export const RAIL_WIDTH = 0.06;   // Rail thickness
export const POCKET_RADIUS = 0.055; // Pocket opening radius
export const BALL_RADIUS = 0.028; // Standard pool ball radius

// Pocket positions (6 pockets)
const HW = TABLE_WIDTH / 2;
const HL = TABLE_LENGTH / 2;
export const POCKET_POSITIONS: Vector3[] = [
  new Vector3(-HW, TABLE_HEIGHT, -HL),    // top-left corner
  new Vector3(0, TABLE_HEIGHT, -HL - 0.01),       // top-center (side)
  new Vector3(HW, TABLE_HEIGHT, -HL),      // top-right corner
  new Vector3(-HW, TABLE_HEIGHT, HL),      // bottom-left corner
  new Vector3(0, TABLE_HEIGHT, HL + 0.01),        // bottom-center (side)
  new Vector3(HW, TABLE_HEIGHT, HL),       // bottom-right corner
];

export function createTable(world: World): Group {
  const table = new Group();
  table.name = 'pool-table';

  // Table body/legs
  const bodyGeo = new BoxGeometry(TABLE_WIDTH + RAIL_WIDTH * 2 + 0.1, 0.12, TABLE_LENGTH + RAIL_WIDTH * 2 + 0.1);
  const bodyMat = new MeshStandardMaterial({
    color: 0x0a0a15,
    metalness: 0.8,
    roughness: 0.3,
  });
  const body = new Mesh(bodyGeo, bodyMat);
  body.position.set(0, TABLE_HEIGHT - 0.06, 0);
  table.add(body);

  // Table legs
  const legGeo = new CylinderGeometry(0.04, 0.05, TABLE_HEIGHT - 0.12, 8);
  const legMat = new MeshStandardMaterial({
    color: 0x111122,
    metalness: 0.9,
    roughness: 0.2,
    emissive: new Color(0x001133),
    emissiveIntensity: 0.3,
  });
  const legPositions = [
    [-HW - 0.02, (TABLE_HEIGHT - 0.12) / 2, -HL - 0.02],
    [HW + 0.02, (TABLE_HEIGHT - 0.12) / 2, -HL - 0.02],
    [-HW - 0.02, (TABLE_HEIGHT - 0.12) / 2, HL + 0.02],
    [HW + 0.02, (TABLE_HEIGHT - 0.12) / 2, HL + 0.02],
  ];
  for (const [x, y, z] of legPositions) {
    const leg = new Mesh(legGeo, legMat);
    leg.position.set(x, y, z);
    table.add(leg);

    // Leg glow ring
    const ringGeo = new RingGeometry(0.05, 0.065, 16);
    const ringMat = new MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.6,
      side: 2,
    });
    const ring = new Mesh(ringGeo, ringMat);
    ring.position.set(x, 0.01, z);
    ring.rotation.x = -Math.PI / 2;
    table.add(ring);
  }

  // Playing surface (rich green baize with subtle depth)
  const surfaceGeo = new PlaneGeometry(TABLE_WIDTH, TABLE_LENGTH, 32, 64);
  const surfaceMat = new MeshStandardMaterial({
    color: 0x004d33,
    metalness: 0.05,
    roughness: 0.92,
    emissive: new Color(0x002a1a),
    emissiveIntensity: 0.4,
  });
  const surface = new Mesh(surfaceGeo, surfaceMat);
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = TABLE_HEIGHT;
  table.add(surface);

  // Subtle directional nap lines on felt (thin lines along length)
  const napGroup = new Group();
  napGroup.name = 'felt-nap';
  const napMat = new MeshBasicMaterial({
    color: 0x005533,
    transparent: true,
    opacity: 0.08,
  });
  const napCount = 20;
  for (let i = 0; i < napCount; i++) {
    const x = -TABLE_WIDTH / 2 + (i / (napCount - 1)) * TABLE_WIDTH;
    const lineGeo = new BoxGeometry(0.001, 0.0005, TABLE_LENGTH - 0.02);
    const line = new Mesh(lineGeo, napMat);
    line.position.set(x, TABLE_HEIGHT + 0.0005, 0);
    napGroup.add(line);
  }
  table.add(napGroup);

  // Wireframe overlay on surface
  const surfaceEdges = new EdgesGeometry(new PlaneGeometry(TABLE_WIDTH, TABLE_LENGTH));
  const surfaceWire = new LineSegments(surfaceEdges, new LineBasicMaterial({
    color: 0x00ffcc,
    transparent: true,
    opacity: 0.3,
  }));
  surfaceWire.rotation.x = -Math.PI / 2;
  surfaceWire.position.y = TABLE_HEIGHT + 0.001;
  table.add(surfaceWire);

  // Subtle center-line decoration (faint cross on playing surface)
  const centerLineMat = new MeshBasicMaterial({
    color: 0x00aa77,
    transparent: true,
    opacity: 0.06,
  });
  const centerLineH = new Mesh(
    new BoxGeometry(TABLE_WIDTH - 0.04, 0.001, 0.002),
    centerLineMat
  );
  centerLineH.position.set(0, TABLE_HEIGHT + 0.0008, 0);
  table.add(centerLineH);

  const centerLineV = new Mesh(
    new BoxGeometry(0.002, 0.001, TABLE_LENGTH - 0.04),
    centerLineMat
  );
  centerLineV.position.set(0, TABLE_HEIGHT + 0.0008, 0);
  table.add(centerLineV);

  // Rails (4 sides, split by pockets)
  createRails(table);

  // Pockets (glowing holes)
  for (let i = 0; i < POCKET_POSITIONS.length; i++) {
    const pocket = createPocket(i);
    table.add(pocket);
  }

  // Diamond markers on rails
  createDiamonds(table);

  // Head string line
  const headStringGeo = new BoxGeometry(TABLE_WIDTH - 0.02, 0.001, 0.002);
  const headStringMat = new MeshBasicMaterial({
    color: 0x00ffcc,
    transparent: true,
    opacity: 0.3,
  });
  const headString = new Mesh(headStringGeo, headStringMat);
  headString.position.set(0, TABLE_HEIGHT + 0.001, HL * 0.5);
  table.add(headString);

  // Foot spot
  const footSpotGeo = new SphereGeometry(0.006, 8, 8);
  const footSpotMat = new MeshBasicMaterial({ color: 0x00ffcc });
  const footSpot = new Mesh(footSpotGeo, footSpotMat);
  footSpot.position.set(0, TABLE_HEIGHT + 0.002, -HL * 0.5);
  table.add(footSpot);

  // Edge glow strips along table perimeter
  createEdgeGlow(table);

  // Hanging light fixture above table
  createLightFixture(table);

  world.scene.add(table);
  return table;
}

function createRails(table: Group) {
  const railMat = new MeshStandardMaterial({
    color: 0x0a1a2a,
    metalness: 0.7,
    roughness: 0.3,
    emissive: new Color(0x003355),
    emissiveIntensity: 0.4,
  });

  const railEdgeMat = new LineBasicMaterial({
    color: 0x00ddff,
    transparent: true,
    opacity: 0.7,
  });

  // Long rails (Z direction, split by center pocket)
  const longRailLen = (TABLE_LENGTH / 2) - POCKET_RADIUS * 2;
  const longRailGeo = new BoxGeometry(RAIL_WIDTH, RAIL_HEIGHT, longRailLen);

  // Left rail - top half
  addRailSegment(table, longRailGeo, railMat, railEdgeMat,
    -HW - RAIL_WIDTH / 2, TABLE_HEIGHT + RAIL_HEIGHT / 2, -longRailLen / 2 - POCKET_RADIUS);
  // Left rail - bottom half
  addRailSegment(table, longRailGeo, railMat, railEdgeMat,
    -HW - RAIL_WIDTH / 2, TABLE_HEIGHT + RAIL_HEIGHT / 2, longRailLen / 2 + POCKET_RADIUS);
  // Right rail - top half
  addRailSegment(table, longRailGeo, railMat, railEdgeMat,
    HW + RAIL_WIDTH / 2, TABLE_HEIGHT + RAIL_HEIGHT / 2, -longRailLen / 2 - POCKET_RADIUS);
  // Right rail - bottom half
  addRailSegment(table, longRailGeo, railMat, railEdgeMat,
    HW + RAIL_WIDTH / 2, TABLE_HEIGHT + RAIL_HEIGHT / 2, longRailLen / 2 + POCKET_RADIUS);

  // Short rails (X direction)
  const shortRailLen = TABLE_WIDTH - POCKET_RADIUS * 4;
  const shortRailGeo = new BoxGeometry(shortRailLen, RAIL_HEIGHT, RAIL_WIDTH);

  // Top rail
  addRailSegment(table, shortRailGeo, railMat, railEdgeMat,
    0, TABLE_HEIGHT + RAIL_HEIGHT / 2, -HL - RAIL_WIDTH / 2);
  // Bottom rail
  addRailSegment(table, shortRailGeo, railMat, railEdgeMat,
    0, TABLE_HEIGHT + RAIL_HEIGHT / 2, HL + RAIL_WIDTH / 2);
}

function addRailSegment(table: Group, geo: BoxGeometry, mat: MeshStandardMaterial, edgeMat: LineBasicMaterial, x: number, y: number, z: number) {
  const rail = new Mesh(geo, mat);
  rail.position.set(x, y, z);
  table.add(rail);

  const edges = new EdgesGeometry(geo);
  const wire = new LineSegments(edges, edgeMat);
  wire.position.set(x, y, z);
  table.add(wire);
}

function createPocket(index: number): Group {
  const pos = POCKET_POSITIONS[index];
  const pocket = new Group();
  pocket.name = `pocket-${index}`;

  // Pocket hole (dark circle)
  const holeGeo = new CylinderGeometry(POCKET_RADIUS, POCKET_RADIUS, 0.02, 16);
  const holeMat = new MeshBasicMaterial({ color: 0x000000 });
  const hole = new Mesh(holeGeo, holeMat);
  hole.position.copy(pos);
  hole.position.y -= 0.005;
  pocket.add(hole);

  // Glow ring around pocket
  const ringGeo = new RingGeometry(POCKET_RADIUS, POCKET_RADIUS + 0.01, 24);
  const ringMat = new MeshBasicMaterial({
    color: 0xff6600,
    transparent: true,
    opacity: 0.8,
    side: 2,
  });
  const ring = new Mesh(ringGeo, ringMat);
  ring.position.copy(pos);
  ring.position.y += 0.002;
  ring.rotation.x = -Math.PI / 2;
  pocket.add(ring);

  // Outer glow ring
  const outerRingGeo = new RingGeometry(POCKET_RADIUS + 0.01, POCKET_RADIUS + 0.02, 24);
  const outerRingMat = new MeshBasicMaterial({
    color: 0xff3300,
    transparent: true,
    opacity: 0.3,
    side: 2,
  });
  const outerRing = new Mesh(outerRingGeo, outerRingMat);
  outerRing.position.copy(pos);
  outerRing.position.y += 0.003;
  outerRing.rotation.x = -Math.PI / 2;
  pocket.add(outerRing);

  return pocket;
}

function createDiamonds(table: Group) {
  const diamondMat = new MeshBasicMaterial({
    color: 0x00ffcc,
    transparent: true,
    opacity: 0.6,
  });
  const diamondGeo = new SphereGeometry(0.005, 4, 4);

  // Long rail diamonds (3 per half rail, each side)
  for (let side = -1; side <= 1; side += 2) {
    for (let half = -1; half <= 1; half += 2) {
      for (let i = 1; i <= 3; i++) {
        const z = half * (POCKET_RADIUS + i * (TABLE_LENGTH / 2 - POCKET_RADIUS * 2) / 4);
        const d = new Mesh(diamondGeo, diamondMat);
        d.position.set(side * (HW + RAIL_WIDTH), TABLE_HEIGHT + RAIL_HEIGHT + 0.003, z);
        table.add(d);
      }
    }
  }

  // Short rail diamonds (3 per short rail)
  for (let end = -1; end <= 1; end += 2) {
    for (let i = 1; i <= 3; i++) {
      const x = -HW + POCKET_RADIUS * 2 + i * (TABLE_WIDTH - POCKET_RADIUS * 4) / 4;
      const d = new Mesh(diamondGeo, diamondMat);
      d.position.set(x, TABLE_HEIGHT + RAIL_HEIGHT + 0.003, end * (HL + RAIL_WIDTH));
      table.add(d);
    }
  }
}

function createEdgeGlow(table: Group) {
  const glowMat = new MeshBasicMaterial({
    color: 0x00ddff,
    transparent: true,
    opacity: 0.15,
  });

  // Long edge strips
  for (let side = -1; side <= 1; side += 2) {
    const strip = new Mesh(
      new BoxGeometry(0.005, 0.002, TABLE_LENGTH + RAIL_WIDTH * 2),
      glowMat
    );
    strip.position.set(side * (HW + RAIL_WIDTH + 0.05), TABLE_HEIGHT, 0);
    table.add(strip);
  }

  // Short edge strips
  for (let end = -1; end <= 1; end += 2) {
    const strip = new Mesh(
      new BoxGeometry(TABLE_WIDTH + RAIL_WIDTH * 2, 0.002, 0.005),
      glowMat
    );
    strip.position.set(0, TABLE_HEIGHT, end * (HL + RAIL_WIDTH + 0.05));
    table.add(strip);
  }
}

function createLightFixture(table: Group) {
  const fixture = new Group();
  fixture.name = 'light-fixture';

  // Horizontal bar (long, above table)
  const barGeo = new BoxGeometry(0.04, 0.02, TABLE_LENGTH * 0.7);
  const barMat = new MeshStandardMaterial({
    color: 0x0a0a15,
    metalness: 0.9,
    roughness: 0.2,
    emissive: new Color(0x001122),
    emissiveIntensity: 0.3,
  });
  const bar = new Mesh(barGeo, barMat);
  bar.position.set(0, 2.3, 0);
  fixture.add(bar);

  // Wireframe edges on bar
  const barEdges = new EdgesGeometry(barGeo);
  const barWire = new LineSegments(barEdges, new LineBasicMaterial({
    color: 0x00ddff,
    transparent: true,
    opacity: 0.5,
  }));
  barWire.position.copy(bar.position);
  fixture.add(barWire);

  // Hanging cable to ceiling
  const cableGeo = new CylinderGeometry(0.004, 0.004, 1.7, 4);
  const cableMat = new MeshBasicMaterial({
    color: 0x333344,
  });
  const cable = new Mesh(cableGeo, cableMat);
  cable.position.set(0, 3.15, 0);
  fixture.add(cable);

  // 3 downward shade cones
  const shadePositions = [0, -TABLE_LENGTH * 0.22, TABLE_LENGTH * 0.22];
  for (const z of shadePositions) {
    // Shade cone (inverted)
    const shadeGeo = new CylinderGeometry(0.12, 0.04, 0.08, 12, 1, true);
    const shadeMat = new MeshStandardMaterial({
      color: 0x0a0a20,
      metalness: 0.7,
      roughness: 0.3,
      emissive: new Color(0x001133),
      emissiveIntensity: 0.4,
      side: 2,
    });
    const shade = new Mesh(shadeGeo, shadeMat);
    shade.position.set(0, 2.26, z);
    fixture.add(shade);

    // Shade wireframe
    const shadeEdges = new EdgesGeometry(shadeGeo);
    const shadeWire = new LineSegments(shadeEdges, new LineBasicMaterial({
      color: 0x00ddff,
      transparent: true,
      opacity: 0.4,
    }));
    shadeWire.position.copy(shade.position);
    fixture.add(shadeWire);

    // Glow bulb inside
    const bulbGeo = new SphereGeometry(0.015, 8, 8);
    const bulbMat = new MeshBasicMaterial({
      color: 0x00ddff,
      transparent: true,
      opacity: 0.9,
    });
    const bulb = new Mesh(bulbGeo, bulbMat);
    bulb.position.set(0, 2.24, z);
    fixture.add(bulb);

    // Bulb glow halo
    const haloGeo = new SphereGeometry(0.04, 8, 8);
    const haloMat = new MeshBasicMaterial({
      color: 0x00ddff,
      transparent: true,
      opacity: 0.15,
      blending: AdditiveBlending,
    });
    const halo = new Mesh(haloGeo, haloMat);
    halo.position.set(0, 2.24, z);
    fixture.add(halo);

    // Downward light cone (visible beam)
    const beamGeo = new CylinderGeometry(0.01, 0.4, 1.3, 12, 1, true);
    const beamMat = new MeshBasicMaterial({
      color: 0x00bbdd,
      transparent: true,
      opacity: 0.02,
      side: 2,
    });
    const beam = new Mesh(beamGeo, beamMat);
    beam.position.set(0, 1.6, z);
    fixture.add(beam);
  }

  table.add(fixture);
}
