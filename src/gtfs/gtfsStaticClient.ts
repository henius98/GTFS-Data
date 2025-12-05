// src/gtfs/gtfsStaticClient.ts
import type { Logger } from '../core/logger.js';
import type { GtfsCategory } from '../core/types.js';

export interface GtfsStaticClientOptions {
  baseUrl: string;
  logger?: Logger;
}

export class GtfsStaticClient {
  private readonly baseUrl: string;
  private readonly logger?: Logger;

  constructor(options: GtfsStaticClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.logger = options.logger;
  }

  async getStaticZip(
    category: GtfsCategory,
    signal?: AbortSignal
  ): Promise<Buffer> {
    const url = `${this.baseUrl}?category=${encodeURIComponent(category)}`;
    this.logger?.info('Downloading GTFS static ZIP', { url, category });

    const res = await fetch(url, { method: 'GET', signal });

    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => '');
      this.logger?.error('Failed to download GTFS static ZIP', {
        status: res.status,
        bodySnippet: body.substring(0, 200)
      });
      throw new Error(`HTTP ${res.status} while fetching ${url}`);
    }

    const ab = await res.arrayBuffer();
    const buffer = Buffer.from(ab);
    this.logger?.info('Downloaded GTFS static ZIP', {
      bytes: buffer.length
    });

    return buffer;
  }
}
