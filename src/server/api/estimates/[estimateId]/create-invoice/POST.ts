import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { estimates, estimateLineItems, invoices, invoiceLineItems } from '../../../../db/schema.js';
import { eq, asc } from 'drizzle-orm';

export default async function handler(req: Request<{ estimateId: string }>, res: Response) {
  try {
    const id = Number(req.params.estimateId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const [est] = await db.select().from(estimates).where(eq(estimates.id, id)).limit(1);
    if (!est) return res.status(404).json({ error: 'Estimate not found' });

    const lineItems = await db.select().from(estimateLineItems)
      .where(eq(estimateLineItems.estimateId, id))
      .orderBy(asc(estimateLineItems.sortOrder));

    // Generate invoice number
    const allInvoices = await db.select().from(invoices);
    const invoiceNumber = `INV-${String(allInvoices.length + 1).padStart(4, '0')}`;

    const subtotal = Number(est.subtotal);
    const total = Number(est.total);

    const result = await db.insert(invoices).values({
      jobId: est.jobId ?? null,
      invoiceNumber,
      status: 'draft' as const,
      clientName: est.clientName,
      clientEmail: est.clientEmail ?? null,
      clientAddress: est.clientAddress ?? null,
      projectDescription: est.projectDescription ?? null,
      subtotal: subtotal.toFixed(2),
      taxRate: '0.00',
      tax: '0.00',
      total: total.toFixed(2),
      dueDate: null,
      notes: est.notes ?? null,
    });

    const invoiceId = Number(result[0].insertId);

    if (lineItems.length) {
      await db.insert(invoiceLineItems).values(
        lineItems.map(li => ({
          invoiceId,
          description: li.description,
          quantity: String(li.quantity),
          unitPrice: String(li.unitPrice),
          lineTotal: (Number(li.quantity) * Number(li.unitPrice)).toFixed(2),
          type: (li.category === 'labor' || li.category === 'materials') ? li.category : 'other' as 'labor' | 'materials' | 'other',
        }))
      );
    }

    return res.status(201).json({ invoiceId });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create invoice from estimate', message: String(error) });
  }
}
