import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { HardwareLayout, LayerVisibility, Vec3 } from '@/types';
import { getConcreteMaterial, getTrimMaterial, MM } from './materials';
import { Instanced } from './AnchorFixtures';

/** Windrispenband 40 × 2 mm. */
const STRAP_WIDTH = 40;
const STRAP_THICKNESS = 2;
/** Hold-down angle: plate on the stud face, foot on the base, anchor bolt with washer and nut (mm). */
const HOLD_DOWN = { width: 60, height: 340, foot: 80, thickness: 3, washer: 40, washerHeight: 4, nut: 24, nutHeight: 14, rod: 16, rodLength: 30 } as const;
/** Angle bracket with rib 90 × 90 × 2.5 mm. */
const BRACKET = { leg: 90, thickness: 2.5 } as const;
/** Sparrenpfettenanker 170 mm: 100 mm on the rafter flank, 70 mm down the purlin flank, 35 mm wide, 2 mm thick. */
const RAFTER_ANCHOR = { rafterLeg: 100, purlinLeg: 70, width: 35, thickness: 2 } as const;
/** Roof trim: flange on the covering and the apron down the edge (mm). */
const TRIM = { flange: 100, thickness: 1.5 } as const;

type Part = 'box' | 'washer' | 'hex' | 'trim' | 'concreteBox' | 'concreteRound';

const v = (p: Vec3): THREE.Vector3 => new THREE.Vector3(p.x, p.y, p.z);
const Y = new THREE.Vector3(0, 1, 0);

/** Unit part centred at `centre` (mm), local x along `x`, local y along `y`, scaled to `size` (mm); always a right-handed basis. */
function place(centre: THREE.Vector3, x: THREE.Vector3, y: THREE.Vector3, size: [number, number, number]): THREE.Matrix4 {
  const xn = x.clone().normalize();
  const yn = y.clone().normalize();
  const zn = new THREE.Vector3().crossVectors(xn, yn).normalize();
  return new THREE.Matrix4()
    .makeBasis(xn, yn, zn)
    .scale(new THREE.Vector3(size[0] * MM, size[1] * MM, size[2] * MM))
    .setPosition(centre.clone().multiplyScalar(MM));
}

/** `base` moved by each (direction, mm) pair. */
const at = (base: THREE.Vector3, ...offsets: [THREE.Vector3, number][]): THREE.Vector3 => offsets.reduce((p, [dir, s]) => p.addScaledVector(dir, s), base.clone());

