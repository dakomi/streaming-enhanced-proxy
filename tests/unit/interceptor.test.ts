import {
  stripRestrictiveHeaders,
  isHtmlResponse,
  injectScripts,
} from '../../src/proxy/interceptor';

// ── stripRestrictiveHeaders ──────────────────────────────────────────────────

describe('stripRestrictiveHeaders', () => {
  it('removes content-security-policy', () => {
    const headers: Record<string, string | undefined> = {
      'content-security-policy': "default-src 'self'",
      'content-type': 'text/html',
    };
    stripRestrictiveHeaders(headers);
    expect(headers['content-security-policy']).toBeUndefined();
    expect(headers['content-type']).toBe('text/html');
  });

  it('removes content-security-policy-report-only', () => {
    const headers: Record<string, string | undefined> = {
      'content-security-policy-report-only': "default-src 'self'",
    };
    stripRestrictiveHeaders(headers);
    expect(headers['content-security-policy-report-only']).toBeUndefined();
  });

  it('removes x-frame-options', () => {
    const headers: Record<string, string | undefined> = { 'x-frame-options': 'DENY' };
    stripRestrictiveHeaders(headers);
    expect(headers['x-frame-options']).toBeUndefined();
  });

  it('removes cross-origin-embedder-policy', () => {
    const headers: Record<string, string | undefined> = { 'cross-origin-embedder-policy': 'require-corp' };
    stripRestrictiveHeaders(headers);
    expect(headers['cross-origin-embedder-policy']).toBeUndefined();
  });

  it('removes cross-origin-opener-policy', () => {
    const headers: Record<string, string | undefined> = { 'cross-origin-opener-policy': 'same-origin' };
    stripRestrictiveHeaders(headers);
    expect(headers['cross-origin-opener-policy']).toBeUndefined();
  });

  it('removes cross-origin-resource-policy', () => {
    const headers: Record<string, string | undefined> = { 'cross-origin-resource-policy': 'same-origin' };
    stripRestrictiveHeaders(headers);
    expect(headers['cross-origin-resource-policy']).toBeUndefined();
  });

  it('removes all restrictive headers simultaneously', () => {
    const headers: Record<string, string | undefined> = {
      'content-security-policy': "default-src 'self'",
      'content-security-policy-report-only': "default-src 'self'",
      'x-frame-options': 'SAMEORIGIN',
      'cross-origin-embedder-policy': 'require-corp',
      'cross-origin-opener-policy': 'same-origin',
      'cross-origin-resource-policy': 'same-origin',
      'content-type': 'text/html',
      'cache-control': 'no-cache',
    };
    stripRestrictiveHeaders(headers);
    expect(headers['content-security-policy']).toBeUndefined();
    expect(headers['content-security-policy-report-only']).toBeUndefined();
    expect(headers['x-frame-options']).toBeUndefined();
    expect(headers['cross-origin-embedder-policy']).toBeUndefined();
    expect(headers['cross-origin-opener-policy']).toBeUndefined();
    expect(headers['cross-origin-resource-policy']).toBeUndefined();
    // Safe headers must be preserved
    expect(headers['content-type']).toBe('text/html');
    expect(headers['cache-control']).toBe('no-cache');
  });

  it('removes mixed-case variants of restricted headers', () => {
    const headers: Record<string, string | undefined> = {
      'Content-Security-Policy': "default-src 'self'",
      'X-Frame-Options': 'DENY',
    };
    stripRestrictiveHeaders(headers);
    expect(headers['Content-Security-Policy']).toBeUndefined();
    expect(headers['X-Frame-Options']).toBeUndefined();
  });

  it('handles empty headers object safely', () => {
    const headers: Record<string, string | undefined> = {};
    expect(() => stripRestrictiveHeaders(headers)).not.toThrow();
    expect(Object.keys(headers)).toHaveLength(0);
  });
});

// ── isHtmlResponse ───────────────────────────────────────────────────────────

describe('isHtmlResponse', () => {
  it('returns true for text/html', () => {
    expect(isHtmlResponse('text/html')).toBe(true);
  });
  it('returns true for text/html; charset=utf-8', () => {
    expect(isHtmlResponse('text/html; charset=utf-8')).toBe(true);
  });
  it('returns true for TEXT/HTML (uppercase)', () => {
    expect(isHtmlResponse('TEXT/HTML')).toBe(true);
  });
  it('returns false for application/json', () => {
    expect(isHtmlResponse('application/json')).toBe(false);
  });
  it('returns false for application/javascript', () => {
    expect(isHtmlResponse('application/javascript')).toBe(false);
  });
  it('returns false for undefined', () => {
    expect(isHtmlResponse(undefined)).toBe(false);
  });
  it('returns false for empty string', () => {
    expect(isHtmlResponse('')).toBe(false);
  });
  it('returns false for video/mp4', () => {
    expect(isHtmlResponse('video/mp4')).toBe(false);
  });
});

