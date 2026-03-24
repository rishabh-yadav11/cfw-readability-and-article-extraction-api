import { Context, Next } from "hono";
import { Env, ApiKeyData, RateLimitData, Variables } from "../types";

export const rateLimitMiddleware = async (
  c: Context<{
    Bindings: Env;
    Variables: Variables;
  }>,
  next: Next,
) => {
  const apiKeyData = c.get("apiKeyData");
  const ip = c.req.header("CF-Connecting-IP") || "unknown";
  const key = `ratelimit:${apiKeyData ? apiKeyData.key_id : ip}`;

  const limits = {
    free: { rpm: 60, daily: 5000 },
    pro: { rpm: 300, daily: 100000 },
    agency: { rpm: 1000, daily: 1000000 }, // No explicit daily for agency in spec, using large number
  };

  const plan = apiKeyData?.plan || "free";
  const limit = limits[plan];

  const dataStr = await c.env.KV.get(key);
  let data: RateLimitData;

  const now = Date.now();
  const dayStart = new Date().setHours(0, 0, 0, 0);

  if (!dataStr) {
    data = {
      tokens: limit.rpm,
      last_refill: now,
      daily_usage: 0,
      last_daily_reset: dayStart,
    };
  } else {
    data = JSON.parse(dataStr);
  }

  // Reset daily if needed
  if (data.last_daily_reset < dayStart) {
    data.daily_usage = 0;
    data.last_daily_reset = dayStart;
  }

  // Refill tokens
  const elapsed = (now - data.last_refill) / 1000;
  const refill = elapsed * (limit.rpm / 60);
  data.tokens = Math.min(limit.rpm, data.tokens + refill);
  data.last_refill = now;

  if (data.tokens < 1 || data.daily_usage >= limit.daily) {
    c.header("Retry-After", "60");
    return c.json(
      {
        ok: false,
        error: { code: "RATE_LIMITED", message: "Too many requests" },
        request_id: c.get("requestId"),
      },
      429,
    );
  }

  data.tokens -= 1;
  data.daily_usage += 1;

  c.executionCtx.waitUntil(c.env.KV.put(key, JSON.stringify(data)));

  c.header("X-RateLimit-Limit", limit.rpm.toString());
  c.header("X-RateLimit-Remaining", Math.floor(data.tokens).toString());
  c.header("X-RateLimit-Reset", (Math.floor(now / 1000) + 60).toString());

  await next();
};
