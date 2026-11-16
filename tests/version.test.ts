import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readAppVersion } from '../src/server/version.ts';

function dirWith(packageJson?: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rotor-clash-version-'));
  if (packageJson !== undefined) fs.writeFileSync(path.join(dir, 'package.json'), packageJson);
  return dir;
}

test('app version: read from package.json, "unknown" when it is missing or broken', () => {
  assert.equal(readAppVersion(dirWith('{"name":"x","version":"1.2.3"}')), '1.2.3');
  assert.equal(readAppVersion(dirWith()), 'unknown', 'no package.json');
  assert.equal(readAppVersion(dirWith('not json')), 'unknown', 'invalid JSON');
  assert.equal(readAppVersion(dirWith('{"version":42}')), 'unknown', 'version is not a string');
});

test('app version: the repository package.json has a semver version the client can compare against', () => {
  assert.match(readAppVersion(), /^\d+\.\d+\.\d+$/);
});
