/**
 * Application startup entry point for Phusion Passenger on hosting panel / hosting panel hosting.
 * Delegates to the bundled CommonJS production server in dist-server/server.cjs.
 *
 * package.json has "type": "module", so this file is ESM: `require` is not available.
 * Importing the .cjs bundle works from ESM and keeps the entry compatible with Passenger.
 */
import './dist-server/server.cjs';
