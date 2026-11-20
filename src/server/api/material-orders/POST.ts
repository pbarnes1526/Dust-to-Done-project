import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { materialOrders } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  try {
    const { jobId, description, quantity, unit, supplier, productLink, unitPrice, totalCost, status, orderDate, expectedDelivery, actualDelivery, notes } = req.body;
    if (!description) return res.status(400).json({ error: 'description required' });
    const [result] = await db.insert(materialOrders).values({ jobId, description, quantity, unit, supplier, productLink, unitPrice, totalCost, status: status || 'needed', orderDate, expectedDelivery, actualDelivery, notes });
    const id = (result as { insertId: number }).insertId;
    const [row] = await db.select().from(materialOrders).where(eq(materialOrders.id, id));
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
