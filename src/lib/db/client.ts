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

interface CreateDatabaseClientOptions {
  endOnClose?: boolean | undefined;
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

export function createDatabaseClient(
  connectionString: string,
  options: CreateDatabaseClientOptions = {}
): DatabaseClient {
  const sqlClient = postgres(connectionString, {
    max: 1,
    prepare: true
  });
  const close =
    options.endOnClose === false ? async () => undefined : () => sqlClient.end();

  return {
    connectionString,
    sql: sqlClient,
    db: drizzle(sqlClient, { schema }),
    close
  };
}

export function createDatabaseClientFromSource(
  source: DatabaseConnectionSource,
  options?: CreateDatabaseClientOptions | undefined
) {
  return createDatabaseClient(resolveDatabaseConnectionString(source), options);
}

export function createWorkerDatabaseClient(
  env: Pick<
    WorkerBindings,
    "HYPERDRIVE" | "CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE"
  >
) {
  if (env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE) {
    // Local Wrangler dev exposes a plain Postgres connection string. Close the
    // request-scoped client so iterative demo traffic does not exhaust local DB
    // connections across requests.
    return createDatabaseClientFromSource({
      CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE:
        env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE
    });
  }

  return createDatabaseClientFromSource(
    {
      HYPERDRIVE: env.HYPERDRIVE
    },
    {
      // Hyperdrive owns the underlying pool in deployed Workers. Ending the
      // client per request can race later awaited queries and trigger
      // CONNECTION_ENDED in that environment.
      endOnClose: false
    }
  );
}
