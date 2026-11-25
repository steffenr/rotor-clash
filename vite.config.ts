import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {buildMetaCsp} from './src/server/security.ts';
import {readAppVersion} from './src/server/version.ts';

/** Puts the Content-Security-Policy into the built index.html (production build only, not the dev server). */
function cspMeta(): Plugin {
  return {
    name: 'rotor-clash-csp-meta',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: {'http-equiv': 'Content-Security-Policy', content: buildMetaCsp()},
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [tailwindcss(), cspMeta()],
    // Lets the running client compare its own version with the server's (update banner / reload).
    define: {
      __APP_VERSION__: JSON.stringify(readAppVersion()),
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // The runtime datastore (data/leaderboard.json) and the package files sit next to the sources
      // but are never part of the app; the dev server must not hand them out either. The defaults
      // from Vite are repeated here because `deny` replaces them. `src/data/**` stays readable: the
      // deck markdown is imported with ?raw and must keep working.
      fs: {
        deny: [
          '.env',
          '.env.*',
          '*.{crt,pem,key,p12,pfx,cer,der}',
          '.npmrc',
          '.yarnrc.yml',
          '**/.git/**',
          '**/.github/**',
          '**/data/leaderboard.json',
          '**/data/leaderboard.json.tmp',
          '**/package.json',
          '**/package-lock.json',
        ],
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
