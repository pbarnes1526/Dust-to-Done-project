import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { estimates, estimateLineItems } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ estimateId: string }>, res: Response) {
  try {
    const id = Number(req.params.estimateId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    await db.delete(estimateLineItems).where(eq(estimateLineItems.estimateId, id));
    await db.delete(estimates).where(eq(estimates.id, id));
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete estimate', message: String(error) });
  }
}
