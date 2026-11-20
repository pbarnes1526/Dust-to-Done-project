import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { invoices, invoiceLineItems } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request<{ invoiceId: string }>, res: Response) {
  try {
    const id = Number(req.params.invoiceId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    await db.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, id));
    await db.delete(invoices).where(eq(invoices.id, id));
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete invoice', message: String(error) });
  }
}
