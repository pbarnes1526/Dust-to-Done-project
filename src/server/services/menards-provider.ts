// Menards provider adapter — powered by Scavio API.
// Retrieves live product pricing from Menards, Terre Haute, IN (store 3180).
// Requires SCAVIO_API_KEY in Airo Secrets.

import type { SupplierProvider, SupplierPrice, ProviderStatus } from './supplier-pricing.js';
import type { ScavioProduct } from './scavio-client.js';
import { scavioMenardsSearch, scavioMenardsProduct, scavioCheckAuth } from './scavio-client.js';
import { getSecret } from '#airo/secrets';

const STORE_LOCATION = 'Terre Haute, IN';

function mapToSupplierPrice(p: ScavioProduct, supplier: 'Menards' | "Lowe's", storeLocation: string): SupplierPrice {
  const resolvedPrice = p.price ?? p.sale_price ?? p.regular_price ?? 0;
  return {
    supplier,
    retailerProductId: p.item_id ?? p.id ?? '',
    sku: p.item_number ?? p.model_number ?? p.sku,
    upc: p.upc,
    productName: p.title ?? p.name ?? '',
    unit: p.unit ?? 'each',
    unitPrice: typeof resolvedPrice === 'number' ? resolvedPrice : 0,
    productUrl: p.url ?? p.productUrl,
    storeLocation,
    verifiedAt: new Date(p.lastVerified ?? p.verifiedAt ?? new Date().toISOString()),
  };
}

export class MenardsProvider implements SupplierProvider {
  readonly name = 'Menards' as const;
  readonly storeLocation = STORE_LOCATION;

  async searchProducts(query: string): Promise<SupplierPrice[]> {
    const results = await scavioMenardsSearch(query);
    return results.map(p => mapToSupplierPrice(p, 'Menards', STORE_LOCATION));
  }

  async getProductPrice(retailerProductId: string): Promise<SupplierPrice | null> {
    const product = await scavioMenardsProduct(retailerProductId);
    if (!product) return null;
    return mapToSupplierPrice(product, 'Menards', STORE_LOCATION);
  }

  async getConnectionStatus(): Promise<ProviderStatus> {
    const apiKey = getSecret('SCAVIO_API_KEY');
    if (!apiKey) {
      return {
        supplier: 'Menards',
        connectionStatus: 'awaiting_authorization',
        message: 'SCAVIO_API_KEY is not configured. Add it in Airo Secrets to enable live Menards pricing.',
        lastChecked: new Date(),
      };
    }

    const auth = await scavioCheckAuth();
    if (!auth.ok) {
      return {
        supplier: 'Menards',
        connectionStatus: 'error',
        message: `Scavio API key check failed: ${(auth.error ?? '').slice(0, 200)}`,
        lastChecked: new Date(),
      };
    }

    return {
      supplier: 'Menards',
      connectionStatus: 'connected',
      message: `Connected via Scavio API. Store: ${STORE_LOCATION} (store #3180).`,
      lastChecked: new Date(),
    };
  }
}

export const menardsProvider = new MenardsProvider();
