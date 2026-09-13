import { memo, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { Panel, RoofCovering } from '@/types';
import { getCladdingMaterial, getRoofMaterial, getWireframeMaterial, MM } from './materials';
import { basisQuaternion } from './TimberMember';

interface PanelMeshProps {
  panel: Panel;
  covering: RoofCovering;
  wireframe: boolean;
  onClick?: (panel: Panel, e: ThreeEvent<MouseEvent>) => void;
}

export const PanelMesh = memo(function PanelMesh({ panel, covering, wireframe, onClick }: PanelMeshProps) {
  const geometry = useMemo(() => {
    if (panel.outline) {
      const shape = new THREE.Shape(panel.outline.outer.map((p) => new THREE.Vector2(p.u * MM, p.v * MM)));
      for (const hole of panel.outline.holes) {
        shape.holes.push(new THREE.Path(hole.map((p) => new THREE.Vector2(p.u * MM, p.v * MM))));
      }
      return new THREE.ExtrudeGeometry(shape, { depth: panel.outline.thickness * MM, bevelEnabled: false, steps: 1 });
    }
    const [a, b, t] = panel.size ?? [1, 1, 0.02];
    return new THREE.BoxGeometry(a * MM, b * MM, t * MM);
  }, [panel.outline, panel.size]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const quaternion = useMemo(() => basisQuaternion(panel.direction, panel.up), [panel.direction, panel.up]);
  const position = useMemo<[number, number, number]>(
    () => [panel.anchor.x * MM, panel.anchor.y * MM, panel.anchor.z * MM],
    [panel.anchor],
  );
  const material = wireframe ? getWireframeMaterial() : panel.kind === 'roof' ? getRoofMaterial(covering) : getCladdingMaterial();

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={position}
      quaternion={quaternion}
      castShadow
      receiveShadow
      userData={{ panelId: panel.id, wallId: panel.wallId }}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick(panel, e);
        }
      }}
    />
  );
});
