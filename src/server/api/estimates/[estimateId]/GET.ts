import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { estimates, estimateLineItems } from '../../../db/schema.js';
import { eq, asc } from 'drizzle-orm';

export default async function handler(req: Request<{ estimateId: string }>, res: Response) {
  try {
    const id = Number(req.params.estimateId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const [est] = await db.select().from(estimates).where(eq(estimates.id, id)).limit(1);
    if (!est) return res.status(404).json({ error: 'Estimate not found' });
    const lineItems = await db.select().from(estimateLineItems).where(eq(estimateLineItems.estimateId, id)).orderBy(asc(estimateLineItems.sortOrder));
    return res.json({ ...est, lineItems });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch estimate', message: String(error) });
  }
}
