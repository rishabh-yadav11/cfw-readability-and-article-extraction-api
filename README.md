# Article Extraction & Content Clean

> **News / Data** | High-performance API powered by Cloudflare Workers.

## Description
Turn messy web pages into clean, structured JSON. Extract author, publish date, main image, and clean text.

This API is designed for high-scale applications requiring low latency and robust security. It is fully integrated with RapidAPI for seamless billing and key management.

## Key Features
- **Global Low Latency**: Deployed on Cloudflare's global edge network.
- **Enterprise Security**: Built-in SSRF protection and strict input validation.
- **Developer First**: Structured JSON responses and clear error codes.
- **RapidAPI Ready**: No custom auth logic required; simply use your RapidAPI Key.

## Authentication
This API is exclusively available via **RapidAPI**. 
1. Subscribe to a plan on the RapidAPI Marketplace.
2. Include the following headers in your requests:
   - `X-RapidAPI-Key`: Your unique RapidAPI Subscription Key.
   - `X-RapidAPI-Host`: The host assigned by RapidAPI.

## API Endpoints
- GET /v1/readability?url=\n- GET /v1/article?url=\n- POST /v1/readability/batch

## Implementation Details
- **Technology**: TypeScript / Hono / Cloudflare Workers
- **Database**: Cloudflare D1 (SQL) for usage tracking
- **Response Format**: JSON
- **Rate Limits**: Managed by your RapidAPI plan (Basic, Pro, Ultra)

## Standard Response Shape
```json
{
  "ok": true,
  "data": { ... },
  "request_id": "req_..."
}
```

---
*Maintained by rishabh-yadav11. For custom enterprise deployments, contact us.*