function buildParts(layout: HardwareLayout, layers: LayerVisibility, built: ((ids: string[]) => boolean)): Record<Part, THREE.Matrix4[]> {
  const out: Record<Part, THREE.Matrix4[]> = { box: [], washer: [], hex: [], trim: [], concreteBox: [], concreteRound: [] };
  const shown = <T extends { hostIds: string[] }>(items: T[]): T[] => items.filter((i) => i.hostIds.length === 0 || built(i.hostIds));

  if (layers.frame) {
    for (const s of shown(layout.straps)) {
      const a = v(s.a);
      const b = v(s.b);
      const dir = b.clone().sub(a);
      out.box.push(place(a.clone().add(b).multiplyScalar(0.5), dir, v(s.normal), [dir.length(), STRAP_THICKNESS, STRAP_WIDTH]));
    }

    for (const h of shown(layout.holdDowns)) {
      const p = v(h.position);
      const inward = v(h.inward);
      const along = v(h.along);
      const t = HOLD_DOWN.thickness;
      out.box.push(place(at(p, [inward, t / 2], [Y, HOLD_DOWN.height / 2]), along, Y, [HOLD_DOWN.width, HOLD_DOWN.height, t]));
      out.box.push(place(at(p, [inward, HOLD_DOWN.foot / 2], [Y, t / 2]), along, Y, [HOLD_DOWN.width, t, HOLD_DOWN.foot]));
      const bolt = at(p, [inward, HOLD_DOWN.foot * 0.6]);
      out.washer.push(place(at(bolt, [Y, t + HOLD_DOWN.washerHeight / 2]), along, Y, [HOLD_DOWN.washer, HOLD_DOWN.washerHeight, HOLD_DOWN.washer]));
      out.hex.push(place(at(bolt, [Y, t + HOLD_DOWN.washerHeight + HOLD_DOWN.nutHeight / 2]), along, Y, [HOLD_DOWN.nut, HOLD_DOWN.nutHeight, HOLD_DOWN.nut]));
      out.washer.push(place(at(bolt, [Y, t + HOLD_DOWN.washerHeight + HOLD_DOWN.rodLength / 2]), along, Y, [HOLD_DOWN.rod, HOLD_DOWN.rodLength, HOLD_DOWN.rod]));
    }

    for (const b of shown(layout.brackets)) {
      const p = v(b.position);
      const o = v(b.outward);
      const { leg, thickness: t } = BRACKET;
      // vertical leg on the post face, horizontal leg under the purlin
      out.box.push(place(at(p, [o, t / 2], [Y, -leg / 2]), o, Y, [t, leg, b.width]));
      out.box.push(place(at(p, [o, leg / 2], [Y, -t / 2]), o, Y, [leg, t, b.width]));
      // the stiffening rib in the bend
      out.box.push(place(at(p, [o, leg * 0.18], [Y, -leg * 0.18]), new THREE.Vector3().addScaledVector(o, 1).addScaledVector(Y, 1), o.clone().addScaledVector(Y, -1), [leg * 0.45, t * 3, t * 2]));
    }

    for (const r of shown(layout.rafterAnchors)) {
      const p = v(r.position);
      const flank = v(r.flank);
      const face = v(r.face);
      const { rafterLeg, purlinLeg, width, thickness: t } = RAFTER_ANCHOR;
      out.box.push(place(at(p, [flank, t / 2], [face, -width / 2], [Y, rafterLeg / 2]), flank, Y, [t, rafterLeg, width]));
      out.box.push(place(at(p, [face, t / 2], [flank, width / 2], [Y, -purlinLeg / 2]), face, Y, [t, purlinLeg, width]));
    }
  }

  if (layers.roof) {
    for (const tr of shown(layout.trims)) {
      const s = v(tr.start);
      const e = v(tr.end);
      const dir = e.clone().sub(s);
      const mid = s.clone().add(e).multiplyScalar(0.5);
      const n = v(tr.normal);
      const inward = v(tr.inward);
      const length = dir.length();
      out.trim.push(place(at(mid, [inward, TRIM.flange / 2], [n, TRIM.thickness / 2]), dir, n, [length, TRIM.thickness, TRIM.flange]));
      out.trim.push(place(at(mid, [inward, -TRIM.thickness / 2], [n, TRIM.thickness - tr.drop / 2]), dir, n, [length, tr.drop, TRIM.thickness]));
    }
  }

  if (layers.foundations) {
    const X = new THREE.Vector3(1, 0, 0);
    for (const f of shown(layout.footings)) {
      const centre = at(v(f.top), [Y, -f.height / 2]);
      (f.shape === 'round' ? out.concreteRound : out.concreteBox).push(place(centre, X, Y, [f.size, f.height, f.size]));
    }
    for (const c of shown(layout.curbs)) {
      out.concreteBox.push(place(at(v(c.top), [Y, -c.height / 2]), v(c.direction), Y, [c.length, c.height, c.width]));
    }
  }
  return out;
}

/**
 * Steel hardware the statics and connections size – strap crosses, hold-downs, purlin brackets,
 * rafter anchors – plus the roof edge trims and the concrete below ground, each behind its layer.
 * `built` limits the parts to those whose host members are already up (assembly guide).
 */
export function HardwareFixtures({ layout, layers, built }: { layout: HardwareLayout; layers: LayerVisibility; built: (ids: string[]) => boolean }) {
  const geometries = useMemo(
    () => ({
      box: new THREE.BoxGeometry(1, 1, 1),
      washer: new THREE.CylinderGeometry(0.5, 0.5, 1, 20),
      hex: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
      round: new THREE.CylinderGeometry(0.5, 0.5, 1, 32),
    }),
    [],
  );
  useEffect(() => () => Object.values(geometries).forEach((g) => g.dispose()), [geometries]);
  const parts = useMemo(() => buildParts(layout, layers, built), [layout, layers, built]);
  return (
    <group>
      <Instanced geometry={geometries.box} matrices={parts.box} />
      <Instanced geometry={geometries.washer} matrices={parts.washer} />
      <Instanced geometry={geometries.hex} matrices={parts.hex} />
      <Instanced geometry={geometries.box} matrices={parts.trim} material={getTrimMaterial()} />
      <Instanced geometry={geometries.box} matrices={parts.concreteBox} material={getConcreteMaterial()} shadows={false} />
      <Instanced geometry={geometries.round} matrices={parts.concreteRound} material={getConcreteMaterial()} shadows={false} />
    </group>
  );
}
