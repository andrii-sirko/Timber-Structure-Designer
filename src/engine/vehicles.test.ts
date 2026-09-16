import assert from 'node:assert/strict';
import test from 'node:test';
import type { Vehicle } from '../types/index.ts';
import { defaultObjectSize, getVehicleModel, resolveVehicleModel, vehicleCorners, vehiclesOverlap, VEHICLE_CATALOG } from './vehicles.ts';

const place = (modelId: string, x: number, z: number, size?: Vehicle['size']): Vehicle => ({ id: modelId + x, modelId, x, z, rotationDeg: 0, color: '#000', ...(size ? { size } : {}) });

test('fixed-size models ignore a size override', () => {
  const golf = resolveVehicleModel(place('vw-golf', 0, 0, { length: 100, width: 100, height: 100 }));
  assert.deepEqual([golf.length, golf.width, golf.mirrorWidth, golf.height], [4284, 1789, 2027, 1456]);
  assert.equal(defaultObjectSize(getVehicleModel('vw-golf')), undefined);
});

test('free-size objects take the instance size; mirror width follows the width', () => {
  const table = resolveVehicleModel(place('table-custom', 0, 0, { length: 2400, width: 900, height: 780 }));
  assert.deepEqual([table.length, table.width, table.mirrorWidth, table.height], [2400, 900, 900, 780]);
  assert.deepEqual(defaultObjectSize(getVehicleModel('table-custom')), { length: 1600, width: 800, height: 750 });
});

test('instance size is clamped and rounded', () => {
  const shelf = resolveVehicleModel(place('shelf-tools', 0, 0, { length: 12, width: 99999, height: 1800.4 }));
  assert.deepEqual([shelf.length, shelf.width, shelf.height], [100, 6000, 1800]);
});

test('footprint and overlap use the instance size', () => {
  const big = place('box-custom', 0, 0, { length: 4000, width: 4000, height: 500 });
  const c = vehicleCorners(big, resolveVehicleModel(big));
  assert.equal(Math.max(...c.map((p) => p.x)), 2000);
  const bin = place('bin-120', 1900, 0);
  assert.equal(vehiclesOverlap(big, bin), true);
  assert.equal(vehiclesOverlap(place('box-custom', 0, 0), bin), false);
});

test('every garden object has a silhouette-compatible catalogue entry', () => {
  const ids = ['mower-push', 'mower-riding', 'wheelbarrow', 'shelf-tools', 'table-custom', 'workbench', 'bench-garden', 'firewood', 'box-custom', 'rain-barrel', 'ibc-tank', 'ladder', 'grill-gas', 'grill-kettle'];
  for (const id of ids) {
    const m = VEHICLE_CATALOG.find((x) => x.id === id);
    assert.ok(m, id);
    assert.equal(m.mirrorWidth, m.width, `${id} has no mirrors`);
  }
});
