import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { invoices, invoiceLineItems } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

interface LineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  type: 'labor' | 'materials' | 'other';
}

export default async function handler(req: Request<{ invoiceId: string }>, res: Response) {
  try {
    const id = Number(req.params.invoiceId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const {
      jobId, clientName, clientEmail, clientAddress, projectDescription,
      status, taxRate, dueDate, notes, lineItems,
    } = req.body as {
      jobId?: number; clientName?: string; clientEmail?: string; clientAddress?: string;
      projectDescription?: string; status?: string; taxRate?: number;
      dueDate?: string; notes?: string; lineItems?: LineItemInput[];
    };

    const subtotal = (lineItems ?? []).reduce((s, li) => s + li.quantity * li.unitPrice, 0);
    const rate = taxRate ?? 0;
    const taxAmt = subtotal * (rate / 100);
    const total = subtotal + taxAmt;

    await db.update(invoices).set({
      jobId: jobId ?? null,
      clientName,
      clientEmail: clientEmail ?? null,
      clientAddress: clientAddress ?? null,
      projectDescription: projectDescription ?? null,
      status: status as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | undefined,
      subtotal: subtotal.toFixed(2),
      taxRate: rate.toFixed(2),
      tax: taxAmt.toFixed(2),
      total: total.toFixed(2),
      dueDate: dueDate ?? null,
      notes: notes ?? null,
    }).where(eq(invoices.id, id));

    if (lineItems !== undefined) {
      await db.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, id));
      if (lineItems.length) {
        await db.insert(invoiceLineItems).values(
          lineItems.map(li => ({
            invoiceId: id,
            description: li.description,
            quantity: li.quantity.toFixed(2),
            unitPrice: li.unitPrice.toFixed(2),
            lineTotal: (li.quantity * li.unitPrice).toFixed(2),
            type: li.type ?? 'other',
          }))
        );
      }
    }

    const [updated] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    const items = await db.select().from(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, id));
    return res.json({ ...updated, lineItems: items });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update invoice', message: String(error) });
  }
}
