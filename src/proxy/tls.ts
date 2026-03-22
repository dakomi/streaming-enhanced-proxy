// TLS helpers: locate and serve the auto-generated CA certificate
// http-mitm-proxy generates and manages TLS certs automatically using node-forge.
// The CA cert is stored at: {sslCaDir}/certs/ca.pem

import path from 'path';
import fs from 'fs';

const CERTS_DIR = path.resolve(process.env.CERTS_DIR ?? 'certs');

/** Path to the auto-generated CA cert (created by http-mitm-proxy on first run) */
export function getCACertPath(): string {
  return path.join(CERTS_DIR, 'certs', 'ca.pem');
}

/** Returns true if the CA cert has been generated */
export function caCertExists(): boolean {
  return fs.existsSync(getCACertPath());
}

