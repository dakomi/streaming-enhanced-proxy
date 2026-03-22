// Domain → streaming service mapping
// Derived from manifest.config.ts in upstream Netflix-Prime-Auto-Skip

export type ServiceName =
  | 'netflix'
  | 'amazon'
  | 'disney'
  | 'crunchyroll'
  | 'max'
  | 'paramount';

interface ServiceEntry {
  service: ServiceName;
  scriptFile: string;
}

/**
 * Checks whether a given hostname belongs to a supported streaming service.
 * Returns service metadata if matched, undefined otherwise.
 */
export function matchDomain(hostname: string): ServiceEntry | undefined {
  const host = hostname.toLowerCase().replace(/^www\./, '');

  // Netflix
  if (
    host.endsWith('.netflix.com') ||
    host === 'netflix.com' ||
    host.endsWith('.netflix.ca') ||
    host === 'netflix.ca' ||
    host.endsWith('.netflix.com.au') ||
    host === 'netflix.com.au'
  ) {
    return { service: 'netflix', scriptFile: 'netflix.js' };
  }

  // Amazon Prime Video
  if (
    host.endsWith('.primevideo.com') ||
    host === 'primevideo.com' ||
    host.endsWith('.amazon.com') ||
    host === 'amazon.com' ||
    host.endsWith('.amazon.co.jp') ||
    host === 'amazon.co.jp' ||
    host.endsWith('.amazon.de') ||
    host === 'amazon.de' ||
    host.endsWith('.amazon.co.uk') ||
    host === 'amazon.co.uk'
  ) {
    return { service: 'amazon', scriptFile: 'amazon.js' };
  }

  // Disney+ / Hotstar / Star+ / JioCinema
  if (
    host.endsWith('.disneyplus.com') ||
    host === 'disneyplus.com' ||
    host.endsWith('.hotstar.com') ||
    host === 'hotstar.com' ||
    host.endsWith('.starplus.com') ||
    host === 'starplus.com' ||
    host.endsWith('.jiostar.com') ||
    host === 'jiostar.com' ||
    host.endsWith('.jiocinema.com') ||
    host === 'jiocinema.com'
  ) {
    return { service: 'disney', scriptFile: 'disney.js' };
  }

  // Crunchyroll
  if (
    host.endsWith('.crunchyroll.com') ||
    host === 'crunchyroll.com'
  ) {
    return { service: 'crunchyroll', scriptFile: 'crunchyroll.js' };
  }

  // Max / HBO Max
  if (
    host.endsWith('.max.com') ||
    host === 'max.com' ||
    host.endsWith('.hbomax.com') ||
    host === 'hbomax.com'
  ) {
    return { service: 'max', scriptFile: 'max.js' };
  }

  // Paramount+
  if (
    host.endsWith('.paramountplus.com') ||
    host === 'paramountplus.com'
  ) {
    return { service: 'paramount', scriptFile: 'paramount.js' };
  }

  return undefined;
}

/** All supported domains for proxy interception (for http-mitm-proxy hostname filtering) */
export const ALL_DOMAINS: string[] = [
  // Netflix
  'netflix.com', 'netflix.ca', 'netflix.com.au',
  // Amazon
  'primevideo.com', 'amazon.com', 'amazon.co.jp', 'amazon.de', 'amazon.co.uk',
  // Disney+
  'disneyplus.com', 'hotstar.com', 'starplus.com', 'jiostar.com', 'jiocinema.com',
  // Crunchyroll
  'crunchyroll.com',
  // Max
  'max.com', 'hbomax.com',
  // Paramount
  'paramountplus.com',
];
