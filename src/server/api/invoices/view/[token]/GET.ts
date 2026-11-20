// GET /api/invoices/view/:token — public, no auth required
import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { invoices, invoiceLineItems } from '../../../../db/schema.js';
import { eq, asc } from 'drizzle-orm';

export default async function handler(req: Request<{ token: string }>, res: Response) {
  try {
    const { token } = req.params;
    if (!token || token.length < 16) return res.status(400).json({ error: 'Invalid token' });

    const [inv] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.viewToken, token))
      .limit(1);

    if (!inv) return res.status(404).json({ error: 'Invoice not found' });

    const lineItems = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, inv.id))
      .orderBy(asc(invoiceLineItems.id));

    return res.json({ ...inv, lineItems });
  } catch (error) {
    console.error('invoice view error:', error);
    return res.status(500).json({ error: 'Failed to load invoice' });
  }
}
