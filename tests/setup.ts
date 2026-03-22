/**
 * Jest setup file — runs in each test worker before any module is loaded.
 * Sets required environment variables so singleton modules (e.g. the
 * SQLite store) use isolated temp directories rather than the real
 * runtime data and scripts directories.
 */
import os from 'os';
import path from 'path';
import fs from 'fs';

const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'se-test-'));

process.env.DATA_DIR = path.join(tmpBase, 'data');
process.env.SCRIPTS_DIR = path.join(tmpBase, 'scripts');
// Point the admin server at the actual source admin dir so tests don't
// require a prior `npm run build`.
process.env.ADMIN_DIR_OVERRIDE = path.resolve(__dirname, '..', 'src', 'server', 'admin');
process.env.ADMIN_PORT = '0'; // random port — only used by startServer, not buildApp
