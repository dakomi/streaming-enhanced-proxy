/**
 * Integration tests for the Fastify HTTP API.
 * Uses Fastify's built-in inject() so no real TCP port is bound.
 * DATA_DIR / SCRIPTS_DIR are isolated temp dirs (set in tests/setup.ts).
 */
import fs from 'fs';
import path from 'path';
import { buildApp } from '../../src/server/index';
import { defaultSettings } from '../../src/settings/defaults';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

// ── /health ──────────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns 200 with ok:true', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ ok: boolean; timestamp: string }>();
    expect(body.ok).toBe(true);
    expect(typeof body.timestamp).toBe('string');
  });
});

// ── /api/settings/:deviceId ──────────────────────────────────────────────────

describe('GET /api/settings/:deviceId', () => {
  it('returns 200 with default settings for a new device', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/settings/new-device-get-test',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('Netflix');
    expect(body).toHaveProperty('Amazon');
    expect(body.Netflix.skipIntro).toBe(defaultSettings.Netflix.skipIntro);
  });
});

describe('POST /api/settings/:deviceId', () => {
  it('returns 200 and updates settings', async () => {
    const deviceId = 'server-test-post-device';
    const payload = { Netflix: { ...defaultSettings.Netflix, skipIntro: false } };

    const res = await app.inject({
      method: 'POST',
      url: `/api/settings/${deviceId}`,
      headers: { 'content-type': 'application/json' },
      payload,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.Netflix.skipIntro).toBe(false);
  });

  it('persists settings so a subsequent GET returns them', async () => {
    const deviceId = 'server-test-persist-device';
    const payload = { Amazon: { ...defaultSettings.Amazon, skipAd: false } };

    await app.inject({
      method: 'POST',
      url: `/api/settings/${deviceId}`,
      headers: { 'content-type': 'application/json' },
      payload,
    });

    const getRes = await app.inject({ method: 'GET', url: `/api/settings/${deviceId}` });
    expect(getRes.statusCode).toBe(200);
    const body = getRes.json();
    expect(body.Amazon.skipAd).toBe(false);
  });

  it('does not clobber unrelated service settings', async () => {
    const deviceId = 'server-test-no-clobber';
    await app.inject({
      method: 'POST',
      url: `/api/settings/${deviceId}`,
      headers: { 'content-type': 'application/json' },
      payload: { HBO: { ...defaultSettings.HBO, skipIntro: false } },
    });

    const getRes = await app.inject({ method: 'GET', url: `/api/settings/${deviceId}` });
    const body = getRes.json();
    expect(body.HBO.skipIntro).toBe(false);
    // Other services remain at defaults
    expect(body.Netflix).toEqual(defaultSettings.Netflix);
  });
});

// ── /api/devices ─────────────────────────────────────────────────────────────

describe('GET /api/devices', () => {
  it('returns 200 with an array', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/devices' });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it('includes devices that were created via /api/settings', async () => {
    const deviceId = 'server-test-list-device';
    await app.inject({ method: 'GET', url: `/api/settings/${deviceId}` });

    const res = await app.inject({ method: 'GET', url: '/api/devices' });
    const devices = res.json<Array<{ id: string }>>() ;
    expect(devices.some((d) => d.id === deviceId)).toBe(true);
  });
});

describe('PATCH /api/devices/:deviceId', () => {
  it('returns 200 and updates the friendly name', async () => {
    const deviceId = 'server-test-rename-device';
    // Create the device
    await app.inject({ method: 'GET', url: `/api/settings/${deviceId}` });

    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/devices/${deviceId}`,
      headers: { 'content-type': 'application/json' },
      payload: { friendly_name: 'Bedroom TV' },
    });
    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.json().ok).toBe(true);

    // Verify the name was persisted
    const listRes = await app.inject({ method: 'GET', url: '/api/devices' });
    const devices = listRes.json<Array<{ id: string; friendly_name: string }>>();
    const device = devices.find((d) => d.id === deviceId);
    expect(device?.friendly_name).toBe('Bedroom TV');
  });
});

// ── /api/scripts/:filename ────────────────────────────────────────────────────

describe('GET /api/scripts/:filename', () => {
  it('returns 404 for an unknown/disallowed script name', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/scripts/evil.js' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toMatch(/not found/i);
  });

  it('returns 503 when a valid script has not been downloaded yet', async () => {
    // SCRIPTS_DIR is an empty temp dir (set by setup.ts) — no scripts present
    const res = await app.inject({ method: 'GET', url: '/api/scripts/netflix.js' });
    expect(res.statusCode).toBe(503);
    expect(res.json().error).toMatch(/update-scripts/i);
  });

  it('returns 200 with JS content-type when script file exists', async () => {
    const scriptsDir = process.env.SCRIPTS_DIR!;
    fs.mkdirSync(scriptsDir, { recursive: true });
    const scriptPath = path.join(scriptsDir, 'amazon.js');
    fs.writeFileSync(scriptPath, '/* test script */');

    const res = await app.inject({ method: 'GET', url: '/api/scripts/amazon.js' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/javascript');

    fs.unlinkSync(scriptPath);
  });

  it('returns 404 for path-traversal attempts', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/scripts/../package.json' });
    // Either 404 (not in allowlist) or 400 (bad request) — never 200
    expect(res.statusCode).not.toBe(200);
  });
});

// ── /api/update-status ────────────────────────────────────────────────────────

describe('GET /api/update-status', () => {
  it('returns 200 with version info shape', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/update-status' });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ currentVersion: string | null; updatedAt: string | null; lastCheck: string | null }>();
    expect('currentVersion' in body).toBe(true);
    expect('updatedAt' in body).toBe(true);
    expect('lastCheck' in body).toBe(true);
  });
});

// ── /ca.crt ───────────────────────────────────────────────────────────────────

describe('GET /ca.crt', () => {
  it('returns 404 when no CA cert has been generated', async () => {
    // The certs directory is empty in the test environment
    const res = await app.inject({ method: 'GET', url: '/ca.crt' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toMatch(/CA cert/i);
  });
});

// ── /settings page ────────────────────────────────────────────────────────────

describe('GET /settings', () => {
  it('returns 200 with HTML content', async () => {
    const res = await app.inject({ method: 'GET', url: '/settings' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
  });
});

// ── rate limit headers ────────────────────────────────────────────────────────

describe('Rate limiting', () => {
  it('includes x-ratelimit headers in responses', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.headers).toHaveProperty('x-ratelimit-limit');
    expect(res.headers).toHaveProperty('x-ratelimit-remaining');
  });
});
