import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildModel, defaultPartition } from '@/engine';
import { PROJECT_TEMPLATES } from '@/store/defaults';
import { hasTranslation, t, tx } from '@/i18n/core';
import type { ProjectState } from '@/types';
import { applyStepOrder, assemblyProgress, buildAssemblyFrames, buildAssemblySteps, moveStepKey, stepHardwareShares } from './assembly';

function variants(): ProjectState[] {
  return PROJECT_TEMPLATES.flatMap((tpl) => {
    const plain = tpl.build();
    const full = tpl.build();
    full.params.floor = { ...full.params.floor, enabled: true };
    full.params.maxRafterLength = 2500; // forces an intermediate purlin row
    full.partitions = [defaultPartition(full.params, 'z', 'p1', 'Partition 1')];
    const sloped = tpl.build();
    sloped.params.roofScheme = 'sloped-purlins';
    sloped.params.roofDirection = 'left';
    return [plain, full, sloped];
  });
}

test('every member and panel is installed in exactly one step', () => {
  for (const project of variants()) {
    const model = buildModel(project);
    const steps = buildAssemblySteps(model, project);
    const ids = steps.flatMap((s) => [...s.memberIds, ...s.panelIds]);
    assert.equal(new Set(ids).size, ids.length, 'no piece appears twice');
    assert.deepEqual([...ids].sort(), [...model.framing.members.map((m) => m.id), ...model.framing.panels.map((p) => p.id)].sort());
    assert.equal(new Set(steps.map((s) => s.key)).size, steps.length, 'step keys are unique');
    assert.ok(!steps.some((s) => s.stage === 'other'), 'no member falls through to the catch-all step');
  }
});

test('intermediate purlin rows get their own posts, purlin and braces', () => {
  const project = PROJECT_TEMPLATES[0].build();
  project.params.maxRafterLength = 2500;
  const steps = buildAssemblySteps(buildModel(project), project);
  const keys = steps.map((s) => s.key);
  assert.ok(keys.includes('posts:mid0') && keys.includes('purlin:mid0'), keys.join());
  assert.ok(keys.indexOf('purlin:mid0') < keys.indexOf('rafters'));
  assert.equal(steps.find((s) => s.key === 'posts:mid0')?.where, 'middle row 1');
});

test('a row gets its posts before its purlin, and the rafters come after every purlin', () => {
  const project = PROJECT_TEMPLATES[0].build();
  const keys = buildAssemblySteps(buildModel(project), project).map((s) => s.key);
  assert.deepEqual(keys, ['posts:front', 'purlin:front', 'braces:front', 'posts:rear', 'purlin:rear', 'braces:rear', 'rafters', 'roof']);
});

test('a saved order survives steps being added and removed', () => {
  const project = PROJECT_TEMPLATES[0].build();
  const steps = buildAssemblySteps(buildModel(project), project);
  const saved = ['gone', 'posts:rear', 'posts:front', 'purlin:rear', 'purlin:front', 'rafters'];
  assert.deepEqual(
    applyStepOrder(steps, saved).map((s) => s.key),
    ['posts:rear', 'posts:front', 'purlin:rear', 'braces:rear', 'purlin:front', 'braces:front', 'rafters', 'roof'],
  );
  assert.equal(applyStepOrder(steps, undefined), steps);
  assert.deepEqual(moveStepKey(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a']);
  assert.deepEqual(moveStepKey(['a', 'b', 'c'], 2, -5), ['c', 'a', 'b']);
});

test('frames walk the whole model, step by step or piece by piece', () => {
  const project = PROJECT_TEMPLATES[2].build();
  const model = buildModel(project);
  const steps = buildAssemblySteps(model, project);
  const total = model.framing.members.length + model.framing.panels.length;
  for (const pieceMode of [false, true]) {
    const frames = buildAssemblyFrames(steps, model.framing.members, pieceMode);
    const end = assemblyProgress(frames, frames.length - 1);
    assert.equal(end.installed.size + end.current.size, total);
    assert.equal(assemblyProgress(frames, 0).installed.size, 0);
    if (pieceMode) assert.ok(frames.every((f) => f.memberIds.length + f.panelIds.length <= 1));
    else assert.equal(frames.length, steps.length);
  }
  // Pieces of a step go in bottom-up
  const frames = buildAssemblyFrames(steps, model.framing.members, true);
  const byId = new Map(model.framing.members.map((m) => [m.id, m]));
  const openingStep = steps.findIndex((s) => s.stage === 'wall-openings');
  const heights = frames.filter((f) => f.stepIndex === openingStep).map((f) => byId.get(f.memberIds[0])!.start.y);
  assert.deepEqual(heights, [...heights].sort((a, b) => a - b));
});

test('step titles and instructions are translated', () => {
  for (const project of variants()) {
    for (const step of buildAssemblySteps(buildModel(project), project)) {
      for (const lang of ['uk', 'de'] as const) {
        assert.ok(hasTranslation(step.title, lang), `${lang}: ${step.title}`);
        assert.ok(hasTranslation(step.instruction, lang), `${lang}: ${step.instruction}`);
        if (step.where && !step.key.includes(':p1')) assert.notEqual(tx(step.where, lang), step.where, `${lang}: ${step.where}`);
        assert.ok(!t(step.title, { where: 'X' }, lang).includes('{'));
      }
    }
  }
});

test('hardware is shared out over the steps that use it', () => {
  const project = PROJECT_TEMPLATES[0].build();
  const model = buildModel(project);
  const steps = buildAssemblySteps(model, project);
  const shares = stepHardwareShares(steps, model.connections.hardware);
  const bases = (key: string): number | undefined => shares.get(key)?.find((h) => h.item.id === 'post-base')?.quantity;
  assert.equal(bases('posts:front'), 3);
  assert.equal(bases('posts:rear'), 3);
  assert.equal(bases('rafters'), undefined);
  for (const item of model.connections.hardware) {
    const shared = [...shares.values()].flat().filter((h) => h.item.id === item.id).reduce((sum, h) => sum + h.quantity, 0);
    if (shared > 0) assert.ok(shared >= item.quantity, `${item.id}: ${shared} of ${item.quantity}`);
  }
});
