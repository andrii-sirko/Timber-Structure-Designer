import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import type { CameraPreset, DerivedModel } from '@/types';
import { useProjectStore, useWallFrames } from '@/store';
import { MM } from './materials';

interface Bounds {
  min: THREE.Vector3;
  max: THREE.Vector3;
}

export function modelBounds(model: DerivedModel, project: { params: { length: number; width: number; overhangs: { front: number; rear: number; left: number; right: number } } }): Bounds {
  const p = project.params;
  const min = new THREE.Vector3(-p.overhangs.right * MM, 0, -p.overhangs.front * MM);
  const max = new THREE.Vector3((p.length + p.overhangs.left) * MM, model.framing.roof.ridgeHeight * MM, (p.width + p.overhangs.rear) * MM);
  return { min, max };
}

interface OrbitLike {
  target: THREE.Vector3;
  update: () => void;
}

/** Applies camera presets (isometric, elevations, plan, wall elevation) and frames the model. */
export function CameraRig({ bounds }: { bounds: Bounds }) {
  const preset = useProjectStore((s) => s.view.cameraPreset);
  const orthographic = useProjectStore((s) => s.view.orthographic);
  const nonce = useProjectStore((s) => s.cameraNonce);
  const selectedWallId = useProjectStore((s) => s.selectedWallId);
  const frames = useWallFrames();
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as OrbitLike | null;
  const size = useThree((s) => s.size);

  const wallForPreset: string | null = preset === 'wall' ? selectedWallId : null;

  // Bounds are read through a ref so that editing dimensions does not re-frame the camera;
  // only an explicit preset change / nonce bump (or viewport resize) re-frames.
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  useEffect(() => {
    const bounds = boundsRef.current;
    const centre = bounds.min.clone().add(bounds.max).multiplyScalar(0.5);
    const extent = bounds.max.clone().sub(bounds.min);
    const radius = extent.length() / 2;
    const target = centre.clone();
    let position: THREE.Vector3;
    let fitW = extent.x;
    let fitH = extent.y;

    const dist = (w: number, h: number): number => {
      if (camera instanceof THREE.PerspectiveCamera) {
        const fov = (camera.fov * Math.PI) / 180;
        const aspect = size.width / Math.max(size.height, 1);
        const dH = h / 2 / Math.tan(fov / 2);
        const dW = w / 2 / Math.tan(fov / 2) / aspect;
        return Math.max(dH, dW) * 1.35 + radius * 0.2;
      }
      return radius * 3 + 5;
    };

    const applyPreset = (p: CameraPreset): void => {
      switch (p) {
        case 'top':
          fitW = extent.x;
          fitH = extent.z;
          // tiny −Z offset: screen-up = +Z, so the plan reads with the front at the bottom (left wall on the left)
          position = centre.clone().add(new THREE.Vector3(0, dist(fitW, fitH) + extent.y, -0.0001));
          break;
        case 'front':
          fitW = extent.x;
          fitH = extent.y;
          position = centre.clone().add(new THREE.Vector3(0, 0, -dist(fitW, fitH) - extent.z / 2));
          break;
        case 'rear':
          fitW = extent.x;
          fitH = extent.y;
          position = centre.clone().add(new THREE.Vector3(0, 0, dist(fitW, fitH) + extent.z / 2));
          break;
        case 'left':
          fitW = extent.z;
          fitH = extent.y;
          position = centre.clone().add(new THREE.Vector3(dist(fitW, fitH) + extent.x / 2, 0, 0));
          break;
        case 'right':
          fitW = extent.z;
          fitH = extent.y;
          position = centre.clone().add(new THREE.Vector3(-dist(fitW, fitH) - extent.x / 2, 0, 0));
          break;
        case 'wall': {
          const frame = wallForPreset ? (frames[wallForPreset] ?? null) : null;
          if (!frame) {
            applyPreset('iso');
            return;
          }
          fitW = frame.length * MM * 1.1;
          fitH = extent.y;
          const wallCentre = frame.toWorld(frame.length / 2, (frame.studTopAt(frame.length / 2) / 2) * 1.0, 0);
          target.set(wallCentre.x * MM, extent.y / 2, wallCentre.z * MM);
          const n = new THREE.Vector3(frame.normal.x, frame.normal.y, frame.normal.z);
          position = target.clone().addScaledVector(n, dist(fitW, fitH) + 1);
          break;
        }
        case 'iso':
        default: {
          fitW = Math.hypot(extent.x, extent.z);
          fitH = extent.y + extent.z * 0.5;
          const d = dist(fitW, fitH);
          position = centre.clone().add(new THREE.Vector3(-0.8, 0.65, -1.0).normalize().multiplyScalar(d));
          break;
        }
      }
    };
    applyPreset(preset);

    camera.position.copy(position!);
    camera.up.set(0, 1, 0);
    camera.lookAt(target);
    if (camera instanceof THREE.OrthographicCamera) {
      const zoom = Math.min(size.width / (fitW * 1.25), size.height / (fitH * 1.35));
      camera.zoom = Math.max(zoom, 5);
      camera.near = 0.01;
      camera.far = 500;
    }
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.copy(target);
      controls.update();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, orthographic, nonce, camera, controls, size.width, size.height, wallForPreset]);

  return null;
}
