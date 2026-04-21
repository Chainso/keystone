import { createContext, useContext, type ReactNode } from "react";
import { z } from "zod";

import {
  artifactCollectionEnvelopeSchema,
  type ArtifactResource
} from "../../../../src/http/api/v1/artifacts/contracts";
import {
  runDetailEnvelopeSchema,
  taskCollectionEnvelopeSchema,
  taskDetailEnvelopeSchema,
  workflowGraphDetailEnvelopeSchema,
  type RunResource,
  type TaskResource,
  type WorkflowGraphResource
} from "../../../../src/http/api/v1/runs/contracts";

export interface RunExecutionApi {
  getRun: (runId: string) => Promise<RunResource>;
  getRunTask: (runId: string, taskId: string) => Promise<TaskResource>;
  getRunWorkflow: (runId: string) => Promise<WorkflowGraphResource>;
  listRunTaskArtifacts: (runId: string, taskId: string) => Promise<ArtifactResource[]>;
  listRunTasks: (runId: string) => Promise<TaskResource[]>;
}

const currentFetchImplementation: typeof fetch = (...args) => fetch(...args);
const defaultBrowserDevAuth = {
  token: "change-me-local-token",
  tenantId: "tenant-dev-local"
} as const;
const RunExecutionApiContext = createContext<RunExecutionApi | null>(null);

declare global {
  interface Window {
    __KESTONE_UI_DEV_AUTH__?:
      | {
          token?: string;
          tenantId?: string;
        }
      | undefined;
  }
}

function resolveBrowserDevAuth() {
  const providedAuth =
    typeof window === "undefined" ? undefined : window.__KESTONE_UI_DEV_AUTH__;

  return {
    token: providedAuth?.token?.trim() || defaultBrowserDevAuth.token,
    tenantId: providedAuth?.tenantId?.trim() || defaultBrowserDevAuth.tenantId
  };
}

function buildProtectedBrowserHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);
  const auth = resolveBrowserDevAuth();

  nextHeaders.set("Authorization", `Bearer ${auth.token}`);
  nextHeaders.set("X-Keystone-Tenant-Id", auth.tenantId);

  return nextHeaders;
}

function normalizeApiErrorMessage(payload: unknown, fallbackMessage: string) {
  if (typeof payload !== "object" || payload === null || !("error" in payload)) {
    return fallbackMessage;
  }

  const error = payload.error;

  if (typeof error !== "object" || error === null || !("message" in error)) {
    return fallbackMessage;
  }

  return typeof error.message === "string" ? error.message : fallbackMessage;
}

async function parseResponseOrThrow<T>(
  response: Response,
  schema: z.ZodType<T>,
  fallbackMessage: string
) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(normalizeApiErrorMessage(payload, fallbackMessage));
  }

  return schema.parse(payload);
}

export function createBrowserRunExecutionApi(
  fetchImplementation: typeof fetch = currentFetchImplementation
): RunExecutionApi {
  return {
    async getRun(runId) {
      const response = await fetchImplementation(`/v1/runs/${encodeURIComponent(runId)}`, {
        method: "GET",
        credentials: "same-origin",
        headers: buildProtectedBrowserHeaders({
          accept: "application/json"
        })
      });
      const payload = await parseResponseOrThrow(
        response,
        runDetailEnvelopeSchema,
        `Unable to load run details (${response.status}).`
      );

      return payload.data;
    },
    async getRunTask(runId, taskId) {
      const response = await fetchImplementation(
        `/v1/runs/${encodeURIComponent(runId)}/tasks/${encodeURIComponent(taskId)}`,
        {
          method: "GET",
          credentials: "same-origin",
          headers: buildProtectedBrowserHeaders({
            accept: "application/json"
          })
        }
      );
      const payload = await parseResponseOrThrow(
        response,
        taskDetailEnvelopeSchema,
        `Unable to load task detail (${response.status}).`
      );

      return payload.data;
    },
    async getRunWorkflow(runId) {
      const response = await fetchImplementation(`/v1/runs/${encodeURIComponent(runId)}/workflow`, {
        method: "GET",
        credentials: "same-origin",
        headers: buildProtectedBrowserHeaders({
          accept: "application/json"
        })
      });
      const payload = await parseResponseOrThrow(
        response,
        workflowGraphDetailEnvelopeSchema,
        `Unable to load execution workflow (${response.status}).`
      );

      return payload.data;
    },
    async listRunTaskArtifacts(runId, taskId) {
      const response = await fetchImplementation(
        `/v1/runs/${encodeURIComponent(runId)}/tasks/${encodeURIComponent(taskId)}/artifacts`,
        {
          method: "GET",
          credentials: "same-origin",
          headers: buildProtectedBrowserHeaders({
            accept: "application/json"
          })
        }
      );
      const payload = await parseResponseOrThrow(
        response,
        artifactCollectionEnvelopeSchema,
        `Unable to load task artifacts (${response.status}).`
      );

      return payload.data.items;
    },
    async listRunTasks(runId) {
      const response = await fetchImplementation(`/v1/runs/${encodeURIComponent(runId)}/tasks`, {
        method: "GET",
        credentials: "same-origin",
        headers: buildProtectedBrowserHeaders({
          accept: "application/json"
        })
      });
      const payload = await parseResponseOrThrow(
        response,
        taskCollectionEnvelopeSchema,
        `Unable to load run tasks (${response.status}).`
      );

      return payload.data.items;
    }
  };
}

export function RunExecutionApiProvider({
  api,
  children
}: {
  api: RunExecutionApi | null;
  children: ReactNode;
}) {
  return (
    <RunExecutionApiContext.Provider value={api}>{children}</RunExecutionApiContext.Provider>
  );
}

export function useOptionalRunExecutionApi() {
  return useContext(RunExecutionApiContext);
}
