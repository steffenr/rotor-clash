import test from 'node:test';
import assert from 'node:assert/strict';
import { httpsUrlOrEmpty } from '../src/shared/externalUrl.ts';
import { getPhotoCredit } from '../src/shared/photoCredits.ts';
import { PHOTO_CREDITS } from '../src/data/photoCredits.ts';

test('external links: only absolute https URLs survive', () => {
  assert.equal(httpsUrlOrEmpty('https://commons.wikimedia.org/wiki/File:Example.jpg'), 'https://commons.wikimedia.org/wiki/File:Example.jpg');
  assert.equal(httpsUrlOrEmpty('  https://example.org/path?q=1  '), 'https://example.org/path?q=1');
  for (const bad of [
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'http://example.org',
    '//evil.example/path',
    '/relative/path',
    'file:///etc/passwd',
    '',
    '   ',
    42,
    null,
    undefined,
  ]) {
    assert.equal(httpsUrlOrEmpty(bad), '', `${String(bad)} must not become a link`);
  }
});

test('external links: every photo credit keeps https links and a sanitized copy is returned', () => {
  for (const [key, credit] of Object.entries(PHOTO_CREDITS)) {
    assert.equal(getPhotoCredit(key)?.licenseUrl, credit.licenseUrl, `${key}: licenseUrl passes through`);
    assert.equal(getPhotoCredit(key)?.sourceUrl, credit.sourceUrl, `${key}: sourceUrl passes through`);
  }
  assert.equal(getPhotoCredit('missing-key'), null);
});
