import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { invoices, invoiceLineItems } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ invoiceId: string }>, res: Response) {
  try {
    const id = Number(req.params.invoiceId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });
    const items = await db.select().from(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, id));
    return res.json({ ...inv, lineItems: items });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch invoice', message: String(error) });
  }
}
