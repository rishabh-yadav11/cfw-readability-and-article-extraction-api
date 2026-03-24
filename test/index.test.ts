import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../src/index';

const mockKV = {
  get: async (key: string) => {
    if (key.startsWith('apikey:')) {
      return JSON.stringify({
        key_id: 'test_key',
        plan: 'pro',
        scopes: ['article:read'],
        status: 'active',
      });
    }
    return null;
  },
  put: async () => {},
};

const MOCK_ENV = {
  KV: mockKV as any,
};

const MOCK_CTX = {
  waitUntil: (promise: Promise<any>) => {},
  passThroughOnException: () => {},
  props: {},
} as any;

describe('Readability API', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('should return 401 without auth', async () => {
    const res = await app.fetch(new Request('http://localhost/v1/readability?url=https://example.com'), MOCK_ENV, MOCK_CTX);
    expect(res.status).toBe(401);
  });

  it('should extract article from html', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Article</title>
        </head>
        <body>
          <article>
            <h1>Test Article</h1>
            <p>This is a test paragraph that should be long enough to be considered content by readability. It needs to have enough words to pass the density checks that Readability performs to distinguish between boilerplate and content.</p>
            <p>Another paragraph to make sure it has enough density to be extracted correctly as an article. Adding more text here to ensure it definitely looks like a real article to the extraction algorithm.</p>
          </article>
        </body>
      </html>
    `;
    (globalThis as any).fetch.mockResolvedValue(new Response(mockHtml, {
      headers: { 'Content-Type': 'text/html' }
    }));

    const req = new Request('http://localhost/v1/readability?url=https://example.com/article', {
      headers: { 'Authorization': 'Bearer test_token' }
    });
    const res = await app.fetch(req, MOCK_ENV, MOCK_CTX);
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.data.title).toBe('Test Article');
    expect(body.data.textContent).toContain('This is a test paragraph');
  });

  it('should block local urls', async () => {
    const req = new Request('http://localhost/v1/readability?url=http://localhost:8080', {
      headers: { 'Authorization': 'Bearer test_token' }
    });
    const res = await app.fetch(req, MOCK_ENV, MOCK_CTX);
    expect(res.status).toBe(502);
  });
});
