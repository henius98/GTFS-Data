// src/gtfs/sqliteWriter.ts
import Database from 'better-sqlite3';
import * as unzipper from 'unzipper';
import { parse } from 'csv-parse';
import * as path from 'node:path';
import type { Logger } from '../core/logger.js';

const TABLE_PRIMARY_KEYS: Record<string, string[]> = {
  trips: ['trip_id'],
  calendar: ['service_id', 'start_date', 'end_date'],
  routes: ['route_id'],
  shapes: ['shape_id', 'shape_pt_sequence'],
  stops: ['stop_id'],
  stop_times: ['trip_id', 'stop_sequence']
};

interface UpsertInfo {
  pkColumns: string[];
  updatableColumns: string[];
}

export interface SqliteWriterOptions {
  dbPath: string;
  logger?: Logger;
  batchSize?: number;
}

function normalize(name: string): string {
  return name.toLowerCase();
}

function getTableColumns(
  db: Database.Database,
  tableName: string
): Set<string> {
  const rows = db.prepare(`PRAGMA table_info("${tableName}")`).all();
  return new Set(rows.map(row => String(row.name)));
}

function buildPreparedInsert(
  db: Database.Database,
  tableName: string,
  columns: string[],
  upsert: UpsertInfo | null
): Database.Statement {
  const columnList = columns.map(c => `"${c}"`).join(',');
  const placeholders = columns.map(() => '?').join(',');
  let sql = `INSERT INTO "${tableName}" (${columnList}) VALUES (${placeholders})`;

  if (upsert?.pkColumns.length) {
    const conflictTarget = upsert.pkColumns.map(c => `"${c}"`).join(',');
    if (upsert.updatableColumns.length) {
      const setClause = upsert.updatableColumns
        .map(c => `"${c}" = excluded."${c}"`)
        .join(',');
      sql += ` ON CONFLICT(${conflictTarget}) DO UPDATE SET ${setClause}`;
    } else {
      sql += ` ON CONFLICT(${conflictTarget}) DO NOTHING`;
    }
  }

  return db.prepare(sql);
}

function getUpsertInfo(tableName: string, headers: string[]): UpsertInfo | null {
  const pkFromMap = TABLE_PRIMARY_KEYS[normalize(tableName)];
  if (!pkFromMap) return null;

  const headerSet = new Set(headers.map(normalize));
  const pkColumns = pkFromMap.filter(pk => headerSet.has(normalize(pk)));
  if (pkColumns.length === 0) return null;

  const pkSet = new Set(pkColumns.map(normalize));
  const updatableColumns = headers.filter(h => !pkSet.has(normalize(h)));

  return { pkColumns, updatableColumns };
}

export class GtfsSqliteWriter {
  private readonly dbPath: string;
  private readonly logger?: Logger;
  private readonly batchSize: number;

  constructor(options: SqliteWriterOptions) {
    this.dbPath = options.dbPath;
    this.logger = options.logger;
    this.batchSize = options.batchSize ?? 3000;
  }

  async importFromZip(zipBuffer: Buffer): Promise<void> {
    const db = new Database(this.dbPath);

    // Performance options – leave commented if you care about durability more than speed.
    // db.pragma('journal_mode = WAL');
    // db.pragma('synchronous = NORMAL');

    try {
      const directory = await unzipper.Open.buffer(zipBuffer);

      for (const entry of directory.files) {
        if (entry.type !== 'File') continue;

        const fileName = entry.path;

        if (
          !fileName.toLowerCase().endsWith('.txt') ||
          fileName.toLowerCase() === 'agency.txt'
        ) {
          continue;
        }

        const tableName = path.basename(fileName, '.txt');
        this.logger?.info('Processing GTFS file', { fileName, tableName });

        const stream = entry.stream();
        // eslint-disable-next-line no-await-in-loop
        await this.processGtfsFile(tableName, stream, db);
      }

      this.logger?.info('All GTFS static files processed');
    } finally {
      db.close();
    }
  }

  private async processGtfsFile(
    tableName: string,
    stream: NodeJS.ReadableStream,
    db: Database.Database
  ): Promise<void> {
    const parser = stream.pipe(
      parse({
        bom: true,
        relax_column_count: true,
        skip_empty_lines: true
      })
    ) as AsyncIterable<string[]>;

    const BATCH_SIZE = this.batchSize;

    let headers: string[] | null = null;
    let columnIndexes: number[] = [];
    let upsertInfo: UpsertInfo | null = null;
    let batch: string[][] = [];
    let rowCount = 0;

    const tableColumns = getTableColumns(db, tableName);
    const insertBatch = db.transaction(
      (stmt: Database.Statement, rows: string[][], indexes: number[]) => {
        for (const row of rows) {
          const values = indexes.map(idx => {
            const value = row[idx];
            return value === '' ? null : value;
          });
          stmt.run(values);
        }
      }
    );

    try {
      for await (const record of parser) {
        if (!headers) {
          const rawHeaders = record.map(h => h.trim());
          headers = rawHeaders.filter(h => tableColumns.has(h));
          columnIndexes = rawHeaders
            .map((h, idx) => (tableColumns.has(h) ? idx : -1))
            .filter(idx => idx >= 0);
          if (headers.length === 0) {
            return;
          }

          upsertInfo = getUpsertInfo(tableName, headers);
          continue;
        }

        if (!headers || columnIndexes.length === 0) {
          continue;
        }

        batch.push(record);
        rowCount++;

        if (batch.length >= BATCH_SIZE) {
          const stmt = buildPreparedInsert(db, tableName, headers, upsertInfo);
          insertBatch(stmt, batch, columnIndexes);
          batch = [];
        }
      }

      if (headers && batch.length > 0) {
        const stmt = buildPreparedInsert(db, tableName, headers, upsertInfo);
        insertBatch(stmt, batch, columnIndexes);
      }
      this.logger?.info('Upserted rows into table', {
        tableName,
        rowCount
      });
    } catch (err) {
      this.logger?.error('Error processing GTFS file', {
        tableName,
        error: (err as Error).message
      });
      throw err;
    }
  }
}
