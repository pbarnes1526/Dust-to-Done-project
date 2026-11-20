import type { Request, Response } from 'express';
import { db } from '../../../../../db/client.js';
import { takeoffMaterials } from '../../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ projectId: string; materialId: string }>, res: Response) {
  try {
    const id = Number(req.params.materialId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid materialId' });
    const { category, name, description, quantity, unit, unitPrice, wastePercent, supplier, productInfo, productLink, priceSource, priceDate, sortOrder } = req.body;
    const qty = Number(quantity) || 1;
    const price = Number(unitPrice) || 0;
    const waste = Number(wastePercent ?? 10) / 100;
    const extended = qty * price * (1 + waste);
    await db.update(takeoffMaterials).set({
      category, name, description, quantity: String(qty), unit, unitPrice: String(price),
      wastePercent: String(wastePercent ?? 10),
      extendedPrice: String(Math.round(extended * 100) / 100),
      supplier, productInfo, productLink: productLink ?? null, priceSource, priceDate, sortOrder,
    }).where(eq(takeoffMaterials.id, id));
    const [updated] = await db.select().from(takeoffMaterials).where(eq(takeoffMaterials.id, id)).limit(1);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update material', message: String(error) });
  }
}
