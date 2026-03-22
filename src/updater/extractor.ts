// ZIP download and script extraction from upstream GitHub releases
// Downloads the upstream source code, builds it with Vite+CRXJS, then uses
// esbuild (from the upstream's own node_modules) to bundle each content script
// into a self-contained IIFE that includes all dependency chunks, with a
// browser-extension API shim prepended so the scripts work outside an extension.

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import AdmZip from 'adm-zip';
import os from 'os';

const SCRIPTS_DIR = path.resolve(process.env.SCRIPTS_DIR ?? 'scripts');
const VERSION_FILE = path.join(SCRIPTS_DIR, 'version.json');

/** Content script entry-point names in the upstream build output */
const CONTENT_SCRIPTS: Array<{ src: string; dst: string }> = [
  { src: 'amazon.ts.js',      dst: 'amazon.js' },
  { src: 'netflix.ts.js',     dst: 'netflix.js' },
  { src: 'disney.ts.js',      dst: 'disney.js' },
  { src: 'crunchyroll.ts.js', dst: 'crunchyroll.js' },
  { src: 'max.ts.js',         dst: 'max.js' },
  { src: 'paramount.ts.js',   dst: 'paramount.js' },
];

/**
 * Shim prepended to each bundled script (via esbuild --banner).
 * Sets up chrome/browser extension APIs pointing at our local proxy API
 * so scripts work identically to how they do in the browser extension.
 */
const BROWSER_SHIM = `(function(){
  var __seBase=window.__seBase||"http://streamingenhanced.local";
  var __seDevId=window.__seDeviceId||(function(){
    var id=localStorage.getItem("__se_device_id");
    if(!id){id=typeof crypto!="undefined"&&crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2);localStorage.setItem("__se_device_id",id);}
    return id;
  })();
  window.__seDeviceId=__seDevId;
  function seGet(){return fetch(__seBase+"/api/settings/"+__seDevId).then(function(r){return r.json();}).then(function(d){return{settings:d};});}
  function seSet(d){return fetch(__seBase+"/api/settings/"+__seDevId,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d.settings||d)}).then(function(r){return r.json();}).then(function(){});}
  var storageShim={get:seGet,set:seSet};
  var storageArea={sync:storageShim,local:storageShim,onChanged:{addListener:function(){},removeListener:function(){},dispatch:function(){}}};
  window.chrome=Object.assign({},window.chrome||{});
  window.chrome.runtime=Object.assign({id:"__se_proxy__",getURL:function(u){return u;},sendMessage:function(){return Promise.resolve();},onMessage:{addListener:function(){},removeListener:function(){}}},window.chrome.runtime||{});
  window.chrome.storage=storageArea;
  window.browser=window.browser||{};
  window.browser.storage=storageArea;
  window.browser.runtime=window.chrome.runtime;
})();`;

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function fetchBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, { headers: { 'User-Agent': 'streaming-enhanced-proxy/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const location = res.headers.location;
        if (!location) return reject(new Error('Redirect with no location'));
        return resolve(fetchBuffer(location));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      const bufs: Buffer[] = [];
      res.on('data', (chunk: Buffer) => bufs.push(chunk));
      res.on('end', () => resolve(Buffer.concat(bufs)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

export interface VersionInfo {
  version: string;
  updatedAt: string;
}

export function readVersion(): VersionInfo | null {
  try {
    return JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8')) as VersionInfo;
  } catch {
    return null;
  }
}

function writeVersion(info: VersionInfo): void {
  ensureDir(SCRIPTS_DIR);
  fs.writeFileSync(VERSION_FILE, JSON.stringify(info, null, 2), 'utf8');
}

/**
 * Fetch the latest upstream version string via raw.githubusercontent.com
 * (no GitHub API authentication required).
 */
export async function fetchLatestVersion(): Promise<string> {
  const url = 'https://raw.githubusercontent.com/Dreamlinerm/Netflix-Prime-Auto-Skip/main/package.json';
  const buf = await fetchBuffer(url);
  const pkg = JSON.parse(buf.toString('utf8')) as { version: string };
  return pkg.version;
}

/**
 * Download upstream source, build with Vite, bundle each content script
 * with esbuild into a self-contained IIFE, then copy to SCRIPTS_DIR.
 * Falls back to last known good scripts if anything fails.
 */
export async function buildAndExtractScripts(version: string): Promise<void> {
  ensureDir(SCRIPTS_DIR);

  const zipUrl = 'https://codeload.github.com/Dreamlinerm/Netflix-Prime-Auto-Skip/zip/refs/heads/main';
  console.log('[Updater] Downloading upstream source ZIP…');
  const zipBuffer = await fetchBuffer(zipUrl);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'se-build-'));
  console.log(`[Updater] Extracting source to ${tmpDir}…`);

  try {
    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(tmpDir, true);

    const entries = fs.readdirSync(tmpDir);
    if (entries.length === 0) throw new Error('Empty ZIP extract');
    const srcRoot = path.join(tmpDir, entries[0]);

    // Satisfy dotenv import in vite.config.ts
    fs.writeFileSync(path.join(srcRoot, '.env'), '', 'utf8');

    console.log('[Updater] Installing upstream dependencies (may take a few minutes)…');
    execSync('npm install --prefer-offline', {
      cwd: srcRoot,
      stdio: 'pipe',
      timeout: 5 * 60 * 1000,
    });

    console.log('[Updater] Building upstream scripts…');
    execSync('npm run build:chrome', {
      cwd: srcRoot,
      stdio: 'pipe',
      timeout: 5 * 60 * 1000,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        // Fixed epoch for reproducible builds (same value used by upstream's own build scripts)
        SOURCE_DATE_EPOCH: '1234567890',
      },
    });

    const distDir = path.join(srcRoot, 'dist', 'chrome');
    if (!fs.existsSync(distDir)) {
      throw new Error(`Build output missing: ${distDir}`);
    }

    // Locate esbuild from upstream's own node_modules
    const esbuildBin = path.join(srcRoot, 'node_modules', '.bin', 'esbuild');
    if (!fs.existsSync(esbuildBin)) {
      throw new Error('esbuild not found in upstream node_modules');
    }

    // Bundle each content script with esbuild (IIFE + shim banner)
    let bundled = 0;
    for (const { src, dst } of CONTENT_SCRIPTS) {
      const srcPath = path.join(distDir, src);
      if (!fs.existsSync(srcPath)) {
        console.warn(`[Updater] Expected script not found in build: ${src}`);
        continue;
      }

      const tmpOut = path.join(tmpDir, dst);
      try {
        execSync(
          `"${esbuildBin}" "${srcPath}" --bundle --format=iife --global-name=__se_unused --banner:js=${JSON.stringify(BROWSER_SHIM)} --outfile="${tmpOut}"`,
          { cwd: distDir, stdio: 'pipe', timeout: 60_000 }
        );
        const dest = path.join(SCRIPTS_DIR, dst);
        const tmp = dest + '.tmp';
        fs.copyFileSync(tmpOut, tmp);
        fs.renameSync(tmp, dest);
        const size = fs.statSync(dest).size;
        console.log(`[Updater] Bundled ${dst} (${size} bytes)`);
        bundled++;
      } catch (bundleErr) {
        console.warn(`[Updater] Failed to bundle ${src}: ${(bundleErr as Error).message}`);
      }
    }

    if (bundled === 0) throw new Error('Failed to bundle any content scripts');

    writeVersion({ version, updatedAt: new Date().toISOString() });
    console.log(`[Updater] Scripts updated to version ${version} (${bundled}/${CONTENT_SCRIPTS.length} bundled)`);
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}


