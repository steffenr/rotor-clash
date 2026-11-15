import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { SERVER_TURBINE_DECK } from '../src/server/turbineRepository.ts';
import { PHOTO_CREDITS } from '../src/data/photoCredits.ts';
import { getPhotoCredit, isFreeLicense } from '../src/shared/photoCredits.ts';

const IMAGE_DIR = path.resolve(process.cwd(), 'src', 'assets', 'images', 'real');

test('free-licence check accepts CC0, public domain, CC BY and CC BY-SA, and rejects anything restrictive', () => {
  for (const ok of ['CC0 1.0', 'Public domain', 'CC BY 4.0', 'CC BY-SA 3.0', 'CC BY-SA 4.0', 'CC BY 2.0']) {
    assert.equal(isFreeLicense(ok), true, ok);
  }
  for (const bad of ['CC BY-NC 4.0', 'CC BY-ND 2.0', 'CC BY-NC-SA 3.0', 'All rights reserved', 'Fair use', '']) {
    assert.equal(isFreeLicense(bad), false, bad);
  }
});

test('every card with a real photo has a complete credit for a freely licensed Wikimedia Commons image', () => {
  const keys = new Set(SERVER_TURBINE_DECK.filter((c) => c.isRealPhoto).map((c) => c.photoKey));
  assert.ok(keys.size > 0);
  for (const key of keys) {
    const credit = getPhotoCredit(key);
    assert.ok(credit, `missing photo credit for "${key}"`);
    assert.ok(credit.author.trim().length > 0, `${key}: author`);
    assert.ok(credit.title.trim().length > 0, `${key}: title`);
    assert.ok(isFreeLicense(credit.license), `${key}: licence "${credit.license}" is not a free licence`);
    assert.ok(credit.licenseUrl.startsWith('https://'), `${key}: licenseUrl`);
    assert.ok(
      credit.sourceUrl.startsWith('https://commons.wikimedia.org/wiki/File:'),
      `${key}: sourceUrl must be the Commons file page`
    );
    assert.ok(fs.existsSync(path.join(IMAGE_DIR, credit.file)), `${key}: image file ${credit.file} is missing`);
  }
});

test('no image file ships without a licence record, and every credit points at an existing file', () => {
  const files = fs.readdirSync(IMAGE_DIR).filter((f) => /\.(jpe?g|png)$/i.test(f));
  const credited = new Set(Object.values(PHOTO_CREDITS).map((c) => c.file));
  for (const file of files) assert.ok(credited.has(file), `${file} has no entry in photoCredits.ts`);
  for (const [key, credit] of Object.entries(PHOTO_CREDITS)) {
    assert.equal(credit.file.replace(/\.(jpe?g|png)$/i, ''), key, `${key}: file name must match the photo key`);
  }
});

test('cards without a credit use concept art, never a claimed real photo', () => {
  for (const card of SERVER_TURBINE_DECK) {
    if (!card.isRealPhoto) assert.equal(getPhotoCredit(card.photoKey), null, `${card.id} is concept art`);
  }
});

test('each image file is exactly the one its credit describes (SHA-256 match)', () => {
  for (const [key, credit] of Object.entries(PHOTO_CREDITS)) {
    const bytes = fs.readFileSync(path.join(IMAGE_DIR, credit.file));
    const hash = crypto.createHash('sha256').update(bytes).digest('hex');
    assert.equal(hash, credit.sha256, `${key}: ${credit.file} does not match the file the credit was written for`);
  }
});
