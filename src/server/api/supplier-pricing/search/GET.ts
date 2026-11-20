// GET /api/supplier-pricing/search?q=&supplier=
// Searches both suppliers sequentially (Scavio free plan: 1 in-flight at a time).
// When q looks like a SKU number, routes to direct product lookup instead of keyword search.
// Optional ?supplier=menards|lowes restricts the search to one supplier (useful for SKU lookup).
import type { Request, Response } from 'express';
import { menardsProvider } from '../../../services/menards-provider.js';
import { lowesProvider } from '../../../services/lowes-provider.js';
import { scavioMenardsSearchBySku, scavioLowesSearchBySku } from '../../../services/scavio-client.js';
import {
  classifyProduct,
  classifySearchResult,
  groupSearchResults,
  type SearchResultProduct,
  type GroupedSearchResult,
} from '../../../services/product-matcher.js';
import type { SupplierPrice } from '../../../services/supplier-pricing.js';

// SKU detection heuristic.
// Menards item numbers: 5-7 digit numeric strings (e.g. 1234567, 161234)
// Lowe's item numbers:  numeric, often 6-9 digits (e.g. 123456, 5013453)
// Model/SKU codes:      alphanumeric with dashes (e.g. 2x4-8-PT, SPF-2X4-8)
// We flag as SKU when the input is:
//   - purely numeric with 5+ digits, OR
//   - alphanumeric+dash with no spaces and at least one digit
function detectSkuInput(q: string): { isSku: boolean; normalizedSku: string } {
  const trimmed = q.trim();
  const pureNumeric = /^\d{5,}$/.test(trimmed);
  const alphanumericCode = /^[A-Za-z0-9][A-Za-z0-9\-]{3,}$/.test(trimmed) && /\d/.test(trimmed) && !/\s/.test(trimmed);
  return {
    isSku: pureNumeric || alphanumericCode,
    normalizedSku: trimmed,
  };
}

function toSearchProduct(p: SupplierPrice): Omit<SearchResultProduct, 'category' | 'classification' | 'isLikelyMatch' | 'matchNote'> {
  return {
    supplier: p.supplier,
    retailerProductId: p.retailerProductId,
    sku: p.sku,
    productName: p.productName,
    unit: p.unit,
    unitPrice: p.unitPrice,
    productUrl: p.productUrl,
    storeLocation: p.storeLocation,
    verifiedAt: p.verifiedAt.toISOString(),
  };
}

export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    const q = String(req.query.q ?? '').trim();
    if (!q) {
      res.status(400).json({ error: 'Query parameter q is required' });
      return;
    }

    // Optional supplier filter — 'menards' | 'lowes' | undefined (both)
    const supplierParam = String(req.query.supplier ?? '').toLowerCase().trim();
    const supplierFilter: 'menards' | 'lowes' | 'both' =
      supplierParam === 'menards' ? 'menards' :
      supplierParam === 'lowes'   ? 'lowes'   : 'both';

    const { isSku, normalizedSku } = detectSkuInput(q);

    // Classify the query for product matching (used even for SKU lookups)
    const queryClassification = classifyProduct(q);
    const queryCategory = queryClassification.category;
    const queryDimensions = queryClassification.dimensions;

    let menardsRaw: SupplierPrice[] = [];
    let lowesRaw: SupplierPrice[] = [];

    if (isSku) {
      // SKU mode: direct product lookup, sequential per Scavio free plan rules
      if (supplierFilter === 'menards' || supplierFilter === 'both') {
        const skuResults = await scavioMenardsSearchBySku(normalizedSku);
        menardsRaw = skuResults.map(p => {
          const resolvedPrice = p.price ?? p.sale_price ?? p.regular_price ?? 0;
          return {
            supplier: 'Menards' as const,
            retailerProductId: p.item_id ?? p.id ?? '',
            sku: p.item_number ?? p.model_number ?? p.sku,
            upc: p.upc,
            productName: p.title ?? p.name ?? '',
            unit: p.unit ?? 'each',
            unitPrice: typeof resolvedPrice === 'number' ? resolvedPrice : 0,
            productUrl: p.url ?? p.productUrl,
            storeLocation: 'Terre Haute, IN',
            verifiedAt: new Date(p.lastVerified ?? p.verifiedAt ?? new Date().toISOString()),
          };
        });
      }
      if (supplierFilter === 'lowes' || supplierFilter === 'both') {
        const skuResults = await scavioLowesSearchBySku(normalizedSku);
        lowesRaw = skuResults.map(p => {
          const resolvedPrice = p.price ?? p.sale_price ?? p.regular_price ?? 0;
          return {
            supplier: "Lowe's" as const,
            retailerProductId: p.item_id ?? p.id ?? '',
            sku: p.item_number ?? p.model_number ?? p.sku,
            upc: p.upc,
            productName: p.title ?? p.name ?? '',
            unit: p.unit ?? 'each',
            unitPrice: typeof resolvedPrice === 'number' ? resolvedPrice : 0,
            productUrl: p.url ?? p.productUrl,
            storeLocation: 'Terre Haute, IN',
            verifiedAt: new Date(p.lastVerified ?? p.verifiedAt ?? new Date().toISOString()),
          };
        });
      }
    } else {
      // Keyword search mode — sequential, both suppliers
      if (supplierFilter === 'menards' || supplierFilter === 'both') {
        menardsRaw = await menardsProvider.searchProducts(q);
      }
      if (supplierFilter === 'lowes' || supplierFilter === 'both') {
        lowesRaw = await lowesProvider.searchProducts(q);
      }
    }

    // Classify every result
    const menards: SearchResultProduct[] = menardsRaw.map(p =>
      classifySearchResult(toSearchProduct(p), queryCategory, queryDimensions),
    );
    const lowes: SearchResultProduct[] = lowesRaw.map(p =>
      classifySearchResult(toSearchProduct(p), queryCategory, queryDimensions),
    );

    // Group all results together by category
    const allProducts = [...menards, ...lowes];
    const grouped: GroupedSearchResult[] = groupSearchResults(allProducts, queryCategory);

    // Likely-match products from each supplier (for quick comparison)
    const likelyMenards = menards.filter(p => p.isLikelyMatch);
    const likelyLowes = lowes.filter(p => p.isLikelyMatch);

    res.json({
      query: q,
      queryCategory,
      queryDimensions,
      isSku,
      supplierFilter,
      menards,
      lowes,
      grouped,
      likelyMatches: { menards: likelyMenards, lowes: likelyLowes },
    });
  } catch (err) {
    res.status(500).json({ error: 'Search failed', message: String(err) });
  }
}
