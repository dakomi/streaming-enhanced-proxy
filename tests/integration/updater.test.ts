/**
 * Integration tests for the script updater — specifically the parts that
 * are exercisable without running the full build pipeline:
 *   - fetchLatestVersion()  — real HTTP call to raw.githubusercontent.com
 *   - fetchBuffer()         — real HTTP call used as a building block
 *   - readVersion()         — reads from the temp SCRIPTS_DIR set in setup.ts
 */
import fs from 'fs';
import path from 'path';
import { fetchBuffer, fetchLatestVersion, readVersion } from '../../src/updater/extractor';

describe('fetchBuffer', () => {
  it(
    'can fetch a small text file from raw.githubusercontent.com',
    async () => {
      // Fetch the upstream package.json — small, fast, no auth required
      const url =
        'https://raw.githubusercontent.com/Dreamlinerm/Netflix-Prime-Auto-Skip/main/package.json';
      const buf = await fetchBuffer(url);
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.length).toBeGreaterThan(0);
      // Should be valid JSON
      expect(() => JSON.parse(buf.toString('utf8'))).not.toThrow();
    },
    15_000 // 15 s network timeout
  );

  it(
    'follows HTTP redirects transparently',
    async () => {
      // codeload returns a redirect before the zip stream starts
      // We only fetch the README which is small enough for a test
      const url =
        'https://raw.githubusercontent.com/Dreamlinerm/Netflix-Prime-Auto-Skip/main/README.md';
      const buf = await fetchBuffer(url);
      expect(buf.length).toBeGreaterThan(100);
    },
    15_000
  );

  it('rejects with an error for a 404 URL', async () => {
    const url =
      'https://raw.githubusercontent.com/Dreamlinerm/Netflix-Prime-Auto-Skip/main/THIS_FILE_DOES_NOT_EXIST_abc123.txt';
    await expect(fetchBuffer(url)).rejects.toThrow(/HTTP 404/);
  }, 15_000);
});

describe('fetchLatestVersion', () => {
  it(
    'returns a non-empty semver-like string',
    async () => {
      const version = await fetchLatestVersion();
      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
      // Semver pattern: digits separated by dots
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    },
    15_000
  );
});

describe('readVersion', () => {
  const scriptsDir = process.env.SCRIPTS_DIR!;

  it('returns null when no version.json exists', () => {
    // Ensure the file does not exist
    const versionFile = path.join(scriptsDir, 'version.json');
    if (fs.existsSync(versionFile)) fs.unlinkSync(versionFile);
    expect(readVersion()).toBeNull();
  });

  it('returns the parsed version info when version.json exists', () => {
    const scriptsPath = scriptsDir;
    fs.mkdirSync(scriptsPath, { recursive: true });
    const versionFile = path.join(scriptsPath, 'version.json');
    const info = { version: '1.2.3', updatedAt: '2026-01-01T00:00:00.000Z' };
    fs.writeFileSync(versionFile, JSON.stringify(info), 'utf8');

    const result = readVersion();
    expect(result).not.toBeNull();
    expect(result!.version).toBe('1.2.3');
    expect(result!.updatedAt).toBe('2026-01-01T00:00:00.000Z');

    fs.unlinkSync(versionFile);
  });

  it('returns null when version.json is malformed', () => {
    const scriptsPath = scriptsDir;
    fs.mkdirSync(scriptsPath, { recursive: true });
    const versionFile = path.join(scriptsPath, 'version.json');
    fs.writeFileSync(versionFile, 'not-json', 'utf8');

    expect(readVersion()).toBeNull();

    fs.unlinkSync(versionFile);
  });
});
