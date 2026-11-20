import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { priceLibrary } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  try {
    const { name, description, category, unit, unitPrice, vendor, sku, notes } = req.body as Record<string, string>;
    if (!name || !unitPrice) return res.status(400).json({ error: 'name and unitPrice are required' });
    const [result] = await db.insert(priceLibrary).values({
      name, description: description || null, category: category || 'materials',
      unit: unit || 'ea', unitPrice, vendor: vendor || null, sku: sku || null, notes: notes || null,
    });
    const insertId = (result as { insertId: number }).insertId;
    const inserted = await db.select().from(priceLibrary).where(eq(priceLibrary.id, insertId));
    res.status(201).json(inserted[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create price library item', message: String(err) });
  }
}
