/**
 * Integration tests for the settings SQLite store.
 * DATA_DIR is set to a temp directory by tests/setup.ts before any
 * module is imported, so the in-process SQLite singleton uses an
 * isolated database that does not interfere with runtime data.
 */
import {
  touchDevice,
  getSettings,
  saveSettings,
  listDevices,
  renameDevice,
} from '../../src/settings/store';
import { defaultSettings } from '../../src/settings/defaults';

const DEVICE_A = 'test-device-aaa';
const DEVICE_B = 'test-device-bbb';

describe('Settings store', () => {
  // ── touchDevice ─────────────────────────────────────────────────────────
  describe('touchDevice', () => {
    it('creates a new device row on first call', () => {
      touchDevice(DEVICE_A, '192.168.1.10');
      const devices = listDevices();
      const found = devices.find((d) => d.id === DEVICE_A);
      expect(found).toBeDefined();
      expect(found!.last_seen_ip).toBe('192.168.1.10');
    });

    it('updates last_seen_ip on subsequent calls', () => {
      touchDevice(DEVICE_A, '10.0.0.5');
      const devices = listDevices();
      const found = devices.find((d) => d.id === DEVICE_A);
      expect(found!.last_seen_ip).toBe('10.0.0.5');
    });

    it('does not reset settings when touching an existing device', () => {
      // Give device A some custom settings first
      saveSettings(DEVICE_A, { Netflix: { ...defaultSettings.Netflix, skipIntro: false } });
      touchDevice(DEVICE_A, '10.0.0.6');
      const settings = getSettings(DEVICE_A);
      expect(settings.Netflix.skipIntro).toBe(false);
    });
  });

  // ── getSettings ─────────────────────────────────────────────────────────
  describe('getSettings', () => {
    it('returns defaultSettings for an unknown deviceId', () => {
      const settings = getSettings('nonexistent-device-xyz');
      expect(settings).toEqual(defaultSettings);
    });

    it('returns a complete SettingsType with all categories', () => {
      touchDevice(DEVICE_B, '127.0.0.1');
      const settings = getSettings(DEVICE_B);
      expect(settings).toHaveProperty('Amazon');
      expect(settings).toHaveProperty('Netflix');
      expect(settings).toHaveProperty('Disney');
      expect(settings).toHaveProperty('Crunchyroll');
      expect(settings).toHaveProperty('HBO');
      expect(settings).toHaveProperty('Paramount');
      expect(settings).toHaveProperty('Video');
      expect(settings).toHaveProperty('General');
    });
  });

  // ── saveSettings ─────────────────────────────────────────────────────────
  describe('saveSettings', () => {
    it('persists a partial update to a single service', () => {
      touchDevice(DEVICE_B, '127.0.0.1');
      saveSettings(DEVICE_B, { Netflix: { ...defaultSettings.Netflix, skipIntro: false } });
      const settings = getSettings(DEVICE_B);
      expect(settings.Netflix.skipIntro).toBe(false);
    });

    it('does not overwrite other services when updating one', () => {
      touchDevice(DEVICE_B, '127.0.0.1');
      saveSettings(DEVICE_B, { Disney: { ...defaultSettings.Disney, skipAd: false } });
      const settings = getSettings(DEVICE_B);
      // Disney was updated
      expect(settings.Disney.skipAd).toBe(false);
      // Amazon should still have defaults
      expect(settings.Amazon).toEqual(defaultSettings.Amazon);
    });

    it('merges missing fields from defaults when a partial settings object is stored', () => {
      touchDevice(DEVICE_B, '127.0.0.1');
      // Simulate a partial settings object that only has some fields
      saveSettings(DEVICE_B, {
        Amazon: { skipIntro: false } as Record<string, unknown>,
      });
      const settings = getSettings(DEVICE_B);
      // The saved field is applied
      expect(settings.Amazon.skipIntro).toBe(false);
      // Missing fields fall back to defaults
      expect(settings.Amazon.skipCredits).toBe(defaultSettings.Amazon.skipCredits);
    });

    it('survives unknown top-level keys without throwing', () => {
      touchDevice(DEVICE_B, '127.0.0.1');
      expect(() =>
        saveSettings(DEVICE_B, { UnknownService: { foo: true } } as Record<string, unknown>)
      ).not.toThrow();
    });

    it('returns updated settings via getSettings immediately after save', () => {
      touchDevice(DEVICE_B, '127.0.0.1');
      saveSettings(DEVICE_B, { Video: { ...defaultSettings.Video, epilepsy: true } });
      const settings = getSettings(DEVICE_B);
      expect(settings.Video.epilepsy).toBe(true);
    });
  });

  // ── listDevices ──────────────────────────────────────────────────────────
  describe('listDevices', () => {
    it('returns an array', () => {
      expect(Array.isArray(listDevices())).toBe(true);
    });

    it('includes previously created devices', () => {
      const devices = listDevices();
      const ids = devices.map((d) => d.id);
      expect(ids).toContain(DEVICE_A);
      expect(ids).toContain(DEVICE_B);
    });

    it('each device has required fields', () => {
      const devices = listDevices();
      for (const device of devices) {
        expect(typeof device.id).toBe('string');
        expect(typeof device.friendly_name).toBe('string');
        expect(typeof device.last_seen_ip).toBe('string');
        expect(typeof device.last_seen_at).toBe('string');
        expect(typeof device.settings).toBe('object');
      }
    });
  });

  // ── renameDevice ─────────────────────────────────────────────────────────
  describe('renameDevice', () => {
    it('updates the friendly_name of an existing device', () => {
      touchDevice(DEVICE_A, '127.0.0.1');
      renameDevice(DEVICE_A, 'Living Room TV');
      const devices = listDevices();
      const found = devices.find((d) => d.id === DEVICE_A);
      expect(found!.friendly_name).toBe('Living Room TV');
    });

    it('does not throw for a non-existent device', () => {
      expect(() => renameDevice('no-such-device', 'name')).not.toThrow();
    });
  });
});
