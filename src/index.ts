import { Hono } from 'hono';
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import { requestIdMiddleware } from './middlewares/requestId';
import { bodyLimitMiddleware } from './middlewares/bodyLimit';
import { authMiddleware } from './middlewares/auth';
import { rateLimitMiddleware } from './middlewares/rateLimit';
import { Env, Variables } from './types';
import { isUrlAllowed } from './utils/ssrf';

const app = new Hono<{ Bindings: Env, Variables: Variables }>();

app.use('*', requestIdMiddleware);
app.use('*', bodyLimitMiddleware);

app.get('/', (c) => {
  return c.json({
    ok: true,
    message: 'Readability and Article Extraction API',
    version: '1.0.0',
  });
});

// Protected routes
const protectedRoutes = new Hono<{ Bindings: Env, Variables: Variables }>();
protectedRoutes.use('*', authMiddleware('article:read'));
protectedRoutes.use('*', rateLimitMiddleware);

async function extractArticle(url: string) {
  if (!isUrlAllowed(url)) {
    throw new Error('Invalid or blocked URL');
  }

  const response = await fetch(url, {
    headers: { 'User-Agent': 'CFW-Readability-Bot/1.0' },
    cf: { cacheTtl: 86400 }, // Cache for 24h as per spec
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.statusText}`);
  }

  const html = await response.text();
  const { document } = parseHTML(html);
  
  // Readability needs a 'document' like object.
  const reader = new Readability(document as any);
  const article = reader.parse();

  if (!article) {
    throw new Error('Failed to extract article content');
  }

  return article;
}

protectedRoutes.get('/readability', async (c) => {
  const url = c.req.query('url');
  if (!url) return c.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'URL is required' } }, 400);

  try {
    const article = await extractArticle(url);
    return c.json({ ok: true, data: article, request_id: c.get('requestId') });
  } catch (e: any) {
    return c.json({ ok: false, error: { code: 'UPSTREAM_ERROR', message: e.message } }, 502);
  }
});

protectedRoutes.get('/article', async (c) => {
  const url = c.req.query('url');
  if (!url) return c.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'URL is required' } }, 400);

  try {
    const article = await extractArticle(url);
    return c.json({ ok: true, data: article, request_id: c.get('requestId') });
  } catch (e: any) {
    return c.json({ ok: false, error: { code: 'UPSTREAM_ERROR', message: e.message } }, 502);
  }
});

protectedRoutes.post('/readability/batch', async (c) => {
  const { urls } = await c.req.json();
  if (!Array.isArray(urls)) return c.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'urls array is required' } }, 400);

  const results = await Promise.all(
    urls.slice(0, 5).map(async (url) => {
      try {
        const article = await extractArticle(url);
        return { url, ok: true, data: article };
      } catch (e: any) {
        return { url, ok: false, error: e.message };
      }
    })
  );

  return c.json({ ok: true, data: results, request_id: c.get('requestId') });
});

app.route('/v1', protectedRoutes);

export default app;
