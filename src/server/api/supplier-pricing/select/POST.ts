// POST /api/supplier-pricing/select
// Two modes:
//   1. Select an existing DB supplier price as the active price for a material
//      Body: { materialId, supplier }
//   2. Manually select a live search product as the equivalent for a material
//      Body: { materialId, product: SearchResultProduct, confidence: 'high'|'medium'|'low' }
//
// Never overwrites a manually locked/approved estimate price.
import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { priceLibrary, supplierPrices } from '../../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { SearchResultProduct } from '../../../services/product-matcher.js';

interface SelectBySupplierBody {
  materialId: number;
  supplier: string;
  product?: undefined;
}

interface SelectByProductBody {
  materialId: number;
  supplier?: undefined;
  product: SearchResultProduct;
  confidence: 'high' | 'medium' | 'low';
  matchReason: string;
}

type Body = SelectBySupplierBody | SelectByProductBody;

export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as Body;
    const { materialId } = body;

    if (!materialId) {
      res.status(400).json({ error: 'materialId is required' });
      return;
    }

    const [material] = await db.select().from(priceLibrary).where(eq(priceLibrary.id, materialId)).limit(1);
    if (!material) {
      res.status(404).json({ error: 'Material not found' });
      return;
    }

    // Mode 2: manually select a live search product
    if (body.product) {
      const p = body.product;
      const supplier = p.supplier as 'Menards' | "Lowe's";

      if (p.unitPrice <= 0) {
        res.status(400).json({ error: 'Cannot select a product with no verified price' });
        return;
      }

      // Upsert into supplier_prices for this material + supplier
      const existing = await db
        .select()
        .from(supplierPrices)
        .where(and(eq(supplierPrices.materialId, materialId), eq(supplierPrices.supplier, supplier)))
        .limit(1);

      const priceDecimal = p.unitPrice.toFixed(2);
      const now = new Date();

      if (existing.length > 0) {
        await db
          .update(supplierPrices)
          .set({
            retailerProductId: p.retailerProductId,
            sku: p.sku ?? null,
            productName: p.productName,
            unit: p.unit,
            unitPrice: priceDecimal,
            productUrl: p.productUrl ?? null,
            verifiedAt: now,
            availabilityStatus: 'available',
            matchConfidence: body.confidence,
            updatedAt: now,
          })
          .where(and(eq(supplierPrices.materialId, materialId), eq(supplierPrices.supplier, supplier)));
      } else {
        await db.insert(supplierPrices).values({
          materialId,
          supplier,
          storeLocation: p.storeLocation,
          retailerProductId: p.retailerProductId,
          sku: p.sku ?? null,
          productName: p.productName,
          unit: p.unit,
          unitPrice: priceDecimal,
          productUrl: p.productUrl ?? null,
          verifiedAt: now,
          availabilityStatus: 'available',
          matchConfidence: body.confidence,
        });
      }

      res.json({
        ok: true,
        mode: 'manual_product_selection',
        materialId,
        supplier,
        unitPrice: p.unitPrice,
        productName: p.productName,
        confidence: body.confidence,
        matchReason: body.matchReason,
      });
      return;
    }

    // Mode 1: select existing DB supplier price
    const { supplier } = body;
    if (!supplier) {
      res.status(400).json({ error: 'supplier is required' });
      return;
    }

    const [price] = await db
      .select()
      .from(supplierPrices)
      .where(and(eq(supplierPrices.materialId, materialId), eq(supplierPrices.supplier, supplier as 'Menards' | "Lowe's")))
      .limit(1);

    if (!price || price.unitPrice === null) {
      res.status(404).json({ error: 'No verified price found for this supplier' });
      return;
    }

    res.json({ ok: true, mode: 'existing_price', unitPrice: price.unitPrice, supplier });
  } catch (err) {
    res.status(500).json({ error: 'Select failed', message: String(err) });
  }
}
