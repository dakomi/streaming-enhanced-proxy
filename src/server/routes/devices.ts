// GET  /api/devices — list all known devices
// PATCH /api/devices/:deviceId — update friendly name

import type { FastifyInstance } from 'fastify';
import { listDevices, renameDevice } from '../../settings/store.js';

export async function devicesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/devices', async (_request, reply) => {
    const devices = listDevices();
    return reply.send(devices);
  });

  app.patch<{
    Params: { deviceId: string };
    Body: { friendly_name?: string };
  }>(
    '/api/devices/:deviceId',
    {
      schema: {
        body: { type: 'object', properties: { friendly_name: { type: 'string' } } },
      },
    },
    async (request, reply) => {
      const { deviceId } = request.params;
      const { friendly_name } = request.body;
      if (friendly_name !== undefined) {
        renameDevice(deviceId, friendly_name);
      }
      return reply.send({ ok: true });
    }
  );
}
