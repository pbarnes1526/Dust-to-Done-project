import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { priceLibrary } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ itemId: string }>, res: Response) {
  try {
    const id = parseInt(req.params.itemId, 10);
    const { name, description, category, unit, unitPrice, vendor, sku, notes } = req.body as Record<string, string>;
    if (!name || !unitPrice) return res.status(400).json({ error: 'name and unitPrice are required' });
    await db.update(priceLibrary).set({
      name, description: description || null, category: category || 'materials',
      unit: unit || 'ea', unitPrice, vendor: vendor || null, sku: sku || null, notes: notes || null,
    }).where(eq(priceLibrary.id, id));
    const updated = await db.select().from(priceLibrary).where(eq(priceLibrary.id, id));
    if (!updated.length) return res.status(404).json({ error: 'Not found' });
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update price library item', message: String(err) });
  }
}