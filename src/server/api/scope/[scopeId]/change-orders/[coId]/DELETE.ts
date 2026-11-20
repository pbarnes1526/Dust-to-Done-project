import type { Request, Response } from 'express';
import { db } from '../../../../../db/client.js';
import { scopeChangeOrders } from '../../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ scopeId: string; coId: string }>, res: Response) {
  try {
    const coId = Number(req.params.coId);
    if (isNaN(coId)) return res.status(400).json({ error: 'Invalid coId' });
    await db.delete(scopeChangeOrders).where(eq(scopeChangeOrders.id, coId));
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete change order', message: String(error) });
  }
}
