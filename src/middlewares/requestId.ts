import { Context, Next } from "hono";
import { generateRequestId } from "../utils/crypto";
import { Env, Variables } from "../types";

export const requestIdMiddleware = async (c: Context<{ Bindings: Env, Variables: Variables }>, next: Next) => {
  const requestId = c.req.header("X-Request-Id") || generateRequestId();
  c.set("requestId", requestId);
  c.header("X-Request-Id", requestId);
  await next();
};
