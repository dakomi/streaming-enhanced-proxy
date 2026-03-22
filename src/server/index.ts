// Admin + API HTTP server (Fastify)
// Serves: admin dashboard, per-device settings UI, REST API

import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyRateLimit from '@fastify/rate-limit';
import fs from 'fs';
import path from 'path';
import { settingsRoutes } from './routes/settings.js';
import { scriptsRoutes } from './routes/scripts.js';
import { devicesRoutes } from './routes/devices.js';
import { updateRoutes } from './routes/update.js';
import { getCACertPath, caCertExists } from '../proxy/tls.js';

const ADMIN_PORT = parseInt(process.env.ADMIN_PORT ?? '3000', 10);
const ADMIN_DIR = path.resolve(__dirname, 'admin');

export async function startServer(): Promise<void> {
  const app = Fastify({ logger: false, trustProxy: true });

  // Global rate limiting — prevents DoS on LAN
  await app.register(fastifyRateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
  });

  // Register routes
  await app.register(settingsRoutes);
  await app.register(scriptsRoutes);
  await app.register(devicesRoutes);
  await app.register(updateRoutes);

  // Serve static admin dashboard files
  await app.register(fastifyStatic, {
    root: ADMIN_DIR,
    prefix: '/',
    decorateReply: false,
  });

  // CA cert download — rate limited tightly (file system access)
  app.get('/ca.crt', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (_request, reply) => {
    const certPath = getCACertPath();
    if (!caCertExists()) {
      return reply.status(404).send({
        error: 'CA cert not yet generated — start the proxy first to trigger generation',
      });
    }
    return reply
      .header('Content-Type', 'application/x-x509-ca-cert')
      .header('Content-Disposition', 'attachment; filename="streaming-enhanced-proxy-ca.crt"')
      .send(fs.createReadStream(certPath));
  });

  // Per-device settings page
  app.get('/settings', async (_request, reply) => {
    return reply.sendFile('settings.html');
  });

  // Health check
  app.get('/health', async (_request, reply) => {
    return reply.send({ ok: true, timestamp: new Date().toISOString() });
  });

  await app.listen({ port: ADMIN_PORT, host: '0.0.0.0' });
  console.log(`[Server] Admin dashboard listening on http://0.0.0.0:${ADMIN_PORT}`);
}
