// GET /api/scripts/:filename — serve cached compiled scripts

import type { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';

const SCRIPTS_DIR = path.resolve(process.env.SCRIPTS_DIR ?? 'scripts');

const ALLOWED_SCRIPTS = new Set([
  'netflix.js',
  'amazon.js',
  'disney.js',
  'crunchyroll.js',
  'max.js',
  'paramount.js',
]);

export async function scriptsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { filename: string } }>(
    '/api/scripts/:filename',
    {
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const { filename } = request.params;

      // Validate filename to prevent path traversal
      if (!ALLOWED_SCRIPTS.has(filename)) {
        return reply.status(404).send({ error: 'Script not found' });
      }

      const filePath = path.join(SCRIPTS_DIR, filename);
      if (!fs.existsSync(filePath)) {
        return reply.status(503).send({
          error: 'Script not yet available — trigger /api/update-scripts to download',
        });
      }

      const content = fs.readFileSync(filePath);
      return reply
        .header('Content-Type', 'application/javascript; charset=utf-8')
        .header('Cache-Control', 'public, max-age=3600')
        .send(content);
    }
  );
}
