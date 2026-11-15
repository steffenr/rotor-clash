import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PROJECT_IMAGES } from '../src/data/projectImages.ts';

const IMAGE_DIR = path.resolve(process.cwd(), 'src', 'assets', 'images');
const SRC_DIR = path.resolve(process.cwd(), 'src');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'assets' ? [] : sourceFiles(p);
    return /\.(ts|css|html)$/.test(e.name) && e.name !== 'projectImages.ts' ? [p] : [];
  });
}

test('every image outside real/ is documented, unchanged, and carries AI-generation credentials', () => {
  const files = fs.readdirSync(IMAGE_DIR).filter((f) => /\.(jpe?g|png)$/i.test(f));
  const listed = new Set(PROJECT_IMAGES.map((i) => i.file));
  for (const f of files) assert.ok(listed.has(f), `${f} has no entry in src/data/projectImages.ts`);
  for (const img of PROJECT_IMAGES) {
    const bytes = fs.readFileSync(path.join(IMAGE_DIR, img.file));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), img.sha256, `${img.file} changed`);
    // The embedded C2PA manifest is the evidence for the documented origin.
    const head = bytes.subarray(0, 120_000).toString('latin1');
    assert.ok(head.includes('c2pa') && head.includes('trainedAlgorithmicMedia'), `${img.file}: no AI-generation credentials`);
    assert.ok(head.includes('Google'), `${img.file}: expected a Google-signed manifest`);
  }
});

test('images marked as shipped are really used, and unused ones are not shipped by accident', () => {
  const code = sourceFiles(SRC_DIR).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  for (const img of PROJECT_IMAGES) {
    const used = code.includes(img.file);
    assert.equal(used, img.shipped, `${img.file}: shipped=${img.shipped} but referenced=${used}`);
  }
});
