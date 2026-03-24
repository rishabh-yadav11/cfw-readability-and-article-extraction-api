export interface Env {
  KV: KVNamespace;
}

export interface ApiKeyData {
  key_id: string;
  prefix: string;
  plan: 'free' | 'pro' | 'agency';
  scopes: string[];
  status: 'active' | 'revoked' | 'expired';
  created_at: number;
  last_used_at?: number;
}

export interface RateLimitData {
  tokens: number;
  last_refill: number;
  daily_usage: number;
  last_daily_reset: number;
}

export interface Variables {
  requestId: string;
  apiKeyData?: ApiKeyData;
}
