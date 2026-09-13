import * as THREE from 'three';
import type { MemberCategory, RoofCovering } from '@/types';

/** Scene scale: 1 unit = 1 m; engine works in mm. */
export const MM = 0.001;

function makeCanvas(width: number, height: number): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas not supported');
  return ctx;
}

/** Deterministic pseudo-random generator so textures look identical across reloads. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function finishTexture(ctx: CanvasRenderingContext2D, repeat: [number, number]): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/** Procedural softwood grain: long fibres along U with subtle knots. Tile = 1 m × 0.25 m. */
function createWoodTexture(seed: number, base: string, dark: string): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const ctx = makeCanvas(w, h);
  const rnd = mulberry32(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1;
  for (let i = 0; i < 90; i++) {
    const y = rnd() * h;
    const amp = 2 + rnd() * 6;
    const freq = 0.004 + rnd() * 0.01;
    const phase = rnd() * Math.PI * 2;
    ctx.globalAlpha = 0.08 + rnd() * 0.2;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const yy = y + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 3.1 + phase) * amp * 0.3;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  // a few knots
  for (let i = 0; i < 3; i++) {
    const cx = rnd() * w;
    const cy = rnd() * h;
    const r = 6 + rnd() * 10;
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
    g.addColorStop(0, 'rgba(70,40,15,0.55)');
    g.addColorStop(1, 'rgba(70,40,15,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.6, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return finishTexture(ctx, [1, 4]);
}

/** Vertical board cladding: one board per tile (120 mm wide, 1.2 m tall). */
function createBoardTexture(): THREE.CanvasTexture {
  const w = 128;
  const h = 1280;
  const ctx = makeCanvas(w, h);
  const rnd = mulberry32(7);
  ctx.fillStyle = '#b98a55';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#8d6236';
  for (let i = 0; i < 40; i++) {
    ctx.globalAlpha = 0.1 + rnd() * 0.2;
    ctx.lineWidth = 1 + rnd() * 2;
    const x = rnd() * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + (rnd() - 0.5) * 30, h * 0.3, x + (rnd() - 0.5) * 30, h * 0.7, x + (rnd() - 0.5) * 20, h);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#4a2f16';
  ctx.fillRect(0, 0, 6, h); // shadow gap between boards
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(6, 0, 4, h); // highlight edge
  return finishTexture(ctx, [1 / 0.12, 1 / 1.2]);
}

function createTrapezoidalTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 64;
  const ctx = makeCanvas(w, h);
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, '#7d848c');
  g.addColorStop(0.3, '#b8bec4');
  g.addColorStop(0.45, '#8a9098');
  g.addColorStop(0.55, '#8a9098');
  g.addColorStop(0.7, '#c2c7cc');
  g.addColorStop(1, '#7d848c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  return finishTexture(ctx, [1 / 0.207, 1]);
}

function createTileTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 256;
  const ctx = makeCanvas(w, h);
  ctx.fillStyle = '#9c4a33';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, w, 10);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(0, 12, w, 8);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, 0, 8, h);
  ctx.fillRect(w / 2, 0, 8, h);
  return finishTexture(ctx, [1 / 0.3, 1 / 0.33]);
}

function createShingleTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 128;
  const ctx = makeCanvas(w, h);
  const rnd = mulberry32(11);
  ctx.fillStyle = '#3f4448';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 1500; i++) {
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.15)';
    ctx.fillRect(rnd() * w, rnd() * h, 2, 2);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, w, 6);
  for (let x = 0; x < w; x += 64) ctx.fillRect(x, 0, 3, h / 2);
  return finishTexture(ctx, [1 / 1.0, 1 / 0.28]);
}

function createGreenTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 256;
  const ctx = makeCanvas(w, h);
  const rnd = mulberry32(21);
  ctx.fillStyle = '#4f7a3a';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `rgba(${40 + rnd() * 80},${90 + rnd() * 90},${30 + rnd() * 40},0.5)`;
    ctx.fillRect(rnd() * w, rnd() * h, 3, 3);
  }
  return finishTexture(ctx, [1, 1]);
}

const cache = new Map<string, THREE.Material>();

