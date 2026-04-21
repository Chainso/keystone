import { projectCollectionEnvelopeSchema } from "../../../../src/http/api/v1/projects/contracts";

export interface CurrentProjectRecord {
  projectId: string;
  projectKey: string;
  displayName: string;
  description: string;
}

export interface ProjectManagementApi {
  listProjects: () => Promise<CurrentProjectRecord[]>;
}

const currentFetchImplementation: typeof fetch = (...args) => fetch(...args);

function normalizeProjectRecord(project: {
  projectId: string;
  projectKey: string;
  displayName: string;
  description: string | null;
}) {
  return {
    projectId: project.projectId,
    projectKey: project.projectKey,
    displayName: project.displayName,
    description: project.description ?? ""
  };
}

export function createBrowserProjectManagementApi(
  fetchImplementation: typeof fetch = currentFetchImplementation
): ProjectManagementApi {
  return {
    async listProjects() {
      const response = await fetchImplementation("/v1/projects", {
        method: "GET",
        credentials: "same-origin",
        headers: {
          accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Unable to load projects (${response.status}).`);
      }

      const payload = projectCollectionEnvelopeSchema.parse(await response.json());

      return payload.data.items.map(normalizeProjectRecord);
    }
  };
}

export function createStaticProjectManagementApi(
  projects: CurrentProjectRecord[]
): ProjectManagementApi {
  return {
    async listProjects() {
      return projects;
    }
  };
}
