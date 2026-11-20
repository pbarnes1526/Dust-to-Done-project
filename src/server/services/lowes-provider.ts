// Lowe's provider adapter — powered by Scavio API.
// Retrieves live product pricing from Lowe's, Terre Haute, IN (store 0524).
// Requires SCAVIO_API_KEY in Airo Secrets.

import type { SupplierProvider, SupplierPrice, ProviderStatus } from './supplier-pricing.js';
import type { ScavioProduct } from './scavio-client.js';
import { scavioLowesSearch, scavioLowesProduct, scavioCheckAuth } from './scavio-client.js';
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

export class LowesProvider implements SupplierProvider {
  readonly name = "Lowe's" as const;
  readonly storeLocation = STORE_LOCATION;

  async searchProducts(query: string): Promise<SupplierPrice[]> {
    const results = await scavioLowesSearch(query);
    return results.map(p => mapToSupplierPrice(p, "Lowe's", STORE_LOCATION));
  }

  async getProductPrice(retailerProductId: string): Promise<SupplierPrice | null> {
    const product = await scavioLowesProduct(retailerProductId);
    if (!product) return null;
    return mapToSupplierPrice(product, "Lowe's", STORE_LOCATION);
  }

  async getConnectionStatus(): Promise<ProviderStatus> {
    const apiKey = getSecret('SCAVIO_API_KEY');
    if (!apiKey) {
      return {
        supplier: "Lowe's",
        connectionStatus: 'awaiting_authorization',
        message: "SCAVIO_API_KEY is not configured. Add it in Airo Secrets to enable live Lowe's pricing.",
        lastChecked: new Date(),
      };
    }

    const auth = await scavioCheckAuth();
    if (!auth.ok) {
      return {
        supplier: "Lowe's",
        connectionStatus: 'error',
        message: `Scavio API key check failed: ${(auth.error ?? '').slice(0, 200)}`,
        lastChecked: new Date(),
      };
    }

    return {
      supplier: "Lowe's",
      connectionStatus: 'connected',
      message: `Connected via Scavio API. Store: ${STORE_LOCATION} (store #0524).`,
      lastChecked: new Date(),
    };
  }
}

export const lowesProvider = new LowesProvider();
