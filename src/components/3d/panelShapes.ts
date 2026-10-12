import * as THREE from 'three';
import type { Panel } from '@/types';
import { MM } from './materials';

/** Extruded panel geometry: the outline with its cut-outs, or the separate boards of spaced cladding. */
export function panelGeometry(panel: Panel): THREE.BufferGeometry {
  const outline = panel.outline;
  if (outline) {
    const toShape = (points: { u: number; v: number }[]) => new THREE.Shape(points.map((p) => new THREE.Vector2(p.u * MM, p.v * MM)));
    let shapes: THREE.Shape[];
    if (panel.boards) {
      shapes = panel.boards.map(toShape);
    } else {
      const shape = toShape(outline.outer);
      for (const hole of outline.holes) shape.holes.push(new THREE.Path(hole.map((p) => new THREE.Vector2(p.u * MM, p.v * MM))));
      shapes = [shape];
    }
    return new THREE.ExtrudeGeometry(shapes, { depth: outline.thickness * MM, bevelEnabled: false, steps: 1 });
  }
  const [a, b, t] = panel.size ?? [1, 1, 0.02];
  return new THREE.BoxGeometry(a * MM, b * MM, t * MM);
}

/** Cache key of `panelGeometry`'s result */
export function panelGeometryKey(panel: Panel, outlineKey: (points: readonly { u: number; v: number }[]) => string): string {
  const outline = panel.outline;
  if (!outline) return `box|${panel.size?.join(',')}`;
  if (panel.boards) return `boards|${panel.boards.map(outlineKey).join('/')}|${outline.thickness}`;
  return `${outlineKey(outline.outer)}|${outline.holes.map(outlineKey).join('/')}|${outline.thickness}`;
}
