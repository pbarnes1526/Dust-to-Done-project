// GET /api/supplier-pricing/compare?materialId=
// Returns the stored supplier prices + comparison result for a Price Library item.
import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { supplierPrices, priceLibrary } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';
import { selectHigherVerifiedPrice } from '../../../services/supplier-pricing.js';
import type { SupplierPrice } from '../../../services/supplier-pricing.js';

export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    const materialId = parseInt(String(req.query.materialId ?? ''), 10);
    if (!materialId) {
      res.status(400).json({ error: 'materialId is required' });
      return;
    }

    const [material] = await db.select().from(priceLibrary).where(eq(priceLibrary.id, materialId)).limit(1);
    if (!material) {
      res.status(404).json({ error: 'Material not found' });
      return;
    }

    const prices = await db.select().from(supplierPrices).where(eq(supplierPrices.materialId, materialId));

    const menardsRow = prices.find(p => p.supplier === 'Menards');
    const lowesRow = prices.find(p => p.supplier === "Lowe's");

    const toSupplierPrice = (row: typeof menardsRow): SupplierPrice | null => {
      if (!row || row.unitPrice === null) return null;
      return {
        supplier: row.supplier as SupplierPrice['supplier'],
        retailerProductId: row.retailerProductId ?? '',
        sku: row.sku ?? undefined,
        upc: row.upc ?? undefined,
        productName: row.productName ?? material.name,
        unit: row.unit ?? material.unit,
        unitPrice: Number(row.unitPrice),
        productUrl: row.productUrl ?? undefined,
        storeLocation: row.storeLocation,
        verifiedAt: row.verifiedAt ?? new Date(),
      };
    };

    const menards = toSupplierPrice(menardsRow);
    const lowes = toSupplierPrice(lowesRow);
    const comparison = selectHigherVerifiedPrice(menards, lowes);

    res.json({
      material,
      menards: menardsRow ?? null,
      lowes: lowesRow ?? null,
      comparison,
    });
  } catch (err) {
    res.status(500).json({ error: 'Compare failed', message: String(err) });
  }
}
