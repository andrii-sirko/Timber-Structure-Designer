import { memo, useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Opening } from '@/types';
import { WALL_IDS } from '@/types';
import { useProjectStore, useWallFrames } from '@/store';
import type { WallFrame } from '@/engine/framing';
import { findPreset } from '@/engine/framing';
import { getDoorLeafMaterial, getFrameMaterial, getGlassMaterial, getHardwareMaterial, getSashMaterial, MM } from './materials';
import { basisQuaternion } from './TimberMember';

/** Frame legs / head: width into the opening and depth through the wall (mm). */
const FRAME_WIDTH = 60;
const FRAME_DEPTH = 120;
/** Frame is centred here along the wall normal: cladding sits at n = 0…20, studs behind it. */
const FRAME_N = -40;
const LEAF_THICKNESS = 40;
const LEAF_N = -30;
const SASH_WIDTH = 50;
const HANDLE_HEIGHT = 1050;

type Box = { u: number; v: number; n: number; w: number; h: number; d: number; material: 'frame' | 'leaf' | 'sash' | 'glass' | 'hardware' };

function box(u: number, v: number, n: number, w: number, h: number, d: number, material: Box['material']): Box {
  return { u, v, n, w, h, d, material };
}

/** Four (window) or three (door) frame pieces lining the rough opening. */
function frameBoxes(o: Opening, withSill: boolean): Box[] {
  const { x, y, width, height } = o;
  const out: Box[] = [
    box(x + FRAME_WIDTH / 2, y + height / 2, FRAME_N, FRAME_WIDTH, height, FRAME_DEPTH, 'frame'),
    box(x + width - FRAME_WIDTH / 2, y + height / 2, FRAME_N, FRAME_WIDTH, height, FRAME_DEPTH, 'frame'),
    box(x + width / 2, y + height - FRAME_WIDTH / 2, FRAME_N, width - 2 * FRAME_WIDTH, FRAME_WIDTH, FRAME_DEPTH, 'frame'),
  ];
  if (withSill) out.push(box(x + width / 2, y + FRAME_WIDTH / 2, FRAME_N, width - 2 * FRAME_WIDTH, FRAME_WIDTH, FRAME_DEPTH, 'frame'));
  return out;
}

/** Boarded leaf with two ledges and a diagonal brace (Z-Beschlag) on the outer face. */
function boardedLeaf(u0: number, v0: number, w: number, h: number): Box[] {
  const ledgeN = LEAF_N + LEAF_THICKNESS / 2 + 12;
  return [
    box(u0 + w / 2, v0 + h / 2, LEAF_N, w, h, LEAF_THICKNESS, 'leaf'),
    box(u0 + w / 2, v0 + 200, ledgeN, w - 40, 100, 24, 'sash'),
    box(u0 + w / 2, v0 + h - 200, ledgeN, w - 40, 100, 24, 'sash'),
  ];
}

/** Framed leaf: boarded lower panel, glazed upper half inside a sash. */
function glazedLeaf(u0: number, v0: number, w: number, h: number): Box[] {
  const split = v0 + h * 0.45;
  const glassH = v0 + h - split - SASH_WIDTH;
  return [
    box(u0 + w / 2, (v0 + split) / 2, LEAF_N, w, split - v0, LEAF_THICKNESS, 'leaf'),
    box(u0 + SASH_WIDTH / 2, split + glassH / 2, LEAF_N, SASH_WIDTH, glassH, LEAF_THICKNESS, 'sash'),
    box(u0 + w - SASH_WIDTH / 2, split + glassH / 2, LEAF_N, SASH_WIDTH, glassH, LEAF_THICKNESS, 'sash'),
    box(u0 + w / 2, v0 + h - SASH_WIDTH / 2, LEAF_N, w, SASH_WIDTH, LEAF_THICKNESS, 'sash'),
    box(u0 + w / 2, split + glassH / 2, LEAF_N, w - 2 * SASH_WIDTH, glassH, 6, 'glass'),
  ];
}

function doorBoxes(o: Opening): Box[] {
  const preset = findPreset(o.preset);
  const style = preset?.type === 'door' ? preset.style : 'boarded';
  const leaves = preset?.type === 'door' ? preset.leaves : o.width >= 1300 ? 2 : 1;
  const innerU = o.x + FRAME_WIDTH;
  const innerW = o.width - 2 * FRAME_WIDTH;
  const innerH = o.height - FRAME_WIDTH;
  const out = frameBoxes(o, false);
  const leaf = (u0: number, v0: number, w: number, h: number): Box[] => (style === 'glazed' ? glazedLeaf(u0, v0, w, h) : boardedLeaf(u0, v0, w, h));
  if (leaves === 2) {
    const w = (innerW - 6) / 2;
    out.push(...leaf(innerU, o.y, w, innerH), ...leaf(innerU + w + 6, o.y, w, innerH));
  } else if (style === 'stable') {
    const split = Math.round(innerH * 0.55);
    out.push(...leaf(innerU, o.y, innerW, split - 5), ...leaf(innerU, o.y + split + 5, innerW, innerH - split - 5));
  } else {
    out.push(...leaf(innerU, o.y, innerW, innerH));
  }
  // handle on the side opposite the hinge (double doors: on the active right leaf, near the meeting stile)
  const handleU = leaves === 2 ? innerU + innerW / 2 + 60 : o.hinge === 'right' ? innerU + 70 : innerU + innerW - 70;
  out.push(box(handleU, o.y + HANDLE_HEIGHT, LEAF_N + LEAF_THICKNESS / 2 + 20, 22, 130, 40, 'hardware'));
  return out;
}

