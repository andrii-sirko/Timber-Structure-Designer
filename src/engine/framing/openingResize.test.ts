import assert from 'node:assert/strict';
import test from 'node:test';
import type { Opening } from '@/types';
import { edgeHandleCentre, resizableEdges, resizeOpening, sizeChanged } from './openingResize.ts';
import { FRAME_GAP, OPENING_PRESETS, findPreset, frameSizeFor, openingFromPreset, openingMaterials, presetMatches } from './openingCatalog.ts';
import { headerHeight } from './openings.ts';

const door: Opening = { id: 'd', type: 'door', x: 1000, y: 0, width: 900, height: 2000 };
const win: Opening = { id: 'w', type: 'window', x: 1000, y: 1000, width: 1000, height: 800 };

test('dragging the right edge changes only the width, snapped to 10 mm', () => {
  assert.deepEqual(resizeOpening(door, 'right', 2154, 500), { x: 1000, y: 0, width: 1150, height: 2000 });
});

test('dragging the left edge keeps the right edge in place', () => {
  assert.deepEqual(resizeOpening(door, 'left', 1200, 500), { x: 1200, y: 0, width: 700, height: 2000 });
});

test('an edge can never cross the opposite edge below the minimum size', () => {
  assert.deepEqual(resizeOpening(door, 'left', 5000, 0), { x: 1600, y: 0, width: 300, height: 2000 });
  assert.deepEqual(resizeOpening(door, 'right', -5000, 0), { x: 1000, y: 0, width: 300, height: 2000 });
  assert.deepEqual(resizeOpening(win, 'top', 0, 0), { x: 1000, y: 1000, width: 1000, height: 300 });
});

test('window bottom edge moves the sill and keeps the head', () => {
  assert.deepEqual(resizeOpening(win, 'bottom', 0, 1204), { x: 1000, y: 1200, width: 1000, height: 600 });
  assert.deepEqual(resizeOpening(win, 'bottom', 0, -300), { x: 1000, y: 0, width: 1000, height: 1800 });
});

test('doors have no bottom handle, windows have all four', () => {
  assert.deepEqual(resizableEdges(door), ['left', 'right', 'top']);
  assert.deepEqual(resizableEdges(win), ['left', 'right', 'top', 'bottom']);
  assert.deepEqual(edgeHandleCentre(win, 'top'), { u: 1500, v: 1800 });
  assert.deepEqual(edgeHandleCentre(win, 'left'), { u: 1000, v: 1400 });
});

test('sizeChanged ignores pure moves', () => {
  assert.equal(sizeChanged(door, { width: door.width, height: door.height }), false);
  assert.equal(sizeChanged(door, { ...door, width: 910 }), true);
});

test('every preset is on the 10 mm framing grid and keeps the header at 160 mm or less', () => {
  for (const p of OPENING_PRESETS) {
    assert.equal(p.roughWidth % 10, 0, p.id);
    assert.equal(p.roughHeight % 10, 0, p.id);
    assert.ok(headerHeight(p.roughWidth) <= 160, `${p.id} needs a ${headerHeight(p.roughWidth)} mm header`);
    assert.ok(p.roughWidth > p.frameWidth && p.roughHeight > p.frameHeight, `${p.id} frame must be smaller than the rough opening`);
    assert.ok(p.materials.length >= 3, `${p.id} lists its materials`);
  }
  assert.ok(new Set(OPENING_PRESETS.map((p) => p.id)).size === OPENING_PRESETS.length, 'preset ids are unique');
});

test('DIN door sizes: 875×2000 → rough 890×2010, frame 860×1992', () => {
  const p = findPreset('door-boarded-875');
  assert.ok(p);
  assert.equal(p.roughWidth, 890);
  assert.equal(p.roughHeight, 2010);
  assert.equal(p.frameWidth, 860);
  assert.equal(p.frameHeight, 1992);
  const o = { id: 'x', x: 0, ...openingFromPreset(p) };
  assert.equal(o.type, 'door');
  assert.equal(o.y, 0);
  assert.equal(o.hinge, 'left');
  assert.ok(presetMatches(o, p));
  assert.deepEqual(frameSizeFor(o), { width: 860, height: 1992 });
  assert.equal(openingMaterials(o), p.materials);
});

test('window presets carry their sill height and a 10 mm gap per side', () => {
  const p = findPreset('window-turntilt-800x800');
  assert.ok(p && p.type === 'window');
  const o = { id: 'x', x: 0, ...openingFromPreset(p) };
  assert.equal(o.y, p.sill);
  assert.equal(o.width, 800 + 2 * FRAME_GAP);
  assert.equal(o.hinge, undefined);
});

test('a hand-resized preset falls back to made-to-measure materials and frame size', () => {
  const p = findPreset('window-turntilt-800x800');
  assert.ok(p);
  const o: Opening = { id: 'x', x: 0, ...openingFromPreset(p), width: 900 };
  assert.equal(presetMatches(o, p), false);
  assert.deepEqual(frameSizeFor(o), { width: 880, height: 800 });
  assert.match(openingMaterials(o)[0], /Made-to-measure/);
});
