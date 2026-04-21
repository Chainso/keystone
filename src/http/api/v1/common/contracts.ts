import { z } from "zod";

export const apiVersionSchema = z.literal("v1");
export const isoTimestampSchema = z.string().datetime({ offset: true });
export const metadataSchema = z.record(z.string(), z.unknown());
export const resourceIdSchema = z.string().trim().min(1);

export const resourceImplementationValues = ["reused", "projected", "stub"] as const;
export const routeAvailabilityValues = [
  "implemented",
  "scaffolded",
  "contract_frozen",
  "legacy_debug"
] as const;
export const routeResponseKindValues = ["detail", "collection", "action", "stream"] as const;
export const httpMethodValues = ["GET", "POST", "PUT", "PATCH"] as const;

export const resourceImplementationSchema = z.enum(resourceImplementationValues);
export const routeAvailabilitySchema = z.enum(routeAvailabilityValues);
export const routeResponseKindSchema = z.enum(routeResponseKindValues);
export const httpMethodSchema = z.enum(httpMethodValues);

export const resourceScaffoldSchema = z.object({
  implementation: resourceImplementationSchema,
  note: z.string().trim().min(1).nullable().default(null)
});

export const detailEnvelopeMetaSchema = z.object({
  apiVersion: apiVersionSchema,
  envelope: z.literal("detail"),
  resourceType: z.string().trim().min(1)
});

export const collectionEnvelopeMetaSchema = z.object({
  apiVersion: apiVersionSchema,
  envelope: z.literal("collection"),
  resourceType: z.string().trim().min(1)
});

export const actionEnvelopeMetaSchema = z.object({
  apiVersion: apiVersionSchema,
  envelope: z.literal("action"),
  resourceType: z.string().trim().min(1)
});

export interface ApiRouteDefinition {
  method: (typeof httpMethodValues)[number];
  path: string;
  family: string;
  resourceType: string;
  responseKind: (typeof routeResponseKindValues)[number];
  implementation: (typeof resourceImplementationValues)[number];
  availability: (typeof routeAvailabilityValues)[number];
  note?: string;
}

export function buildResourceSchema<const TResourceType extends string, TShape extends z.ZodRawShape>(
  _resourceType: TResourceType,
  shape: TShape
) {
  return z.object(shape);
}

export function buildDetailEnvelopeSchema<TSchema extends z.ZodTypeAny>(
  resourceType: string,
  resourceSchema: TSchema
) {
  return z.object({
    data: resourceSchema,
    meta: detailEnvelopeMetaSchema.extend({
      resourceType: z.literal(resourceType)
    })
  });
}

export function buildCollectionEnvelopeSchema<TSchema extends z.ZodTypeAny>(
  resourceType: string,
  resourceSchema: TSchema
) {
  return z.object({
    data: z.object({
      items: z.array(resourceSchema),
      total: z.number().int().nonnegative()
    }),
    meta: collectionEnvelopeMetaSchema.extend({
      resourceType: z.literal(resourceType)
    })
  });
}

export function buildActionEnvelopeSchema<TSchema extends z.ZodTypeAny>(
  resourceType: string,
  actionSchema: TSchema
) {
  return z.object({
    data: actionSchema,
    meta: actionEnvelopeMetaSchema.extend({
      resourceType: z.literal(resourceType)
    })
  });
}

export const notImplementedErrorDetailsSchema = z.object({
  apiVersion: apiVersionSchema,
  resourceType: z.string().trim().min(1),
  implementation: resourceImplementationSchema,
  operation: z.string().trim().min(1),
  route: z.string().trim().min(1),
  reason: z.string().trim().min(1)
});

export const notImplementedErrorResponseSchema = z.object({
  error: z.object({
    code: z.literal("not_implemented"),
    message: z.string().trim().min(1),
    details: notImplementedErrorDetailsSchema
  })
});

export type ResourceImplementation = z.infer<typeof resourceImplementationSchema>;