function windowBoxes(o: Opening): Box[] {
  const preset = findPreset(o.preset);
  const style = preset?.type === 'window' ? preset.style : o.width >= 1100 ? 'double' : 'turn-tilt';
  const innerU = o.x + FRAME_WIDTH;
  const innerV = o.y + FRAME_WIDTH;
  const innerW = o.width - 2 * FRAME_WIDTH;
  const innerH = o.height - 2 * FRAME_WIDTH;
  const out = frameBoxes(o, true);
  const sash = (u0: number, w: number): void => {
    out.push(
      box(u0 + SASH_WIDTH / 2, innerV + innerH / 2, LEAF_N, SASH_WIDTH, innerH, LEAF_THICKNESS, 'sash'),
      box(u0 + w - SASH_WIDTH / 2, innerV + innerH / 2, LEAF_N, SASH_WIDTH, innerH, LEAF_THICKNESS, 'sash'),
      box(u0 + w / 2, innerV + SASH_WIDTH / 2, LEAF_N, w - 2 * SASH_WIDTH, SASH_WIDTH, LEAF_THICKNESS, 'sash'),
      box(u0 + w / 2, innerV + innerH - SASH_WIDTH / 2, LEAF_N, w - 2 * SASH_WIDTH, SASH_WIDTH, LEAF_THICKNESS, 'sash'),
    );
  };
  if (style === 'double') {
    const w = (innerW - FRAME_WIDTH) / 2;
    out.push(box(innerU + innerW / 2, innerV + innerH / 2, FRAME_N, FRAME_WIDTH, innerH, FRAME_DEPTH, 'frame'));
    sash(innerU, w);
    sash(innerU + w + FRAME_WIDTH, w);
  } else if (style !== 'fixed') {
    sash(innerU, innerW);
  }
  out.push(box(innerU + innerW / 2, innerV + innerH / 2, LEAF_N, innerW, innerH, 6, 'glass'));
  // exterior sill board with 40 mm overhang, sloping drip in front of the cladding
  out.push(box(o.x + o.width / 2, o.y - 15, 25, o.width + 80, 30, 90, 'frame'));
  return out;
}

function fixtureBoxes(o: Opening): Box[] {
  if (o.type === 'door') return doorBoxes(o);
  if (o.type === 'window') return windowBoxes(o);
  return [];
}

const MATERIALS = {
  frame: getFrameMaterial,
  leaf: getDoorLeafMaterial,
  sash: getSashMaterial,
  glass: getGlassMaterial,
  hardware: getHardwareMaterial,
} as const;

const Fixture = memo(function Fixture({ opening, hostKey, frame }: { opening: Opening; hostKey: string; frame: WallFrame }) {
  const selectOpening = useProjectStore((s) => s.selectOpening);
  const measureMode = useProjectStore((s) => s.view.measureMode);
  const boxes = useMemo(() => fixtureBoxes(opening), [opening]);
  const quaternion = useMemo(() => basisQuaternion(frame.u, frame.v), [frame.u, frame.v]);
  const onClick = (e: ThreeEvent<MouseEvent>): void => {
    if (measureMode) return;
    e.stopPropagation();
    selectOpening(hostKey, opening.id);
  };
  return (
    <group position={[frame.origin.x * MM, frame.origin.y * MM, frame.origin.z * MM]} quaternion={quaternion} onClick={onClick}>
      {boxes.map((b, i) => (
        <mesh key={i} position={[b.u * MM, b.v * MM, b.n * MM]} material={MATERIALS[b.material]()} castShadow={b.material !== 'glass'} receiveShadow>
          <boxGeometry args={[b.w * MM, b.h * MM, b.d * MM]} />
        </mesh>
      ))}
    </group>
  );
});

/** Door leaves, window sashes and frames drawn inside every opening of a closed wall or partition. */
export function OpeningFixtures() {
  const project = useProjectStore((s) => s.project);
  const frames = useWallFrames();
  const hosts = useMemo(() => {
    const out: { key: string; openings: Opening[] }[] = [];
    for (const id of WALL_IDS) if (project.walls[id].closed) out.push({ key: id, openings: project.walls[id].openings });
    for (const p of project.partitions) out.push({ key: p.id, openings: p.openings });
    return out;
  }, [project.walls, project.partitions]);
  return (
    <group>
      {hosts.map(({ key, openings }) => {
        const frame = frames[key];
        if (!frame) return null;
        return openings.map((o) => <Fixture key={o.id} opening={o} hostKey={key} frame={frame} />);
      })}
    </group>
  );
}
