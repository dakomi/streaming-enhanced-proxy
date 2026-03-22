// Proxy server entry point using http-mitm-proxy
// Intercepts HTTP/HTTPS traffic for target streaming domains,
// strips CSP headers and injects content scripts into HTML responses.
// TLS certs are managed automatically by http-mitm-proxy (using node-forge).

import { Proxy } from 'http-mitm-proxy';
import path from 'path';
import { matchDomain } from './domains.js';
import { stripRestrictiveHeaders, isHtmlResponse, injectScripts } from './interceptor.js';

const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '8080', 10);
const CERTS_DIR = path.resolve(process.env.CERTS_DIR ?? 'certs');

export function startProxy(): void {
  const proxy = new Proxy();

  proxy.onError(function (ctx, err) {
    // Log errors without revealing request/response bodies
    const host = ctx?.clientToProxyRequest?.headers?.host ?? 'unknown';
    console.error(`[Proxy] Error for ${host}:`, (err as Error).message);
  });

  proxy.onRequest(function (ctx, callback) {
    const hostname = (ctx.clientToProxyRequest.headers.host ?? '').split(':')[0];

    // Only deeply inspect streaming service domains
    if (!matchDomain(hostname)) {
      return callback();
    }

    ctx.onResponse(function (ctx, callback) {
      if (!ctx.serverToProxyResponse) {
        return callback();
      }
      const headers = ctx.serverToProxyResponse.headers as Record<string, string | string[]>;
      const contentType = headers['content-type'] as string | undefined;

      // Only modify HTML responses
      if (!isHtmlResponse(contentType)) {
        return callback();
      }

      // Strip restrictive headers
      stripRestrictiveHeaders(headers);

      // Collect body chunks, inject scripts, send modified response
      const chunks: Buffer[] = [];

      ctx.onResponseData(function (_ctx, chunk, cb) {
        chunks.push(chunk);
        return cb(null, undefined);
      });

      ctx.onResponseEnd(function (_ctx, cb) {
        const fullBody = Buffer.concat(chunks).toString('utf8');
        const modified = injectScripts(fullBody, hostname);
        ctx.proxyToClientResponse.write(Buffer.from(modified, 'utf8'));
        return cb();
      });

      return callback();
    });

    return callback();
  });

  proxy.listen({ port: PROXY_PORT, sslCaDir: CERTS_DIR }, (err?: Error | null) => {
    if (err) {
      console.error('[Proxy] Failed to start:', err.message);
      process.exit(1);
    }
    console.log(`[Proxy] Listening on port ${PROXY_PORT} (HTTP + HTTPS MITM)`);
    console.log(`[Proxy] CA cert will be at: ${CERTS_DIR}/certs/ca.pem`);
  });
}

