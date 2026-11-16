import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { EN_UI } from '../src/data/locales/en/ui.ts';
import { DE_UI } from '../src/data/locales/de/ui.ts';

type Leaf = { path: string; value: string };

function leaves(obj: unknown, prefix = ''): Leaf[] {
  if (typeof obj === 'string') return [{ path: prefix, value: obj }];
  if (Array.isArray(obj)) return obj.flatMap((v, i) => leaves(v, `${prefix}[${i}]`));
  if (obj && typeof obj === 'object') {
    return Object.entries(obj).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
  }
  return [];
}

/** `## id` sections with `- key: value` lines, as used by the locale markdown files. */
function parseMd(file: string): Leaf[] {
  const out: Leaf[] = [];
  let section = '';
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const h = line.match(/^## (.+)$/);
    if (h) {
      section = h[1].trim();
      continue;
    }
    const kv = line.match(/^- (\w+): ?(.*)$/);
    if (kv && section) out.push({ path: `${path.basename(file)} ${section}.${kv[1]}`, value: kv[2] });
  }
  return out;
}

const LOCALES = path.resolve(import.meta.dirname, '../src/data/locales');
const ALL: Leaf[] = [
  ...leaves(EN_UI).map((l) => ({ ...l, path: `en/ui ${l.path}` })),
  ...leaves(DE_UI).map((l) => ({ ...l, path: `de/ui ${l.path}` })),
  ...['en', 'de'].flatMap((lang) =>
    ['turbines.md', 'groups.md'].flatMap((f) =>
      parseMd(path.join(LOCALES, lang, f)).map((l) => ({ ...l, path: `${lang}/${l.path}` }))
    )
  ),
];

function problems(s: string): string[] {
  const found: string[] = [];
  if (s.trim() === '') found.push('empty');
  if (/\(\s*\)|\[\s*\]|\{\s*\}/.test(s)) found.push('empty brackets');
  if (/^\s|\s$/.test(s)) found.push('leading/trailing space');
  if (/\S {2,}\S/.test(s)) found.push('double space');
  if (/\bundefined\b|\bnull\b|\bNaN\b|\[object|\$\{|\{\{|%s|\bTODO\b|\bFIXME\b/i.test(s)) found.push('placeholder text');
  if ((s.match(/\(/g) ?? []).length !== (s.match(/\)/g) ?? []).length) found.push('unbalanced parentheses');
  if (/ [,.;:!?](\s|$)/.test(s)) found.push('space before punctuation');
  // exactly two dots is a typo; three (an ellipsis) is intended
  if (/,,|(?<!\.)\.\.(?!\.)|!!|\?\?|,\./.test(s)) found.push('doubled punctuation');
  return found;
}

test('texts: no empty brackets, stray spaces or placeholder garbage in any UI, card or group string', () => {
  const bad = ALL.flatMap((l) => problems(l.value).map((p) => `${l.path}: ${p} → ${JSON.stringify(l.value.slice(0, 80))}`));
  assert.deepEqual(bad, []);
});

test('texts: {placeholders} are the same in English and German', () => {
  const tokens = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
  const de = new Map(leaves(DE_UI).map((l) => [l.path, l.value]));
  const mismatched = leaves(EN_UI)
    .filter((l) => tokens(l.value) !== tokens(de.get(l.path) ?? ''))
    .map((l) => l.path);
  assert.deepEqual(mismatched, []);
});

test('texts: every {placeholder} in the UI strings is one the app fills in', () => {
  const known = new Set(['{rounds}']);
  const unknown = ALL.flatMap((l) => (l.value.match(/\{\w+\}/g) ?? []).filter((t) => !known.has(t)).map((t) => `${l.path}: ${t}`));
  assert.deepEqual(unknown, []);
});
