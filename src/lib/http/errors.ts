import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export function jsonErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown> | undefined
) {
  return Response.json(
    {
      error: {
        code,
        message,
        details: details ?? null
      }
    },
    { status }
  );
}

export function throwJsonHttpError(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown> | undefined
): never {
  throw new HTTPException(status as ContentfulStatusCode, {
    res: jsonErrorResponse(code, message, status, details)
  });
}
