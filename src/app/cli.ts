// src/app/cli.ts
import * as path from 'node:path';
import { loadConfigFromEnv } from '../config/env.js';
import { initializeSqliteSchema } from '../core/database.js';
import { consoleLogger } from '../core/logger.js';
import { GtfsStaticImporter } from '../gtfs/gtfsStaticImporter.js';

type Command = 'import' | 'init';

interface ParsedArgs {
  command: Command;
  category?: string;
  dbPath?: string;
  schemaPath?: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = { command: 'import' };
  let i = 2;

  if (argv[i] && !argv[i].startsWith('-') && (argv[i] === 'import' || argv[i] === 'init')) {
    result.command = argv[i] as Command;
    i++;
  }

  for (; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case '--category':
      case '-c':
        if (!argv[i + 1]) throw new Error('Missing value for --category');
        result.category = argv[++i];
        break;
      case '--db':
      case '-d':
        if (!argv[i + 1]) throw new Error('Missing value for --db');
        result.dbPath = argv[++i];
        break;
      case '--schema':
      case '-s':
        if (!argv[i + 1]) throw new Error('Missing value for --schema');
        result.schemaPath = argv[++i];
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return result;
}

function resolveSchemaPath(schemaPathFromArgs?: string): string {
  if (schemaPathFromArgs) return path.resolve(schemaPathFromArgs);

  return path.resolve(process.cwd(), 'DB', 'tables.sql');
}

async function main(): Promise<void> {
  const cfg = loadConfigFromEnv();
  let args: ParsedArgs;

  try {
    args = parseArgs(process.argv);
  } catch (err) {
    consoleLogger.error((err as Error).message);
    process.exitCode = 1;
    return;
  }

  const dbPath = args.dbPath ?? cfg.dbPath;
  const category = args.category ?? cfg.defaultCategory;
  const schemaPath = resolveSchemaPath(args.schemaPath ?? cfg.schemaPath);

  try {
    initializeSqliteSchema({
      dbPath,
      schemaSqlPath: schemaPath,
      logger: consoleLogger
    });

    if (args.command === 'init') {
      consoleLogger.info('Database initialized; skipping import step', {
        dbPath,
        schemaPath
      });
      return;
    }

    const importer = new GtfsStaticImporter({
      baseUrl: cfg.baseUrl,
      dbPath,
      logger: consoleLogger
    });

    await importer.importCategory(category);
  } catch (err) {
    consoleLogger.error('GTFS static import failed', {
      error: (err as Error).message
    });
    process.exitCode = 1;
  }
}

void main();
