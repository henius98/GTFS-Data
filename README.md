# GTFS Static Importer

High-performance GTFS static data importer for SQLite using Node.js + TypeScript.

## Setup

### Local
1) Install dependencies:
   - `pnpm install`
2) (Optional) Configure environment variables:
   - `GTFS_BASE_URL` (default: `https://api.data.gov.my/gtfs-static/prasarana`)
   - `GTFS_DB_PATH` (default: `./gtfs.db`)
   - `GTFS_CATEGORY` (default: `rapid-bus-penang`)
   - `GTFS_SCHEMA_PATH` (default: `DB/tables.sql`)
3) Initialize the database schema:
   - `pnpm run db:init`
4) Import GTFS data:
   - `pnpm run gtfs:import`
5) Start the scheduler (runs imports every hour):
   - `pnpm run scheduler`

### Docker
1) Build the image:
   - `docker build -t gtfs-static-importer .`
2) Run an import:
   - `docker run --rm gtfs-static-importer`
