import * as THREE from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import type { FramingResult, Opening, Vec3 } from '@/types';
import type { WallFrames } from '@/engine/framing';
import { basisQuaternion } from '@/components/3d/TimberMember';
import { MM } from '@/components/3d/materials';

/**
 * Line drawings for the printed assembly guide: white solids with dark outlines on white paper,
 * the pieces of the current step filled and drawn heavier. Rendered off screen, independent of
 * the interactive view (its camera, layers and selection).
 */
export interface DrawingRequest {
  /** Pieces already built (members and panels) */
  installed: ReadonlySet<string>;
  /** Pieces fitted now */
  current: ReadonlySet<string>;
  /** Doors and windows: not drawn / already fitted / fitted now */
  fixtures: 'none' | 'installed' | 'current';
  /** Draw what is built in full ink (cover drawing) instead of stepping it back behind the current pieces */
  bold?: boolean;
}

export interface AssemblyDrawer {
  /** PNG data URL of the structure at one stop of the guide */
  draw: (request: DrawingRequest) => string;
  /** Width / height of the produced images */
  aspect: number;
  dispose: () => void;
}

const WIDTH = 1800;
const HEIGHT = 1200;
const PAPER = '#ffffff';
const INK = '#1f2937';
const INK_LIGHT = '#6b7280';
const ACCENT = '#f5b301';
/** Camera elevation above the horizon and its default plan direction (the app's isometric view) */
const ELEVATION = (28 * Math.PI) / 180;
const DEFAULT_AZIMUTH = Math.atan2(-1.0, -0.8);

interface Piece {
  id: string;
  kind: 'member' | 'panel' | 'fixture';
  mesh: THREE.Mesh;
  edges: LineSegments2;
  centre: THREE.Vector3;
}

function outline(geometry: THREE.BufferGeometry, material: LineMaterial): LineSegments2 {
  const edges = new THREE.EdgesGeometry(geometry, 20);
  const lines = new LineSegments2(new LineSegmentsGeometry().setPositions(edges.getAttribute('position').array as Float32Array), material);
  edges.dispose();
  return lines;
}

const toVector = (v: Vec3): THREE.Vector3 => new THREE.Vector3(v.x * MM, v.y * MM, v.z * MM);

