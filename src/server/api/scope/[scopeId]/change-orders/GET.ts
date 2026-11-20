import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { scopeChangeOrders } from '../../../../db/schema.js';
import { eq, asc } from 'drizzle-orm';

export default async function handler(req: Request<{ scopeId: string }>, res: Response) {
  try {
    const projectId = Number(req.params.scopeId);
    if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid scopeId' });
    const orders = await db.select().from(scopeChangeOrders).where(eq(scopeChangeOrders.projectId, projectId)).orderBy(asc(scopeChangeOrders.createdAt));
    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch change orders', message: String(error) });
  }
}
