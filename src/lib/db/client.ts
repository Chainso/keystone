import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import type { WorkerBindings } from "../../env";
import * as schema from "./schema";

export interface DatabaseConnectionSource {
  HYPERDRIVE?: Pick<Hyperdrive, "connectionString"> | undefined;
  CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE?: string | undefined;
  DATABASE_URL?: string | undefined;
  connectionString?: string | undefined;
}

export interface DatabaseClient {
  connectionString: string;
  sql: postgres.Sql<Record<string, unknown>>;
  db: PostgresJsDatabase<typeof schema>;
  close: () => Promise<void>;
}

export function resolveDatabaseConnectionString(source: DatabaseConnectionSource) {
  if (source.connectionString) {
    return source.connectionString;
  }

  if (source.HYPERDRIVE?.connectionString) {
    return source.HYPERDRIVE.connectionString;
  }

  if (source.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE) {
    return source.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE;
  }

  if (source.DATABASE_URL) {
    return source.DATABASE_URL;
  }

  throw new Error(
    "Database connection string is missing. Provide env.HYPERDRIVE, CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE, or DATABASE_URL."
  );
}

export function createDatabaseClient(connectionString: string): DatabaseClient {
  const sqlClient = postgres(connectionString, {
    max: 1,
    prepare: true
  });

  return {
    connectionString,
    sql: sqlClient,
    db: drizzle(sqlClient, { schema }),
    close: () => sqlClient.end()
  };
}

export function createDatabaseClientFromSource(source: DatabaseConnectionSource) {
  return createDatabaseClient(resolveDatabaseConnectionString(source));
}

export function createWorkerDatabaseClient(env: Pick<WorkerBindings, "HYPERDRIVE">) {
  return createDatabaseClientFromSource({
    HYPERDRIVE: env.HYPERDRIVE
  });
}
