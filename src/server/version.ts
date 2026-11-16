import fs from 'node:fs';
import path from 'node:path';

/**
 * The app version, read from the package.json next to the running app. The release workflow bumps it
 * before building, so the client bundle (see `__APP_VERSION__` in vite.config.ts) and the server that
 * is deployed with it always agree; a client that reports an older version needs a reload.
 */
export function readAppVersion(dir: string = process.cwd()): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8')) as { version?: unknown };
    return typeof pkg.version === 'string' && pkg.version ? pkg.version : 'unknown';
  } catch {
    return 'unknown';
  }
}
