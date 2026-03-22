import { matchDomain, ALL_DOMAINS } from '../../src/proxy/domains';

describe('matchDomain', () => {
  // ── Netflix ────────────────────────────────────────────────────────────────
  describe('Netflix', () => {
    it('matches netflix.com bare domain', () => {
      expect(matchDomain('netflix.com')).toEqual({ service: 'netflix', scriptFile: 'netflix.js' });
    });
    it('matches www.netflix.com (strips www.)', () => {
      expect(matchDomain('www.netflix.com')).toEqual({ service: 'netflix', scriptFile: 'netflix.js' });
    });
    it('matches subdomain of netflix.com', () => {
      expect(matchDomain('play.netflix.com')).toEqual({ service: 'netflix', scriptFile: 'netflix.js' });
    });
    it('matches netflix.ca', () => {
      expect(matchDomain('netflix.ca')).toEqual({ service: 'netflix', scriptFile: 'netflix.js' });
    });
    it('matches netflix.com.au', () => {
      expect(matchDomain('netflix.com.au')).toEqual({ service: 'netflix', scriptFile: 'netflix.js' });
    });
  });

  // ── Amazon ─────────────────────────────────────────────────────────────────
  describe('Amazon', () => {
    it('matches primevideo.com', () => {
      expect(matchDomain('primevideo.com')).toEqual({ service: 'amazon', scriptFile: 'amazon.js' });
    });
    it('matches www.amazon.com', () => {
      expect(matchDomain('www.amazon.com')).toEqual({ service: 'amazon', scriptFile: 'amazon.js' });
    });
    it('matches amazon.co.jp', () => {
      expect(matchDomain('amazon.co.jp')).toEqual({ service: 'amazon', scriptFile: 'amazon.js' });
    });
    it('matches amazon.de', () => {
      expect(matchDomain('amazon.de')).toEqual({ service: 'amazon', scriptFile: 'amazon.js' });
    });
    it('matches amazon.co.uk', () => {
      expect(matchDomain('amazon.co.uk')).toEqual({ service: 'amazon', scriptFile: 'amazon.js' });
    });
    it('matches subdomain of primevideo.com', () => {
      expect(matchDomain('watch.primevideo.com')).toEqual({ service: 'amazon', scriptFile: 'amazon.js' });
    });
  });

  // ── Disney ─────────────────────────────────────────────────────────────────
  describe('Disney', () => {
    it('matches disneyplus.com', () => {
      expect(matchDomain('disneyplus.com')).toEqual({ service: 'disney', scriptFile: 'disney.js' });
    });
    it('matches www.disneyplus.com', () => {
      expect(matchDomain('www.disneyplus.com')).toEqual({ service: 'disney', scriptFile: 'disney.js' });
    });
    it('matches hotstar.com', () => {
      expect(matchDomain('hotstar.com')).toEqual({ service: 'disney', scriptFile: 'disney.js' });
    });
    it('matches starplus.com', () => {
      expect(matchDomain('starplus.com')).toEqual({ service: 'disney', scriptFile: 'disney.js' });
    });
    it('matches jiostar.com', () => {
      expect(matchDomain('jiostar.com')).toEqual({ service: 'disney', scriptFile: 'disney.js' });
    });
    it('matches jiocinema.com', () => {
      expect(matchDomain('jiocinema.com')).toEqual({ service: 'disney', scriptFile: 'disney.js' });
    });
  });

  // ── Crunchyroll ────────────────────────────────────────────────────────────
  describe('Crunchyroll', () => {
    it('matches crunchyroll.com', () => {
      expect(matchDomain('crunchyroll.com')).toEqual({ service: 'crunchyroll', scriptFile: 'crunchyroll.js' });
    });
    it('matches subdomain of crunchyroll.com', () => {
      expect(matchDomain('static.crunchyroll.com')).toEqual({ service: 'crunchyroll', scriptFile: 'crunchyroll.js' });
    });
  });

  // ── Max / HBO Max ──────────────────────────────────────────────────────────
  describe('Max/HBO', () => {
    it('matches max.com', () => {
      expect(matchDomain('max.com')).toEqual({ service: 'max', scriptFile: 'max.js' });
    });
    it('matches www.max.com', () => {
      expect(matchDomain('www.max.com')).toEqual({ service: 'max', scriptFile: 'max.js' });
    });
    it('matches hbomax.com', () => {
      expect(matchDomain('hbomax.com')).toEqual({ service: 'max', scriptFile: 'max.js' });
    });
    it('matches subdomain of hbomax.com', () => {
      expect(matchDomain('play.hbomax.com')).toEqual({ service: 'max', scriptFile: 'max.js' });
    });
  });

  // ── Paramount ──────────────────────────────────────────────────────────────
  describe('Paramount', () => {
    it('matches paramountplus.com', () => {
      expect(matchDomain('paramountplus.com')).toEqual({ service: 'paramount', scriptFile: 'paramount.js' });
    });
    it('matches www.paramountplus.com', () => {
      expect(matchDomain('www.paramountplus.com')).toEqual({ service: 'paramount', scriptFile: 'paramount.js' });
    });
  });

  // ── Non-streaming domains ──────────────────────────────────────────────────
  describe('unsupported domains', () => {
    it('returns undefined for google.com', () => {
      expect(matchDomain('google.com')).toBeUndefined();
    });
    it('returns undefined for empty string', () => {
      expect(matchDomain('')).toBeUndefined();
    });
    it('returns undefined for partial match (not-netflix.com)', () => {
      expect(matchDomain('not-netflix.com')).toBeUndefined();
    });
    it('returns undefined for youtube.com', () => {
      expect(matchDomain('youtube.com')).toBeUndefined();
    });
    it('does not match domain that merely contains "netflix"', () => {
      // Should NOT match — "netflixfake.com" doesn't end with ".netflix.com"
      expect(matchDomain('netflixfake.com')).toBeUndefined();
    });
  });

  // ── Case insensitivity ─────────────────────────────────────────────────────
  describe('case insensitivity', () => {
    it('handles uppercase hostname', () => {
      expect(matchDomain('NETFLIX.COM')).toEqual({ service: 'netflix', scriptFile: 'netflix.js' });
    });
    it('handles mixed-case hostname', () => {
      expect(matchDomain('Watch.DisneyPlus.COM')).toEqual({ service: 'disney', scriptFile: 'disney.js' });
    });
  });
});

describe('ALL_DOMAINS', () => {
  it('is a non-empty array', () => {
    expect(ALL_DOMAINS.length).toBeGreaterThan(0);
  });
  it('contains netflix.com', () => {
    expect(ALL_DOMAINS).toContain('netflix.com');
  });
  it('contains primevideo.com', () => {
    expect(ALL_DOMAINS).toContain('primevideo.com');
  });
  it('contains all 6 services', () => {
    const hasNetflix = ALL_DOMAINS.some((d) => d.includes('netflix'));
    const hasAmazon = ALL_DOMAINS.some((d) => d.includes('amazon') || d.includes('primevideo'));
    const hasDisney = ALL_DOMAINS.some((d) => d.includes('disney'));
    const hasCrunchyroll = ALL_DOMAINS.some((d) => d.includes('crunchyroll'));
    const hasMax = ALL_DOMAINS.some((d) => d.includes('max'));
    const hasParamount = ALL_DOMAINS.some((d) => d.includes('paramount'));
    expect(hasNetflix && hasAmazon && hasDisney && hasCrunchyroll && hasMax && hasParamount).toBe(true);
  });
});
