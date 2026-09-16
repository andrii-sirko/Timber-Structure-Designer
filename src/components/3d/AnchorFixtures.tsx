import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Member } from '@/types';
import { plateAnchors, postBases } from '@/engine/joinery/anchors';
import { getGalvanisedMaterial, MM } from './materials';

/** Frame anchor washer and head on the plate top (mm). */
const WASHER_DIAMETER = 32;
const WASHER_THICKNESS = 3;
const HEAD_DIAMETER = 20;
const HEAD_HEIGHT = 5;
/** Post base: foot plate, U-flanges and M12 bolts through the post (mm). */
const FOOT_THICKNESS = 8;
const FOOT_OVERHANG = 40;
const FLANGE_THICKNESS = 6;
const FLANGE_HEIGHT = 160;
const FLANGE_WIDTH = 80;
const BOLT_HEIGHTS = [50, 120];
const BOLT_HEAD_DIAMETER = 19;
const BOLT_HEAD_HEIGHT = 8;

type Part = 'box' | 'washer' | 'hex';

function useGeometries(): Record<Part, THREE.BufferGeometry> {
  const geometries = useMemo(
    () => ({
      box: new THREE.BoxGeometry(1, 1, 1),
      washer: new THREE.CylinderGeometry(0.5, 0.5, 1, 20),
      hex: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
    }),
    [],
  );
  useEffect(() => () => Object.values(geometries).forEach((g) => g.dispose()), [geometries]);
  return geometries;
}

function Instanced({ geometry, matrices }: { geometry: THREE.BufferGeometry; matrices: THREE.Matrix4[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [matrices]);
  if (matrices.length === 0) return null;
  // keyed by count: an InstancedMesh cannot grow after creation
  return <instancedMesh key={matrices.length} ref={ref} args={[geometry, getGalvanisedMaterial(), matrices.length]} castShadow receiveShadow />;
}

const Y = new THREE.Vector3(0, 1, 0);

/** Matrix for a unit part centred at `centre` (mm), scaled to `size` (mm) in the basis x / Y / z. */
function place(centre: THREE.Vector3, x: THREE.Vector3, z: THREE.Vector3, size: [number, number, number], y: THREE.Vector3 = Y): THREE.Matrix4 {
  const basis = new THREE.Matrix4().makeBasis(x, y, z);
  return basis.scale(new THREE.Vector3(size[0] * MM, size[1] * MM, size[2] * MM)).setPosition(centre.clone().multiplyScalar(MM));
}

/** Frame anchors on the bottom plates and post bases under the posts. */
export function AnchorFixtures({ members }: { members: Member[] }) {
  const geometries = useGeometries();
  const parts = useMemo(() => {
    const out: Record<Part, THREE.Matrix4[]> = { box: [], washer: [], hex: [] };
    const X = new THREE.Vector3(1, 0, 0);
    const Z = new THREE.Vector3(0, 0, 1);

    for (const a of plateAnchors(members)) {
      const p = new THREE.Vector3(a.position.x, a.position.y, a.position.z);
      out.washer.push(place(p.clone().addScaledVector(Y, WASHER_THICKNESS / 2), X, Z, [WASHER_DIAMETER, WASHER_THICKNESS, WASHER_DIAMETER]));
      out.hex.push(place(p.clone().addScaledVector(Y, WASHER_THICKNESS + HEAD_HEIGHT / 2), X, Z, [HEAD_DIAMETER, HEAD_HEIGHT, HEAD_DIAMETER]));
    }

    for (const b of postBases(members)) {
      const f = new THREE.Vector3(b.flangeAxis.x, b.flangeAxis.y, b.flangeAxis.z);
      const d = new THREE.Vector3(b.depthAxis.x, b.depthAxis.y, b.depthAxis.z);
      const foot = new THREE.Vector3(b.position.x, b.position.y, b.position.z);
      const outer = b.width / 2 + FLANGE_THICKNESS + FOOT_OVERHANG;
      out.box.push(place(foot.clone().addScaledVector(Y, FOOT_THICKNESS / 2), f, d, [2 * outer, FOOT_THICKNESS, Math.max(b.depth, FLANGE_WIDTH + 2 * FOOT_OVERHANG)]));
      for (const side of [-1, 1]) {
        const flangeCentre = foot
          .clone()
          .addScaledVector(Y, FOOT_THICKNESS + FLANGE_HEIGHT / 2)
          .addScaledVector(f, side * (b.width / 2 + 0.5 + FLANGE_THICKNESS / 2));
        out.box.push(place(flangeCentre, f, d, [FLANGE_THICKNESS, FLANGE_HEIGHT, Math.min(FLANGE_WIDTH, b.depth)]));
        for (const h of BOLT_HEIGHTS) {
          const head = foot
            .clone()
            .addScaledVector(Y, FOOT_THICKNESS + h)
            .addScaledVector(f, side * (b.width / 2 + 0.5 + FLANGE_THICKNESS + BOLT_HEAD_HEIGHT / 2));
          // cylinder axis (local Y) along the bolt, i.e. the flange normal
          out.hex.push(place(head, Y, d, [BOLT_HEAD_DIAMETER, BOLT_HEAD_HEIGHT, BOLT_HEAD_DIAMETER], f));
        }
      }
    }
    return out;
  }, [members]);

  return (
    <group>
      {(Object.keys(parts) as Part[]).map((k) => (
        <Instanced key={k} geometry={geometries[k]} matrices={parts[k]} />
      ))}
    </group>
  );
}
