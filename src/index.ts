// Main entry point for streaming-enhanced-proxy
// Starts both the admin/API server and the MITM proxy.

import { startServer } from './server/index.js';
import { startProxy } from './proxy/index.js';
import { startScheduler, initialCheck } from './updater/index.js';

async function main(): Promise<void> {
  console.log('=== Streaming Enhanced Proxy ===');

  // Start admin + API HTTP server
  await startServer();

  // Start the MITM proxy
  startProxy();

  // Run initial script update check (non-fatal)
  await initialCheck();

  // Schedule daily auto-updates
  startScheduler();

  console.log('[Main] All services started.');
}

main().catch((err) => {
  console.error('[Main] Fatal error:', err);
  process.exit(1);
});
