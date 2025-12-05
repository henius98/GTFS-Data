// src/gtfs/gtfsStaticImporter.ts
import type { Logger } from '../core/logger.js';
import type { GtfsCategory } from '../core/types.js';
import { GtfsStaticClient } from './gtfsStaticClient.js';
import { GtfsSqliteWriter } from './sqliteWriter.js';

export interface GtfsStaticImporterOptions {
  baseUrl: string;
  dbPath: string;
  logger: Logger;
}

export class GtfsStaticImporter {
  private readonly client: GtfsStaticClient;
  private readonly writer: GtfsSqliteWriter;
  private readonly logger: Logger;

  constructor(options: GtfsStaticImporterOptions) {
    this.logger = options.logger;
    this.client = new GtfsStaticClient({
      baseUrl: options.baseUrl,
      logger: options.logger
    });
    this.writer = new GtfsSqliteWriter({
      dbPath: options.dbPath,
      logger: options.logger
    });
  }

  async importCategory(category: GtfsCategory): Promise<void> {
    this.logger.info('Starting GTFS static import', { category });

    const start = performance.now();
    const zipBuffer = await this.client.getStaticZip(category);
    await this.writer.importFromZip(zipBuffer);

    const elapsedMs = performance.now() - start;
    this.logger.info('Completed GTFS static import', {
      category,
      elapsedMs: Math.round(elapsedMs)
    });
  }
}
