import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { materialOrders } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';
import { createNotification } from '../../../lib/notify.js';

export default async function handler(req: Request<{ orderId: string }>, res: Response) {
  try {
    const id = parseInt(req.params.orderId);
    const { jobId, description, quantity, unit, supplier, productLink, unitPrice, totalCost, status, orderDate, expectedDelivery, actualDelivery, notes } = req.body;
    await db.update(materialOrders).set({ jobId, description, quantity, unit, supplier, productLink, unitPrice, totalCost, status, orderDate, expectedDelivery, actualDelivery, notes }).where(eq(materialOrders.id, id));
    const [row] = await db.select().from(materialOrders).where(eq(materialOrders.id, id));
    if (status === 'received') {
      await createNotification('material_delivery', 'Material Delivered', (description || 'Material order') + ' has been received.', jobId || null);
    } else if (status === 'backordered') {
      await createNotification('delayed_project', 'Material Backordered', (description || 'Material order') + ' is backordered.', jobId || null);
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: 'Failed', message: String(err) });
  }
}
