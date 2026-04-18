import { notImplementedErrorResponseSchema } from "./contracts";

export function jsonNotImplementedResponse(input: {
  resourceType: string;
  implementation: "reused" | "projected" | "stub";
  operation: string;
  route: string;
  reason: string;
}) {
  return Response.json(
    notImplementedErrorResponseSchema.parse({
      error: {
        code: "not_implemented",
        message: `${input.operation} is not implemented for ${input.resourceType}.`,
        details: {
          apiVersion: "v1",
          resourceType: input.resourceType,
          implementation: input.implementation,
          operation: input.operation,
          route: input.route,
          reason: input.reason
        }
      }
    }),
    { status: 501 }
  );
}
