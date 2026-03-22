// POST /api/update-scripts — manually trigger upstream script update

import type { FastifyInstance } from 'fastify';
import { checkAndUpdate, getLastCheckTime } from '../../updater/index.js';
import { readVersion } from '../../updater/extractor.js';

export async function updateRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/update-scripts', async (_request, reply) => {
    try {
      const result = await checkAndUpdate();
      return reply.send({
        ok: true,
        updated: result.updated,
        version: result.version,
        lastCheck: getLastCheckTime(),
      });
    } catch (err) {
      return reply.status(500).send({
        ok: false,
        error: (err as Error).message,
      });
    }
  });

  app.get('/api/update-status', async (_request, reply) => {
    const version = readVersion();
    return reply.send({
      currentVersion: version?.version ?? null,
      updatedAt: version?.updatedAt ?? null,
      lastCheck: getLastCheckTime(),
    });
  });
}
