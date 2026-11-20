import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { takeoffMaterials } from '../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ projectId: string }>, res: Response) {
  try {
    const projectId = Number(req.params.projectId);
    if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid projectId' });
    const { replace, items } = req.body as {
      replace?: boolean;
      items: { category: string; name: string; description?: string; quantity: string; unit: string; unitPrice: string; wastePercent?: string; supplier?: string; productInfo?: string; productLink?: string; priceSource?: string; priceDate?: string; aiGenerated?: number; sortOrder?: number }[];
    };
    if (replace) await db.delete(takeoffMaterials).where(eq(takeoffMaterials.projectId, projectId));
    if (!items || items.length === 0) return res.json([]);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unitPrice) || 0;
      const waste = Number(item.wastePercent ?? 10) / 100;
      const extended = qty * price * (1 + waste);
      await db.insert(takeoffMaterials).values({
        projectId, category: item.category, name: item.name, description: item.description ?? null,
        quantity: String(qty), unit: item.unit, unitPrice: String(price),
        wastePercent: String(item.wastePercent ?? 10),
        extendedPrice: String(Math.round(extended * 100) / 100),
        productLink: item.productLink ?? null,
        supplier: item.supplier ?? null, productInfo: item.productInfo ?? null,
        priceSource: item.priceSource ?? null, priceDate: item.priceDate ?? null,
        aiGenerated: item.aiGenerated ?? 0, sortOrder: item.sortOrder ?? i,
      });
    }
    const all = await db.select().from(takeoffMaterials).where(eq(takeoffMaterials.projectId, projectId));
    return res.status(201).json(all);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save materials', message: String(error) });
  }
}
