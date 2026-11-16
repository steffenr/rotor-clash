import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {buildMetaCsp} from './src/server/security.ts';

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
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
