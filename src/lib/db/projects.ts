import { and, asc, eq, inArray } from "drizzle-orm";

import type {
  ProjectComponent,
  ProjectConfig,
  StoredProject
} from "../../keystone/projects/contracts";
import { parseProjectConfig } from "../../keystone/projects/contracts";
import type { DatabaseClient } from "./client";
import {
  projectComponentRuleOverrides,
  projectComponents,
  projectEnvVars,
  projectRuleSets,
  projects
} from "./schema";

interface ProjectLookupInput {
  tenantId: string;
  projectId: string;
}

export interface CreateProjectInput {
  tenantId: string;
  projectId?: string | undefined;
  config: ProjectConfig;
}

export interface UpdateProjectInput extends ProjectLookupInput {
  config: ProjectConfig;
}

interface ProjectSummary {
  tenantId: string;
  projectId: string;
  projectKey: string;
  displayName: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function sortComponentOverride<T extends { componentKey: string }>(items: T[]) {
  return [...items].sort((left, right) => left.componentKey.localeCompare(right.componentKey));
}

function sortEnvVars<T extends { name: string }>(items: T[]) {
  return [...items].sort((left, right) => left.name.localeCompare(right.name));
}

function toProjectSummary(row: typeof projects.$inferSelect): ProjectSummary {
  return {
    tenantId: row.tenantId,
    projectId: row.projectId,
    projectKey: row.projectKey,
    displayName: row.displayName,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

async function loadStoredProject(
  client: DatabaseClient,
  projectRow: typeof projects.$inferSelect
): Promise<StoredProject> {
  const [ruleSetRow, componentRows, envVarRows] = await Promise.all([
    client.db.query.projectRuleSets.findFirst({
      where: eq(projectRuleSets.projectId, projectRow.projectId)
    }),
    client.db.query.projectComponents.findMany({
      where: eq(projectComponents.projectId, projectRow.projectId),
      orderBy: [asc(projectComponents.componentKey)]
    }),
    client.db.query.projectEnvVars.findMany({
      where: eq(projectEnvVars.projectId, projectRow.projectId),
      orderBy: [asc(projectEnvVars.envKey)]
    })
  ]);
  const overrideRows =
    componentRows.length === 0
      ? []
      : await client.db.query.projectComponentRuleOverrides.findMany({
          where: inArray(
            projectComponentRuleOverrides.componentId,
            componentRows.map((row) => row.componentId)
          ),
          orderBy: [asc(projectComponentRuleOverrides.componentId)]
        });

  const overrideByComponentId = new Map(overrideRows.map((row) => [row.componentId, row]));
  const components = componentRows.map((componentRow): ProjectComponent => {
    const overrideRow = overrideByComponentId.get(componentRow.componentId);

    return {
      componentKey: componentRow.componentKey,
      displayName: componentRow.displayName,
      kind: "git_repository",
      config: {
        localPath: componentRow.localPath ?? undefined,
        gitUrl: componentRow.gitUrl ?? undefined,
        ref: componentRow.ref ?? undefined
      },
      ruleOverride: overrideRow
        ? {
          reviewInstructions: overrideRow.reviewInstructions ?? undefined,
          testInstructions: overrideRow.testInstructions ?? undefined
        }
        : undefined,
    };
  });

  const envVars = envVarRows.map((row) => ({
    name: row.envKey,
    value: row.envValue
  }));

  return {
    tenantId: projectRow.tenantId,
    projectId: projectRow.projectId,
    projectKey: projectRow.projectKey,
    displayName: projectRow.displayName,
    description: projectRow.description,
    ruleSet: {
      reviewInstructions: ruleSetRow?.reviewInstructions ?? [],
      testInstructions: ruleSetRow?.testInstructions ?? []
    },
    components,
    envVars,
    createdAt: projectRow.createdAt,
    updatedAt: projectRow.updatedAt
  };
}

async function replaceProjectChildren(
  tx: DatabaseClient["db"],
  input: {
    projectId: string;
    config: ProjectConfig;
    preserveCreatedAt?: boolean | undefined;
  }
) {
  const now = new Date();

  await tx
    .insert(projectRuleSets)
    .values({
      projectId: input.projectId,
      reviewInstructions: input.config.ruleSet.reviewInstructions,
      testInstructions: input.config.ruleSet.testInstructions,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: projectRuleSets.projectId,
      set: {
        reviewInstructions: input.config.ruleSet.reviewInstructions,
        testInstructions: input.config.ruleSet.testInstructions,
        updatedAt: now
      }
    });

  await tx.delete(projectEnvVars).where(eq(projectEnvVars.projectId, input.projectId));
  await tx.delete(projectComponents).where(eq(projectComponents.projectId, input.projectId));

  if (input.config.components.length > 0) {
    const componentRows = input.config.components.map((component) => ({
      componentId: crypto.randomUUID(),
      projectId: input.projectId,
      componentKey: component.componentKey,
      displayName: component.displayName,
      kind: component.kind,
      localPath: component.config.localPath ?? null,
      gitUrl: component.config.gitUrl ?? null,
      ref: component.config.ref ?? null,
      createdAt: now,
      updatedAt: now
    }));

    const insertedComponents = await tx.insert(projectComponents).values(componentRows).returning();
    const componentByKey = new Map(insertedComponents.map((row) => [row.componentKey, row.componentId]));
    const overrideRows = input.config.components.flatMap((component) => {
      if (!component.ruleOverride) {
        return [];
      }

      const componentId = componentByKey.get(component.componentKey);
      if (!componentId) {
        throw new Error(`Missing inserted component row for ${component.componentKey}.`);
      }

      return [
        {
          componentId,
          reviewInstructions: component.ruleOverride.reviewInstructions ?? null,
          testInstructions: component.ruleOverride.testInstructions ?? null,
          createdAt: now,
          updatedAt: now
        }
      ];
    });

    if (overrideRows.length > 0) {
      await tx.insert(projectComponentRuleOverrides).values(overrideRows);
    }
  }

  if (input.config.envVars.length > 0) {
    await tx.insert(projectEnvVars).values(
      input.config.envVars.map((envVar) => ({
        envVarId: crypto.randomUUID(),
        projectId: input.projectId,
        envKey: envVar.name,
        envValue: envVar.value,
        createdAt: now,
        updatedAt: now
      }))
    );
  }
}

export async function createProject(client: DatabaseClient, input: CreateProjectInput) {
  const config = parseProjectConfig(input.config);
  const projectId = input.projectId ?? crypto.randomUUID();
  const now = new Date();

  await client.db.transaction(async (tx) => {
    await tx.insert(projects).values({
      tenantId: input.tenantId,
      projectId,
      projectKey: config.projectKey,
      displayName: config.displayName,
      description: config.description,
      createdAt: now,
      updatedAt: now
    });

    await replaceProjectChildren(tx, {
      projectId,
      config
    });
  });

  const created = await getProject(client, {
    tenantId: input.tenantId,
    projectId
  });

  if (!created) {
    throw new Error(`Project ${projectId} was not found after creation.`);
  }

  return created;
}

export async function getProject(client: DatabaseClient, input: ProjectLookupInput) {
  const projectRow = await client.db.query.projects.findFirst({
    where: and(eq(projects.tenantId, input.tenantId), eq(projects.projectId, input.projectId))
  });

  if (!projectRow) {
    return undefined;
  }

  return loadStoredProject(client, projectRow);
}

export async function getProjectByKey(
  client: DatabaseClient,
  input: {
    tenantId: string;
    projectKey: string;
  }
) {
  const projectRow = await client.db.query.projects.findFirst({
    where: and(eq(projects.tenantId, input.tenantId), eq(projects.projectKey, input.projectKey))
  });

  if (!projectRow) {
    return undefined;
  }

  return loadStoredProject(client, projectRow);
}

export async function listProjects(
  client: DatabaseClient,
  input: {
    tenantId: string;
  }
) {
  const rows = await client.db.query.projects.findMany({
    where: eq(projects.tenantId, input.tenantId),
    orderBy: [asc(projects.createdAt), asc(projects.projectKey)]
  });

  return rows.map(toProjectSummary);
}

export async function updateProject(client: DatabaseClient, input: UpdateProjectInput) {
  const config = parseProjectConfig(input.config);
  const existing = await client.db.query.projects.findFirst({
    where: and(eq(projects.tenantId, input.tenantId), eq(projects.projectId, input.projectId))
  });

  if (!existing) {
    throw new Error(`Project ${input.projectId} was not found for tenant ${input.tenantId}.`);
  }

  const now = new Date();
  await client.db.transaction(async (tx) => {
    await tx
      .update(projects)
      .set({
        projectKey: config.projectKey,
        displayName: config.displayName,
        description: config.description,
        updatedAt: now
      })
      .where(and(eq(projects.tenantId, input.tenantId), eq(projects.projectId, input.projectId)));

    await replaceProjectChildren(tx, {
      projectId: input.projectId,
      config
    });
  });

  const updated = await getProject(client, input);
  if (!updated) {
    throw new Error(`Project ${input.projectId} was not found after update.`);
  }

  return updated;
}

export async function listProjectComponents(
  client: DatabaseClient,
  input: ProjectLookupInput
) {
  const project = await getProject(client, input);

  if (!project) {
    return [];
  }

  return sortComponentOverride(project.components);
}

export async function listProjectEnvVars(
  client: DatabaseClient,
  input: ProjectLookupInput
) {
  const project = await getProject(client, input);

  if (!project) {
    return [];
  }

  return sortEnvVars(project.envVars);
}
