/**
 * Application startup entry point for Phusion Passenger on Plesk / cPanel hosting.
 * Delegates to the bundled CommonJS production server in dist-server/server.cjs.
 */
require('./dist-server/server.cjs');
