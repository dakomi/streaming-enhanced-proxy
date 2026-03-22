// GitHub release poller + scheduled auto-updater
// Checks upstream version via raw.githubusercontent.com (no API token needed)
// and builds scripts from source when a new version is available.

import cron from 'node-cron';
import { buildAndExtractScripts, fetchLatestVersion, readVersion } from './extractor.js';

const UPDATE_CRON = process.env.UPDATE_CRON ?? '0 3 * * *'; // daily at 03:00

let lastCheckTime: string | null = null;

export async function checkAndUpdate(): Promise<{ updated: boolean; version: string }> {
  lastCheckTime = new Date().toISOString();
  console.log('[Updater] Checking for upstream updates…');

  const latestVersion = await fetchLatestVersion();

  const current = readVersion();
  if (current?.version === latestVersion) {
    console.log(`[Updater] Already at latest version ${latestVersion}`);
    return { updated: false, version: latestVersion };
  }

  console.log(`[Updater] New version available: ${latestVersion} (current: ${current?.version ?? 'none'})`);
  await buildAndExtractScripts(latestVersion);
  return { updated: true, version: latestVersion };
}

export function getLastCheckTime(): string | null {
  return lastCheckTime;
}

export function startScheduler(): void {
  console.log(`[Updater] Scheduler started (cron: ${UPDATE_CRON})`);
  cron.schedule(UPDATE_CRON, async () => {
    try {
      await checkAndUpdate();
    } catch (err) {
      console.error('[Updater] Scheduled update failed:', (err as Error).message);
    }
  });
}

/** Run an initial update check on startup (non-fatal if it fails) */
export async function initialCheck(): Promise<void> {
  try {
    await checkAndUpdate();
  } catch (err) {
    console.warn('[Updater] Initial update check failed (using cached scripts if available):', (err as Error).message);
  }
}