function cached<T extends THREE.Material>(key: string, make: () => T): T {
  let m = cache.get(key) as T | undefined;
  if (!m) {
    m = make();
    cache.set(key, m);
  }
  return m;
}

const CATEGORY_TINT: Record<MemberCategory, string> = {
  post: '#c79a5e',
  beam: '#d2a86b',
  rafter: '#dcb57a',
  brace: '#c9995a',
  stud: '#e0bd85',
  plate: '#c99c62',
  header: '#d6ad70',
  sill: '#d6ad70',
};

export function getWoodMaterial(category: MemberCategory): THREE.MeshStandardMaterial {
  return cached(`wood-${category}`, () => {
    const seed = Object.keys(CATEGORY_TINT).indexOf(category) * 17 + 3;
    return new THREE.MeshStandardMaterial({
      map: createWoodTexture(seed, CATEGORY_TINT[category], '#6b4423'),
      roughness: 0.82,
      metalness: 0.02,
    });
  });
}

export function getWireframeMaterial(): THREE.MeshBasicMaterial {
  return cached('wireframe', () => new THREE.MeshBasicMaterial({ color: '#e9d3ab', wireframe: true, transparent: true, opacity: 0.6 }));
}

export function getHoverMaterial(): THREE.MeshStandardMaterial {
  return cached(
    'hover',
    () => new THREE.MeshStandardMaterial({ color: '#f5c463', emissive: '#f59e0b', emissiveIntensity: 0.45, roughness: 0.6 }),
  );
}

export function getSelectedMaterial(): THREE.MeshStandardMaterial {
  return cached(
    'selected',
    () => new THREE.MeshStandardMaterial({ color: '#7dd3fc', emissive: '#0ea5e9', emissiveIntensity: 0.5, roughness: 0.5 }),
  );
}

/** The member whose neighbour distances are being inspected. */
export function getInspectedMaterial(): THREE.MeshStandardMaterial {
  return cached(
    'inspected',
    () => new THREE.MeshStandardMaterial({ color: '#67e8f9', emissive: '#06b6d4', emissiveIntensity: 0.65, roughness: 0.45 }),
  );
}

/** A member measured against the inspected one. */
export function getNeighbourMaterial(): THREE.MeshStandardMaterial {
  return cached(
    'neighbour',
    () => new THREE.MeshStandardMaterial({ color: '#a7f3d0', emissive: '#10b981', emissiveIntensity: 0.3, roughness: 0.6 }),
  );
}

export function getCladdingMaterial(): THREE.MeshStandardMaterial {
  return cached('cladding', () => new THREE.MeshStandardMaterial({ map: createBoardTexture(), roughness: 0.9, side: THREE.DoubleSide }));
}

export function getRoofMaterial(covering: RoofCovering): THREE.Material {
  return cached(`roof-${covering}`, () => {
    switch (covering) {
      case 'trapezoidal-sheet':
        return new THREE.MeshStandardMaterial({ map: createTrapezoidalTexture(), roughness: 0.35, metalness: 0.7 });
      case 'polycarbonate':
        return new THREE.MeshPhysicalMaterial({ color: '#bfe3ff', transmission: 0.5, transparent: true, opacity: 0.5, roughness: 0.15, thickness: 0.02 });
      case 'roof-tiles':
        return new THREE.MeshStandardMaterial({ map: createTileTexture(), roughness: 0.85 });
      case 'bitumen-shingles':
        return new THREE.MeshStandardMaterial({ map: createShingleTexture(), roughness: 0.95 });
      case 'green-roof':
        return new THREE.MeshStandardMaterial({ map: createGreenTexture(), roughness: 1 });
    }
  });
}

export function getOpeningHandleMaterial(selected: boolean): THREE.MeshBasicMaterial {
  return cached(`handle-${selected}`, () =>
    new THREE.MeshBasicMaterial({
      color: selected ? '#38bdf8' : '#fb923c',
      transparent: true,
      opacity: selected ? 0.45 : 0.3,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
}

export function getWallPlaneMaterial(): THREE.MeshBasicMaterial {
  return cached('wall-plane', () =>
    new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide }),
  );
}
