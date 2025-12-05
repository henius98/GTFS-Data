// src/config/env.ts
import * as path from 'node:path';

export interface AppConfig {
  baseUrl: string;
  dbPath: string;
  defaultCategory: string;
  schemaPath: string;
}

export function loadConfigFromEnv(): AppConfig {
  return {
    baseUrl:
      process.env.GTFS_BASE_URL ??
      'https://api.data.gov.my/gtfs-static/prasarana',
    dbPath: process.env.GTFS_DB_PATH ?? './gtfs.db',
    defaultCategory: process.env.GTFS_CATEGORY ?? 'rapid-bus-penang',
    schemaPath:
      process.env.GTFS_SCHEMA_PATH ??
      path.resolve(process.cwd(), 'DB', 'tables.sql')
  };
}
