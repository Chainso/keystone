import { z } from "zod";

export const projectComponentKindValues = ["git_repository"] as const;

const stringListSchema = z.array(z.string().trim().min(1));
const metadataSchema = z.record(z.string(), z.unknown());

export const projectRuleSetSchema = z.object({
  reviewInstructions: stringListSchema.default([]),
  testInstructions: stringListSchema.default([])
});

export const projectComponentRuleOverrideSchema = z
  .object({
    reviewInstructions: stringListSchema.optional(),
    testInstructions: stringListSchema.optional(),
    metadata: metadataSchema.default({})
  })
  .refine(
    (value) => value.reviewInstructions !== undefined || value.testInstructions !== undefined,
    {
      message: "Provide at least one project component rule override.",
      path: ["reviewInstructions"]
    }
  );

export const gitRepositoryComponentConfigSchema = z
  .object({
    localPath: z.string().trim().min(1).optional(),
    gitUrl: z.string().url().optional(),
    defaultRef: z.string().trim().min(1).optional()
  })
  .superRefine((value, context) => {
    const hasLocalPath = Boolean(value.localPath);
    const hasGitUrl = Boolean(value.gitUrl);

    if (hasLocalPath === hasGitUrl) {
      context.addIssue({
        code: "custom",
        message: "Provide exactly one of config.localPath or config.gitUrl.",
        path: ["localPath"]
      });
    }
  });

export const gitRepositoryProjectComponentSchema = z.object({
  componentKey: z.string().trim().min(1),
  displayName: z.string().trim().min(1),
  kind: z.literal("git_repository"),
  config: gitRepositoryComponentConfigSchema,
  ruleOverride: projectComponentRuleOverrideSchema.optional(),
  metadata: metadataSchema.default({})
});

export const projectComponentSchema = z.discriminatedUnion("kind", [
  gitRepositoryProjectComponentSchema
]);

export const projectEnvVarSchema = z.object({
  name: z.string().trim().min(1),
  value: z.string(),
  metadata: metadataSchema.default({})
});

export const projectIntegrationBindingSchema = z.object({
  bindingKey: z.string().trim().min(1),
  tenantIntegrationId: z.string().trim().min(1),
  overrides: metadataSchema.default({}),
  metadata: metadataSchema.default({})
});

export const projectConfigSchema = z.object({
  projectKey: z.string().trim().min(1),
  displayName: z.string().trim().min(1),
  description: z.string().trim().min(1).nullable().default(null),
  ruleSet: projectRuleSetSchema.default({
    reviewInstructions: [],
    testInstructions: []
  }),
  components: z.array(projectComponentSchema).min(1),
  envVars: z.array(projectEnvVarSchema).default([]),
  integrationBindings: z.array(projectIntegrationBindingSchema).default([]),
  metadata: metadataSchema.default({})
});

export type ProjectRuleSet = z.infer<typeof projectRuleSetSchema>;
export type ProjectComponentRuleOverride = z.infer<typeof projectComponentRuleOverrideSchema>;
export type GitRepositoryComponentConfig = z.infer<typeof gitRepositoryComponentConfigSchema>;
export type ProjectComponent = z.infer<typeof projectComponentSchema>;
export type ProjectEnvVar = z.infer<typeof projectEnvVarSchema>;
export type ProjectIntegrationBinding = z.infer<typeof projectIntegrationBindingSchema>;
export type ProjectConfig = z.infer<typeof projectConfigSchema>;

export interface StoredProject extends ProjectConfig {
  tenantId: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

export function parseProjectConfig(value: unknown) {
  return projectConfigSchema.parse(value);
}