export function createAssemblyDrawer(framing: FramingResult, frames: WallFrames, openings: { hostKey: string; opening: Opening }[]): AssemblyDrawer {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(WIDTH, HEIGHT, false);
  renderer.setClearColor(PAPER, 1);

  const scene = new THREE.Scene();
  const resolution = new THREE.Vector2(WIDTH, HEIGHT);
  // Solids sit slightly behind their own outlines so the hidden-line drawing stays crisp
  const solid = (color: string, opacity = 1): THREE.MeshBasicMaterial =>
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1.5, polygonOffsetUnits: 1.5, transparent: opacity < 1, opacity, depthWrite: opacity === 1 });
  const line = (color: string, linewidth: number): LineMaterial => new LineMaterial({ color, linewidth, resolution });
  const materials = {
    built: solid(PAPER),
    current: solid(ACCENT),
    currentPanel: solid(ACCENT, 0.55),
    builtLine: line(INK_LIGHT, 2),
    builtPanelLine: line(INK_LIGHT, 1.4),
    boldLine: line(INK, 2.4),
    currentLine: line(INK, 3.6),
  };

  const pieces: Piece[] = [];
  const add = (id: string, kind: Piece['kind'], geometry: THREE.BufferGeometry, position: THREE.Vector3, quaternion: THREE.Quaternion): void => {
    const mesh = new THREE.Mesh(geometry, materials.built);
    const edges = outline(geometry, materials.builtLine);
    for (const object of [mesh, edges]) {
      object.position.copy(position);
      object.quaternion.copy(quaternion);
      scene.add(object);
    }
    geometry.computeBoundingBox();
    const centre = geometry.boundingBox!.getCenter(new THREE.Vector3()).applyQuaternion(quaternion).add(position);
    pieces.push({ id, kind, mesh, edges, centre });
  };

  for (const m of framing.members) {
    const shape = new THREE.Shape(m.profile.map((p) => new THREE.Vector2(p.u * MM, p.v * MM)));
    const depth = m.section.width * MM;
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1, curveSegments: 1 });
    geometry.translate(0, 0, -depth / 2);
    add(m.id, 'member', geometry, toVector(m.start), basisQuaternion(m.direction, m.up));
  }
  for (const p of framing.panels) {
    let geometry: THREE.BufferGeometry;
    if (p.outline) {
      const shape = new THREE.Shape(p.outline.outer.map((q) => new THREE.Vector2(q.u * MM, q.v * MM)));
      for (const hole of p.outline.holes) shape.holes.push(new THREE.Path(hole.map((q) => new THREE.Vector2(q.u * MM, q.v * MM))));
      geometry = new THREE.ExtrudeGeometry(shape, { depth: p.outline.thickness * MM, bevelEnabled: false, steps: 1 });
    } else {
      const [a, b, t] = p.size ?? [1, 1, 0.02];
      geometry = new THREE.BoxGeometry(a * MM, b * MM, t * MM);
    }
    add(p.id, 'panel', geometry, toVector(p.anchor), basisQuaternion(p.direction, p.up));
  }
  for (const { hostKey, opening } of openings) {
    const frame = frames[hostKey];
    if (!frame || opening.type === 'passage') continue;
    const geometry = new THREE.BoxGeometry(opening.width * MM, opening.height * MM, 40 * MM);
    add(`fixture:${opening.id}`, 'fixture', geometry, toVector(frame.toWorld(opening.x + opening.width / 2, opening.y + opening.height / 2, 0)), basisQuaternion(frame.u, frame.v));
  }

  // One framing for every drawing, so the structure keeps its size from step to step
  const bounds = new THREE.Box3();
  for (const piece of pieces) bounds.expandByObject(piece.mesh);
  if (bounds.isEmpty()) bounds.set(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 1, 1));
  const centre = bounds.getCenter(new THREE.Vector3());
  const radius = bounds.getSize(new THREE.Vector3()).length() / 2;
  const planRadius = Math.hypot(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z) / 2;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, radius * 8);

  const aim = (azimuth: number): void => {
    const direction = new THREE.Vector3(Math.cos(azimuth) * Math.cos(ELEVATION), Math.sin(ELEVATION), Math.sin(azimuth) * Math.cos(ELEVATION));
    camera.position.copy(centre).addScaledVector(direction, radius * 4);
    camera.up.set(0, 1, 0);
    camera.lookAt(centre);
    camera.updateMatrixWorld(true);
    // Fit the projected bounding box, keeping the image aspect
    const inverse = camera.matrixWorldInverse;
    let halfW = 0;
    let halfH = 0;
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
      const p = new THREE.Vector3(x, y, z).applyMatrix4(inverse);
      halfW = Math.max(halfW, Math.abs(p.x));
      halfH = Math.max(halfH, Math.abs(p.y));
    }
    const half = Math.max(halfH, halfW / (WIDTH / HEIGHT)) * 1.06;
    camera.left = -half * (WIDTH / HEIGHT);
    camera.right = half * (WIDTH / HEIGHT);
    camera.top = half;
    camera.bottom = -half;
    camera.updateProjectionMatrix();
  };

  /** Look from the side the current pieces are on, so they are not hidden behind what is built. */
  const azimuthFor = (current: Piece[]): number => {
    if (current.length === 0) return DEFAULT_AZIMUTH;
    const mean = current.reduce((sum, p) => sum.add(p.centre), new THREE.Vector3()).multiplyScalar(1 / current.length);
    const dx = mean.x - centre.x;
    const dz = mean.z - centre.z;
    if (Math.hypot(dx, dz) < planRadius * 0.2) return DEFAULT_AZIMUTH;
    // Snap to the four diagonal views: the one closest to the pieces' side, turned for a 3/4 view
    const side = Math.atan2(dz, dx);
    const diagonals = [Math.PI / 4, (3 * Math.PI) / 4, (-3 * Math.PI) / 4, -Math.PI / 4];
    const distance = (a: number): number => Math.abs(Math.atan2(Math.sin(a - side), Math.cos(a - side)));
    const candidates = diagonals.filter((a) => distance(a) <= Math.PI / 4 + 1e-6);
    const preferred = (a: number): number => Math.abs(Math.atan2(Math.sin(a - DEFAULT_AZIMUTH), Math.cos(a - DEFAULT_AZIMUTH)));
    return candidates.sort((a, b) => preferred(a) - preferred(b))[0] ?? DEFAULT_AZIMUTH;
  };

  const draw = ({ installed, current, fixtures, bold }: DrawingRequest): string => {
    const now: Piece[] = [];
    for (const piece of pieces) {
      const isFixture = piece.kind === 'fixture';
      const isCurrent = isFixture ? fixtures === 'current' : current.has(piece.id);
      const isBuilt = isFixture ? fixtures === 'installed' : installed.has(piece.id);
      const sheet = piece.kind === 'panel';
      piece.edges.visible = isCurrent || isBuilt;
      // Built sheets are drawn as outlines only: a closed roof or wall must not hide the next steps
      piece.mesh.visible = isCurrent || (isBuilt && !sheet);
      piece.mesh.material = isCurrent ? (sheet ? materials.currentPanel : materials.current) : materials.built;
      piece.edges.material = isCurrent ? materials.currentLine : bold ? materials.boldLine : sheet ? materials.builtPanelLine : materials.builtLine;
      piece.mesh.renderOrder = isCurrent && sheet ? 2 : 0;
      piece.edges.renderOrder = isCurrent ? 3 : 1;
      if (isCurrent) now.push(piece);
    }
    aim(azimuthFor(now));
    renderer.render(scene, camera);
    return canvas.toDataURL('image/png');
  };

  const dispose = (): void => {
    for (const piece of pieces) {
      piece.mesh.geometry.dispose();
      piece.edges.geometry.dispose();
    }
    for (const material of Object.values(materials)) material.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };

  return { draw, aspect: WIDTH / HEIGHT, dispose };
}
