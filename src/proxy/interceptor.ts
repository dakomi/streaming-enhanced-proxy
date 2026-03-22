// HTML interception: strips restrictive headers and injects content scripts.

import type { IncomingMessage, ServerResponse } from 'http';
import { matchDomain } from './domains.js';

/** Headers to strip from proxied HTML responses */
const STRIP_HEADERS = [
  'content-security-policy',
  'content-security-policy-report-only',
  'x-frame-options',
  'cross-origin-embedder-policy',
  'cross-origin-opener-policy',
  'cross-origin-resource-policy',
];

const ADMIN_ORIGIN = process.env.ADMIN_ORIGIN ?? 'http://streamingenhanced.local';
const ADMIN_PORT = process.env.ADMIN_PORT ?? '3000';

function getAdminBase(): string {
  const port = ADMIN_PORT !== '80' ? `:${ADMIN_PORT}` : '';
  return ADMIN_ORIGIN.includes(':3000') || ADMIN_ORIGIN.includes(':' + ADMIN_PORT)
    ? ADMIN_ORIGIN
    : `${ADMIN_ORIGIN}${port}`;
}

/** Build the injection snippet for a given service.
 * Each service script is a self-contained IIFE bundle with the browser
 * extension API shim already prepended by esbuild at build time.
 * The injection only needs to set __seBase and __seDeviceId so the
 * bundled shim can find our local settings API.
 */
function buildInjection(serviceScript: string): string {
  const base = getAdminBase();
  return `<!-- injected by streaming-enhanced-proxy -->
<script>
(function(){
  // Set up per-device ID (stored in localStorage for persistence across page loads)
  var id = localStorage.getItem('__se_device_id');
  if (!id) {
    id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    localStorage.setItem('__se_device_id', id);
  }
  window.__seDeviceId = id;
  window.__seBase = '${base}';
})();
</script>
<script src="${base}/api/scripts/${serviceScript}"></script>`;
}

/** Strip restricted response headers in-place */
export function stripRestrictiveHeaders(headers: Record<string, string | string[] | undefined>): void {
  for (const h of STRIP_HEADERS) {
    delete headers[h];
    // Headers may be stored with mixed case
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === h) {
        delete headers[key];
      }
    }
  }
}

/** Returns true if the content-type indicates an HTML document */
export function isHtmlResponse(contentType: string | undefined): boolean {
  return !!contentType && contentType.toLowerCase().includes('text/html');
}

/**
 * Injects the streaming-enhanced script tags into an HTML string.
 * Inserts after <head> (or before first <script>/<body> as fallback).
 * Only modifies if a matching service is found for the hostname.
 */
export function injectScripts(html: string, hostname: string): string {
  const match = matchDomain(hostname);
  if (!match) return html;

  const injection = buildInjection(match.scriptFile);

  // Prefer injecting right after <head> tag
  const headMatch = html.match(/<head(\s[^>]*)?>/i);
  if (headMatch && headMatch.index !== undefined) {
    const pos = headMatch.index + headMatch[0].length;
    return html.slice(0, pos) + '\n' + injection + '\n' + html.slice(pos);
  }

  // Fallback: inject before first <script> tag
  const scriptMatch = html.match(/<script/i);
  if (scriptMatch && scriptMatch.index !== undefined) {
    return html.slice(0, scriptMatch.index) + injection + '\n' + html.slice(scriptMatch.index);
  }

  // Last resort: prepend
  return injection + '\n' + html;
}

// Exported for use by proxy middleware
export { matchDomain };
