import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildModel, autoFixStatics, costOptimizeStatics, OPENING_PRESETS, VEHICLE_CATALOG } from '@/engine';
import { PROJECT_TEMPLATES } from '@/store/defaults';
import type { ProjectState, RoofDirection } from '@/types';
import { DICTIONARY_PARTS } from './dict';
import { hasTranslation, t, tx } from './core';

/** Keys whose string values the UI shows translated (via `tx`). Member names are hover labels and stay English. */
const TEXT_KEYS = new Set(['name', 'label', 'element', 'detail', 'recommendation', 'message', 'messages', 'notes', 'note', 'spec', 'group', 'description', 'title', 'reason', 'summary', 'text', 'walls', 'wallCollisions', 'changes', 'materials', 'product', 'wall']);
const SKIP_KEYS = new Set(['members', 'id', 'nameDe', 'labelDe', 'elementDe', 'modelId']);

function collect(value: unknown, out: Set<string>, key = ''): void {
  if (typeof value === 'string') {
    if (TEXT_KEYS.has(key) && /[A-Za-z]{3,}/.test(value.replace(/\bmm\b/g, ''))) out.add(value);
  } else if (Array.isArray(value)) {
    for (const v of value) collect(v, out, key);
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) if (!SKIP_KEYS.has(k)) collect(v, out, k);
  }
}


/** Words that legitimately survive translation: German trade terms in parentheses, symbols, brands, units. */
const KEEP = /^(mm|kN|kNm|max|min|incl|span|beam|stoß|kerve|hakenblatt|pfette|pfosten|sparren|epdm|osb|din|wpc|dpc|vs|minimum|option|crossover|pickup|trekking|stulp)$/i;

/** English words (4+ letters) of the source still present in the translation, ignoring (…) asides and brand names. */
function leftoverEnglish(source: string, translated: string): string[] {
  const words = (x: string) => new Set((x.replace(/\([^()]*\)/g, ' ').match(/[A-Za-z][a-z]{3,}/g) ?? []).map((w) => w.toLowerCase()));
  const src = words(source);
  return [...words(translated)].filter((w) => src.has(w) && !KEEP.test(w) && !/^[A-Z]/.test(source.match(new RegExp(`\\b${w}`, 'i'))?.[0] ?? '') );
}

function variants(): ProjectState[] {
  const out: ProjectState[] = [];
  const dirs: RoofDirection[] = ['rear', 'front', 'left', 'right'];
  for (const tpl of PROJECT_TEMPLATES) {
    for (const dir of dirs) {
      const p = tpl.build();
      p.params.roofDirection = dir;
      out.push(p);
      // an under-sized, heavily loaded variant to trigger failing checks and recommendations
      const weak = tpl.build();
      weak.params.roofDirection = dir;
      weak.params.length *= 1.6;
      weak.params.width *= 1.5;
      weak.params.loads = { ...weak.params.loads, snowLoad: 2.5, windLoad: 1.2 };
      weak.params.timber = { ...weak.params.timber, post: { width: 80, height: 80 }, beam: { width: 80, height: 120 }, rafter: { width: 50, height: 100 } };
      out.push(weak);
    }
  }
  return out;
}

test('every engine text shown in the UI has a Ukrainian and German translation', () => {
  const texts = new Set<string>();
  for (const project of variants()) {
    collect(buildModel(project), texts);
    for (const run of [autoFixStatics, costOptimizeStatics]) {
      try {
        collect(run(project), texts);
      } catch {
        // not every variant is fixable
      }
    }
  }
  collect(OPENING_PRESETS, texts);
  collect(VEHICLE_CATALOG, texts);
  const missing = { uk: [] as string[], de: [] as string[] };
  for (const s of texts) {
    for (const lang of ['uk', 'de'] as const) {
      if (!hasTranslation(s, lang)) missing[lang].push(s);
      else {
        const left = leftoverEnglish(s, tx(s, lang));
        if (left.length) missing[lang].push(`${s}  ⟶  ${tx(s, lang)}  [${left.join(', ')}]`);
      }
    }
  }
  if (process.env.I18N_REPORT) {
    console.log(`${texts.size} engine texts; missing uk ${missing.uk.length}, de ${missing.de.length}`);
    for (const s of missing.uk) console.log('  uk ✗', JSON.stringify(s));
    for (const s of missing.de) console.log('  de ✗', JSON.stringify(s));
  }
  assert.deepEqual(missing.uk.slice(0, 20), [], `${missing.uk.length} engine texts without a Ukrainian translation (run with I18N_REPORT=1)`);
  assert.deepEqual(missing.de.slice(0, 20), [], `${missing.de.length} engine texts without a German translation`);
});

test('dictionary entries keep their placeholders and have no conflicting duplicates', () => {
  const seen = new Map<string, string>();
  for (const [part, dict] of Object.entries(DICTIONARY_PARTS)) {
    for (const [key, entry] of Object.entries(dict)) {
      const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
      assert.equal(ph(entry.uk), ph(key), `uk placeholders differ for "${key}" (${part})`);
      assert.equal(ph(entry.de), ph(key), `de placeholders differ for "${key}" (${part})`);
      const prev = seen.get(key);
      if (prev) {
        const a = DICTIONARY_PARTS[prev][key];
        assert.ok(a.uk === entry.uk && a.de === entry.de, `"${key}" translated differently in ${prev} and ${part}`);
      }
      seen.set(key, part);
    }
  }
});

test('translators interpolate and fall back to English', () => {
  assert.equal(t('No such key {n}', { n: 3 }, 'uk'), 'No such key 3');
  assert.equal(tx('Some unknown engine text', 'de'), 'Some unknown engine text');
  assert.equal(tx('anything', 'en'), 'anything');
});
