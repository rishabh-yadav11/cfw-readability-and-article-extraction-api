import { Context, Next } from "hono";
import { hashApiKey } from "../utils/crypto";
import { ApiKeyData, Env, Variables } from "../types";

export const authMiddleware = (requiredScope: string) => {
  return async (
    c: Context<{
      Bindings: Env;
      Variables: Variables;
    }>,
    next: Next,
  ) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json(
        {
          ok: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Missing or invalid Authorization header",
          },
          request_id: c.get("requestId"),
        },
        401,
      );
    }

    const apiKey = authHeader.substring(7);
    const hash = await hashApiKey(apiKey);

    const dataStr = await c.env.KV.get(`apikey:${hash}`);
    if (!dataStr) {
      return c.json(
        {
          ok: false,
          error: { code: "UNAUTHORIZED", message: "Invalid API key" },
          request_id: c.get("requestId"),
        },
        401,
      );
    }

    let keyData: ApiKeyData;
    try {
      keyData = JSON.parse(dataStr) as ApiKeyData;
    } catch (e) {
      return c.json(
        {
          ok: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Error parsing API key data",
          },
          request_id: c.get("requestId"),
        },
        500,
      );
    }

    if (keyData.status !== "active") {
      return c.json(
        {
          ok: false,
          error: {
            code: "UNAUTHORIZED",
            message: "API key is revoked or inactive",
          },
          request_id: c.get("requestId"),
        },
        401,
      );
    }

    if (!keyData.scopes.includes(requiredScope)) {
      return c.json(
        {
          ok: false,
          error: {
            code: "FORBIDDEN",
            message: `Missing required scope: ${requiredScope}`,
          },
          request_id: c.get("requestId"),
        },
        403,
      );
    }

    c.executionCtx.waitUntil(
      c.env.KV.put(
        `apikey:${hash}`,
        JSON.stringify({ ...keyData, last_used_at: Date.now() }),
      ),
    );

    c.set("apiKeyData", keyData);
    await next();
  };
};
