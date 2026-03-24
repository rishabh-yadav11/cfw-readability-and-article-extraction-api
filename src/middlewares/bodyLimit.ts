import { Context, Next } from "hono";
import { Env, Variables } from "../types";

export const bodyLimitMiddleware = async (c: Context<{ Bindings: Env, Variables: Variables }>, next: Next) => {
  const contentLength = c.req.header("Content-Length");
  if (contentLength && parseInt(contentLength) > 256 * 1024) {
    return c.json(
      {
        ok: false,
        error: { code: "PAYLOAD_TOO_LARGE", message: "Payload too large" },
        request_id: c.get("requestId"),
      },
      413,
    );
  }
  await next();
};
