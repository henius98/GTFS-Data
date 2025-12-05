// src/core/database.ts
import Database from 'better-sqlite3';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Logger } from './logger.js';

export interface InitializeSqliteOptions {
  dbPath: string;
  schemaSqlPath: string;
  logger?: Logger;
}

function ensureDirectoryExists(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!dir || dir === '.') return;

  fs.mkdirSync(dir, { recursive: true });
}

export function initializeSqliteSchema(options: InitializeSqliteOptions): void {
  const { dbPath, schemaSqlPath, logger } = options;

  if (!fs.existsSync(schemaSqlPath)) {
    throw new Error(`Schema file not found at ${schemaSqlPath}`);
  }

  ensureDirectoryExists(dbPath);
  const ddl = fs.readFileSync(schemaSqlPath, 'utf8');

  const db = new Database(dbPath);
  try {
    db.exec('BEGIN');
    db.exec(ddl);
    db.exec('COMMIT');
    logger?.info('SQLite schema ensured', { dbPath, schemaSqlPath });
  } catch (err) {
    db.exec('ROLLBACK');
    logger?.error('Failed to initialize SQLite schema', {
      error: (err as Error).message
    });
    throw err;
  } finally {
    db.close();
  }
}