// ── injectScripts ─────────────────────────────────────────────────────────────

describe('injectScripts', () => {
  const netflixHost = 'www.netflix.com';
  const unknownHost = 'google.com';

  it('returns html unchanged for unmatched hostname', () => {
    const html = '<html><head></head><body></body></html>';
    expect(injectScripts(html, unknownHost)).toBe(html);
  });

  it('injects after <head> tag', () => {
    const html = '<html><head><title>Netflix</title></head><body></body></html>';
    const result = injectScripts(html, netflixHost);
    expect(result).toContain('<head>');
    // Injection should appear immediately after <head>
    const headPos = result.indexOf('<head>') + '<head>'.length;
    const scriptPos = result.indexOf('<script', headPos);
    expect(scriptPos).toBeGreaterThan(headPos);
    expect(scriptPos).toBeLessThan(result.indexOf('<title>'));
  });

  it('injection contains the correct service script URL', () => {
    const html = '<html><head></head><body></body></html>';
    const result = injectScripts(html, netflixHost);
    expect(result).toContain('netflix.js');
    expect(result).toContain('/api/scripts/netflix.js');
  });

  it('injection contains the device ID setup script', () => {
    const html = '<html><head></head><body></body></html>';
    const result = injectScripts(html, netflixHost);
    expect(result).toContain('__se_device_id');
    expect(result).toContain('__seBase');
  });

  it('injects the correct service script for amazon.com', () => {
    const html = '<html><head></head><body></body></html>';
    const result = injectScripts(html, 'www.amazon.com');
    expect(result).toContain('amazon.js');
    expect(result).not.toContain('netflix.js');
  });

  it('injects the correct service script for disneyplus.com', () => {
    const html = '<html><head></head></html>';
    const result = injectScripts(html, 'disneyplus.com');
    expect(result).toContain('disney.js');
  });

  it('injects the correct service script for crunchyroll.com', () => {
    const html = '<html><head></head></html>';
    const result = injectScripts(html, 'crunchyroll.com');
    expect(result).toContain('crunchyroll.js');
  });

  it('injects the correct service script for max.com', () => {
    const html = '<html><head></head></html>';
    const result = injectScripts(html, 'max.com');
    expect(result).toContain('max.js');
  });

  it('injects the correct service script for paramountplus.com', () => {
    const html = '<html><head></head></html>';
    const result = injectScripts(html, 'paramountplus.com');
    expect(result).toContain('paramount.js');
  });

  it('falls back to injecting before first <script> when no <head>', () => {
    const html = '<html><script src="app.js"></script></html>';
    const result = injectScripts(html, netflixHost);
    // Injection should appear before the existing script tag
    const injectPos = result.indexOf('<!-- injected');
    const appScriptPos = result.indexOf('<script src="app.js">');
    expect(injectPos).toBeLessThan(appScriptPos);
  });

  it('prepends injection as last resort when no <head> or <script>', () => {
    const html = '<html><body>Hello</body></html>';
    const result = injectScripts(html, netflixHost);
    expect(result.startsWith('<!-- injected')).toBe(true);
  });

  it('handles <head> tag with attributes', () => {
    const html = '<html><head lang="en"><title>Test</title></head></html>';
    const result = injectScripts(html, netflixHost);
    // Injection should follow the opening <head ...> tag
    const headClose = result.indexOf('>') + 1; // first > in <head lang="en">
    const headTagEnd = result.indexOf('>', result.indexOf('<head')) + 1;
    const firstScriptAfterHead = result.indexOf('<script', headTagEnd);
    expect(firstScriptAfterHead).toBeGreaterThan(headTagEnd);
    expect(firstScriptAfterHead).toBeLessThan(result.indexOf('<title>'));
  });

  it('injection is present only once', () => {
    const html = '<html><head></head><body></body></html>';
    const result = injectScripts(html, netflixHost);
    const occurrences = (result.match(/<!-- injected by streaming-enhanced-proxy -->/g) ?? []).length;
    expect(occurrences).toBe(1);
  });
});
