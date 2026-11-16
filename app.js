/**
 * Application startup entry point for process managers that start a Node.js file (e.g. Phusion Passenger).
 * Delegates to the bundled CommonJS production server in dist-server/server.cjs.
 *
 * package.json has "type": "module", so this file is ESM: `require` is not available.
 * Importing the .cjs bundle works from ESM and keeps the entry compatible with such process managers.
 */
import './dist-server/server.cjs';
