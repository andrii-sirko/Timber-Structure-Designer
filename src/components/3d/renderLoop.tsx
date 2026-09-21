import { useCallback, useEffect, useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';

/**
 * The canvas renders on demand (frameloop="demand") with a static shadow map: a frame is drawn only
 * when something changes, and shadows are re-rendered only when the scene content changes (not while
 * orbiting). Imperative scene mutations outside React props must call this to show up.
 */
export function useRedraw(): () => void {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  return useCallback(() => {
    gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [gl, invalidate]);
}

let renderNow: (() => HTMLCanvasElement) | null = null;

/** PNG of the viewport. Renders a fresh frame first: the drawing buffer is not preserved between frames. */
export function snapshotPng(): string | null {
  return renderNow ? renderNow().toDataURL('image/png') : null;
}

/**
 * Mount inside <Canvas>, re-rendered with the scene: refreshes shadows and requests a frame on every
 * scene commit, registers the screenshot hook and reports WebGL context loss / restore.
 */
export function RenderLoop({ onContextLost }: { onContextLost: (lost: boolean) => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const redraw = useRedraw();

  useLayoutEffect(() => {
    gl.shadowMap.autoUpdate = false;
    redraw();
  });

  useEffect(() => {
    renderNow = () => {
      gl.shadowMap.needsUpdate = true;
      gl.render(scene, camera);
      return gl.domElement;
    };
    return () => {
      renderNow = null;
    };
  }, [gl, scene, camera]);

  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (): void => onContextLost(true);
    const restored = (): void => {
      onContextLost(false);
      redraw();
    };
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', restored);
    return () => {
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
    };
  }, [gl, onContextLost, redraw]);

  return null;
}
