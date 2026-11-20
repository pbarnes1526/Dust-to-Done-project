// Scavio API client — building materials pricing data provider.
// Docs: https://scavio.dev/docs
// Credentials: SCAVIO_API_KEY stored in Airo Secrets.
//
// Endpoint pattern: GET /api/v1/{retailer}/search?q=&store_id=
//                   GET /api/v1/{retailer}/product/{id}?store_id=
// Menards store 3180 = Terre Haute, IN
// Lowe's  store 0524 = Terre Haute, IN

import { getSecret } from '#airo/secrets';

const BASE_URL = 'https://api.scavio.dev/api/v1';
const TIMEOUT_MS = 15_000;

// Scavio free plan allows only 1 in-flight request at a time.
// Attach the queue chain to globalThis so it survives Vite SSR module re-imports
// and is shared across all callers in the same Node process.
declare const globalThis: { __scavioChain?: Promise<unknown> };
if (!globalThis.__scavioChain) globalThis.__scavioChain = Promise.resolve();

function scavioQueue<T>(fn: () => Promise<T>): Promise<T> {
  const next = globalThis.__scavioChain!.then(() => fn(), () => fn());
  globalThis.__scavioChain = next.then(() => undefined, () => undefined);
  return next;
}

// Terre Haute, IN store identifiers
export const MENARDS_STORE_ID = '3180';
export const LOWES_STORE_ID = '0524';
export const TERRE_HAUTE_ZIP = '47802';

export interface ScavioProduct {
  // Scavio actual field names from API response
  item_id?: string;
  item_number?: string;
  model_number?: string;
  sku?: string;
  upc?: string;
  title?: string;
  name?: string;
  description?: string;
  brand?: string;
  unit?: string;
  price?: number | null;
  regular_price?: number | null;
  sale_price?: number | null;
  currency?: string;
  retailer?: string;
  url?: string;
  productUrl?: string;
  image?: string;
  availability?: string;
  in_stock?: boolean;
  lastVerified?: string;
  verifiedAt?: string;
  // fallback id field
  id?: string;
}

export interface ScavioSearchResponse {
  // Scavio wraps results in: { data: { products: [...], total_results, ... }, credits_used, ... }
  data?: {
    products?: ScavioProduct[];
    total_results?: number;
    total_pages?: number;
    count?: number;
  };
  // Fallback flat shapes
  results?: ScavioProduct[];
  products?: ScavioProduct[];
}

async function scavioFetch<T>(
  path: string,
  params: Record<string, string> = {},
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, unknown>,
  retries = 2,
): Promise<T> {
  return scavioQueue(() => scavioFetchDirect<T>(path, params, method, body, retries));
}

async function scavioFetchDirect<T>(
  path: string,
  params: Record<string, string> = {},
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, unknown>,
  retries = 2,
): Promise<T> {
  const apiKey = getSecret('SCAVIO_API_KEY');
  if (!apiKey) throw new Error('SCAVIO_API_KEY is not configured');

  const url = new URL(BASE_URL + path);
  if (method === 'GET') {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(url.toString(), {
        method,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'DustToDone/1.0',
        },
        body: method === 'POST' ? JSON.stringify(body ?? params) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);

      // 429 should not happen with the queue, but back off and retry if it does
      if (res.status === 429 && attempt < retries) {
        const retryAfter = Number(res.headers.get('retry-after') ?? 3);
        await new Promise(r => setTimeout(r, (retryAfter + attempt * 2) * 1000));
        continue;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Scavio API error ${res.status}: ${text.slice(0, 300)}`);
      }

      return res.json() as Promise<T>;
    } catch (err) {
      clearTimeout(timer);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
    }
  }

  throw new Error('Scavio API: max retries exceeded');
}

/** Search Menards products by keyword. store_id 3180 = Terre Haute, IN. */
export async function scavioMenardsSearch(query: string, limit = 10): Promise<ScavioProduct[]> {
  const data = await scavioFetch<ScavioSearchResponse>(
    '/menards/search',
    {},
    'POST',
    { query, store_id: MENARDS_STORE_ID, zip: TERRE_HAUTE_ZIP, limit },
  );
  return data.data?.products ?? data.results ?? data.products ?? [];
}

/** Get a specific Menards product price by product ID. */
export async function scavioMenardsProduct(productId: string): Promise<ScavioProduct | null> {
  try {
    const data = await scavioFetch<{ data?: ScavioProduct; product?: ScavioProduct }>(
      `/menards/product/${encodeURIComponent(productId)}`,
      { store_id: MENARDS_STORE_ID },
      'GET',
    );
    return data.data ?? data.product ?? null;
  } catch {
    return null;
  }
}

/** Search Lowe's products by keyword. store_id 0524 = Terre Haute, IN. */
export async function scavioLowesSearch(query: string, limit = 10): Promise<ScavioProduct[]> {
  const data = await scavioFetch<ScavioSearchResponse>(
    '/lowes/search',
    {},
    'POST',
    { query, store_id: LOWES_STORE_ID, zip: TERRE_HAUTE_ZIP, limit },
  );
  return data.data?.products ?? data.results ?? data.products ?? [];
}

/** Get a specific Lowe's product price by product ID. */
export async function scavioLowesProduct(productId: string): Promise<ScavioProduct | null> {
  try {
    const data = await scavioFetch<{ data?: ScavioProduct; product?: ScavioProduct }>(
      `/lowes/product/${encodeURIComponent(productId)}`,
      { store_id: LOWES_STORE_ID },
      'GET',
    );
    return data.data ?? data.product ?? null;
  } catch {
    return null;
  }
}

/**
 * Look up a Menards product by SKU number.
 * Tries the direct product endpoint first (SKU as product ID), then falls back
 * to a keyword search using the SKU string so partial/formatted SKUs still resolve.
 */
export async function scavioMenardsSearchBySku(sku: string): Promise<ScavioProduct[]> {
  // Try direct product lookup first — Menards item numbers map to product IDs
  const direct = await scavioMenardsProduct(sku);
  if (direct) return [direct];
  // Fall back to keyword search — Scavio indexes SKU/item_number in search
  return scavioMenardsSearch(sku, 5);
}

/**
 * Look up a Lowe's product by SKU/item number.
 * Tries the direct product endpoint first, then falls back to keyword search.
 */
export async function scavioLowesSearchBySku(sku: string): Promise<ScavioProduct[]> {
  const direct = await scavioLowesProduct(sku);
  if (direct) return [direct];
  return scavioLowesSearch(sku, 5);
}

/** Check API key validity via the usage endpoint (no credits consumed). */
export async function scavioCheckAuth(): Promise<{ ok: boolean; error?: string }> {
  try {
    await scavioFetch<unknown>('/usage', {}, 'GET');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
