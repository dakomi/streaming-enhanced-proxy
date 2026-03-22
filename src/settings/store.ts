// Per-device settings store backed by SQLite (better-sqlite3)
// One row per device ID, settings stored as a JSON column.

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { SettingsType } from '../types/settings.js';
import { defaultSettings } from './defaults.js';

const DATA_DIR = path.resolve(process.env.DATA_DIR ?? 'data');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

ensureDir(DATA_DIR);

const db = new Database(path.join(DATA_DIR, 'devices.db'));

// Initialise schema
db.exec(`
  CREATE TABLE IF NOT EXISTS devices (
    id          TEXT PRIMARY KEY,
    friendly_name TEXT NOT NULL DEFAULT '',
    last_seen_ip  TEXT NOT NULL DEFAULT '',
    last_seen_at  TEXT NOT NULL DEFAULT (datetime('now')),
    settings    TEXT NOT NULL DEFAULT '{}'
  );
`);

export interface DeviceRecord {
  id: string;
  friendly_name: string;
  last_seen_ip: string;
  last_seen_at: string;
  settings: SettingsType;
}

function mergeSettings(stored: Partial<SettingsType>): SettingsType {
  return {
    Amazon: { ...defaultSettings.Amazon, ...stored.Amazon },
    Netflix: { ...defaultSettings.Netflix, ...stored.Netflix },
    Disney: { ...defaultSettings.Disney, ...stored.Disney },
    Crunchyroll: { ...defaultSettings.Crunchyroll, ...stored.Crunchyroll },
    HBO: { ...defaultSettings.HBO, ...stored.HBO },
    Paramount: { ...defaultSettings.Paramount, ...stored.Paramount },
    Video: { ...defaultSettings.Video, ...stored.Video },
    General: { ...defaultSettings.General, ...stored.General },
  };
}

const stmtGet = db.prepare<[string]>(
  'SELECT * FROM devices WHERE id = ?'
);
const stmtUpsert = db.prepare<[string, string, string]>(
  `INSERT INTO devices (id, last_seen_ip, last_seen_at, settings)
   VALUES (?, ?, datetime('now'), ?)
   ON CONFLICT(id) DO UPDATE SET
     last_seen_ip = excluded.last_seen_ip,
     last_seen_at = excluded.last_seen_at`
);
const stmtUpdateSettings = db.prepare<[string, string]>(
  'UPDATE devices SET settings = ? WHERE id = ?'
);
const stmtUpdateName = db.prepare<[string, string]>(
  'UPDATE devices SET friendly_name = ? WHERE id = ?'
);
const stmtAll = db.prepare(
  'SELECT * FROM devices ORDER BY last_seen_at DESC'
);

export function touchDevice(deviceId: string, ip: string): void {
  const row = stmtGet.get(deviceId) as { settings: string } | undefined;
  if (!row) {
    stmtUpsert.run(deviceId, ip, JSON.stringify(defaultSettings));
  } else {
    stmtUpsert.run(deviceId, ip, row.settings);
  }
}

export function getSettings(deviceId: string): SettingsType {
  const row = stmtGet.get(deviceId) as { settings: string } | undefined;
  if (!row) return { ...defaultSettings };
  try {
    return mergeSettings(JSON.parse(row.settings) as Partial<SettingsType>);
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(deviceId: string, partial: Record<string, unknown>): void {
  const current = getSettings(deviceId);
  // Merge at the top level only — partial keys overwrite current keys
  const merged = mergeSettings({ ...current, ...(partial as Partial<SettingsType>) });
  stmtUpdateSettings.run(JSON.stringify(merged), deviceId);
}

export function listDevices(): DeviceRecord[] {
  const rows = stmtAll.all() as Array<{
    id: string;
    friendly_name: string;
    last_seen_ip: string;
    last_seen_at: string;
    settings: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    friendly_name: r.friendly_name,
    last_seen_ip: r.last_seen_ip,
    last_seen_at: r.last_seen_at,
    settings: (() => {
      try { return mergeSettings(JSON.parse(r.settings) as Partial<SettingsType>); }
      catch { return { ...defaultSettings }; }
    })(),
  }));
}

export function renameDevice(deviceId: string, name: string): void {
  stmtUpdateName.run(name, deviceId);
}
