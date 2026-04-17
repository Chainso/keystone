import { z } from "zod";

import { runExecutionOptionsSchema } from "../../lib/runs/options";

const repoSourceSchema = z
  .object({
    localPath: z.string().trim().min(1).optional(),
    gitUrl: z.string().url().optional(),
    ref: z.string().trim().min(1).optional()
  })
  .superRefine((value, context) => {
    const hasLocalPath = Boolean(value.localPath);
    const hasGitUrl = Boolean(value.gitUrl);

    if (hasLocalPath === hasGitUrl) {
      context.addIssue({
        code: "custom",
        message: "Provide exactly one of repo.localPath or repo.gitUrl.",
        path: ["localPath"]
      });
    }
  })
  .transform((value) => {
    if (value.localPath) {
      return {
        source: "localPath" as const,
        localPath: value.localPath,
        ref: value.ref
      };
    }

    return {
      source: "gitUrl" as const,
      gitUrl: value.gitUrl as string,
      ref: value.ref
    };
  });

const decisionPackageSchema = z
  .object({
    localPath: z.string().trim().min(1).optional(),
    payload: z.record(z.string(), z.unknown()).optional()
  })
  .superRefine((value, context) => {
    const hasLocalPath = Boolean(value.localPath);
    const hasPayload = Boolean(value.payload);

    if (hasLocalPath === hasPayload) {
      context.addIssue({
        code: "custom",
        message:
          "Provide exactly one of decisionPackage.localPath or decisionPackage.payload.",
        path: ["localPath"]
      });
    }
  })
  .transform((value) => {
    if (value.localPath) {
      return {
        source: "localPath" as const,
        localPath: value.localPath
      };
    }

    return {
      source: "payload" as const,
      payload: value.payload as Record<string, unknown>
    };
  });

export const runInputSchema = z.object({
  repo: repoSourceSchema,
  decisionPackage: decisionPackageSchema,
  options: runExecutionOptionsSchema.default({
    thinkMode: "mock",
    preserveSandbox: false
  })
});

export type RunInput = z.infer<typeof runInputSchema>;

export function parseRunInput(value: unknown) {
  return runInputSchema.parse(value);
}
