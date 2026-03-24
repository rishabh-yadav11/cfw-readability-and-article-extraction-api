import { Context, Next } from "hono";
import { Env, Variables } from "../types";

export const idempotencyMiddleware = async (
  c: Context<{ Bindings: Env, Variables: Variables }>,
  next: Next,
) => {
  if (c.req.method !== "POST") {
    return next();
  }

  const idempotencyKey = c.req.header("Idempotency-Key");
  if (!idempotencyKey) {
    return c.json(
      {
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: "Idempotency-Key header is required",
        },
        request_id: c.get("requestId"),
      },
      400,
    );
  }

  const key = `idempotency:${idempotencyKey}`;
  const cached = await c.env.KV.get(key);

  if (cached) {
    const response = JSON.parse(cached);
    return c.json(response.body, response.status);
  }

  // Wrap response to cache it
  const originalJson = c.json.bind(c);
  c.json = (body: any, status: any) => {
    const res = originalJson(body, status);
    if (status >= 200 && status < 300) {
      c.executionCtx.waitUntil(
        c.env.KV.put(key, JSON.stringify({ body, status }), {
          expirationTtl: 3600,
        }),
      );
    }
    return res;
  };

  await next();
};
