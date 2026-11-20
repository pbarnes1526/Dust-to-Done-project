import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { materialOrders } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ orderId: string }>, res: Response) {
  try {
    const id = parseInt(req.params.orderId);
    await db.delete(materialOrders).where(eq(materialOrders.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
