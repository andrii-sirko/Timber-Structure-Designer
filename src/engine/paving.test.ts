import assert from 'node:assert/strict';
import test from 'node:test';
import { estimateStoneCount, insertVertex, offsetEdge, isSelfIntersecting, polygonAreaM2, polygonPerimeterM, resizePolygon } from './paving.ts';

const rect = [
  { x: 0, z: 0 },
  { x: 6000, z: 0 },
  { x: 6000, z: 3000 },
  { x: 0, z: 3000 },
];

test('rectangle area and perimeter', () => {
  assert.equal(polygonAreaM2(rect), 18);
  assert.equal(polygonPerimeterM(rect), 18);
  assert.equal(polygonAreaM2(rect.slice().reverse()), 18);
});

test('L-shaped polygon area', () => {
  const l = [
    { x: 0, z: 0 },
    { x: 4000, z: 0 },
    { x: 4000, z: 2000 },
    { x: 2000, z: 2000 },
    { x: 2000, z: 4000 },
    { x: 0, z: 4000 },
  ];
  assert.equal(polygonAreaM2(l), 12);
});

test('inserting a vertex on an edge keeps the area', () => {
  const next = insertVertex(rect, 1);
  assert.equal(next.length, 5);
  assert.deepEqual(next[2], { x: 6000, z: 1500 });
  assert.equal(polygonAreaM2(next), 18);
});

test('self-intersection detection', () => {
  assert.equal(isSelfIntersecting(rect), false);
  const bowtie = [
    { x: 0, z: 0 },
    { x: 1000, z: 1000 },
    { x: 1000, z: 0 },
    { x: 0, z: 1000 },
  ];
  assert.equal(isSelfIntersecting(bowtie), true);
});

test('resizing scales the bounding box', () => {
  const r = resizePolygon(rect, 3000, 6000);
  assert.deepEqual(r[2], { x: 3000, z: 6000 });
  assert.equal(polygonAreaM2(r), 18);
});

test('stone count uses the stone module incl. joint', () => {
  // 18 m² / ((0.2 + 0.003) × (0.1 + 0.003)) ≈ 860.9 → 861
  assert.equal(estimateStoneCount(18, { stoneLength: 200, stoneWidth: 100, jointWidth: 3 }), 861);
});

test('offsetEdge moves both endpoints along the edge normal only', () => {
  // edge 1 runs +Z at x = 6000; its normal is ±X, so the Z part of the drag is ignored
  const next = offsetEdge(rect, 1, 500, 900);
  assert.deepEqual(next[1], { x: 6500, z: 0 });
  assert.deepEqual(next[2], { x: 6500, z: 3000 });
  assert.deepEqual(next[0], rect[0]);
  assert.deepEqual(next[3], rect[3]);
});

test('offsetEdge snaps the offset distance', () => {
  const next = offsetEdge(rect, 0, 0, -130, 50);
  assert.equal(next[0].z, -150);
  assert.equal(next[1].z, -150);
});

test('offsetEdge wraps the last edge to the first vertex', () => {
  const next = offsetEdge(rect, 3, -200, 0);
  assert.equal(next[3].x, -200);
  assert.equal(next[0].x, -200);
});
