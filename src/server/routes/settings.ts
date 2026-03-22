import type { FastifyInstance } from 'fastify';
import { getSettings, saveSettings, touchDevice } from '../../settings/store.js';

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { deviceId: string } }>(
    '/api/settings/:deviceId',
    async (request, reply) => {
      const { deviceId } = request.params;
      const ip = (request.ip as string | undefined) ?? '';
      touchDevice(deviceId, ip);
      const settings = getSettings(deviceId);
      return reply.send(settings);
    }
  );

  // No body schema validation — we accept any JSON object and merge safely server-side
  app.post<{ Params: { deviceId: string } }>(
    '/api/settings/:deviceId',
    async (request, reply) => {
      const { deviceId } = request.params;
      const ip = (request.ip as string | undefined) ?? '';
      touchDevice(deviceId, ip);
      // Accept any JSON object and merge with stored settings
      const partial = (request.body as Record<string, unknown>) ?? {};
      saveSettings(deviceId, partial);
      const updated = getSettings(deviceId);
      return reply.send(updated);
    }
  );
}
