import { createStore } from 'zustand/vanilla';
import { DICTIONARY } from './dict';

/**
 * Minimal i18n: English source strings are the keys; each dictionary entry carries its
 * Ukrainian and German text. Keys may contain `{name}` placeholders:
 *   - `t(key, params)` interpolates params into the translated template (UI code).
 *   - `tx(text)` translates an already-built English string from the engine by matching it
 *     against the templates, translating the captured pieces recursively (so "Post front 2"
 *     matches "Post {side} {n}"), and falling back to sentence-by-sentence translation.
 * Anything without an entry stays English.
 */
export type Lang = 'en' | 'uk' | 'de';
export type Entry = { uk: string; de: string };
export type Dict = Record<string, Entry>;
export type Params = Record<string, string | number>;

export const LANGS: { id: Lang; short: string; name: string }[] = [
  { id: 'en', short: 'EN', name: 'English' },
  { id: 'uk', short: 'UA', name: 'Українська' },
  { id: 'de', short: 'DE', name: 'Deutsch' },
];

const STORAGE_KEY = 'timber-lang';

function initialLang(): Lang {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'uk' || stored === 'de') return stored;
    const nav = globalThis.navigator?.language?.slice(0, 2);
    if (nav === 'uk' || nav === 'de') return nav;
  } catch {
    // storage unavailable (private mode, node tests)
  }
  return 'en';
}

export const langStore = createStore<{ lang: Lang }>(() => ({ lang: initialLang() }));

export const getLang = (): Lang => langStore.getState().lang;

export function setLang(lang: Lang): void {
  langStore.setState({ lang });
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}

const interpolate = (s: string, params?: Params): string =>
  params ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : s;

/** Translate a UI string (English source text, optionally a `{placeholder}` template). */
export function t(key: string, params?: Params, lang: Lang = getLang()): string {
  const entry = lang === 'en' ? undefined : DICTIONARY[key];
  return interpolate(entry ? entry[lang as 'uk' | 'de'] : key, params);
}

// ---------------------------------------------------------------------------------------------
// Dynamic (engine) strings

interface Template {
  re: RegExp;
  /** Same pattern with greedy captures: tried too, the better-scoring split wins */
  greedy: RegExp;
  names: string[];
  entry: Entry;
  literal: number;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const TEMPLATES: Template[] = Object.entries(DICTIONARY)
  .filter(([key]) => /\{\w+\}/.test(key))
  .map(([key, entry]) => {
    const names: string[] = [];
    const parts = key.split(/\{(\w+)\}/);
    let src = '';
    parts.forEach((p, i) => {
      if (i % 2 === 0) src += escapeRe(p);
      else {
        names.push(p);
        src += '(.+?)';
      }
    });
    return { re: new RegExp(`^${src}$`), greedy: new RegExp(`^${src.replaceAll('(.+?)', '(.+)')}$`), names, entry, literal: parts.filter((_, i) => i % 2 === 0).join('').length };
  })
  // most specific (most literal text) first
  .sort((a, b) => b.literal - a.literal);

const caches: Record<'uk' | 'de', Map<string, string>> = { uk: new Map(), de: new Map() };

/** English words of the source still left in a candidate translation (lower is better). */
function leftover(source: string, out: string): number {
  const src = new Set(source.match(/[A-Za-z]{3,}/g) ?? []);
  return (out.match(/[A-Za-z]{3,}/g) ?? []).filter((w) => src.has(w)).length;
}

function translateDynamic(text: string, lang: 'uk' | 'de', depth: number): string | undefined {
  const exact = DICTIONARY[text];
  if (exact) return exact[lang];
  if (depth > 4 || !/[A-Za-z]/.test(text)) return undefined;
  const candidates: string[] = [];
  for (const tpl of TEMPLATES) {
    const lazy = tpl.re.exec(text);
    if (!lazy) continue;
    // A capture split is good when each piece is a number/symbol or itself translatable
    let best: { params: Params; score: number } | undefined;
    for (const m of [lazy, tpl.greedy.exec(text)]) {
      if (!m) continue;
      const params: Params = {};
      let score = 0;
      tpl.names.forEach((name, i) => {
        const v = m[i + 1];
        const tr = translateDynamic(v, lang, depth + 1);
        if (tr !== undefined || !/[A-Za-z]{3,}/.test(v)) score++;
        params[name] = tr ?? v;
      });
      if (!best || score > best.score) best = { params, score };
    }
    const out = interpolate(tpl.entry[lang], best!.params);
    if (best!.score === tpl.names.length) return out;
    candidates.push(out);
    if (candidates.length >= 3) break;
  }
  // Longer engine texts are built from sentences / clauses: translate them piecewise.
  for (const sep of [/(?<=\.)\s+(?=[A-Z])/, /;\s+/, /\s+·\s+/]) {
    const pieces = text.split(sep);
    if (pieces.length < 2) continue;
    const joiner = text.match(sep)?.[0] ?? ' ';
    const out = pieces.map((p) => translateDynamic(p, lang, depth + 1));
    if (out.some((o) => o !== undefined)) {
      candidates.push(out.map((o, i) => o ?? pieces[i]).join(joiner));
      break;
    }
  }
  // Trailing punctuation / parenthesised suffixes
  const trail = /^(.*?)([.:!]|\s*\([^()]*\))$/.exec(text);
  if (trail && trail[1]) {
    const head = translateDynamic(trail[1], lang, depth + 1);
    if (head !== undefined) {
      const inner = trail[2].trim().slice(1, -1);
      candidates.push(head + (trail[2].trim().startsWith('(') ? ` (${translateDynamic(inner, lang, depth + 1) ?? inner})` : trail[2]));
    }
  }
  if (!candidates.length) return undefined;
  return candidates.reduce((a, b) => (leftover(text, b) < leftover(text, a) ? b : a));
}

/** Translate an English string produced by the engine (names, notes, statics details, warnings…). */
export function tx(text: string, lang: Lang = getLang()): string {
  if (lang === 'en' || !text) return text;
  const cache = caches[lang];
  let out = cache.get(text);
  if (out === undefined) {
    out = translateDynamic(text, lang, 0) ?? text;
    cache.set(text, out);
  }
  return out;
}

/** True when `tx` finds a translation (used by the coverage test). */
export function hasTranslation(text: string, lang: 'uk' | 'de'): boolean {
  return translateDynamic(text, lang, 0) !== undefined;
}
