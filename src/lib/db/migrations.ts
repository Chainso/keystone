import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

import { resolveDatabaseConnectionString } from "./client";

const MIGRATION_TABLE = "keystone_schema_migrations";

export function resolveMigrationsDirectory() {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), "../../../migrations");
}

export async function listMigrationFiles(migrationsDirectory = resolveMigrationsDirectory()) {
  const entries = await readdir(migrationsDirectory, { withFileTypes: true });

  return entries
    .filter((entry: (typeof entries)[number]) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry: (typeof entries)[number]) => entry.name)
    .sort((left: string, right: string) => left.localeCompare(right));
}

export async function applyMigrations(options?: {
  connectionString?: string | undefined;
  migrationsDirectory?: string | undefined;
}) {
  const migrationsDirectory = options?.migrationsDirectory ?? resolveMigrationsDirectory();
  const migrationFiles = await listMigrationFiles(migrationsDirectory);
  const connectionString =
    options?.connectionString ??
    resolveDatabaseConnectionString({
      connectionString: process.env.DATABASE_URL,
      CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE:
        process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE
    });

  const sql = postgres(connectionString, { max: 1, prepare: true });

  try {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
        version text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const appliedRows = await sql<{ version: string }[]>`
      SELECT version
      FROM keystone_schema_migrations
      ORDER BY version
    `;
    const appliedVersions = new Set(appliedRows.map((row) => row.version));
    const newlyApplied: string[] = [];

    for (const fileName of migrationFiles) {
      if (appliedVersions.has(fileName)) {
        continue;
      }

      const migrationPath = path.join(migrationsDirectory, fileName);
      const sqlText = await readFile(migrationPath, "utf8");

      await sql.begin(async (transaction) => {
        await transaction.unsafe(sqlText);
        await transaction`
          INSERT INTO keystone_schema_migrations (version)
          VALUES (${fileName})
        `;
      });

      newlyApplied.push(fileName);
    }

    return {
      applied: newlyApplied,
      skipped: migrationFiles.filter((fileName: string) => appliedVersions.has(fileName))
    };
  } finally {
    await sql.end();
  }
}

async function main() {
  const result = await applyMigrations();

  if (result.applied.length === 0) {
    console.log("No pending migrations.");
    return;
  }

  console.log(`Applied migrations: ${result.applied.join(", ")}`);
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  main().catch((error) => {
    console.error("Migration failed.", error);
    process.exitCode = 1;
  });
}
