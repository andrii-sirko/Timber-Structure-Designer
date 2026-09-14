import assert from 'node:assert/strict';
import test from 'node:test';
import { applyGrabOffset, wallDragDimension, wallDragDimensionValue, wallDragGrabOffset, wallDragRuler, wallHandles } from './wallDrag.ts';

const params = { length: 6000, width: 3000 };

test('front/rear walls control the width, left/right the length', () => {
  assert.equal(wallDragDimension('front'), 'width');
  assert.equal(wallDragDimension('rear'), 'width');
  assert.equal(wallDragDimension('left'), 'length');
  assert.equal(wallDragDimension('right'), 'length');
});

test('dragging the right / rear wall sets the dimension to the pointer position, snapped to 10 mm', () => {
  assert.equal(wallDragDimensionValue('right', { x: 7024, z: 100 }, params), 7020);
  assert.equal(wallDragDimensionValue('rear', { x: 100, z: 3486 }, params), 3490);
});

test('dragging the left / front wall outwards grows the footprint', () => {
  assert.equal(wallDragDimensionValue('left', { x: -500, z: 0 }, params), 6500);
  assert.equal(wallDragDimensionValue('front', { x: 0, z: 400 }, params), 2600);
});

test('never shrinks below the minimum plan dimension', () => {
  assert.equal(wallDragDimensionValue('right', { x: -3000, z: 0 }, params), 500);
  assert.equal(wallDragDimensionValue('left', { x: 9000, z: 0 }, params), 500);
});

test('grab offset keeps the wall from jumping to the pointer', () => {
  const grab = { x: 6250, z: 1500 };
  const offset = wallDragGrabOffset('right', grab, params);
  assert.equal(offset, 250);
  assert.equal(wallDragDimensionValue('right', applyGrabOffset('right', grab, offset), params), 6000);
  const grabLeft = { x: -250, z: 1500 };
  const offsetLeft = wallDragGrabOffset('left', grabLeft, params);
  assert.equal(wallDragDimensionValue('left', applyGrabOffset('left', grabLeft, offsetLeft), params), 6000);
});

test('handles sit just outside each wall face', () => {
  const handles = wallHandles(params, 250);
  assert.deepEqual(handles.find((h) => h.wall === 'right')?.centre, { x: 6250, z: 1500 });
  assert.deepEqual(handles.find((h) => h.wall === 'front')?.centre, { x: 3000, z: -250 });
  assert.equal(handles.find((h) => h.wall === 'left')?.length, 3000);
});

test('ruler spans the controlled dimension', () => {
  assert.equal(wallDragRuler('right', params).label, 'L 6000 mm');
  assert.deepEqual(wallDragRuler('front', params).b, { x: 3000, z: 3000 });
});
