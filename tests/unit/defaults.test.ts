import { defaultSettings } from '../../src/settings/defaults';
import type { SettingsType } from '../../src/types/settings';

describe('defaultSettings', () => {
  it('has all eight top-level service categories', () => {
    const keys: Array<keyof SettingsType> = [
      'Amazon', 'Netflix', 'Disney', 'Crunchyroll', 'HBO', 'Paramount', 'Video', 'General',
    ];
    for (const key of keys) {
      expect(defaultSettings).toHaveProperty(key);
    }
  });

  // ── Amazon ─────────────────────────────────────────────────────────────────
  describe('Amazon', () => {
    it('has skipIntro enabled by default', () => expect(defaultSettings.Amazon.skipIntro).toBe(true));
    it('has skipCredits enabled by default', () => expect(defaultSettings.Amazon.skipCredits).toBe(true));
    it('has skipAd enabled by default', () => expect(defaultSettings.Amazon.skipAd).toBe(true));
    it('has watchCredits disabled by default', () => expect(defaultSettings.Amazon.watchCredits).toBe(false));
    it('has all required boolean fields', () => {
      const boolFields = ['skipIntro', 'skipCredits', 'watchCredits', 'selfAd', 'skipAd',
        'speedSlider', 'filterPaid', 'continuePosition', 'showRating', 'xray', 'improveUI'];
      for (const field of boolFields) {
        expect(typeof (defaultSettings.Amazon as unknown as Record<string, unknown>)[field]).toBe('boolean');
      }
    });
  });

  // ── Netflix ────────────────────────────────────────────────────────────────
  describe('Netflix', () => {
    it('has skipIntro enabled by default', () => expect(defaultSettings.Netflix.skipIntro).toBe(true));
    it('has skipRecap enabled by default', () => expect(defaultSettings.Netflix.skipRecap).toBe(true));
    it('has skipCredits enabled by default', () => expect(defaultSettings.Netflix.skipCredits).toBe(true));
    it('has showRating enabled by default', () => expect(defaultSettings.Netflix.showRating).toBe(true));
    it('has all required boolean fields', () => {
      const boolFields = ['skipIntro', 'skipRecap', 'skipCredits', 'watchCredits', 'skipBlocked',
        'skipAd', 'speedSlider', 'profile', 'showRating', 'removeGames', 'hideTitles'];
      for (const field of boolFields) {
        expect(typeof (defaultSettings.Netflix as unknown as Record<string, unknown>)[field]).toBe('boolean');
      }
    });
  });

  // ── Disney ─────────────────────────────────────────────────────────────────
  describe('Disney', () => {
    it('has skipIntro enabled by default', () => expect(defaultSettings.Disney.skipIntro).toBe(true));
    it('has skipAd enabled by default', () => expect(defaultSettings.Disney.skipAd).toBe(true));
    it('has all required fields', () => {
      const boolFields = ['skipIntro', 'skipCredits', 'watchCredits', 'skipAd', 'speedSlider',
        'showRating', 'selfAd', 'hideTitles'];
      for (const field of boolFields) {
        expect(typeof (defaultSettings.Disney as unknown as Record<string, unknown>)[field]).toBe('boolean');
      }
    });
  });

  // ── Crunchyroll ────────────────────────────────────────────────────────────
  describe('Crunchyroll', () => {
    it('has skipIntro enabled by default', () => expect(defaultSettings.Crunchyroll.skipIntro).toBe(true));
    it('has dubLanguage as a string', () => {
      expect(typeof defaultSettings.Crunchyroll.dubLanguage).toBe('string');
    });
    it('has a non-empty dubLanguage default', () => {
      expect(defaultSettings.Crunchyroll.dubLanguage.length).toBeGreaterThan(0);
    });
  });

  // ── HBO ────────────────────────────────────────────────────────────────────
  describe('HBO', () => {
    it('has skipIntro enabled by default', () => expect(defaultSettings.HBO.skipIntro).toBe(true));
    it('has speedSlider enabled by default', () => expect(defaultSettings.HBO.speedSlider).toBe(true));
    it('has showRating enabled by default', () => expect(defaultSettings.HBO.showRating).toBe(true));
  });

  // ── Paramount ──────────────────────────────────────────────────────────────
  describe('Paramount', () => {
    it('has skipIntro enabled by default', () => expect(defaultSettings.Paramount.skipIntro).toBe(true));
    it('has skipAd enabled by default', () => expect(defaultSettings.Paramount.skipAd).toBe(true));
  });

  // ── Video ──────────────────────────────────────────────────────────────────
  describe('Video', () => {
    it('has playOnFullScreen disabled by default', () => expect(defaultSettings.Video.playOnFullScreen).toBe(false));
    it('has doubleClick enabled by default', () => expect(defaultSettings.Video.doubleClick).toBe(true));
    it('has scrollVolume enabled by default', () => expect(defaultSettings.Video.scrollVolume).toBe(true));
  });

  // ── General ────────────────────────────────────────────────────────────────
  describe('General', () => {
    it('has numeric sliderSteps', () => {
      expect(typeof defaultSettings.General.sliderSteps).toBe('number');
      expect(defaultSettings.General.sliderSteps).toBeGreaterThan(0);
    });
    it('has sliderMin < sliderMax', () => {
      expect(defaultSettings.General.sliderMin).toBeLessThan(defaultSettings.General.sliderMax);
    });
    it('has a non-empty RatingThresholds array', () => {
      expect(Array.isArray(defaultSettings.General.RatingThresholds)).toBe(true);
      expect(defaultSettings.General.RatingThresholds.length).toBeGreaterThan(0);
    });
    it('each RatingThreshold has a color string and numeric value', () => {
      for (const rt of defaultSettings.General.RatingThresholds) {
        expect(typeof rt.color).toBe('string');
        expect(rt.color).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(typeof rt.value).toBe('number');
      }
    });
    it('RatingThresholds are in ascending value order', () => {
      const values = defaultSettings.General.RatingThresholds.map((rt) => rt.value);
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });
  });
});
