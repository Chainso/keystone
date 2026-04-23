import type { DatabaseClient } from "../../src/lib/db/client";
import { documents } from "../../src/lib/db/schema";

type FixtureRow = Record<string, unknown>;

export interface DocumentRepositoryFixture {
  projects: FixtureRow[];
  runs: FixtureRow[];
  documents: FixtureRow[];
  documentRevisions: FixtureRow[];
}

interface DocumentRepositoryFixtureOptions {
  onInsertDocument?: ((row: FixtureRow) => void) | undefined;
  onUpdateDocument?: ((rows: FixtureRow[]) => void) | undefined;
}

function columnNameToPropertyName(columnName: string) {
  return columnName.replace(/_([a-z])/g, (_match, character: string) => character.toUpperCase());
}

function extractEqualityFilters(expression: unknown, filters = new Map<string, unknown>()) {
  if (!expression || typeof expression !== "object") {
    return filters;
  }

  if (!("queryChunks" in expression) || !Array.isArray(expression.queryChunks)) {
    return filters;
  }

  const queryChunks = expression.queryChunks as unknown[];

  for (let index = 0; index < queryChunks.length - 2; index += 1) {
    const column = queryChunks[index];
    const operator = queryChunks[index + 1];
    const param = queryChunks[index + 2];

    if (
      column &&
      typeof column === "object" &&
      "name" in column &&
      typeof column.name === "string" &&
      operator &&
      typeof operator === "object" &&
      "value" in operator &&
      Array.isArray(operator.value) &&
      operator.value[0] === " = " &&
      param &&
      typeof param === "object" &&
      "value" in param
    ) {
      filters.set(column.name, param.value);
    }
  }

  for (const chunk of queryChunks) {
    extractEqualityFilters(chunk, filters);
  }

  return filters;
}

function matchesWhere(row: FixtureRow, where: unknown) {
  const filters = extractEqualityFilters(where);

  for (const [columnName, expectedValue] of filters) {
    const propertyName = columnNameToPropertyName(columnName);

    if (row[propertyName] !== expectedValue) {
      return false;
    }
  }

  return true;
}

function buildQueryTable(rows: FixtureRow[]) {
  return {
    findFirst: async ({ where }: { where?: unknown } = {}) =>
      rows.find((row) => matchesWhere(row, where)),
    findMany: async ({ where }: { where?: unknown } = {}) =>
      rows.filter((row) => matchesWhere(row, where))
  };
}

function buildUpdateTable(
  rows: FixtureRow[],
  options?: DocumentRepositoryFixtureOptions | undefined
) {
  return {
    set(values: FixtureRow) {
      return {
        where(where: unknown) {
          const updatedRows = rows
            .filter((row) => matchesWhere(row, where))
            .map((row) => Object.assign(row, values));

          options?.onUpdateDocument?.(updatedRows);

          return {
            returning: async () => updatedRows
          };
        }
      };
    }
  };
}

function buildInsertTable(
  rows: FixtureRow[],
  options?: DocumentRepositoryFixtureOptions | undefined
) {
  return {
    values(values: FixtureRow) {
      const timestamp = new Date();
      const insertedRow = {
        currentRevisionId: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        ...values
      };
      rows.push(insertedRow);
      options?.onInsertDocument?.(insertedRow);

      return {
        returning: async () => [insertedRow]
      };
    }
  };
}

export function createDocumentRepositoryClient(
  fixture: DocumentRepositoryFixture,
  close: () => Promise<void> | void = async () => undefined,
  options?: DocumentRepositoryFixtureOptions | undefined
): DatabaseClient {
  return {
    connectionString: "postgres://test",
    sql: {} as DatabaseClient["sql"],
    db: {
      query: {
        projects: buildQueryTable(fixture.projects),
        runs: buildQueryTable(fixture.runs),
        documents: buildQueryTable(fixture.documents),
        documentRevisions: buildQueryTable(fixture.documentRevisions)
      },
      update(table: unknown) {
        if (table === documents) {
          return buildUpdateTable(fixture.documents, options);
        }

        throw new Error("Unsupported update table in document repository fixture.");
      },
      insert(table: unknown) {
        if (table === documents) {
          return buildInsertTable(fixture.documents, options);
        }

        throw new Error("Unsupported insert table in document repository fixture.");
      }
    } as DatabaseClient["db"],
    close: async () => {
      await close();
    }
  };
}
