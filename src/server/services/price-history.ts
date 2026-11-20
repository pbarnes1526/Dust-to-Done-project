// Price history service -- records supplier price snapshots and detects changes.

import { db } from '../db/client.js';
import { priceHistory, supplierPrices, supplierConnectionStatus } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import type { SupplierName, ComparisonStatus } from './supplier-pricing.js';

export interface PriceChangeEvent {
  materialId: number;
  supplier: SupplierName;
  previousPrice: number;
  newPrice: number;
  dollarDiff: number;
  percentDiff: number;
  isIncrease: boolean;
}

export async function recordPriceSnapshot(
  materialId: number,
  supplier: SupplierName,
  unitPrice: number,
  selectedEstimatePrice: number | null,
  selectedSupplier: SupplierName | null,
  comparisonStatus: ComparisonStatus,
): Promise<PriceChangeEvent | null> {
  // Find the most recent snapshot for this material+supplier
  const [prev] = await db
    .select()
    .from(priceHistory)
    .where(and(eq(priceHistory.materialId, materialId), eq(priceHistory.supplier, supplier)))
    .orderBy(desc(priceHistory.recordedAt))
    .limit(1);

  await db.insert(priceHistory).values({
    materialId,
    supplier,
    unitPrice: String(unitPrice),
    selectedEstimatePrice: selectedEstimatePrice !== null ? String(selectedEstimatePrice) : null,
    selectedSupplier: selectedSupplier ?? null,
    comparisonStatus,
  });

  if (!prev || prev.unitPrice === null) return null;

  const prevPrice = Number(prev.unitPrice);
  if (prevPrice === unitPrice) return null;

  const dollarDiff = unitPrice - prevPrice;
  const percentDiff = prevPrice > 0 ? (dollarDiff / prevPrice) * 100 : 0;

  return {
    materialId,
    supplier,
    previousPrice: prevPrice,
    newPrice: unitPrice,
    dollarDiff,
    percentDiff,
    isIncrease: dollarDiff > 0,
  };
}

export async function upsertSupplierPrice(
  materialId: number,
  supplier: SupplierName,
  data: {
    storeLocation: string;
    retailerProductId?: string;
    sku?: string;
    upc?: string;
    productName?: string;
    productDescription?: string;
    unit?: string;
    unitPrice: number;
    productUrl?: string;
    availabilityStatus: 'available' | 'unavailable' | 'unknown';
    matchConfidence: 'high' | 'medium' | 'low' | 'none';
  },
): Promise<void> {
  const [existing] = await db
    .select()
    .from(supplierPrices)
    .where(and(eq(supplierPrices.materialId, materialId), eq(supplierPrices.supplier, supplier)))
    .limit(1);

  if (existing) {
    await db
      .update(supplierPrices)
      .set({ ...data, unitPrice: String(data.unitPrice), verifiedAt: new Date() })
      .where(eq(supplierPrices.id, existing.id));
  } else {
    await db.insert(supplierPrices).values({
      materialId,
      supplier,
      ...data,
      unitPrice: String(data.unitPrice),
      verifiedAt: new Date(),
    });
  }
}

export async function syncConnectionStatus(
  supplier: SupplierName,
  status: 'connected' | 'awaiting_authorization' | 'error' | 'unconfigured',
  error?: string,
): Promise<void> {
  const [existing] = await db
    .select()
    .from(supplierConnectionStatus)
    .where(eq(supplierConnectionStatus.supplier, supplier))
    .limit(1);

  if (existing) {
    await db
      .update(supplierConnectionStatus)
      .set({
        connectionStatus: status,
        lastSuccessfulCheck: status === 'connected' ? new Date() : existing.lastSuccessfulCheck,
        lastError: error ?? null,
      })
      .where(eq(supplierConnectionStatus.id, existing.id));
  } else {
    await db.insert(supplierConnectionStatus).values({
      supplier,
      connectionStatus: status,
      lastSuccessfulCheck: status === 'connected' ? new Date() : null,
      lastError: error ?? null,
    });
  }
}
